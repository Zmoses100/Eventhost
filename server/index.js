import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureDb, readDb, writeDb, getTable, ensureRecord, sanitizeUser } from './lib/db.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const API_ORIGIN = process.env.API_ORIGIN || '*';
const uploadRoot = path.resolve(process.cwd(), 'server/uploads');

app.use(cors({ origin: API_ORIGIN === '*' ? true : API_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(uploadRoot));

const nowIso = () => new Date().toISOString();

const signToken = (user) => jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

async function createUserInDb(db, { email, password, options = {} }) {
  const users = getTable(db, 'users');
  const profiles = getTable(db, 'profiles');
  if (users.some((existing) => existing.email.toLowerCase() === String(email).toLowerCase())) {
    return { user: null, error: { message: 'Email already in use.' } };
  }

  const userId = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);
  const role = options?.data?.role || 'Attendee';
  const user = ensureRecord({ id: userId, email, role, password_hash, email_confirmed_at: nowIso() });
  users.push(user);

  const metadata = options?.data || {};
  profiles.push(ensureRecord({
    id: userId,
    email,
    role,
    name: metadata.name || email.split('@')[0],
    phone: metadata.phone || '',
    venue_name: metadata.venue_name || '',
    paypal_email: metadata.paypal_email || '',
    bank_transfer_details: metadata.bank_transfer_details || '',
    profile_picture_url: metadata.profile_picture_url || '',
  }));

  return { user, error: null };
}

async function findUserById(userId) {
  const db = await readDb();
  return getTable(db, 'users').find((user) => user.id === userId) || null;
}

async function authFromRequest(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.sub);
    return user ? { token, user } : null;
  } catch {
    return null;
  }
}

function requireAuth(handler) {
  return async (req, res) => {
    const auth = await authFromRequest(req);
    if (!auth) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }
    req.auth = auth;
    handler(req, res);
  };
}

function applyFilters(rows, filters = []) {
  return rows.filter((row) => filters.every((filter) => {
    const value = row[filter.column];
    switch (filter.op) {
      case 'eq': return value === filter.value;
      case 'neq': return value !== filter.value;
      case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
      case 'ilike': {
        if (typeof value !== 'string' || typeof filter.value !== 'string') return false;
        const pattern = filter.value.replace(/%/g, '').toLowerCase();
        return value.toLowerCase().includes(pattern);
      }
      case 'match':
        return Object.entries(filter.value || {}).every(([key, val]) => row[key] === val);
      case 'or': {
        const clauses = String(filter.value || '').split('),').map((part) => part.replace(/^and\(|\)$/g, ''));
        return clauses.some((clause) => {
          const conditions = clause.split(',').map((item) => item.trim()).filter(Boolean);
          return conditions.every((condition) => {
            const [field, op, ...rest] = condition.split('.');
            const expected = rest.join('.');
            if (op === 'eq') return String(row[field]) === expected;
            return false;
          });
        });
      }
      default:
        return true;
    }
  }));
}

function applyOrder(rows, orderBy) {
  if (!orderBy?.column) return rows;
  const direction = orderBy.ascending === false ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a?.[orderBy.column];
    const bv = b?.[orderBy.column];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? direction : -direction;
  });
}

function applyPaging(rows, range, limit) {
  if (Array.isArray(range) && range.length === 2) {
    const [from, to] = range;
    return rows.slice(from, to + 1);
  }
  if (typeof limit === 'number') {
    return rows.slice(0, limit);
  }
  return rows;
}

function enrichRow(table, row, db) {
  if (!row) return row;
  if (table === 'events') {
    const profile = getTable(db, 'profiles').find((profileRow) => profileRow.id === row.host_id || profileRow.id === row.organizer_id);
    return profile ? { ...row, profiles: profile } : row;
  }
  if (table === 'tickets') {
    const profile = getTable(db, 'profiles').find((profileRow) => profileRow.id === row.user_id);
    const event = getTable(db, 'events').find((eventRow) => eventRow.id === row.event_id);
    return { ...row, profiles: profile || null, events: event || null };
  }
  if (table === 'direct_messages') {
    const sender = getTable(db, 'profiles').find((profileRow) => profileRow.id === row.sender_id);
    return { ...row, sender: sender || null };
  }
  if (table === 'speakers') {
    const profile = getTable(db, 'profiles').find((profileRow) => profileRow.id === row.user_id);
    const event = getTable(db, 'events').find((eventRow) => eventRow.id === row.event_id);
    return { ...row, profiles: profile || null, events: event || null };
  }
  return row;
}

