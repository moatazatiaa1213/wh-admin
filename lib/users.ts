import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

// Created lazily (not at module load) so builds/imports don't fail when
// DATABASE_URL isn't set in the environment doing the importing (e.g. build time).
let sqlClient: NeonQueryFunction<false, false> | null = null
function getSql() {
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL!)
  return sqlClient
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

export async function listUsers(): Promise<AdminUser[]> {
  await ensureTable()
  const rows = await getSql()`SELECT username, created_at FROM admin_users ORDER BY username`
  return rows.map(r => ({ username: r.username as string, createdAt: (r.created_at as Date).toISOString() }))
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
  await ensureTable()
  await getSql()`DELETE FROM admin_users WHERE username = ${username}`
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  await ensureTable()
  const rows = await getSql()`SELECT password_hash FROM admin_users WHERE username = ${username}`
  if (rows.length === 0) return false
  return verifyPassword(password, rows[0].password_hash as string)
}
