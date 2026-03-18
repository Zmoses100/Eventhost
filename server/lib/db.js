import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dataDir = path.resolve(process.cwd(), 'server/data');
const dbPath = path.join(dataDir, 'db.json');

const DEFAULT_DB = {
  users: [],
  sessions: [],
  profiles: [],
  events: [],
  ticket_types: [],
  tickets: [],
  speakers: [],
  messages: [],
  qas: [],
  polls: [],
  quizzes: [],
  chapters: [],
  shared_links: [],
  ctas: [],
  raised_hands: [],
  reactions: [],
  virtual_event_state: [],
  direct_messages: [],
  communications: [],
  sponsors: [],
  notifications: [],
  payment_proofs: [],
  app_settings: [],
  email_tokens: [],
};

let writeLock = Promise.resolve();

const nowIso = () => new Date().toISOString();

export async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

export async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, 'utf8');
  const parsed = raw ? JSON.parse(raw) : {};
  return { ...DEFAULT_DB, ...parsed };
}

export async function writeDb(nextDb) {
  writeLock = writeLock.then(async () => {
    await ensureDb();
    await fs.writeFile(dbPath, JSON.stringify(nextDb, null, 2));
  });
  await writeLock;
}

export function ensureRecord(record) {
  const base = { ...record };
  if (!base.id) base.id = randomUUID();
  if (!base.created_at) base.created_at = nowIso();
  base.updated_at = nowIso();
  return base;
}

export function getTable(db, table) {
  if (!Array.isArray(db[table])) db[table] = [];
  return db[table];
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}