app.get('/api/health', async (_req, res) => {
  await ensureDb();
  res.json({ ok: true, timestamp: nowIso() });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, options = {} } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: { message: 'Email and password are required.' } });
    return;
  }

  const db = await readDb();
  const { user, error } = await createUserInDb(db, { email, password, options });
  if (error) {
    res.status(400).json({ error });
    return;
  }

  await writeDb(db);

  const token = signToken(user);
  res.json({ data: { user: sanitizeUser(user), session: { access_token: token, user: sanitizeUser(user) } }, error: null });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const db = await readDb();
  const users = getTable(db, 'users');
  const user = users.find((item) => item.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user) {
    res.status(400).json({ error: { message: 'Invalid email or password.' } });
    return;
  }

  const ok = await bcrypt.compare(password || '', user.password_hash || '');
  if (!ok) {
    res.status(400).json({ error: { message: 'Invalid email or password.' } });
    return;
  }

  const token = signToken(user);
  res.json({ data: { user: sanitizeUser(user), session: { access_token: token, user: sanitizeUser(user) } }, error: null });
});

app.post('/api/auth/signout', (_req, res) => {
  res.json({ data: { success: true }, error: null });
});

app.get('/api/auth/session', requireAuth(async (req, res) => {
  const user = sanitizeUser(req.auth.user);
  res.json({ data: { session: { access_token: req.auth.token, user } }, error: null });
}));

app.post('/api/auth/update-password', requireAuth(async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    res.status(400).json({ error: { message: 'Password must be at least 6 characters.' } });
    return;
  }
  const db = await readDb();
  const users = getTable(db, 'users');
  const index = users.findIndex((item) => item.id === req.auth.user.id);
  users[index] = { ...users[index], password_hash: await bcrypt.hash(password, 10), updated_at: nowIso() };
  await writeDb(db);
  res.json({ data: { user: sanitizeUser(users[index]) }, error: null });
}));

app.post('/api/auth/signin-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: { message: 'Email is required.' } });
    return;
  }
  const generatedPassword = createHash('sha256').update(`${email}:${Date.now()}`).digest('hex').slice(0, 16);
  const db = await readDb();
  const users = getTable(db, 'users');
  let existing = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!existing) {
    const created = await createUserInDb(db, {
      email,
      password: generatedPassword,
      options: { data: { role: 'Attendee', name: email.split('@')[0] } },
    });
    if (created.error) {
      res.status(400).json({ error: created.error });
      return;
    }
    await writeDb(db);
    existing = created.user;
  }

  const token = signToken(existing);
  res.json({ data: { user: sanitizeUser(existing), session: { access_token: token, user: sanitizeUser(existing) } }, error: null });
});

app.post('/api/auth/reset-password', (_req, res) => {
  res.json({ data: { sent: true }, error: null });
});

