/**
 * lib/tg-bot.ts
 *
 * All menu keyboards, message formatters, conversation-state helpers,
 * and CRUD action handlers for the WHHolidays Telegram bot.
 *
 * Callback-data convention (kept ≤ 64 bytes):
 *   m:main / m:trips / m:cities / m:hotels / m:airlines / m:excurs
 *   t:list:PAGE  t:view:ID  t:pub:ID  t:dra:ID  t:avl:ID  t:com:ID
 *   t:del:ID  t:dok:ID  t:new
 *   c:list  c:new  c:del:ID  c:dok:ID
 *   h:list  h:new  h:del:ID  h:dok:ID
 *   a:list  a:new  a:del:ID  a:dok:ID
 *   e:list  e:new  e:del:ID  e:dok:ID
 */

import { sendMessage, sendKeyboard, editMessage } from '@/lib/telegram'
import { cacheGet, cacheSet, cacheInvalidate }    from '@/lib/cache'
import {
  getTrips, getTrip, updateTrip, deleteTrip,
  uploadTripImage,
  getCities,    createCity,    deleteCity,
  getHotels,    createHotel,    deleteHotel,
  getAirlines,  createAirline,  deleteAirline,
  getExcursions, createExcursion, deleteExcursion,
} from '@/lib/wp-client'
import type { InlineKeyboard } from '@/lib/telegram'
import type { Trip }           from '@/lib/types'

// ─── Conversation state ───────────────────────────────────────────────────────

export interface ConvState {
  flow: 'city' | 'hotel' | 'airline' | 'excursion' | 'update_image'
  step: string
  data: Record<string, string>
}

const CONV_TTL = 600 // 10 min

export const convKey    = (chatId: number) => `tg:conv:${chatId}`
export const pendingKey = (chatId: number) => `tg:pending:${chatId}`

export const getConvState   = (chatId: number) => cacheGet<ConvState>(convKey(chatId))
export const setConvState   = (chatId: number, s: ConvState) => cacheSet(convKey(chatId), s, CONV_TTL)
export const clearConvState = (chatId: number) => cacheInvalidate(convKey(chatId))

// ─── Keyboard builders ────────────────────────────────────────────────────────

export function mainMenuKb(): InlineKeyboard {
  return [
    [{ text: '🗺️ Trips',     callback_data: 'm:trips'   },
     { text: '🏙️ Cities',   callback_data: 'm:cities'  }],
    [{ text: '🏨 Hotels',    callback_data: 'm:hotels'  },
     { text: '✈️ Airlines', callback_data: 'm:airlines' }],
    [{ text: '🎯 Excursions', callback_data: 'm:excurs' }],
  ]
}

export function tripsMenuKb(): InlineKeyboard {
  return [
    [{ text: '📋 List Trips',      callback_data: 't:list:0' }],
    [{ text: '➕ New Trip via AI', callback_data: 't:new'    }],
    [{ text: '⬅️ Main Menu',       callback_data: 'm:main'  }],
  ]
}

const PAGE = 8

export function tripListKb(
  trips:  Trip[],
  page:   number,
  total:  number,
): InlineKeyboard {
  const kb: InlineKeyboard = trips.map(t => [{
    text:          `${t.title.slice(0, 40)} · ${t.status === 'published' ? '✅' : '📝'}`,
    callback_data: `t:view:${t.id}`,
  }])

  const nav: { text: string; callback_data: string }[] = []
  if (page > 0)                    nav.push({ text: '◀️ Prev',  callback_data: `t:list:${page - 1}` })
  if ((page + 1) * PAGE < total)   nav.push({ text: 'Next ▶️', callback_data: `t:list:${page + 1}` })
  if (nav.length) kb.push(nav)

  kb.push([{ text: '⬅️ Trips Menu', callback_data: 'm:trips' }])
  return kb
}

export function tripDetailKb(id: string, status: string, avail: string): InlineKeyboard {
  const statusBtn = status === 'published'
    ? { text: '📝 Set Draft',    callback_data: `t:dra:${id}` }
    : { text: '✅ Publish',      callback_data: `t:pub:${id}` }
  const availBtn = avail === 'completed'
    ? { text: '🟢 Set Available',   callback_data: `t:avl:${id}` }
    : { text: '🏁 Mark Completed',  callback_data: `t:com:${id}` }
  return [
    [statusBtn],
    [availBtn],
    [{ text: '📷 Change Image',   callback_data: `t:img:${id}` }],
    [{ text: '🗑️ Delete Trip',   callback_data: `t:del:${id}` }],
    [{ text: '◀️ Back to List',  callback_data: 't:list:0'    }],
  ]
}

