// lib/telegram.ts

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TG    = `https://api.telegram.org/bot${TOKEN}`

// ── Types ─────────────────────────────────────────────────────────────────────

export type InlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }

export type InlineKeyboard = InlineButton[][]

// ── Messaging ─────────────────────────────────────────────────────────────────

/** Send an HTML-formatted plain message (no keyboard). */
export async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${TG}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

/** Send a message with an inline keyboard. Returns the new message_id. */
export async function sendKeyboard(
  chatId:   number,
  text:     string,
  keyboard: InlineKeyboard,
): Promise<number> {
  const res  = await fetch(`${TG}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:      chatId,
      text,
      parse_mode:   'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  })
  const data = await res.json() as { result?: { message_id: number } }
  return data.result?.message_id ?? 0
}

/** Edit an existing message (text + optional new keyboard). */
export async function editMessage(
  chatId:    number,
  messageId: number,
  text:      string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  await fetch(`${TG}/editMessageText`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:      chatId,
      message_id:   messageId,
      text,
      parse_mode:   'HTML',
      reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
    }),
  })
}

/** Dismiss the Telegram loading spinner on a callback query. */
export async function answerCallback(callbackId: string, toast?: string): Promise<void> {
  await fetch(`${TG}/answerCallbackQuery`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ callback_query_id: callbackId, text: toast ?? '' }),
  })
}

// ── File download ─────────────────────────────────────────────────────────────

/**
 * Download any Telegram file (voice OGG or photo JPEG) and return
 * the raw bytes as a Buffer.
 */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const metaRes  = await fetch(`${TG}/getFile?file_id=${encodeURIComponent(fileId)}`)
  const metaJson = await metaRes.json() as { result: { file_path: string } }
  const filePath = metaJson.result.file_path
  const dlRes    = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`)
  return Buffer.from(await dlRes.arrayBuffer())
}
