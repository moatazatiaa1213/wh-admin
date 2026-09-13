import { neon } from '@neondatabase/serverless'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

// A fresh client per call (not a cached module-level singleton, and not
// created at module load — so builds/imports don't fail when DATABASE_URL
// isn't set in the environment doing the importing, e.g. build time). A
// shared long-lived client object was observed to make queries called from
// a Server Component render (the /users page) silently return stale/empty
// results, while the exact same query worked correctly from a Route
// Handler or a locally-constructed client — a fresh client per call sides
// steps whatever caching Next.js/the driver applies to a reused instance.
function getSql() {
  return neon(process.env.DATABASE_URL!)
}

// Postgres error code for "relation does not exist" — thrown when the
// admin_users table hasn't been created yet (no user has ever been added).
const UNDEFINED_TABLE = '42P01'

function isMissingTable(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === UNDEFINED_TABLE
}

let tableReady: Promise<unknown> | null = null
function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
}

export interface AdminUser {
  username: string
  createdAt: string
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':')
  if (!salt || !hashHex) return false
  const hash = Buffer.from(hashHex, 'hex')
  const derived = (await scrypt(password, salt, hash.length)) as Buffer
  return derived.length === hash.length && timingSafeEqual(derived, hash)
}

// listUsers/deleteUser/verifyCredentials deliberately do NOT call
// ensureTable() first: issuing a CREATE TABLE immediately before a SELECT to
// the same Neon HTTP endpoint, in the same Server Component render, was
// getting collapsed by Next.js's automatic fetch request memoization (both
// are POSTs to the same URL) — the SELECT would spuriously receive the
// CREATE TABLE's empty result. Route Handlers aren't part of the render
// tree so this only ever showed up in the page, not the API route. Instead,
// each read treats "relation does not exist" as an empty/negative result;
// only createUser() (always invoked from a Route Handler, never during
// page render) is responsible for bootstrapping the table.

export async function listUsers(): Promise<AdminUser[]> {
  try {
    const rows = await getSql()`SELECT username, created_at FROM admin_users ORDER BY username`
    return rows.map(r => ({ username: r.username as string, createdAt: (r.created_at as Date).toISOString() }))
  } catch (e) {
    if (isMissingTable(e)) return []
    throw e
  }
}

export async function createUser(username: string, password: string): Promise<AdminUser> {
  await ensureTable()
  const sql = getSql()
  const existing = await sql`SELECT 1 FROM admin_users WHERE username = ${username}`
  if (existing.length > 0) throw new Error('A user with that username already exists')

  const passwordHash = await hashPassword(password)
  const rows = await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${passwordHash})
    RETURNING username, created_at
  `
  const row = rows[0]
  return { username: row.username as string, createdAt: (row.created_at as Date).toISOString() }
}

export async function deleteUser(username: string): Promise<void> {
  try {
    await getSql()`DELETE FROM admin_users WHERE username = ${username}`
  } catch (e) {
    if (!isMissingTable(e)) throw e
  }
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  try {
    const rows = await getSql()`SELECT password_hash FROM admin_users WHERE username = ${username}`
    if (rows.length === 0) return false
    return verifyPassword(password, rows[0].password_hash as string)
  } catch (e) {
    if (isMissingTable(e)) return false
    throw e
  }
}