export function tripDeleteConfirmKb(id: string): InlineKeyboard {
  return [[
    { text: '❌ Yes, Delete', callback_data: `t:dok:${id}` },
    { text: '↩️ Cancel',      callback_data: `t:view:${id}` },
  ]]
}

export function tripConfirmKb(): InlineKeyboard {
  return [[
    { text: '✅ Create Trip', callback_data: 't:create_ok' },
    { text: '❌ Discard',     callback_data: 't:create_no' },
  ]]
}

export function entityListKb(
  items:      { id: string; name: string }[],
  prefix:     'c' | 'h' | 'a' | 'e',
  newAction:  string,
  backAction: string,
): InlineKeyboard {
  // 2 delete buttons per row
  const deleteRows: InlineKeyboard = []
  for (let i = 0; i < items.length; i += 2) {
    const row: { text: string; callback_data: string }[] = []
    row.push({ text: `🗑️ ${items[i].name.slice(0, 20)}`, callback_data: `${prefix}:del:${items[i].id}` })
    if (items[i + 1]) {
      row.push({ text: `🗑️ ${items[i + 1].name.slice(0, 20)}`, callback_data: `${prefix}:del:${items[i + 1].id}` })
    }
    deleteRows.push(row)
  }
  deleteRows.push([
    { text: '➕ New', callback_data: newAction },
    { text: '⬅️ Menu', callback_data: backAction },
  ])
  return deleteRows
}

export function entityDeleteConfirmKb(prefix: string, id: string, back: string): InlineKeyboard {
  return [[
    { text: '❌ Yes, Delete', callback_data: `${prefix}:dok:${id}` },
    { text: '↩️ Cancel',      callback_data: back },
  ]]
}

export function backKb(action: string, label = '⬅️ Back'): InlineKeyboard {
  return [[{ text: label, callback_data: action }]]
}

// ─── Message formatters ───────────────────────────────────────────────────────

export function mainMenuMsg(): string {
  return (
    '🏖️ <b>WHHolidays Bot</b>\n\n' +
    'What would you like to manage?'
  )
}

export function tripsMenuMsg(): string {
  return '🗺️ <b>Trips</b>\n\nChoose an action:'
}

export function tripListMsg(trips: Trip[], page: number, total: number): string {
  const start = page * PAGE
  const lines = trips.map((t, i) => {
    const num    = start + i + 1
    const status = t.status === 'published' ? '✅ Published' : '📝 Draft'
    const avail  = t.availability === 'available' ? '🟢' : '🏁'
    return `${num}. <b>${t.title}</b>\n   ${status} · ${avail} ${t.availability} · ${t.destination}`
  }).join('\n\n')

  return (
    `📋 <b>Trips</b> (${start + 1}–${start + trips.length} of ${total})\n\n` +
    lines + '\n\n' +
    '<i>Tap a trip to manage it.</i>'
  )
}

export function tripDetailMsg(t: Trip): string {
  const price  = (v: number) => v ? `$${Number(v).toLocaleString()}` : '—'
  const status = t.status === 'published' ? '✅ Published' : '📝 Draft'
  const avail  = t.availability === 'available' ? '🟢 Available' : '🏁 Completed'

  return [
    `🗺️ <b>${t.title}</b>`,
    '',
    `📍 <b>Destination:</b> ${t.destination}`,
    `📅 <b>Dates:</b> ${t.travel_date} → ${t.end_date}`,
    `⏱️ <b>Duration:</b> ${t.duration_nights}N / ${t.duration_days}D`,
    `💰 <b>Adult:</b> ${price(t.price_adult)} | <b>Child:</b> ${price(t.price_child)}`,
    `📌 <b>Status:</b> ${status}`,
    `🔄 <b>Availability:</b> ${avail}`,
    `🆔 <b>ID:</b> <code>${t.id}</code>`,
  ].join('\n')
}

// ─── Menu handlers (called from callback router) ──────────────────────────────

export async function showMainMenu(chatId: number, msgId?: number): Promise<void> {
  if (msgId) {
    await editMessage(chatId, msgId, mainMenuMsg(), mainMenuKb())
  } else {
    await sendKeyboard(chatId, mainMenuMsg(), mainMenuKb())
  }
}

export async function showTripsMenu(chatId: number, msgId: number): Promise<void> {
  await editMessage(chatId, msgId, tripsMenuMsg(), tripsMenuKb())
}