app.post('/api/query', async (req, res) => {
  const { table, action = 'select', values, selectOptions = {}, filters = [], orderBy, limit, range, single, maybeSingle } = req.body || {};
  if (!table) {
    res.status(400).json({ error: { message: 'Table is required.' } });
    return;
  }

  const db = await readDb();
  const rows = getTable(db, table);

  try {
    let data = null;
    let count = null;

    if (action === 'insert') {
      const records = (Array.isArray(values) ? values : [values]).filter(Boolean).map((record) => ensureRecord(record));
      rows.push(...records);
      await writeDb(db);
      data = records;
    }

    if (action === 'upsert') {
      const records = (Array.isArray(values) ? values : [values]).filter(Boolean);
      const upserted = records.map((record) => {
        const normalized = ensureRecord(record);
        const index = rows.findIndex((item) => item.id === normalized.id || (record?.event_id && item.event_id === record.event_id));
        if (index >= 0) {
          rows[index] = { ...rows[index], ...record, updated_at: nowIso() };
          return rows[index];
        }
        rows.push(normalized);
        return normalized;
      });
      await writeDb(db);
      data = upserted;
    }

    if (action === 'update') {
      const targetRows = applyFilters(rows, filters);
      data = targetRows.map((row) => {
        const index = rows.findIndex((item) => item.id === row.id);
        rows[index] = { ...rows[index], ...(values || {}), updated_at: nowIso() };
        return rows[index];
      });
      await writeDb(db);
    }

    if (action === 'delete') {
      const toDelete = applyFilters(rows, filters);
      const ids = new Set(toDelete.map((row) => row.id));
      data = toDelete;
      db[table] = rows.filter((row) => !ids.has(row.id));
      await writeDb(db);
    }

    if (action === 'select') {
      data = rows;
      if (selectOptions?.count === 'exact') {
        count = applyFilters(rows, filters).length;
      }
    }

    const filtered = applyFilters(Array.isArray(data) ? data : [data].filter(Boolean), filters)
      .map((row) => enrichRow(table, row, db));

    const ordered = applyOrder(filtered, orderBy);
    const paged = applyPaging(ordered, range, limit);

    let responseData = paged;
    if (single || maybeSingle) {
      responseData = paged[0] || null;
      if (single && !responseData) {
        res.status(406).json({ data: null, error: { message: 'Row not found' } });
        return;
      }
    }

    if (selectOptions?.head) {
      responseData = null;
    }

    res.json({ data: responseData, count, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

app.post('/api/rpc/:name', async (req, res) => {
  const { name } = req.params;
  const args = req.body || {};
  const db = await readDb();

  if (name === 'vote_qa') {
    const qas = getTable(db, 'qas');
    const qa = qas.find((item) => item.id === args.qa_id_to_vote);
    if (qa) qa.votes = Number(qa.votes || 0) + 1;
    await writeDb(db);
    res.json({ data: { success: true }, error: null });
    return;
  }

  if (name === 'vote_poll') {
    const polls = getTable(db, 'polls');
    const poll = polls.find((item) => item.id === args.poll_id_to_vote);
    if (poll?.options?.[args.option_index_to_vote]) {
      poll.options[args.option_index_to_vote].votes = Number(poll.options[args.option_index_to_vote].votes || 0) + 1;
      poll.updated_at = nowIso();
      await writeDb(db);
    }
    res.json({ data: { success: true }, error: null });
    return;
  }

  if (name === 'get_user_emails') {
    const userIds = args.user_ids || [];
    const profiles = getTable(db, 'profiles').filter((item) => userIds.includes(item.id));
    const data = profiles.map((profile) => ({ id: profile.id, email: profile.email }));
    res.json({ data, error: null });
    return;
  }

  if (name === 'get_conversations') {
    const messages = getTable(db, 'direct_messages');
    const profiles = getTable(db, 'profiles');
    const grouped = new Map();
    messages.forEach((message) => {
      const key = [message.sender_id, message.receiver_id].sort().join(':');
      const existing = grouped.get(key);
      if (!existing || new Date(message.created_at) > new Date(existing.last_message_at)) {
        grouped.set(key, {
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          last_message: message.content || '',
          last_message_at: message.created_at,
        });
      }
    });

    const data = Array.from(grouped.values()).map((conversation) => ({
      ...conversation,
      sender: profiles.find((profile) => profile.id === conversation.sender_id) || null,
      receiver: profiles.find((profile) => profile.id === conversation.receiver_id) || null,
    }));

    res.json({ data, error: null });
    return;
  }

  res.status(404).json({ data: null, error: { message: `RPC ${name} not found` } });
});

app.post('/api/functions/:name', requireAuth(async (req, res) => {
  const { name } = req.params;
  const payload = req.body || {};

  if (name === 'generate-ticket') {
    const ticketId = payload?.ticket?.id || payload?.ticket_id || randomUUID();
    res.json({ data: { ticket_url: `/tickets/${ticketId}`, ticket_id: ticketId }, error: null });
    return;
  }

  if (name === 'send-communication-email') {
    res.json({ data: { sent: true, queued_at: nowIso() }, error: null });
    return;
  }

  if (name === 'update-user-by-admin') {
    const db = await readDb();
    const users = getTable(db, 'users');
    const profiles = getTable(db, 'profiles');
    const userId = payload?.userId;
    const updates = payload?.updates || {};
    const userIndex = users.findIndex((item) => item.id === userId);
    const profileIndex = profiles.findIndex((item) => item.id === userId);

    if (userIndex >= 0 && updates.password) {
      users[userIndex].password_hash = await bcrypt.hash(String(updates.password), 10);
      users[userIndex].updated_at = nowIso();
    }
    if (profileIndex >= 0) {
      profiles[profileIndex] = { ...profiles[profileIndex], ...updates, updated_at: nowIso() };
    }

    await writeDb(db);
    res.json({ data: { success: true }, error: null });
    return;
  }

  res.status(404).json({ data: null, error: { message: `Function ${name} not found` } });
}));

app.post('/api/storage/upload', requireAuth(async (req, res) => {
  const { bucket, path: relativePath, content, fileName, contentType } = req.body || {};
  if (!bucket || !relativePath || !content) {
    res.status(400).json({ error: { message: 'bucket, path, and content are required.' } });
    return;
  }

  const bucketDir = path.join(uploadRoot, bucket);
  const destination = path.join(bucketDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });

  const base64 = String(content).includes(',') ? String(content).split(',').pop() : String(content);
  await fs.writeFile(destination, Buffer.from(base64, 'base64'));

  const publicUrl = `/uploads/${bucket}/${relativePath}`;
  res.json({ data: { path: relativePath, fileName, contentType, publicUrl }, error: null });
}));

app.get('/api/storage/public-url', (req, res) => {
  const { bucket, path: relativePath } = req.query;
  if (!bucket || !relativePath) {
    res.status(400).json({ error: { message: 'bucket and path are required.' } });
    return;
  }
  res.json({ data: { publicUrl: `/uploads/${bucket}/${relativePath}` }, error: null });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: { message: 'Internal server error.' } });
});

ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Eventhost API listening on http://localhost:${PORT}`);
  });
});
