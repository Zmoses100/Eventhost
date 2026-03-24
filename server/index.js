import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { rateLimit } from 'express-rate-limit';
import { ensureDb, readDb, writeDb, getTable, ensureRecord, sanitizeUser } from './lib/db.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const API_ORIGIN = process.env.API_ORIGIN || '*';
const uploadRoot = path.resolve(process.cwd(), 'server/uploads');
const distRoot = path.resolve(process.cwd(), 'dist');

app.use(cors({ origin: API_ORIGIN === '*' ? true : API_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(uploadRoot));

const nowIso = () => new Date().toISOString();

const signToken = (user) => jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

const EMAIL_SETTING_KEY = 'email_settings';
const EMAIL_DIAGNOSTIC_KEY = 'email_diagnostic';
const PLATFORM_SETTING_KEY = 'platform_settings';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
const EMAIL_ENCRYPTION_SECRET = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY || JWT_SECRET;
const EMAIL_ENCRYPTION_KEY = createHash('sha256').update(String(EMAIL_ENCRYPTION_SECRET)).digest();
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(['Attendee', 'Event Organizer', 'Speaker']);
const SUPER_ADMIN_ROLE = 'Super Admin';
const getBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};
const DEFAULT_EMAIL_SETTINGS = {
  enabled: getBool(process.env.EMAIL_ENABLED, false),
  queueEnabled: getBool(process.env.EMAIL_QUEUE_ENABLED, false),
  requireEmailVerification: getBool(process.env.AUTH_REQUIRE_EMAIL_VERIFICATION, true),
  allowUnverifiedLogin: getBool(process.env.AUTH_ALLOW_UNVERIFIED_LOGIN, true),
  mailer: process.env.MAIL_MAILER || 'smtp',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUsername: process.env.SMTP_USERNAME || '',
  smtpPasswordEncrypted: '',
  encryption: process.env.SMTP_ENCRYPTION || 'tls',
  fromEmail: process.env.MAIL_FROM_EMAIL || '',
  fromName: process.env.MAIL_FROM_NAME || 'Eventhost',
  replyToEmail: process.env.MAIL_REPLY_TO_EMAIL || '',
};
const DEFAULT_PLATFORM_SETTINGS = {
  platformName: 'EventHost',
  maintenanceMode: false,
  allowEventCreation: true,
  commissionRate: 5,
};

function encryptSecret(value) {
  if (!value) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', EMAIL_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(value) {
  if (!value || !String(value).includes(':')) return '';
  try {
    const [ivHex, tagHex, contentHex] = String(value).split(':');
    const decipher = createDecipheriv('aes-256-gcm', EMAIL_ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(contentHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

function getSetting(db, key) {
  return getTable(db, 'app_settings').find((row) => row.key === key)?.value ?? null;
}

function setSetting(db, key, value) {
  const settings = getTable(db, 'app_settings');
  const index = settings.findIndex((row) => row.key === key);
  const record = ensureRecord({ id: settings[index]?.id, key, value });
  if (index >= 0) settings[index] = record;
  else settings.push(record);
}

function getEmailSettings(db) {
  const stored = getSetting(db, EMAIL_SETTING_KEY) || {};
  const resolved = { ...DEFAULT_EMAIL_SETTINGS, ...stored, smtpPort: Number(stored.smtpPort || DEFAULT_EMAIL_SETTINGS.smtpPort || 587) };
  if (!resolved.smtpPasswordEncrypted && process.env.SMTP_PASSWORD) {
    resolved.smtpPasswordEncrypted = encryptSecret(process.env.SMTP_PASSWORD);
  }
  return resolved;
}

function getPlatformSettings(db) {
  const stored = getSetting(db, PLATFORM_SETTING_KEY) || {};
  return {
    platformName: (stored.platformName ? String(stored.platformName).trim() : '') || DEFAULT_PLATFORM_SETTINGS.platformName,
    maintenanceMode: stored.maintenanceMode === undefined ? DEFAULT_PLATFORM_SETTINGS.maintenanceMode : Boolean(stored.maintenanceMode),
    allowEventCreation: stored.allowEventCreation === undefined ? DEFAULT_PLATFORM_SETTINGS.allowEventCreation : Boolean(stored.allowEventCreation),
    commissionRate: Number.isFinite(Number(stored.commissionRate))
      ? Math.max(0, Math.min(100, Number(stored.commissionRate)))
      : DEFAULT_PLATFORM_SETTINGS.commissionRate,
  };
}

function sanitizeEmailSettings(settings) {
  const hasPassword = Boolean(settings.smtpPasswordEncrypted && decryptSecret(settings.smtpPasswordEncrypted));
  return {
    enabled: Boolean(settings.enabled),
    queueEnabled: Boolean(settings.queueEnabled),
    requireEmailVerification: Boolean(settings.requireEmailVerification),
    allowUnverifiedLogin: Boolean(settings.allowUnverifiedLogin),
    mailer: settings.mailer || 'smtp',
    smtpHost: settings.smtpHost || '',
    smtpPort: Number(settings.smtpPort || 587),
    smtpUsername: settings.smtpUsername || '',
    encryption: settings.encryption || 'tls',
    fromEmail: settings.fromEmail || '',
    fromName: settings.fromName || 'Eventhost',
    replyToEmail: settings.replyToEmail || '',
    hasSmtpPassword: hasPassword,
  };
}

function emailSettingsStatus(settings) {
  const issues = [];
  if (!settings.enabled) issues.push('Email sending is disabled.');
  if (settings.enabled && settings.mailer !== 'smtp') issues.push('Only SMTP mailer is currently supported.');
  if (settings.enabled && !settings.smtpHost) issues.push('SMTP host is required.');
  if (settings.enabled && !settings.smtpPort) issues.push('SMTP port is required.');
  if (settings.enabled && !settings.smtpUsername) issues.push('SMTP username is required.');
  if (settings.enabled && !decryptSecret(settings.smtpPasswordEncrypted)) issues.push('SMTP password is required.');
  if (settings.enabled && !settings.fromEmail) issues.push('From email is required.');
  return { configured: issues.length === 0, issues };
}

function isValidEmail(value) {
  return EMAIL_ADDRESS_PATTERN.test(String(value || '').trim());
}

function validateEmailSettingsInput(input) {
  const errors = [];
  if (input.mailer && input.mailer !== 'smtp') errors.push('Only SMTP mailer is supported.');
  if (input.encryption && !['tls', 'ssl', 'none'].includes(input.encryption)) errors.push('Encryption must be TLS, SSL, or none.');
  if (input.smtpPort && (!Number.isInteger(Number(input.smtpPort)) || Number(input.smtpPort) <= 0)) errors.push('SMTP port must be a valid positive number.');
  if (input.fromEmail && !isValidEmail(input.fromEmail)) errors.push('From email must be a valid email address.');
  if (input.replyToEmail && !isValidEmail(input.replyToEmail)) errors.push('Reply-to email must be a valid email address.');
  return errors;
}

function buildTransport(settings) {
  const status = emailSettingsStatus(settings);
  if (!status.configured) {
    throw new Error(status.issues.join(' '));
  }
  const secure = settings.encryption === 'ssl';
  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: Number(settings.smtpPort || 587),
    secure,
    auth: {
      user: settings.smtpUsername,
      pass: decryptSecret(settings.smtpPasswordEncrypted),
    },
  });
  return transport;
}

async function sendSystemEmail(db, payload) {
  const settings = getEmailSettings(db);
  if (!settings.enabled) {
    console.warn('[email] Skipped (disabled): to=%s subject=%s', payload.to, payload.subject);
    return { sent: false, skipped: true, reason: 'Email sending is disabled.' };
  }
  try {
    const transport = buildTransport(settings);
    const info = await transport.sendMail({
      from: settings.fromName ? `"${settings.fromName}" <${settings.fromEmail}>` : settings.fromEmail,
      replyTo: settings.replyToEmail || undefined,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    console.log('[email] Sent successfully: to=%s messageId=%s', payload.to, info.messageId);
    setSetting(db, EMAIL_DIAGNOSTIC_KEY, {
      lastSuccessAt: nowIso(),
      lastErrorAt: null,
      lastError: '',
    });
    return { sent: true, messageId: info.messageId };
  } catch (sendError) {
    console.error('[email] Send failed: to=%s error=%s', payload.to, sendError.message);
    markEmailFailure(db, sendError.message);
    throw sendError;
  }
}

function markEmailFailure(db, message) {
  console.error('[email]', message);
  const existing = getSetting(db, EMAIL_DIAGNOSTIC_KEY) || {};
  setSetting(db, EMAIL_DIAGNOSTIC_KEY, {
    ...existing,
    lastErrorAt: nowIso(),
    lastError: String(message || 'Unknown email error'),
  });
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function pruneEmailTokens(db) {
  const tokens = getTable(db, 'email_tokens');
  const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  db.email_tokens = tokens.filter((item) => {
    if (!item?.expires_at) return false;
    const expiresAt = new Date(item.expires_at).getTime();
    if (Number.isNaN(expiresAt)) return false;
    if (expiresAt < cutoff) return false;
    if (item.used_at && new Date(item.used_at).getTime() < cutoff) return false;
    return true;
  });
}

function createEmailToken(db, { userId, email, type, expiresMinutes }) {
  pruneEmailTokens(db);
  const rawToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
  const record = ensureRecord({
    user_id: userId,
    email,
    type,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt,
    used_at: null,
  });
  getTable(db, 'email_tokens').push(record);
  return { rawToken, record };
}

function consumeEmailToken(db, { token, type }) {
  pruneEmailTokens(db);
  const tokens = getTable(db, 'email_tokens');
  const tokenHash = hashToken(token);
  const match = tokens.find((item) => item.type === type && item.token_hash === tokenHash);
  if (!match) return { tokenRecord: null, error: { message: 'Invalid or expired token.' } };
  if (match.used_at) return { tokenRecord: null, error: { message: 'Token has already been used.' } };
  if (new Date(match.expires_at).getTime() < Date.now()) return { tokenRecord: null, error: { message: 'Token has expired.' } };
  match.used_at = nowIso();
  match.updated_at = nowIso();
  return { tokenRecord: match, error: null };
}

async function createUserInDb(db, { email, password, options = {}, emailConfirmedAt = null }) {
  const users = getTable(db, 'users');
  const profiles = getTable(db, 'profiles');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (users.some((existing) => existing.email.toLowerCase() === normalizedEmail)) {
    return { user: null, error: { message: 'Email already in use.' } };
  }

  const userId = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);
  const requestedRole = options?.data?.role || 'Attendee';
  const role = ALLOWED_ROLES.has(requestedRole) ? requestedRole : 'Attendee';
  const user = ensureRecord({ id: userId, email: normalizedEmail, role, password_hash, email_confirmed_at: emailConfirmedAt });
  users.push(user);

  const metadata = options?.data || {};
  profiles.push(ensureRecord({
    id: userId,
    email: normalizedEmail,
    role,
    name: metadata.name || normalizedEmail.split('@')[0],
    phone: metadata.phone || '',
    venue_name: metadata.venue_name || '',
    paypal_email: metadata.paypal_email || '',
    bank_transfer_details: metadata.bank_transfer_details || '',
    profile_picture_url: metadata.profile_picture_url || '',
  }));

  return { user, error: null };
}

async function hydrateEmailSettingsFromEnv() {
  if (!process.env.SMTP_PASSWORD) return;
  const db = await readDb();
  const current = getSetting(db, EMAIL_SETTING_KEY) || {};
  if (current.smtpPasswordEncrypted) return;
  setSetting(db, EMAIL_SETTING_KEY, {
    ...getEmailSettings(db),
    smtpPasswordEncrypted: encryptSecret(process.env.SMTP_PASSWORD),
  });
  await writeDb(db);
}

function getAuthPolicy(db) {
  const emailSettings = getEmailSettings(db);
  return {
    requireEmailVerification: Boolean(emailSettings.requireEmailVerification),
    allowUnverifiedLogin: Boolean(emailSettings.allowUnverifiedLogin),
    emailEnabled: Boolean(emailSettings.enabled),
  };
}

function canIssueSession(db, user) {
  const policy = getAuthPolicy(db);
  if (!policy.requireEmailVerification) return true;
  if (user?.email_confirmed_at) return true;
  return policy.allowUnverifiedLogin;
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

const adminEmailRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many requests. Please try again shortly.' } },
});

const spaRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.get('/api/health', async (_req, res) => {
  await ensureDb();
  res.json({ ok: true, timestamp: nowIso() });
});

app.get('/api/admin/email-settings', async (_req, res) => {
  const db = await readDb();
  const settings = getEmailSettings(db);
  const diagnostic = getSetting(db, EMAIL_DIAGNOSTIC_KEY) || null;
  res.json({
    data: {
      settings: sanitizeEmailSettings(settings),
      status: emailSettingsStatus(settings),
      diagnostic,
    },
    error: null,
  });
});

app.get('/api/admin/platform-settings', async (_req, res) => {
  const db = await readDb();
  res.json({
    data: {
      settings: getPlatformSettings(db),
    },
    error: null,
  });
});

app.put('/api/admin/platform-settings', adminEmailRateLimit, async (req, res) => {
  const db = await readDb();
  const current = getPlatformSettings(db);
  const input = req.body || {};
  const next = {
    platformName: input.platformName === undefined ? current.platformName : String(input.platformName || '').trim(),
    maintenanceMode: input.maintenanceMode === undefined ? current.maintenanceMode : Boolean(input.maintenanceMode),
    allowEventCreation: input.allowEventCreation === undefined ? current.allowEventCreation : Boolean(input.allowEventCreation),
    commissionRate: input.commissionRate === undefined ? current.commissionRate : Number(input.commissionRate),
  };

  if (!next.platformName) {
    res.status(400).json({ error: { message: 'Platform name is required.' } });
    return;
  }
  if (!Number.isFinite(next.commissionRate) || next.commissionRate < 0 || next.commissionRate > 100) {
    res.status(400).json({ error: { message: 'Commission rate must be a number between 0 and 100.' } });
    return;
  }

  setSetting(db, PLATFORM_SETTING_KEY, next);
  await writeDb(db);
  res.json({
    data: {
      settings: next,
      message: 'Platform settings saved successfully.',
    },
    error: null,
  });
});

app.put('/api/admin/email-settings', adminEmailRateLimit, async (req, res) => {
  const db = await readDb();
  const current = getEmailSettings(db);
  const input = req.body || {};
  const errors = validateEmailSettingsInput(input);
  if (errors.length > 0) {
    res.status(400).json({ error: { message: errors.join(' ') } });
    return;
  }

  const next = {
    ...current,
    enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
    queueEnabled: input.queueEnabled === undefined ? current.queueEnabled : Boolean(input.queueEnabled),
    requireEmailVerification: input.requireEmailVerification === undefined
      ? current.requireEmailVerification
      : Boolean(input.requireEmailVerification),
    allowUnverifiedLogin: input.allowUnverifiedLogin === undefined
      ? current.allowUnverifiedLogin
      : Boolean(input.allowUnverifiedLogin),
    mailer: input.mailer || current.mailer || 'smtp',
    smtpHost: input.smtpHost === undefined ? current.smtpHost : String(input.smtpHost || '').trim(),
    smtpPort: input.smtpPort === undefined ? current.smtpPort : Number(input.smtpPort),
    smtpUsername: input.smtpUsername === undefined ? current.smtpUsername : String(input.smtpUsername || '').trim(),
    encryption: input.encryption || current.encryption || 'tls',
    fromEmail: input.fromEmail === undefined ? current.fromEmail : String(input.fromEmail || '').trim(),
    fromName: input.fromName === undefined ? current.fromName : String(input.fromName || '').trim(),
    replyToEmail: input.replyToEmail === undefined ? current.replyToEmail : String(input.replyToEmail || '').trim(),
  };
  if (typeof input.smtpPassword === 'string') {
    if (input.smtpPassword.trim()) {
      next.smtpPasswordEncrypted = encryptSecret(input.smtpPassword.trim());
    } else if (input.clearSmtpPassword) {
      next.smtpPasswordEncrypted = '';
    }
  }

  if (next.enabled && (input.validateConnection ?? true)) {
    try {
      const transport = buildTransport(next);
      await transport.verify();
    } catch (verifyError) {
      markEmailFailure(db, verifyError.message);
      await writeDb(db);
      res.status(400).json({ error: { message: `SMTP validation failed: ${verifyError.message}` } });
      return;
    }
  }

  setSetting(db, EMAIL_SETTING_KEY, next);
  await writeDb(db);
  res.json({
    data: {
      settings: sanitizeEmailSettings(next),
      status: emailSettingsStatus(next),
      diagnostic: getSetting(db, EMAIL_DIAGNOSTIC_KEY) || null,
      message: 'Email settings saved successfully.',
    },
    error: null,
  });
});

app.post('/api/admin/email-settings/test', adminEmailRateLimit, async (req, res) => {
  const db = await readDb();
  const settings = getEmailSettings(db);
  const destination = String(req.body?.toEmail || settings.replyToEmail || settings.fromEmail || '').trim();
  if (!destination || !isValidEmail(destination)) {
    res.status(400).json({ error: { message: 'Please provide a valid destination email address for the test email.' } });
    return;
  }
  try {
    const result = await sendSystemEmail(db, {
      to: destination,
      subject: 'Eventhost email test',
      text: `Test email sent at ${nowIso()}.`,
      html: `<p>Test email sent successfully at ${nowIso()}.</p>`,
    });
    await writeDb(db);
    if (!result.sent) {
      res.status(400).json({ error: { message: result.reason || 'Test email was not sent.' } });
      return;
    }
    res.json({ data: { sent: true, message: `Test email sent to ${destination}.` }, error: null });
  } catch (error) {
    markEmailFailure(db, error.message);
    await writeDb(db);
    res.status(500).json({ error: { message: `Test email failed: ${error.message}` } });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, options = {} } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    res.status(400).json({ error: { message: 'Email and password are required.' } });
    return;
  }
  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({ error: { message: 'Please enter a valid email address.' } });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: { message: 'Password must be at least 6 characters.' } });
    return;
  }

  const db = await readDb();
  const policy = getAuthPolicy(db);
  const emailConfirmedAt = policy.requireEmailVerification ? null : nowIso();
  const { user, error } = await createUserInDb(db, { email: normalizedEmail, password, options, emailConfirmedAt });
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const responseMeta = {
    requires_email_verification: policy.requireEmailVerification,
    email_enabled: policy.emailEnabled,
    verification_email_sent: false,
    warnings: [],
  };

  if (policy.requireEmailVerification && policy.emailEnabled) {
    try {
      const { rawToken } = createEmailToken(db, {
        userId: user.id,
        email: user.email,
        type: 'verify_email',
        expiresMinutes: 60 * 24,
      });
      const verifyUrl = `${APP_BASE_URL}/auth?verify_token=${rawToken}&tab=login`;
      const sendResult = await sendSystemEmail(db, {
        to: user.email,
        subject: 'Verify your Eventhost account',
        text: `Welcome to Eventhost! Verify your account by visiting: ${verifyUrl}`,
        html: `<p>Welcome to Eventhost!</p><p>Please verify your account by clicking this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      });
      responseMeta.verification_email_sent = Boolean(sendResult.sent);
      if (!sendResult.sent) {
        responseMeta.warnings.push(sendResult.reason || 'Verification email could not be sent.');
      }
    } catch (sendError) {
      markEmailFailure(db, sendError.message);
      responseMeta.warnings.push('Verification email failed to send. Please contact support.');
    }
  } else if (policy.requireEmailVerification && !policy.emailEnabled) {
    markEmailFailure(db, 'Verification is required but email sending is disabled.');
    responseMeta.warnings.push('Account verification email is unavailable because email sending is disabled.');
  } else if (policy.emailEnabled) {
    try {
      await sendSystemEmail(db, {
        to: user.email,
        subject: 'Welcome to Eventhost',
        text: 'Your account has been created successfully.',
        html: '<p>Your Eventhost account has been created successfully.</p>',
      });
    } catch (sendError) {
      markEmailFailure(db, sendError.message);
      responseMeta.warnings.push('Welcome email could not be sent.');
    }
  }

  await writeDb(db);

  const safeUser = sanitizeUser(user);
  const shouldCreateSession = canIssueSession(db, user);
  const session = shouldCreateSession ? { access_token: signToken(user), user: safeUser } : null;
  res.json({ data: { user: safeUser, session, meta: responseMeta }, error: null });
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

  const policy = getAuthPolicy(db);
  if (policy.requireEmailVerification && !policy.allowUnverifiedLogin && !user.email_confirmed_at) {
    res.status(403).json({
      error: {
        message: 'Your email is not verified yet. Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      },
    });
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
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    res.status(400).json({ error: { message: 'Email is required.' } });
    return;
  }
  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({ error: { message: 'Please enter a valid email address.' } });
    return;
  }
  const generatedPassword = createHash('sha256').update(`${normalizedEmail}:${Date.now()}`).digest('hex').slice(0, 16);
  const db = await readDb();
  const policy = getAuthPolicy(db);
  const users = getTable(db, 'users');
  let existing = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!existing) {
    const created = await createUserInDb(db, {
      email: normalizedEmail,
      password: generatedPassword,
      options: { data: { role: 'Attendee', name: normalizedEmail.split('@')[0] } },
      emailConfirmedAt: policy.requireEmailVerification ? null : nowIso(),
    });
    if (created.error) {
      res.status(400).json({ error: created.error });
      return;
    }
    existing = created.user;
  }

  if (policy.emailEnabled) {
    try {
      const { rawToken } = createEmailToken(db, {
        userId: existing.id,
        email: existing.email,
        type: 'verify_email',
        expiresMinutes: 60,
      });
      const magicLink = `${APP_BASE_URL}/auth?verify_token=${rawToken}&tab=login`;
      await sendSystemEmail(db, {
        to: existing.email,
        subject: 'Your Eventhost sign-in link',
        text: `Use this link to verify and sign in: ${magicLink}`,
        html: `<p>Use this link to verify and sign in:</p><p><a href="${magicLink}">${magicLink}</a></p>`,
      });
    } catch (sendError) {
      markEmailFailure(db, sendError.message);
    }
  } else {
    markEmailFailure(db, 'OTP sign-in requested while email sending is disabled.');
  }

  await writeDb(db);

  const safeUser = sanitizeUser(existing);
  const session = canIssueSession(db, existing) ? { access_token: signToken(existing), user: safeUser } : null;
  res.json({
    data: {
      user: safeUser,
      session,
      message: policy.emailEnabled
        ? 'If this email exists, a sign-in link has been sent.'
        : 'Email delivery is disabled. Please use password login or contact support.',
    },
    error: null,
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  const db = await readDb();
  const users = getTable(db, 'users');
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  const settings = getEmailSettings(db);
  let diagnostic = null;

  if (user && settings.enabled) {
    try {
      const { rawToken } = createEmailToken(db, {
        userId: user.id,
        email: user.email,
        type: 'password_reset',
        expiresMinutes: 30,
      });
      const resetUrl = `${APP_BASE_URL}/auth?tab=login&reset_token=${rawToken}`;
      await sendSystemEmail(db, {
        to: user.email,
        subject: 'Reset your Eventhost password',
        text: `Reset your password by visiting: ${resetUrl}`,
        html: `<p>Reset your password by clicking:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (sendError) {
      diagnostic = 'Password reset email could not be sent. Please contact support.';
      markEmailFailure(db, sendError.message);
    }
  } else if (user && !settings.enabled) {
    diagnostic = 'Password reset is currently unavailable because email sending is disabled.';
    markEmailFailure(db, 'Password reset requested while email sending is disabled.');
  }

  await writeDb(db);
  res.json({
    data: {
      sent: true,
      message: 'If an account exists for this email, a reset email will be sent.',
      diagnostic,
    },
    error: null,
  });
});

app.post('/api/auth/complete-password-reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 6) {
    res.status(400).json({ error: { message: 'A valid token and a password (minimum 6 characters) are required.' } });
    return;
  }
  const db = await readDb();
  const { tokenRecord, error } = consumeEmailToken(db, { token, type: 'password_reset' });
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const users = getTable(db, 'users');
  const userIndex = users.findIndex((item) => item.id === tokenRecord.user_id);
  if (userIndex < 0) {
    res.status(400).json({ error: { message: 'Invalid token user.' } });
    return;
  }
  users[userIndex].password_hash = await bcrypt.hash(String(password), 10);
  users[userIndex].updated_at = nowIso();
  await writeDb(db);
  res.json({ data: { success: true }, error: null });
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    res.status(400).json({ error: { message: 'Verification token is required.' } });
    return;
  }
  const db = await readDb();
  const { tokenRecord, error } = consumeEmailToken(db, { token, type: 'verify_email' });
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const users = getTable(db, 'users');
  const userIndex = users.findIndex((item) => item.id === tokenRecord.user_id);
  if (userIndex < 0) {
    res.status(400).json({ error: { message: 'User not found for this verification token.' } });
    return;
  }
  users[userIndex].email_confirmed_at = nowIso();
  users[userIndex].updated_at = nowIso();
  await writeDb(db);
  const safeUser = sanitizeUser(users[userIndex]);
  res.json({ data: { user: safeUser, session: { access_token: signToken(users[userIndex]), user: safeUser } }, error: null });
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    res.status(400).json({ error: { message: 'A valid email is required.' } });
    return;
  }
  const db = await readDb();
  const users = getTable(db, 'users');
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  const settings = getEmailSettings(db);

  if (!user || user.email_confirmed_at) {
    res.json({ data: { sent: true, message: 'If your account is pending verification, a new email has been sent.' }, error: null });
    return;
  }

  if (!settings.enabled) {
    markEmailFailure(db, 'Resend verification requested while email sending is disabled.');
    await writeDb(db);
    res.status(400).json({ error: { message: 'Email sending is disabled. Contact an administrator.' } });
    return;
  }

  try {
    const { rawToken } = createEmailToken(db, {
      userId: user.id,
      email: user.email,
      type: 'verify_email',
      expiresMinutes: 60 * 24,
    });
    const verifyUrl = `${APP_BASE_URL}/auth?verify_token=${rawToken}&tab=login`;
    await sendSystemEmail(db, {
      to: user.email,
      subject: 'Verify your Eventhost account',
      text: `Verify your account by visiting: ${verifyUrl}`,
      html: `<p>Verify your account by clicking this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    await writeDb(db);
    res.json({ data: { sent: true, message: 'Verification email sent.' }, error: null });
  } catch (sendError) {
    markEmailFailure(db, sendError.message);
    await writeDb(db);
    res.status(500).json({ error: { message: 'Could not send verification email. Please try again later.' } });
  }
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
    const db = await readDb();
    const destination = String(payload?.to || payload?.email || '').trim();
    const subject = String(payload?.subject || 'Eventhost notification').trim();
    const text = String(payload?.text || payload?.message || '').trim();
    const html = payload?.html ? String(payload.html) : undefined;
    if (!destination || !isValidEmail(destination)) {
      res.status(400).json({ error: { message: 'A valid destination email is required.' } });
      return;
    }
    if (!subject || !text) {
      res.status(400).json({ error: { message: 'Email subject and text are required.' } });
      return;
    }
    try {
      const sendResult = await sendSystemEmail(db, { to: destination, subject, text, html });
      await writeDb(db);
      if (!sendResult.sent) {
        res.status(400).json({ error: { message: sendResult.reason || 'Email sending is disabled.' } });
        return;
      }
      res.json({ data: { sent: true, queued_at: nowIso(), messageId: sendResult.messageId }, error: null });
    } catch (error) {
      markEmailFailure(db, error.message);
      await writeDb(db);
      res.status(500).json({ error: { message: `Unable to send email: ${error.message}` } });
    }
    return;
  }

  if (name === 'update-user-by-admin') {
    const db = await readDb();
    const callerProfile = getTable(db, 'profiles').find((p) => p.id === req.auth.user.id);
    if (!callerProfile || callerProfile.role !== SUPER_ADMIN_ROLE) {
      res.status(403).json({ error: { message: 'Only super administrators can update other users.' } });
      return;
    }
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

  const safeBucket = path.basename(bucket);
  const bucketDir = path.resolve(uploadRoot, safeBucket);
  const destination = path.resolve(bucketDir, path.normalize(relativePath));
  if (!destination.startsWith(bucketDir)) {
    res.status(400).json({ error: { message: 'Invalid file path.' } });
    return;
  }
  const safePath = path.relative(bucketDir, destination).split(path.sep).join('/');

  await fs.mkdir(path.dirname(destination), { recursive: true });

  const base64 = String(content).includes(',') ? String(content).split(',').pop() : String(content);
  await fs.writeFile(destination, Buffer.from(base64, 'base64'));

  const publicUrl = `/uploads/${safeBucket}/${safePath}`;
  res.json({ data: { path: safePath, fileName, contentType, publicUrl }, error: null });
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

// Serve the built frontend in production
if (fsSync.existsSync(distRoot)) {
  app.use(express.static(distRoot));
  app.get(/^(?!\/api|\/uploads)/, spaRateLimit, (_req, res) => {
    res.sendFile(path.join(distRoot, 'index.html'));
  });
}

ensureDb().then(async () => {
  await hydrateEmailSettingsFromEnv();
  app.listen(PORT, () => {
    console.log(`Eventhost API listening on http://localhost:${PORT}`);
  });
});