export async function showTripList(chatId: number, msgId: number, page: number): Promise<void> {
  const all    = await getTrips({})
  const total  = all.length
  const slice  = all.slice(page * PAGE, (page + 1) * PAGE)

  if (total === 0) {
    await editMessage(chatId, msgId, '📋 <b>Trips</b>\n\nNo trips yet.', tripsMenuKb())
    return
  }

  await editMessage(
    chatId, msgId,
    tripListMsg(slice, page, total),
    tripListKb(slice, page, total),
  )
}

export async function showTripDetail(chatId: number, msgId: number, tripId: string): Promise<void> {
  try {
    const trip = await getTrip(tripId)
    await editMessage(chatId, msgId, tripDetailMsg(trip), tripDetailKb(trip.id, trip.status, trip.availability ?? 'available'))
  } catch {
    await editMessage(chatId, msgId, '⚠️ Trip not found.', backKb('t:list:0', '◀️ Back to List'))
  }
}

// ─── Trip CRUD callbacks ──────────────────────────────────────────────────────

export async function setTripStatus(
  chatId: number, msgId: number, tripId: string, status: 'published' | 'draft',
): Promise<void> {
  const trip = await getTrip(tripId)
  await updateTrip(tripId, { ...trip, status })
  await showTripDetail(chatId, msgId, tripId)
}

export async function setTripAvailability(
  chatId: number, msgId: number, tripId: string, availability: 'available' | 'completed',
): Promise<void> {
  const trip = await getTrip(tripId)
  await updateTrip(tripId, { ...trip, availability })
  await showTripDetail(chatId, msgId, tripId)
}

export async function confirmDeleteTrip(chatId: number, msgId: number, tripId: string): Promise<void> {
  try {
    const trip = await getTrip(tripId)
    await editMessage(
      chatId, msgId,
      `⚠️ <b>Delete "${trip.title}"?</b>\n\nThis cannot be undone.`,
      tripDeleteConfirmKb(tripId),
    )
  } catch {
    await editMessage(chatId, msgId, '⚠️ Trip not found.', backKb('t:list:0'))
  }
}

export async function doDeleteTrip(chatId: number, msgId: number, tripId: string): Promise<void> {
  try {
    await deleteTrip(tripId)
    await editMessage(chatId, msgId, '✅ Trip deleted.', backKb('t:list:0', '◀️ Back to List'))
  } catch (e) {
    await editMessage(chatId, msgId, `❌ Failed to delete: ${String(e)}`, backKb('t:list:0'))
  }
}

// ─── Entity list screens ──────────────────────────────────────────────────────

export async function showCitiesList(chatId: number, msgId: number): Promise<void> {
  const items = await getCities()
  const text  = items.length
    ? '🏙️ <b>Cities</b> (' + items.length + ')\n\n' +
      items.map((c, i) => `${i + 1}. <b>${c.name}</b> · ${c.country} · ${c.location}`).join('\n')
    : '🏙️ <b>Cities</b>\n\nNo cities yet.'
  await editMessage(chatId, msgId, text,
    entityListKb(items, 'c', 'c:new', 'm:main'))
}

export async function showHotelsList(chatId: number, msgId: number): Promise<void> {
  const items = await getHotels()
  const text  = items.length
    ? '🏨 <b>Hotels</b> (' + items.length + ')\n\n' +
      items.map((h, i) => `${i + 1}. <b>${h.name}</b> · ${'★'.repeat(h.stars)} · ${h.location}`).join('\n')
    : '🏨 <b>Hotels</b>\n\nNo hotels yet.'
  await editMessage(chatId, msgId, text,
    entityListKb(items, 'h', 'h:new', 'm:main'))
}

export async function showAirlinesList(chatId: number, msgId: number): Promise<void> {
  const items = await getAirlines()
  const text  = items.length
    ? '✈️ <b>Airlines</b> (' + items.length + ')\n\n' +
      items.map((a, i) => `${i + 1}. <b>${a.name}</b> · ${a.baggage_allowance}`).join('\n')
    : '✈️ <b>Airlines</b>\n\nNo airlines yet.'
  await editMessage(chatId, msgId, text,
    entityListKb(items, 'a', 'a:new', 'm:main'))
}

export async function showExcursionsList(chatId: number, msgId: number): Promise<void> {
  const items = await getExcursions()
  const text  = items.length
    ? '🎯 <b>Excursions</b> (' + items.length + ')\n\n' +
      items.map((e, i) => `${i + 1}. <b>${e.name}</b>\n   ${e.description.slice(0, 60)}${e.description.length > 60 ? '…' : ''}`).join('\n\n')
    : '🎯 <b>Excursions</b>\n\nNo excursions yet.'
  await editMessage(chatId, msgId, text,
    entityListKb(items, 'e', 'e:new', 'm:main'))
}

