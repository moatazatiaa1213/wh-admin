// app/api/telegram-webhook/route.ts

import { NextRequest, NextResponse }                              from 'next/server'
import { sendMessage, downloadTelegramFile }                      from '@/lib/telegram'
import { parseTripFromText, parseTripFromImage,
         parseTripFromAudio, ParsedTrip }                         from '@/lib/gemini-trip-parser'
import { cacheGet, cacheSet, cacheInvalidate }                    from '@/lib/cache'
import { createTrip }                                             from '@/lib/wp-client'

// ── Config ─────────────────────────────────────────────────────────────────────
const ALLOWED_USER_ID = parseInt(process.env.TELEGRAM_ALLOWED_USER_ID ?? '0', 10)
const WEBHOOK_SECRET  = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
const PENDING_TTL     = 600   // 10 minutes in Redis

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPreview(p: ParsedTrip): string {
  const price = (v: number | null) =>
    v != null ? `${v.toLocaleString('en-EG')} EGP` : '❓ not mentioned'
  const date  = (v: string | null) => v ?? '❓ not mentioned'
  const dur   = p.duration_nights != null
    ? `${p.duration_nights} nights / ${p.duration_nights + 1} days`
    : '❓ not mentioned'

  return [
    '📋 <b>New Trip Preview</b>', '',
    `<b>Title:</b> ${p.title}`,
    `<b>Destination:</b> ${p.destination}`,
    `<b>Travel Date:</b> ${date(p.travel_date)}`,
    `<b>End Date:</b> ${date(p.end_date)}`,
    `<b>Duration:</b> ${dur}`,
    `<b>Adult Price:</b> ${price(p.price_adult)}`,
    `<b>Child Price:</b> ${price(p.price_child)}`,
    '',
    'Reply <b>✅ confirm</b> to create as a draft.',
    'Reply <b>❌ cancel</b> to discard.',
    '',
    '<i>Hotels, airlines, excursions can be linked later via the Migration page.</i>',
  ].join('\n')
}

function isConfirm(text: string): boolean {
  return ['yes', 'confirm', '✅', 'ok', 'okay', 'sure',
          'نعم', 'تمام', 'اوكي', 'موافق', 'تأكيد'].includes(text.toLowerCase().trim())
}

function isCancel(text: string): boolean {
  return ['no', 'cancel', '❌', 'nope',
          'لا', 'الغاء', 'إلغاء', 'كنسل'].includes(text.toLowerCase().trim())
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify Telegram webhook secret header
  if (req.headers.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const message = body?.message as Record<string, unknown> | undefined
  if (!message) return NextResponse.json({ ok: true })

  const chatId = (message.chat as Record<string, unknown>)?.id as number
  const userId = ((message.from as Record<string, unknown>)?.id as number) ?? 0
  const text    = message.text    as string | undefined
  const caption = message.caption as string | undefined   // text attached to a photo/video
  const voice   = message.voice   as Record<string, unknown> | undefined
  // Telegram sends photo as array — last item = highest resolution
  const photo   = message.photo   as Record<string, unknown>[] | undefined

  // 2. Only allow the configured admin user
  if (userId !== ALLOWED_USER_ID) {
    await sendMessage(chatId, '❌ Unauthorized.')
    return NextResponse.json({ ok: true })
  }

  const pendingKey = `tg:pending:${chatId}`

  // 3. Handle confirmation / cancellation of a pending trip
  const pending = await cacheGet<ParsedTrip>(pendingKey)
  if (pending && text) {
    if (isConfirm(text)) {
      await sendMessage(chatId, '⏳ Creating trip in dashboard...')
      try {
        const nights = pending.duration_nights ?? 0
        const trip = await createTrip({
          title:           pending.title,
          trip_number:     '',
          description:     '',
          destination:     pending.destination,
          travel_date:     pending.travel_date  ?? '',
          end_date:        pending.end_date      ?? '',
          duration_nights: nights,
          duration_days:   nights + 1,
          price_adult:     pending.price_adult  ?? 0,
          price_child:     pending.price_child  ?? 0,
          deposit:         0,
          single_rate:     0,
          status:          'draft',
          availability:    'available',
          city_ids:        [],
          hotel_ids:       [],
          airline_ids:     [],
          excursion_ids:   [],
        })
        await cacheInvalidate(pendingKey)
        await sendMessage(chatId,
          `✅ <b>Trip created successfully!</b>\n\n` +
          `<b>${trip.title}</b>\n` +
          `ID: ${trip.id} · Status: Draft\n\n` +
          `Open the dashboard to add details and publish.`
        )
      } catch (e) {
        await sendMessage(chatId, `❌ Failed to create trip: ${String(e)}`)
      }
      return NextResponse.json({ ok: true })
    }

    if (isCancel(text)) {
      await cacheInvalidate(pendingKey)
      await sendMessage(chatId, '❌ Cancelled. Send a new message to start over.')
      return NextResponse.json({ ok: true })
    }
  }

  // 4. Process new input — voice, photo, or text
  try {
    let parsed: ParsedTrip

    if (voice) {
      // ── Voice message → Gemini Audio ──
      await sendMessage(chatId, '🎙️ Listening to your voice message...')
      const buffer = await downloadTelegramFile(voice.file_id as string)
      parsed = await parseTripFromAudio(buffer, 'audio/ogg')

    } else if (photo && photo.length > 0) {
      // ── Photo (+ optional caption) → Gemini Vision ──
      await sendMessage(chatId, '🖼️ Reading your image...')
      const best   = photo[photo.length - 1] as Record<string, unknown>
      const buffer = await downloadTelegramFile(best.file_id as string)
      // Pass caption alongside the image so Gemini sees both
      parsed = await parseTripFromImage(buffer, 'image/jpeg', caption)

    } else if (text ?? caption) {
      // ── Slash commands (text only) ──
      if (text?.startsWith('/')) {
        if (text === '/start' || text === '/help') {
          await sendMessage(chatId,
            '👋 <b>WHHolidays Trip Bot</b>\n\n' +
            'Send me a <b>voice note</b>, <b>photo</b>, or <b>text</b> describing a trip ' +
            'and I\'ll create it as a draft in the admin dashboard.\n\n' +
            '<b>Examples:</b>\n' +
            '🎙️ Voice: "رحلة إسطنبول 10 ليالي من 15 يوليو سعر الكبير 45 ألف جنيه"\n' +
            '🖼️ Photo: screenshot of a note or WhatsApp message with trip info\n' +
            '📝 Text: "Istanbul 10 nights July 15 2026, adult 45000 EGP, child 35000 EGP"'
          )
        }
        return NextResponse.json({ ok: true })
      }
      // ── Plain text (or standalone caption) → Gemini Text ──
      await sendMessage(chatId, '🔍 Extracting trip details...')
      parsed = await parseTripFromText((text ?? caption)!)

    } else {
      await sendMessage(chatId,
        '⚠️ Please send a <b>voice note</b>, <b>photo</b>, or <b>text</b> description of the trip.'
      )
      return NextResponse.json({ ok: true })
    }

    // Store pending trip in Redis and show preview
    await cacheSet(pendingKey, parsed, PENDING_TTL)
    await sendMessage(chatId, formatPreview(parsed))

  } catch (e) {
    console.error('[telegram-webhook]', e)
    await sendMessage(chatId,
      `❌ Something went wrong: ${String(e)}\n\nPlease try again.`
    )
  }

  return NextResponse.json({ ok: true })
}
