import { NextResponse } from 'next/server'
import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from 'undici'

// TEMPORARY diagnostic endpoint — remove after debugging.
// Reports exactly what the server sees when it calls WordPress.
// Public (excluded from middleware) so it can be hit directly in a browser.

export async function GET() {
  const base = process.env.WP_BASE_URL
  const user = process.env.WP_USERNAME
  const pass = process.env.WP_APP_PASSWORD
  const useMock = process.env.USE_MOCK_DATA

  const report: Record<string, unknown> = {
    env: {
      WP_BASE_URL_present: !!base,
      WP_BASE_URL_value: base ?? '(undefined)',
      WP_BASE_URL_length: base?.length ?? 0,
      WP_USERNAME_present: !!user,
      WP_APP_PASSWORD_present: !!pass,
      USE_MOCK_DATA: useMock ?? '(undefined)',
      WP_ORIGIN_IP: process.env.WP_ORIGIN_IP ?? '(undefined)',
    },
  }

  const url = `${base}/wp-json/whholidays/v1/tours`
  report.fetch_url = url

  // Origin-IP bypass dispatcher (mirrors wp-client logic)
  const originIp = process.env.WP_ORIGIN_IP
  let dispatcher: Agent | undefined
  if (originIp && base) {
    const hostname = new URL(base).hostname
    dispatcher = new Agent({
      connect: {
        servername: hostname,
        rejectUnauthorized: true,
        lookup: (
          _h: string,
          opts: { all?: boolean },
          cb: (e: Error | null, a: string | { address: string; family: number }[], f?: number) => void,
        ) => {
          if (opts?.all) cb(null, [{ address: originIp, family: 4 }])
          else cb(null, originIp, 4)
        },
      },
    })
  }

  try {
    const creds = Buffer.from(`${user}:${pass}`).toString('base64')
    const res = await undiciFetch(url, {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      ...(dispatcher ? { dispatcher } : {}),
    } as UndiciRequestInit)

    const text = await res.text()
    let count: number | string = 'n/a'
    try {
      const json = JSON.parse(text)
      count = Array.isArray(json) ? json.length : 'not-an-array'
    } catch {
      count = 'invalid-json'
    }

    report.result = {
      status: res.status,
      ok: res.ok,
      server: res.headers.get('server'),
      cf_mitigated: res.headers.get('cf-mitigated'),
      trip_count: count,
      body_snippet: text.slice(0, 400),
    }
  } catch (e) {
    const err = e as { message?: string; cause?: unknown }
    const cause = err.cause as { message?: string; code?: string; errno?: number } | undefined
    report.result = {
      error: String(e),
      cause_message: cause?.message ?? '(none)',
      cause_code: cause?.code ?? '(none)',
      cause_full: cause ? JSON.stringify(cause, Object.getOwnPropertyNames(cause)) : '(none)',
    }
  }

  return NextResponse.json(report, { status: 200 })
}