// ─── Entity delete callbacks ──────────────────────────────────────────────────

export async function confirmDeleteEntity(
  chatId: number, msgId: number,
  prefix: 'c' | 'h' | 'a' | 'e',
  id: string,
  backAction: string,
): Promise<{ name: string } | null> {
  try {
    let name = ''
    if (prefix === 'c') name = (await getCities()).find(x => x.id === id)?.name ?? id
    if (prefix === 'h') name = (await getHotels()).find(x => x.id === id)?.name ?? id
    if (prefix === 'a') name = (await getAirlines()).find(x => x.id === id)?.name ?? id
    if (prefix === 'e') name = (await getExcursions()).find(x => x.id === id)?.name ?? id

    await editMessage(
      chatId, msgId,
      `⚠️ <b>Delete "${name}"?</b>\n\nThis cannot be undone.`,
      entityDeleteConfirmKb(prefix, id, backAction),
    )
    return { name }
  } catch {
    return null
  }
}

export async function doDeleteCity(chatId: number, msgId: number, id: string): Promise<void> {
  try {
    await deleteCity(id)
    await showCitiesList(chatId, msgId)
  } catch (e) {
    await editMessage(chatId, msgId, `❌ Failed to delete: ${String(e)}`, backKb('m:cities'))
  }
}

export async function doDeleteHotel(chatId: number, msgId: number, id: string): Promise<void> {
  try {
    await deleteHotel(id)
    await showHotelsList(chatId, msgId)
  } catch (e) {
    await editMessage(chatId, msgId, `❌ Failed to delete: ${String(e)}`, backKb('m:hotels'))
  }
}

export async function doDeleteAirline(chatId: number, msgId: number, id: string): Promise<void> {
  try {
    await deleteAirline(id)
    await showAirlinesList(chatId, msgId)
  } catch (e) {
    await editMessage(chatId, msgId, `❌ Failed to delete: ${String(e)}`, backKb('m:airlines'))
  }
}

export async function doDeleteExcursion(chatId: number, msgId: number, id: string): Promise<void> {
  try {
    await deleteExcursion(id)
    await showExcursionsList(chatId, msgId)
  } catch (e) {
    await editMessage(chatId, msgId, `❌ Failed to delete: ${String(e)}`, backKb('m:excurs'))
  }
}

// ─── Entity create flows (step-by-step via plain messages) ────────────────────

/**
 * Start a new create flow. Sends a plain message with the first question
 * and stores conversation state in Redis.
 */
export async function startCreateFlow(
  chatId: number,
  flow: ConvState['flow'],
): Promise<void> {
  await clearConvState(chatId)

  const questions: Record<ConvState['flow'], string> = {
    city:         '🏙️ <b>New City</b>\n\nEnter the city <b>name</b>:',
    hotel:        '🏨 <b>New Hotel</b>\n\nEnter the hotel <b>name</b>:',
    airline:      '✈️ <b>New Airline</b>\n\nEnter the airline <b>name</b>:',
    excursion:    '🎯 <b>New Excursion</b>\n\nEnter the excursion <b>name</b>:',
    update_image: '',
  }

  await setConvState(chatId, { flow, step: 'name', data: {} })
  await sendMessage(chatId, questions[flow] + '\n\n<i>Type /cancel to abort.</i>')
}

/**
 * Handle the next text input in an active create flow.
 * Returns true if the flow is complete (or should stop).
 */
