// app/api/telegram-webhook/route.ts

import { NextRequest, NextResponse }           from 'next/server'
import { sendMessage, sendKeyboard,
         answerCallback, downloadTelegramFile } from '@/lib/telegram'
import { parseTripFromText, parseTripFromImage,
         parseTripFromAudio, ParsedTrip }       from '@/lib/gemini-trip-parser'
import { cacheGet, cacheSet, cacheInvalidate }  from '@/lib/cache'
import { createTrip, uploadTripImage }          from '@/lib/wp-client'
import {
  // state helpers
  getConvState, clearConvState, pendingKey,
  // keyboards / formatters
  mainMenuKb, mainMenuMsg, tripConfirmKb,
  // screens
  showMainMenu, showTripsMenu, showTripList, showTripDetail,
  showCitiesList, showHotelsList, showAirlinesList, showExcursionsList,
  // trip CRUD
  setTripStatus, setTripAvailability,
  confirmDeleteTrip, doDeleteTrip,
  // entity deletes
  confirmDeleteEntity,
  doDeleteCity, doDeleteHotel, doDeleteAirline, doDeleteExcursion,
  // create flows
  startCreateFlow, handleConvStep,
} from '@/lib/tg-bot'

// ── Config ────────────────────────────────────────────────────────────────────

const ALLOWED_USER_ID = parseInt(process.env.TELEGRAM_ALLOWED_USER_ID ?? '0', 10)
const WEBHOOK_SECRET  = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
const PENDING_TTL     = 600

// ── Trip preview helpers ───────────────────────────────────────────────────────

function formatPreview(p: ParsedTrip): string {
  const price = (v: number | null) => v != null ? `$${v.toLocaleString()}` : '❓'
  const date  = (v: string | null) => v ?? '❓'
  const dur   = p.duration_nights != null
    ? `${p.duration_nights}N / ${p.duration_nights + 1}D`
    : '❓'

  return [
    '📋 <b>Trip Preview</b>', '',
    `<b>Title:</b> ${p.title}`,
    `<b>Destination:</b> ${p.destination}`,
    `<b>Travel Date:</b> ${date(p.travel_date)}`,
    `<b>End Date:</b> ${date(p.end_date)}`,
    `<b>Duration:</b> ${dur}`,
    `<b>Adult Price:</b> ${price(p.price_adult)}`,
    `<b>Child Price:</b> ${price(p.price_child)}`,
    '',
    '<i>Hotels, airlines, cities can be linked later via the dashboard.</i>',
  ].join('\n')
}

// ── Callback router ───────────────────────────────────────────────────────────

