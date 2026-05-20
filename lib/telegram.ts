// lib/telegram.ts

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TG    = `https://api.telegram.org/bot${TOKEN}`

/**
 * Send an HTML-formatted message to a Telegram chat.
 * Bold: <b>text</b>  |  Italic: <i>text</i>
 */
export async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${TG}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

/**
 * Download any Telegram file (voice OGG or photo JPEG) and return
 * the raw bytes as a Buffer.
 *
 * Flow:
 *   1. Call getFile to resolve file_id → file_path on Telegram CDN
 *   2. Download the actual bytes
 */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  // 1. Resolve file_path
  const metaRes  = await fetch(`${TG}/getFile?file_id=${encodeURIComponent(fileId)}`)
  const metaJson = await metaRes.json() as { result: { file_path: string } }
  const filePath = metaJson.result.file_path

  // 2. Download bytes
  const dlRes  = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`)
  const arrBuf = await dlRes.arrayBuffer()
  return Buffer.from(arrBuf)
}