export async function handleConvStep(
  chatId: number,
  state:  ConvState,
  input:  string,
): Promise<boolean> {
  const { flow, step, data } = state

  // ── City flow ──────────────────────────────────────────────────────────────
  if (flow === 'city') {
    if (step === 'name') {
      await setConvState(chatId, { flow, step: 'country', data: { ...data, name: input } })
      await sendMessage(chatId, `City: <b>${input}</b>\n\nEnter the <b>country</b>:`)
      return false
    }
    if (step === 'country') {
      await setConvState(chatId, { flow, step: 'location', data: { ...data, country: input } })
      await sendMessage(chatId, `City: <b>${data.name}</b>, ${input}\n\nEnter the <b>location</b> (district / area):`)
      return false
    }
    if (step === 'location') {
      await clearConvState(chatId)
      try {
        await createCity({ name: data.name, country: data.country, location: input })
        await sendKeyboard(
          chatId,
          `✅ <b>City created!</b>\n\n<b>${data.name}</b> · ${data.country} · ${input}`,
          backKb('m:cities', '🏙️ Back to Cities'),
        )
      } catch (e) {
        await sendMessage(chatId, `❌ Failed to create city: ${String(e)}`)
      }
      return true
    }
  }

  // ── Hotel flow ─────────────────────────────────────────────────────────────
  if (flow === 'hotel') {
    if (step === 'name') {
      await setConvState(chatId, { flow, step: 'stars', data: { ...data, name: input } })
      await sendMessage(chatId, `Hotel: <b>${input}</b>\n\nEnter star rating <b>(1–5)</b>:`)
      return false
    }
    if (step === 'stars') {
      const stars = Math.min(5, Math.max(1, parseInt(input) || 3))
      await setConvState(chatId, { flow, step: 'location', data: { ...data, stars: String(stars) } })
      await sendMessage(chatId, `Hotel: <b>${data.name}</b> · ${'★'.repeat(stars)}\n\nEnter the <b>location</b> (city / district):`)
      return false
    }
    if (step === 'location') {
      await clearConvState(chatId)
      try {
        await createHotel({ name: data.name, stars: parseInt(data.stars), location: input })
        await sendKeyboard(
          chatId,
          `✅ <b>Hotel created!</b>\n\n<b>${data.name}</b> · ${'★'.repeat(parseInt(data.stars))} · ${input}`,
          backKb('m:hotels', '🏨 Back to Hotels'),
        )
      } catch (e) {
        await sendMessage(chatId, `❌ Failed to create hotel: ${String(e)}`)
      }
      return true
    }
  }

  // ── Airline flow ───────────────────────────────────────────────────────────
  if (flow === 'airline') {
    if (step === 'name') {
      await setConvState(chatId, { flow, step: 'baggage', data: { ...data, name: input } })
      await sendMessage(chatId, `Airline: <b>${input}</b>\n\nEnter the <b>baggage allowance</b> (e.g. "23kg + 7kg carry-on"):`)
      return false
    }
    if (step === 'baggage') {
      await clearConvState(chatId)
      try {
        await createAirline({ name: data.name, baggage_allowance: input })
        await sendKeyboard(
          chatId,
          `✅ <b>Airline created!</b>\n\n<b>${data.name}</b> · ${input}`,
          backKb('m:airlines', '✈️ Back to Airlines'),
        )
      } catch (e) {
        await sendMessage(chatId, `❌ Failed to create airline: ${String(e)}`)
      }
      return true
    }
  }

  // ── Excursion flow ─────────────────────────────────────────────────────────
  if (flow === 'excursion') {
    if (step === 'name') {
      await setConvState(chatId, { flow, step: 'description', data: { ...data, name: input } })
      await sendMessage(chatId, `Excursion: <b>${input}</b>\n\nEnter a short <b>description</b>:`)
      return false
    }
    if (step === 'description') {
      await clearConvState(chatId)
      try {
        await createExcursion({ name: data.name, description: input })
        await sendKeyboard(
          chatId,
          `✅ <b>Excursion created!</b>\n\n<b>${data.name}</b>\n${input}`,
          backKb('m:excurs', '🎯 Back to Excursions'),
        )
      } catch (e) {
        await sendMessage(chatId, `❌ Failed to create excursion: ${String(e)}`)
      }
      return true
    }
  }

  return false
}

// ─── Update trip image flow ───────────────────────────────────────────────────

/** Called when user taps 📷 Change Image on a trip detail screen. */
export async function startUpdateImageFlow(
  chatId: number,
  tripId: string,
): Promise<void> {
  await clearConvState(chatId)
  await setConvState(chatId, { flow: 'update_image', step: 'photo', data: { tripId } })
  await sendMessage(
    chatId,
    '📷 <b>Change Trip Image</b>\n\nSend the new photo for this trip.\n\n<i>Type /cancel to abort.</i>',
  )
}

/**
 * Called from the webhook when a photo arrives while in update_image flow.
 * Downloads the photo, uploads to WordPress, updates the trip.
 */
export async function handleImageUpdate(
  chatId:  number,
  tripId:  string,
  buffer:  Buffer,
): Promise<void> {
  await clearConvState(chatId)
  try {
    const { url } = await uploadTripImage(buffer, 'image/jpeg', `trip-${tripId}-${Date.now()}.jpg`)
    const trip    = await getTrip(tripId)
    await updateTrip(tripId, { ...trip, featured_image: url })
    await sendKeyboard(
      chatId,
      `✅ <b>Image updated!</b>\n\nTrip: <b>${trip.title}</b>`,
      backKb(`t:view:${tripId}`, '◀️ Back to Trip'),
    )
  } catch (e) {
    await sendMessage(chatId, `❌ Failed to update image: ${String(e)}`)
  }
}