async function handleCallback(
  chatId:     number,
  msgId:      number,
  data:       string,
  callbackId: string,
): Promise<void> {
  // Answer the query immediately to dismiss the loading spinner
  await answerCallback(callbackId)

  const parts  = data.split(':')
  const ns     = parts[0]   // namespace: m / t / c / h / a / e
  const action = parts[1]
  const id     = parts[2]
  const extra  = parts[3]

  // ── Main menu ──────────────────────────────────────────────────────────────
  if (ns === 'm') {
    if (action === 'main')    { await showMainMenu(chatId, msgId);         return }
    if (action === 'trips')   { await showTripsMenu(chatId, msgId);        return }
    if (action === 'cities')  { await showCitiesList(chatId, msgId);       return }
    if (action === 'hotels')  { await showHotelsList(chatId, msgId);       return }
    if (action === 'airlines'){ await showAirlinesList(chatId, msgId);     return }
    if (action === 'excurs')  { await showExcursionsList(chatId, msgId);   return }
  }

  // ── Trips ──────────────────────────────────────────────────────────────────
  if (ns === 't') {
    if (action === 'list')   { await showTripList(chatId, msgId, parseInt(id) || 0); return }
    if (action === 'view')   { await showTripDetail(chatId, msgId, id);              return }
    if (action === 'pub')    { await setTripStatus(chatId, msgId, id, 'published');  return }
    if (action === 'dra')    { await setTripStatus(chatId, msgId, id, 'draft');      return }
    if (action === 'avl')    { await setTripAvailability(chatId, msgId, id, 'available');   return }
    if (action === 'com')    { await setTripAvailability(chatId, msgId, id, 'completed');   return }
    if (action === 'del')    { await confirmDeleteTrip(chatId, msgId, id);           return }
    if (action === 'dok')    { await doDeleteTrip(chatId, msgId, id);                return }

    // Confirm/discard trip from AI parse
    if (action === 'create_ok') {
      const pending = await cacheGet<ParsedTrip>(pendingKey(chatId))
      if (!pending) {
        await sendMessage(chatId, '⚠️ No pending trip — please send a new description.')
        return
      }
      await sendMessage(chatId, '⏳ Creating trip…')
      try {
        const nights = pending.duration_nights ?? 0
        let featuredImageId: number | undefined
        if (pending.tg_file_id) {
          try {
            const buf = await downloadTelegramFile(pending.tg_file_id)
            featuredImageId = await uploadTripImage(buf, 'image/jpeg', `trip-${Date.now()}.jpg`)
          } catch { /* skip image on failure */ }
        }
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
          ...(featuredImageId ? { featured_image_id: featuredImageId } : {}),
        })
        await cacheInvalidate(pendingKey(chatId))
        await sendKeyboard(
          chatId,
          `✅ <b>Trip created!</b>\n\n<b>${trip.title}</b>\nStatus: Draft\n\n<i>Open the dashboard to add details and publish.</i>`,
          mainMenuKb(),
        )
      } catch (e) {
        await sendMessage(chatId, `❌ Failed to create trip: ${String(e)}`)
      }
      return
    }

    if (action === 'create_no') {
      await cacheInvalidate(pendingKey(chatId))
      await sendKeyboard(chatId, '❌ Discarded.', mainMenuKb())
      return
    }

    // New trip — prompt for input
    if (action === 'new') {
      await sendMessage(
        chatId,
        '➕ <b>New Trip via AI</b>\n\n' +
        'Send me a <b>voice note 🎙️</b>, <b>photo 🖼️</b>, or <b>text 📝</b> ' +
        'describing the trip and I\'ll extract the details.\n\n' +
        '<i>Type /cancel to go back to the menu.</i>',
      )
      return
    }

    void extra // suppress lint warning
    return
  }

  // ── Cities ─────────────────────────────────────────────────────────────────
  if (ns === 'c') {
    if (action === 'list') { await showCitiesList(chatId, msgId);   return }
    if (action === 'new')  { await startCreateFlow(chatId, 'city'); return }
    if (action === 'del')  {
      await confirmDeleteEntity(chatId, msgId, 'c', id, 'c:list')
      return
    }
    if (action === 'dok')  { await doDeleteCity(chatId, msgId, id);  return }
  }

  // ── Hotels ─────────────────────────────────────────────────────────────────
  if (ns === 'h') {
    if (action === 'list') { await showHotelsList(chatId, msgId);    return }
    if (action === 'new')  { await startCreateFlow(chatId, 'hotel'); return }
    if (action === 'del')  {
      await confirmDeleteEntity(chatId, msgId, 'h', id, 'h:list')
      return
    }
    if (action === 'dok')  { await doDeleteHotel(chatId, msgId, id); return }
  }

  // ── Airlines ───────────────────────────────────────────────────────────────
  if (ns === 'a') {
    if (action === 'list') { await showAirlinesList(chatId, msgId);    return }
    if (action === 'new')  { await startCreateFlow(chatId, 'airline'); return }
    if (action === 'del')  {
      await confirmDeleteEntity(chatId, msgId, 'a', id, 'a:list')
      return
    }
    if (action === 'dok')  { await doDeleteAirline(chatId, msgId, id); return }
  }

  // ── Excursions ─────────────────────────────────────────────────────────────
  if (ns === 'e') {
    if (action === 'list') { await showExcursionsList(chatId, msgId);    return }
    if (action === 'new')  { await startCreateFlow(chatId, 'excursion'); return }
    if (action === 'del')  {
      await confirmDeleteEntity(chatId, msgId, 'e', id, 'e:list')
      return
    }
    if (action === 'dok')  { await doDeleteExcursion(chatId, msgId, id); return }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify Telegram webhook secret
  if (req.headers.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  // ── 2. Handle inline keyboard button presses ──────────────────────────────
  const cbq = body?.callback_query as Record<string, unknown> | undefined
  if (cbq) {
    const cbChatId = ((cbq.message as Record<string, unknown>)?.chat as Record<string, unknown>)?.id as number
    const cbMsgId  = ((cbq.message as Record<string, unknown>)?.message_id) as number
    const cbUserId = ((cbq.from as Record<string, unknown>)?.id as number) ?? 0
    const cbData   = cbq.data as string ?? ''
    const cbId     = cbq.id  as string ?? ''

    if (cbUserId !== ALLOWED_USER_ID) {
      await answerCallback(cbId, '❌ Unauthorized')
      return NextResponse.json({ ok: true })
    }

    try {
      await handleCallback(cbChatId, cbMsgId, cbData, cbId)
    } catch (e) {
      console.error('[tg-callback]', e)
      await answerCallback(cbId, '❌ Error')
    }
    return NextResponse.json({ ok: true })
  }

  // ── 3. Handle regular messages ────────────────────────────────────────────
  const message = body?.message as Record<string, unknown> | undefined
  if (!message) return NextResponse.json({ ok: true })

  const chatId  = (message.chat as Record<string, unknown>)?.id as number
  const userId  = ((message.from as Record<string, unknown>)?.id as number) ?? 0
  const text    = message.text    as string | undefined
  const caption = message.caption as string | undefined
  const voice   = message.voice   as Record<string, unknown> | undefined
  const photo   = message.photo   as Record<string, unknown>[] | undefined

  if (userId !== ALLOWED_USER_ID) {
    await sendMessage(chatId, '❌ Unauthorized.')
    return NextResponse.json({ ok: true })
  }

  // ── /cancel — abort any active flow ───────────────────────────────────────
  if (text === '/cancel') {
    await clearConvState(chatId)
    await cacheInvalidate(pendingKey(chatId))
    await sendKeyboard(chatId, '❌ Cancelled.', mainMenuKb())
    return NextResponse.json({ ok: true })
  }

  // ── /start / /help / /menu ─────────────────────────────────────────────────
  if (text === '/start' || text === '/help' || text === '/menu') {
    await clearConvState(chatId)
    await sendKeyboard(chatId, mainMenuMsg(), mainMenuKb())
    return NextResponse.json({ ok: true })
  }

  // ── Section shortcut commands ──────────────────────────────────────────────
  if (text === '/trips') {
    await clearConvState(chatId)
    const msgId = await sendKeyboard(chatId, '🗺️ <b>Trips</b>\n\nChoose an action:', [
      [{ text: '📋 List Trips',      callback_data: 't:list:0' }],
      [{ text: '➕ New Trip via AI', callback_data: 't:new'    }],
      [{ text: '⬅️ Main Menu',       callback_data: 'm:main'   }],
    ])
    void msgId
    return NextResponse.json({ ok: true })
  }
  if (text === '/cities') {
    await clearConvState(chatId)
    const msgId = await sendKeyboard(chatId, '🏙️ Loading cities…', [[{ text: '⏳', callback_data: 'm:main' }]])
    await showCitiesList(chatId, msgId)
    return NextResponse.json({ ok: true })
  }
  if (text === '/hotels') {
    await clearConvState(chatId)
    const msgId = await sendKeyboard(chatId, '🏨 Loading hotels…', [[{ text: '⏳', callback_data: 'm:main' }]])
    await showHotelsList(chatId, msgId)
    return NextResponse.json({ ok: true })
  }
  if (text === '/airlines') {
    await clearConvState(chatId)
    const msgId = await sendKeyboard(chatId, '✈️ Loading airlines…', [[{ text: '⏳', callback_data: 'm:main' }]])
    await showAirlinesList(chatId, msgId)
    return NextResponse.json({ ok: true })
  }
  if (text === '/excursions') {
    await clearConvState(chatId)
    const msgId = await sendKeyboard(chatId, '🎯 Loading excursions…', [[{ text: '⏳', callback_data: 'm:main' }]])
    await showExcursionsList(chatId, msgId)
    return NextResponse.json({ ok: true })
  }

  // ── Active conversation flow (city/hotel/airline/excursion create) ─────────
  const convState = await getConvState(chatId)
  if (convState && text) {
    try {
      await handleConvStep(chatId, convState, text)
    } catch (e) {
      await clearConvState(chatId)
      await sendMessage(chatId, `❌ Error: ${String(e)}`)
    }
    return NextResponse.json({ ok: true })
  }

  // ── AI trip parsing — voice / photo / text ─────────────────────────────────
  try {
    let parsed: ParsedTrip

    if (voice) {
      await sendMessage(chatId, '🎙️ Listening to your voice message…')
      const buffer = await downloadTelegramFile(voice.file_id as string)
      parsed = await parseTripFromAudio(buffer, 'audio/ogg')

    } else if (photo && photo.length > 0) {
      await sendMessage(chatId, '🖼️ Reading your image…')
      const best   = photo[photo.length - 1] as Record<string, unknown>
      const fileId = best.file_id as string
      const buffer = await downloadTelegramFile(fileId)
      parsed = await parseTripFromImage(buffer, 'image/jpeg', caption)
      parsed.tg_file_id = fileId

    } else if (text ?? caption) {
      // Ignore unrecognised slash commands
      if ((text ?? '').startsWith('/')) return NextResponse.json({ ok: true })
      await sendMessage(chatId, '🔍 Extracting trip details…')
      parsed = await parseTripFromText((text ?? caption)!)

    } else {
      await sendKeyboard(
        chatId,
        '⚠️ Please send a voice note 🎙️, photo 🖼️, or text description of the trip.\n\nOr use /menu to navigate.',
        mainMenuKb(),
      )
      return NextResponse.json({ ok: true })
    }

    await cacheSet(pendingKey(chatId), parsed, PENDING_TTL)
    await sendKeyboard(chatId, formatPreview(parsed), tripConfirmKb())

  } catch (e) {
    console.error('[tg-message]', e)
    await sendMessage(chatId, `❌ Something went wrong: ${String(e)}\n\nPlease try again.`)
  }

  return NextResponse.json({ ok: true })
}
