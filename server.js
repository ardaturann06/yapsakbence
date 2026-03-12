const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean)
);
const FIRST_USER_IS_ADMIN = process.env.FIRST_USER_IS_ADMIN !== '0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];
const ALLOWED_RECURRENCE_RULES = ['none', 'daily', 'weekly', 'monthly'];
const MAX_TAG_COUNT = 8;
const MAX_TAG_LENGTH = 24;
const MAX_BACKUP_ITEMS = 2000;
const MAX_NOTE_LENGTH = 2000;

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(uploadsDir);

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const imageMimeToExt = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const attachmentMimeToExt = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/json': '.json',
  'text/csv': '.csv',
  ...imageMimeToExt
};

function makeUploadStorage(fileExtResolver) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = fileExtResolver(file) || path.extname(file.originalname || '') || '.bin';
      const safeExt = String(ext || '.bin').toLowerCase().slice(0, 12) || '.bin';
      const fileName = `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
      cb(null, fileName);
    }
  });
}

const profilePhotoUpload = multer({
  storage: makeUploadStorage((file) => imageMimeToExt[file.mimetype]),
  fileFilter: (_req, file, cb) => {
    if (!imageMimeToExt[file.mimetype]) {
      cb(new Error('INVALID_IMAGE_TYPE'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES
  }
});

const taskUpload = multer({
  storage: makeUploadStorage((file) => {
    if (file.fieldname === 'photo') {
      return imageMimeToExt[file.mimetype];
    }
    if (file.fieldname === 'attachment') {
      return attachmentMimeToExt[file.mimetype];
    }
    return '.bin';
  }),
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'photo') {
      if (!imageMimeToExt[file.mimetype]) {
        cb(new Error('INVALID_IMAGE_TYPE'));
        return;
      }
      cb(null, true);
      return;
    }

    if (file.fieldname === 'attachment') {
      if (!attachmentMimeToExt[file.mimetype]) {
        cb(new Error('INVALID_ATTACHMENT_TYPE'));
        return;
      }
      cb(null, true);
      return;
    }

    cb(new Error('INVALID_UPLOAD_FIELD'));
  },
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: 2
  }
});

const taskUploadFields = taskUpload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'attachment', maxCount: 1 }
]);

// PostgreSQL yardımcı fonksiyonlar
async function run(sql, params = []) {
  // SQLite'daki ? yerine PostgreSQL'de $1, $2 kullan
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, params);
  return { lastID: result.rows[0]?.id, changes: result.rowCount };
}

async function all(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, params);
  return result.rows;
}

async function get(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, params);
  return result.rows[0] || null;
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      profile_image_url TEXT,
      nickname TEXT,
      is_admin INTEGER DEFAULT 0,
      password_hash TEXT NOT NULL,
      shared_group_id INTEGER,
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_groups (
      id SERIAL PRIMARY KEY,
      owner_user_id INTEGER NOT NULL UNIQUE,
      share_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_shared_groups_share_code ON shared_groups(share_code)'
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      image_url TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_mime TEXT,
      note_text TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      tags_json TEXT NOT NULL DEFAULT '[]',
      recurrence_rule TEXT NOT NULL DEFAULT 'none',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    )
  `);

  await pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS attachment_url TEXT');
  await pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS attachment_name TEXT');
  await pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS attachment_mime TEXT');
  await pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS note_text TEXT');
  await pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_time TEXT');

  await pool.query('CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_todos_user_sort_order ON todos(user_id, sort_order DESC)');
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function isAdminUser(user) {
  if (!user) return false;
  if (user.is_admin === 1 || user.is_admin === true) return true;
  const normalizedEmail = normalizeEmail(user.email);
  if (ADMIN_EMAILS.has(normalizedEmail)) return true;
  if (FIRST_USER_IS_ADMIN && Number(user.id) === 1) return true;
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname || null,
    email: user.email,
    profile_image_url: user.profile_image_url || null,
    is_admin: isAdminUser(user),
    created_at: user.created_at
  };
}

function transformTodo(row) {
  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    completed_at: row.completed_at || null,
    image_url: row.image_url || null,
    attachment_url: row.attachment_url || null,
    attachment_name: row.attachment_name || null,
    attachment_mime: row.attachment_mime || null,
    note: row.note_text || null,
    due_date: row.due_date || null,
    due_time: row.due_time || null,
    priority: ALLOWED_PRIORITIES.includes(row.priority) ? row.priority : 'medium',
    tags: parseStoredTags(row.tags_json),
    recurrence: ALLOWED_RECURRENCE_RULES.includes(row.recurrence_rule) ? row.recurrence_rule : 'none',
    sort_order: Number.isInteger(row.sort_order) ? row.sort_order : 0,
    created_at: row.created_at
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

function parseBooleanInput(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true' || lowered === '1') return true;
    if (lowered === 'false' || lowered === '0') return false;
  }
  return undefined;
}

function parseDueDateInput(value) {
  if (value === undefined) return { provided: false, value: null };
  if (value === null) return { provided: true, value: null };
  const dateText = String(value).trim();
  if (!dateText) return { provided: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return { provided: true, error: 'due_date alani YYYY-AA-GG formatinda olmali.' };
  }
  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateText) {
    return { provided: true, error: 'Gecersiz due_date degeri gonderildi.' };
  }
  return { provided: true, value: dateText };
}

function parseDueTimeInput(value) {
  if (value === undefined) return { provided: false, value: null };
  if (value === null) return { provided: true, value: null };
  const timeText = String(value).trim();
  if (!timeText) return { provided: true, value: null };
  if (!/^\d{2}:\d{2}$/.test(timeText)) {
    return { provided: true, error: 'due_time alani HH:MM formatinda olmali.' };
  }
  const [hourText, minuteText] = timeText.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { provided: true, error: 'due_time degeri 00:00 - 23:59 araliginda olmali.' };
  }
  return { provided: true, value: timeText };
}

function parseNoteInput(value) {
  if (value === undefined) return { provided: false, value: null };
  if (value === null) return { provided: true, value: null };
  const noteText = String(value).trim();
  if (!noteText) return { provided: true, value: null };
  if (noteText.length > MAX_NOTE_LENGTH) {
    return { provided: true, error: `note alani en fazla ${MAX_NOTE_LENGTH} karakter olabilir.` };
  }
  return { provided: true, value: noteText };
}

function parsePriorityInput(value) {
  if (value === undefined) return { provided: false, value: null };
  if (value === null) return { provided: true, error: 'priority alani bos olamaz.' };
  const normalized = String(value).trim().toLowerCase();
  if (!ALLOWED_PRIORITIES.includes(normalized)) {
    return { provided: true, error: 'priority alani low, medium veya high olmali.' };
  }
  return { provided: true, value: normalized };
}

function parseRecurrenceInput(value) {
  if (value === undefined) return { provided: false, value: null };
  if (value === null) return { provided: true, error: 'recurrence alani bos olamaz.' };
  const normalized = String(value).trim().toLowerCase();
  if (!ALLOWED_RECURRENCE_RULES.includes(normalized)) {
    return { provided: true, error: 'recurrence alani none, daily, weekly veya monthly olmali.' };
  }
  return { provided: true, value: normalized };
}

function addDaysToDateText(dateText, days) {
  const baseDate = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(baseDate.getTime())) return null;
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return baseDate.toISOString().slice(0, 10);
}

function addMonthsToDateText(dateText, months) {
  const parts = String(dateText || '').split('-').map((part) => Number(part));
  const [year, month, day] = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const baseMonthIndex = month - 1;
  const targetMonthIndex = baseMonthIndex + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  const result = new Date(Date.UTC(targetYear, normalizedTargetMonth, clampedDay));
  return result.toISOString().slice(0, 10);
}

function computeNextDueDate(currentDueDate, recurrenceRule) {
  if (!currentDueDate || recurrenceRule === 'none') return null;
  if (recurrenceRule === 'daily') return addDaysToDateText(currentDueDate, 1);
  if (recurrenceRule === 'weekly') return addDaysToDateText(currentDueDate, 7);
  if (recurrenceRule === 'monthly') return addMonthsToDateText(currentDueDate, 1);
  return null;
}

function normalizeTagList(list) {
  const normalized = [];
  const seen = new Set();
  for (const entry of list) {
    const tag = String(entry || '').trim().replace(/\s+/g, ' ');
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) {
      return { ok: false, error: `Her etiket en fazla ${MAX_TAG_LENGTH} karakter olabilir.` };
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
    if (normalized.length > MAX_TAG_COUNT) {
      return { ok: false, error: `En fazla ${MAX_TAG_COUNT} etiket ekleyebilirsin.` };
    }
  }
  return { ok: true, value: normalized };
}

function parseTagsInput(value) {
  if (value === undefined) return { provided: false, value: [] };
  let source = value;
  if (source === null) source = [];
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) {
      source = [];
    } else if (trimmed.startsWith('[')) {
      try { source = JSON.parse(trimmed); } catch (_error) {
        return { provided: true, error: 'tags alani gecerli bir dizi olmali.' };
      }
    } else {
      source = trimmed.split(',');
    }
  }
  if (!Array.isArray(source)) return { provided: true, error: 'tags alani dizi formatinda olmali.' };
  const normalized = normalizeTagList(source);
  if (!normalized.ok) return { provided: true, error: normalized.error };
  return { provided: true, value: normalized.value };
}

function parseStoredTags(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    const normalized = normalizeTagList(parsed);
    return normalized.ok ? normalized.value : [];
  } catch (_error) {
    return [];
  }
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getLocalIpv4Addresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  Object.values(interfaces).forEach((items) => {
    (items || []).forEach((item) => {
      if (!item || item.family !== 'IPv4' || item.internal) return;
      ips.push(item.address);
    });
  });
  return Array.from(new Set(ips));
}

async function deleteUploadedImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/')) return;
  const fileName = path.basename(imageUrl);
  const absPath = path.join(uploadsDir, fileName);
  try { await fs.promises.unlink(absPath); } catch (_error) {}
}

function getUploadedFieldFile(req, fieldName) {
  const fileEntry = req.files && req.files[fieldName];
  if (!Array.isArray(fileEntry) || fileEntry.length === 0) return null;
  return fileEntry[0] || null;
}

function getTaskUploadedAssets(req) {
  const photo = getUploadedFieldFile(req, 'photo');
  const attachment = getUploadedFieldFile(req, 'attachment');
  return {
    photo,
    attachment,
    photoUrl: photo ? `/uploads/${photo.filename}` : null,
    attachmentUrl: attachment ? `/uploads/${attachment.filename}` : null
  };
}

async function cleanupTaskUploads(req) {
  const { photoUrl, attachmentUrl } = getTaskUploadedAssets(req);
  if (photoUrl) await deleteUploadedImage(photoUrl);
  if (attachmentUrl) await deleteUploadedImage(attachmentUrl);
}

function getTodoAssetUrls(row) {
  const urls = [];
  if (row?.image_url) urls.push(row.image_url);
  if (row?.attachment_url) urls.push(row.attachment_url);
  return urls.filter((url, idx, list) => list.indexOf(url) === idx);
}

async function requireAuth(req, res, next) {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Oturum gerekli.' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ error: 'Gecersiz oturum.' });
      return;
    }
    const user = await get(
      'SELECT id, name, nickname, email, profile_image_url, is_admin, created_at, shared_group_id FROM users WHERE id = ?',
      [userId]
    );
    if (!user) {
      res.status(401).json({ error: 'Kullanici bulunamadi.' });
      return;
    }
    req.user = user;
    if (user.shared_group_id) {
      const group = await get('SELECT owner_user_id FROM shared_groups WHERE id = ?', [user.shared_group_id]);
      req.effectiveUserId = group ? group.owner_user_id : user.id;
    } else {
      req.effectiveUserId = user.id;
    }
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Oturum suresi dolmus veya gecersiz.', details: _error.message });
  }
}

function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) {
    res.status(403).json({ error: 'Bu islem icin yonetici yetkisi gerekli.' });
    return;
  }
  next();
}

app.use(express.json());
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true, date: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const nickname = String(req.body?.nickname || '').trim();
    const password = String(req.body?.password || '');

    if (name.length < 2 || name.length > 60) { res.status(400).json({ error: 'Ad 2-60 karakter olmali.' }); return; }
    if (nickname.length > 30) { res.status(400).json({ error: 'Takma ad en fazla 30 karakter olabilir.' }); return; }
    if (!isValidEmail(email)) { res.status(400).json({ error: 'Gecerli bir e-posta girin.' }); return; }
    if (password.length < 6) { res.status(400).json({ error: 'Sifre en az 6 karakter olmali.' }); return; }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) { res.status(409).json({ error: 'Bu e-posta zaten kayitli.' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);

    // PostgreSQL RETURNING kullanarak lastID al
    let i = 0;
    const insertSql = 'INSERT INTO users (name, nickname, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id';
    const insertResult = await pool.query(insertSql, [name, nickname || null, email, passwordHash]);
    const newId = insertResult.rows[0].id;

    const user = await get(
      'SELECT id, name, nickname, email, profile_image_url, is_admin, created_at FROM users WHERE id = ?',
      [newId]
    );
    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (_error) {
    res.status(500).json({ error: 'Kayit islemi basarisiz.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!isValidEmail(email) || !password) { res.status(400).json({ error: 'E-posta ve sifre gerekli.' }); return; }

    const userWithHash = await get(
      'SELECT id, name, nickname, email, profile_image_url, is_admin, password_hash, created_at FROM users WHERE email = ?',
      [email]
    );
    if (!userWithHash) { res.status(401).json({ error: 'E-posta veya sifre hatali.' }); return; }

    const valid = await bcrypt.compare(password, userWithHash.password_hash);
    if (!valid) { res.status(401).json({ error: 'E-posta veya sifre hatali.' }); return; }

    const token = signToken(userWithHash);
    res.json({ token, user: sanitizeUser(userWithHash) });
  } catch (_error) {
    res.status(500).json({ error: 'Giris islemi basarisiz.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.patch('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const nickname = String(req.body?.nickname || '').trim();
    if (name.length < 2 || name.length > 60) { res.status(400).json({ error: 'Ad 2-60 karakter olmali.' }); return; }
    if (nickname.length > 30) { res.status(400).json({ error: 'Takma ad en fazla 30 karakter olabilir.' }); return; }

    await run('UPDATE users SET name = ?, nickname = ? WHERE id = ?', [name, nickname || null, req.user.id]);
    const updatedUser = await get(
      'SELECT id, name, nickname, email, profile_image_url, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (_error) {
    res.status(500).json({ error: 'Profil guncellenemedi.' });
  }
});

app.patch('/api/auth/profile-photo', requireAuth, profilePhotoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Profil fotografi secilmedi.' }); return; }
    const newImageUrl = `/uploads/${req.file.filename}`;
    await run('UPDATE users SET profile_image_url = ? WHERE id = ?', [newImageUrl, req.user.id]);
    const updatedUser = await get(
      'SELECT id, name, nickname, email, profile_image_url, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (req.user.profile_image_url && req.user.profile_image_url !== newImageUrl) {
      await deleteUploadedImage(req.user.profile_image_url);
    }
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (_error) {
    if (req.file) await deleteUploadedImage(`/uploads/${req.file.filename}`);
    res.status(500).json({ error: 'Profil fotografi guncellenemedi.' });
  }
});

app.delete('/api/auth/profile-photo', requireAuth, async (req, res) => {
  try {
    const existingUser = await get('SELECT profile_image_url FROM users WHERE id = ?', [req.user.id]);
    if (existingUser?.profile_image_url) {
      await run('UPDATE users SET profile_image_url = NULL WHERE id = ?', [req.user.id]);
      await deleteUploadedImage(existingUser.profile_image_url);
    }
    const updatedUser = await get(
      'SELECT id, name, nickname, email, profile_image_url, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (_error) {
    res.status(500).json({ error: 'Profil fotografi silinemedi.' });
  }
});

app.get('/api/admin/summary', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const usersRow = await get('SELECT COUNT(*) AS count FROM users');
    const todosRow = await get('SELECT COUNT(*) AS count FROM todos');
    const doneRow = await get('SELECT COUNT(*) AS count FROM todos WHERE completed = 1');
    const withPhotoRow = await get('SELECT COUNT(*) AS count FROM todos WHERE image_url IS NOT NULL');
    const totalTodos = Number(todosRow?.count || 0);
    const completedTodos = Number(doneRow?.count || 0);
    res.json({
      users: Number(usersRow?.count || 0),
      todos: totalTodos,
      completed_todos: completedTodos,
      active_todos: Math.max(totalTodos - completedTodos, 0),
      todos_with_photo: Number(withPhotoRow?.count || 0)
    });
  } catch (_error) {
    res.status(500).json({ error: 'Yonetim ozeti alinamadi.' });
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rawLimit = Number(req.query?.limit || 100);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;
    const rows = await all(
      `SELECT u.id, u.name, u.nickname, u.email, u.profile_image_url, u.is_admin, u.created_at,
        (SELECT COUNT(*) FROM todos t WHERE t.user_id = u.id) AS todo_count,
        (SELECT COUNT(*) FROM todos t WHERE t.user_id = u.id AND t.completed = 1) AS completed_count
       FROM users u ORDER BY u.id DESC LIMIT ?`,
      [limit]
    );
    res.json(rows.map((row) => ({
      id: row.id, name: row.name, nickname: row.nickname || null, email: row.email,
      profile_image_url: row.profile_image_url || null, is_admin: isAdminUser(row),
      todo_count: Number(row.todo_count || 0), completed_count: Number(row.completed_count || 0),
      created_at: row.created_at
    })));
  } catch (_error) {
    res.status(500).json({ error: 'Kullanici listesi alinamadi.' });
  }
});

app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz kullanici id.' }); return; }
    if (id === Number(req.user.id)) { res.status(400).json({ error: 'Kendi rolunu degistiremezsin.' }); return; }
    const isAdmin = parseBooleanInput(req.body.is_admin);
    if (isAdmin === undefined) { res.status(400).json({ error: 'is_admin degeri gerekli.' }); return; }
    const existing = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) { res.status(404).json({ error: 'Kullanici bulunamadi.' }); return; }
    await run('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, id]);
    res.json({ id, is_admin: isAdmin });
  } catch (_error) {
    res.status(500).json({ error: 'Kullanici rolu guncellenemedi.' });
  }
});

app.patch('/api/admin/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz kullanici id.' }); return; }
    const password = String(req.body?.password || '');
    if (password.length < 6) { res.status(400).json({ error: 'Yeni sifre en az 6 karakter olmali.' }); return; }
    const existing = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) { res.status(404).json({ error: 'Kullanici bulunamadi.' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    res.json({ success: true, message: 'Sifre guncellendi.' });
  } catch (_error) {
    res.status(500).json({ error: 'Sifre sifirlanamadi.' });
  }
});

app.get('/api/admin/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rawLimit = Number(req.query?.limit || 100);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;
    const rows = await all(
      `SELECT l.id, l.actor_id, l.action_type, l.details_json, l.created_at,
        u.name AS actor_name, u.nickname AS actor_nickname, u.email AS actor_email
       FROM logs l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.id DESC LIMIT ?`,
      [limit]
    );
    res.json(rows.map((row) => ({
      id: row.id, action_type: row.action_type,
      details: row.details_json ? JSON.parse(row.details_json) : null,
      created_at: row.created_at,
      actor: { id: row.actor_id, name: row.actor_name || 'Bilinmeyen', nickname: row.actor_nickname || null, email: row.actor_email || '-' }
    })));
  } catch (_error) {
    res.status(500).json({ error: 'Loglar alinamadi.' });
  }
});

app.delete('/api/admin/users/:id/todos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz kullanici id.' }); return; }
    const existingUser = await get('SELECT id, name FROM users WHERE id = ?', [id]);
    if (!existingUser) { res.status(404).json({ error: 'Kullanici bulunamadi.' }); return; }
    const todoUploads = await all(
      `
        SELECT image_url, attachment_url
        FROM todos
        WHERE user_id = ?
          AND (
            (image_url IS NOT NULL AND TRIM(image_url) <> '')
            OR (attachment_url IS NOT NULL AND TRIM(attachment_url) <> '')
          )
      `,
      [id]
    );
    const deleted = await run('DELETE FROM todos WHERE user_id = ?', [id]);
    for (const row of todoUploads) {
      for (const url of getTodoAssetUrls(row)) {
        await deleteUploadedImage(url);
      }
    }
    res.json({ user_id: id, deleted_todos: Number(deleted.changes || 0) });
  } catch (_error) {
    res.status(500).json({ error: 'Kullanici gorevleri temizlenemedi.' });
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz kullanici id.' }); return; }
    if (id === Number(req.user.id)) { res.status(400).json({ error: 'Kendi hesabini admin panelinden silemezsin.' }); return; }
    const existingUser = await get('SELECT id, name, profile_image_url FROM users WHERE id = ?', [id]);
    if (!existingUser) { res.status(404).json({ error: 'Kullanici bulunamadi.' }); return; }
    const todoUploads = await all(
      `
        SELECT image_url, attachment_url
        FROM todos
        WHERE user_id = ?
          AND (
            (image_url IS NOT NULL AND TRIM(image_url) <> '')
            OR (attachment_url IS NOT NULL AND TRIM(attachment_url) <> '')
          )
      `,
      [id]
    );
    await run('DELETE FROM users WHERE id = ?', [id]);
    if (existingUser.profile_image_url) await deleteUploadedImage(existingUser.profile_image_url);
    for (const row of todoUploads) {
      for (const url of getTodoAssetUrls(row)) {
        await deleteUploadedImage(url);
      }
    }
    res.json({ deleted_user_id: id, deleted_user_name: existingUser.name });
  } catch (_error) {
    res.status(500).json({ error: 'Kullanici silinemedi.' });
  }
});

app.get('/api/admin/todos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rawLimit = Number(req.query?.limit || 200);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 1000) : 200;
    const rows = await all(
      `SELECT t.id, t.user_id, t.text, t.completed, t.completed_at, t.image_url, t.attachment_url, t.attachment_name,
        t.attachment_mime, t.note_text, t.due_date, t.due_time, t.priority, t.tags_json, t.recurrence_rule, t.sort_order, t.created_at,
        u.name AS user_name, u.email AS user_email
       FROM todos t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT ?`,
      [limit]
    );
    res.json(rows.map((row) => ({
      ...transformTodo(row),
      user: { id: row.user_id || null, name: row.user_name || 'Silinmis kullanici', email: row.user_email || '-' }
    })));
  } catch (_error) {
    res.status(500).json({ error: 'Gorev listesi alinamadi.' });
  }
});

app.delete('/api/admin/todos/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz gorev id.' }); return; }
    const existing = await get('SELECT id, image_url, attachment_url FROM todos WHERE id = ?', [id]);
    if (!existing) { res.status(404).json({ error: 'Gorev bulunamadi.' }); return; }
    await run('DELETE FROM todos WHERE id = ?', [id]);
    for (const url of getTodoAssetUrls(existing)) {
      await deleteUploadedImage(url);
    }
    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: 'Gorev silinemedi.' });
  }
});

app.get('/api/share/status', requireAuth, async (_req, res) => {
  try {
    let activeGroup, ownerId;
    if (_req.user.shared_group_id) {
      activeGroup = await get('SELECT id, owner_user_id, share_code FROM shared_groups WHERE id = ?', [_req.user.shared_group_id]);
      if (!activeGroup) {
        await run('UPDATE users SET shared_group_id = NULL WHERE id = ?', [_req.user.id]);
      } else {
        ownerId = activeGroup.owner_user_id;
      }
    }
    if (!activeGroup) {
      ownerId = _req.user.id;
      activeGroup = await get('SELECT id, share_code FROM shared_groups WHERE owner_user_id = ?', [ownerId]);
      if (!activeGroup) {
        const shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const result = await pool.query(
          'INSERT INTO shared_groups (owner_user_id, share_code) VALUES ($1, $2) RETURNING id',
          [ownerId, shareCode]
        );
        activeGroup = { id: result.rows[0].id, share_code: shareCode };
      }
    }
    if (!activeGroup) return res.status(404).json({ error: 'Paylasim grubu bulunamadi.' });
    const ownerUser = await get('SELECT id, name, nickname, profile_image_url FROM users WHERE id = ?', [ownerId]);
    const joinedUsers = await all('SELECT id, name, nickname, profile_image_url FROM users WHERE shared_group_id = ?', [activeGroup.id]);
    const members = [ownerUser, ...joinedUsers].filter(Boolean).map((u) => ({
      id: u.id, name: u.name, nickname: u.nickname || u.name, profile_image_url: u.profile_image_url
    }));
    res.json({ group_id: activeGroup.id, owner_user_id: ownerId, share_code: activeGroup.share_code, members });
  } catch (error) {
    res.status(500).json({ error: 'Paylasim durumu alinamadi.' });
  }
});

app.post('/api/share/join', requireAuth, async (_req, res) => {
  try {
    const code = String(_req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Paylasim kodu gerekli.' });
    if (code === 'LEAVE') {
      if (!_req.user.shared_group_id) return res.status(400).json({ error: 'Zaten bir gruba uye degilsin.' });
      await run('UPDATE users SET shared_group_id = NULL WHERE id = ?', [_req.user.id]);
      return res.redirect(303, '/api/share/status');
    }
    const groupToJoin = await get('SELECT id, owner_user_id FROM shared_groups WHERE share_code = ?', [code]);
    if (!groupToJoin) return res.status(404).json({ error: 'Bu koda sahip bir grup bulunamadi.' });
    if (groupToJoin.owner_user_id === _req.user.id) return res.status(400).json({ error: 'Kendi listene katilamazsin.' });
    if (_req.user.shared_group_id === groupToJoin.id) return res.redirect(303, '/api/share/status');
    await run('UPDATE users SET shared_group_id = ? WHERE id = ?', [groupToJoin.id, _req.user.id]);
    res.redirect(303, '/api/share/status');
  } catch (error) {
    res.status(500).json({ error: 'Gruba katilma basarisiz.' });
  }
});

app.get('/api/todos', requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT
          id,
          text,
          completed,
          completed_at,
          image_url,
          attachment_url,
          attachment_name,
          attachment_mime,
          note_text,
          due_date,
          due_time,
          priority,
          tags_json,
          recurrence_rule,
          sort_order,
          created_at
        FROM todos
        WHERE user_id = ?
        ORDER BY sort_order DESC, id DESC
      `,
      [req.effectiveUserId]
    );
    res.json(rows.map(transformTodo));
  } catch (_error) {
    res.status(500).json({ error: 'Todo listesi alinamadi.' });
  }
});

app.post('/api/todos', requireAuth, taskUploadFields, async (req, res) => {
  let shouldCleanupUploads = true;
  try {
    const uploadedAssets = getTaskUploadedAssets(req);
    const text = String(req.body?.text || '').trim();
    if (!text) {
      await cleanupTaskUploads(req);
      res.status(400).json({ error: 'Bos gorev eklenemez.' }); return;
    }
    if (text.length > 200) {
      await cleanupTaskUploads(req);
      res.status(400).json({ error: 'Gorev en fazla 200 karakter olabilir.' }); return;
    }
    const dueDateResult = parseDueDateInput(req.body?.due_date);
    if (dueDateResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: dueDateResult.error }); return; }
    const dueTimeResult = parseDueTimeInput(req.body?.due_time);
    if (dueTimeResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: dueTimeResult.error }); return; }
    const noteResult = parseNoteInput(req.body?.note);
    if (noteResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: noteResult.error }); return; }
    const priorityResult = parsePriorityInput(req.body?.priority);
    if (priorityResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: priorityResult.error }); return; }
    const recurrenceResult = parseRecurrenceInput(req.body?.recurrence);
    if (recurrenceResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: recurrenceResult.error }); return; }
    const tagsResult = parseTagsInput(req.body?.tags);
    if (tagsResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: tagsResult.error }); return; }

    const orderRow = await get('SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM todos WHERE user_id = ?', [req.effectiveUserId]);
    const nextSortOrder = Number(orderRow?.max_sort_order || 0) + 1;

    const insertResult = await pool.query(
      `
        INSERT INTO todos (
          user_id,
          text,
          image_url,
          attachment_url,
          attachment_name,
          attachment_mime,
          note_text,
          due_date,
          due_time,
          priority,
          tags_json,
          recurrence_rule,
          sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id
      `,
      [
        req.effectiveUserId,
        text,
        uploadedAssets.photoUrl,
        uploadedAssets.attachmentUrl,
        uploadedAssets.attachment ? String(uploadedAssets.attachment.originalname || '').slice(0, 255) || null : null,
        uploadedAssets.attachment ? uploadedAssets.attachment.mimetype || null : null,
        noteResult.provided ? noteResult.value : null,
        dueDateResult.value,
        dueTimeResult.provided ? dueTimeResult.value : null,
        priorityResult.provided ? priorityResult.value : 'medium',
        JSON.stringify(tagsResult.provided ? tagsResult.value : []),
        recurrenceResult.provided ? recurrenceResult.value : 'none',
        nextSortOrder
      ]
    );
    const newId = insertResult.rows[0].id;
    shouldCleanupUploads = false;

    const todo = await get(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order, created_at
        FROM todos
        WHERE id = ? AND user_id = ?
      `,
      [newId, req.effectiveUserId]
    );
    res.status(201).json(transformTodo(todo));
  } catch (_error) {
    if (shouldCleanupUploads) {
      await cleanupTaskUploads(req);
    }
    res.status(500).json({ error: 'Gorev eklenemedi.' });
  }
});

app.patch('/api/todos/reorder', requireAuth, async (req, res) => {
  try {
    const rawIds = req.body?.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) { res.status(400).json({ error: 'ids alani bos olmayan dizi olmali.' }); return; }
    const ids = rawIds.map((value) => Number(value));
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) { res.status(400).json({ error: 'ids dizisindeki tum degerler gecerli id olmali.' }); return; }
    if (new Set(ids).size !== ids.length) { res.status(400).json({ error: 'ids dizisinde tekrar eden deger olmamali.' }); return; }
    const existingRows = await all('SELECT id FROM todos WHERE user_id = ?', [req.effectiveUserId]);
    if (existingRows.length !== ids.length) { res.status(400).json({ error: 'ids dizisi kullanicinin tum gorevlerini icermeli.' }); return; }
    const existingSet = new Set(existingRows.map((row) => row.id));
    if (ids.some((id) => !existingSet.has(id))) { res.status(400).json({ error: 'ids dizisinde kullaniciya ait olmayan gorev var.' }); return; }

    await pool.query('BEGIN');
    try {
      for (let index = 0; index < ids.length; index += 1) {
        const sortOrder = ids.length - index;
        await pool.query('UPDATE todos SET sort_order = $1 WHERE id = $2 AND user_id = $3', [sortOrder, ids[index], req.effectiveUserId]);
      }
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    const rows = await all(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order, created_at
        FROM todos
        WHERE user_id = ?
        ORDER BY sort_order DESC, id DESC
      `,
      [req.effectiveUserId]
    );
    res.json(rows.map(transformTodo));
  } catch (_error) {
    res.status(500).json({ error: 'Gorev sirasi guncellenemedi.' });
  }
});

app.get('/api/todos/backup/export', requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order, created_at
        FROM todos
        WHERE user_id = ?
        ORDER BY sort_order DESC, id DESC
      `,
      [req.effectiveUserId]
    );
    const items = rows.map((row) => ({
      text: row.text, completed: Boolean(row.completed), completed_at: row.completed_at || null,
      note: row.note_text || null, due_time: row.due_time || null,
      due_date: row.due_date || null, priority: ALLOWED_PRIORITIES.includes(row.priority) ? row.priority : 'medium',
      tags: parseStoredTags(row.tags_json), recurrence: ALLOWED_RECURRENCE_RULES.includes(row.recurrence_rule) ? row.recurrence_rule : 'none',
      created_at: row.created_at
    }));
    res.json({ version: 1, exported_at: new Date().toISOString(), item_count: items.length, items });
  } catch (_error) {
    res.status(500).json({ error: 'Yedek disa aktarma basarisiz.' });
  }
});

app.post('/api/todos/backup/import', requireAuth, async (req, res) => {
  try {
    const mode = String(req.body?.mode || 'replace').trim().toLowerCase();
    if (mode !== 'replace' && mode !== 'append') { res.status(400).json({ error: "mode alani 'replace' veya 'append' olmali." }); return; }
    const backupBody = req.body?.backup && typeof req.body.backup === 'object' ? req.body.backup : req.body;
    const rawItems = backupBody?.items;
    if (!Array.isArray(rawItems)) { res.status(400).json({ error: 'Yedek dosyasi gecerli degil (items dizisi bulunamadi).' }); return; }
    if (rawItems.length > MAX_BACKUP_ITEMS) { res.status(400).json({ error: `Tek seferde en fazla ${MAX_BACKUP_ITEMS} gorev ice aktarilabilir.` }); return; }

    const normalizedItems = [];
    for (let index = 0; index < rawItems.length; index += 1) {
      const entry = rawItems[index];
      const itemNo = index + 1;
      const text = String(entry?.text || '').trim();
      if (!text || text.length > 200) { res.status(400).json({ error: `${itemNo}. gorev metni gecersiz.` }); return; }
      const completedRaw = entry && hasOwn(entry, 'completed') ? entry.completed : false;
      const completed = parseBooleanInput(completedRaw);
      if (completed === undefined) { res.status(400).json({ error: `${itemNo}. gorev completed alani true/false olmali.` }); return; }
      const dueDateResult = parseDueDateInput(entry?.due_date);
      if (dueDateResult.error) { res.status(400).json({ error: `${itemNo}. gorev due_date gecersiz.` }); return; }
      const dueTimeResult = parseDueTimeInput(entry?.due_time);
      if (dueTimeResult.error) { res.status(400).json({ error: `${itemNo}. gorev due_time gecersiz.` }); return; }
      const noteResult = parseNoteInput(entry?.note);
      if (noteResult.error) { res.status(400).json({ error: `${itemNo}. gorev note gecersiz.` }); return; }
      const priorityResult = parsePriorityInput(entry?.priority);
      if (priorityResult.error) { res.status(400).json({ error: `${itemNo}. gorev priority gecersiz.` }); return; }
      const tagsResult = parseTagsInput(entry?.tags);
      if (tagsResult.error) { res.status(400).json({ error: `${itemNo}. gorev tags gecersiz.` }); return; }
      const recurrenceResult = parseRecurrenceInput(entry?.recurrence);
      if (recurrenceResult.error) { res.status(400).json({ error: `${itemNo}. gorev recurrence gecersiz.` }); return; }
      normalizedItems.push({
        text, completed: completed ? 1 : 0, completed_at: entry?.completed_at || null,
        note_text: noteResult.provided ? noteResult.value : null,
        due_date: dueDateResult.value, priority: priorityResult.provided ? priorityResult.value : 'medium',
        due_time: dueTimeResult.provided ? dueTimeResult.value : null,
        tags_json: JSON.stringify(tagsResult.provided ? tagsResult.value : []),
        recurrence_rule: recurrenceResult.provided ? recurrenceResult.value : 'none'
      });
    }

    const existingRows = mode === 'replace'
      ? await all('SELECT image_url, attachment_url FROM todos WHERE user_id = ?', [req.effectiveUserId])
      : [];
    const currentOrderRow = await get('SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM todos WHERE user_id = ?', [req.effectiveUserId]);
    let sortOrder = mode === 'append' ? Number(currentOrderRow?.max_sort_order || 0) : 0;

    await pool.query('BEGIN');
    try {
      if (mode === 'replace') await pool.query('DELETE FROM todos WHERE user_id = $1', [req.effectiveUserId]);
      for (const item of normalizedItems) {
        sortOrder += 1;
        await pool.query(
          `
            INSERT INTO todos (
              user_id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
              note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order
            ) VALUES ($1,$2,$3,$4,NULL,NULL,NULL,NULL,$5,$6,$7,$8,$9,$10,$11)
          `,
          [
            req.effectiveUserId,
            item.text,
            item.completed,
            item.completed_at,
            item.note_text,
            item.due_date,
            item.due_time,
            item.priority,
            item.tags_json,
            item.recurrence_rule,
            sortOrder
          ]
        );
      }
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    if (mode === 'replace') {
      for (const row of existingRows) {
        for (const url of getTodoAssetUrls(row)) {
          await deleteUploadedImage(url);
        }
      }
    }
    const rows = await all(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order, created_at
        FROM todos
        WHERE user_id = ?
        ORDER BY sort_order DESC, id DESC
      `,
      [req.effectiveUserId]
    );
    res.json({ imported_count: normalizedItems.length, mode, todos: rows.map(transformTodo) });
  } catch (_error) {
    res.status(500).json({ error: 'Yedek ice aktarma basarisiz.' });
  }
});

app.get('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz gorev id.' }); return; }
    const row = await get(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order, created_at
        FROM todos
        WHERE id = ? AND user_id = ?
      `,
      [id, req.effectiveUserId]
    );
    if (!row) { res.status(404).json({ error: 'Gorev bulunamadi.' }); return; }
    res.json(transformTodo(row));
  } catch (_error) {
    res.status(500).json({ error: 'Gorev detaylari alinamadi.' });
  }
});

app.patch('/api/todos/:id', requireAuth, taskUploadFields, async (req, res) => {
  let shouldCleanupUploads = true;
  try {
    const uploadedAssets = getTaskUploadedAssets(req);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      await cleanupTaskUploads(req);
      res.status(400).json({ error: 'Gecersiz gorev id.' }); return;
    }
    const existing = await get(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule
        FROM todos
        WHERE id = ? AND user_id = ?
      `,
      [id, req.effectiveUserId]
    );
    if (!existing) {
      await cleanupTaskUploads(req);
      res.status(404).json({ error: 'Gorev bulunamadi.' }); return;
    }

    const updates = [];
    const params = [];
    let shouldDeleteOldImage = false;
    let shouldDeleteOldAttachment = false;
    let nextText = existing.text;
    let nextDueDateBase = existing.due_date;
    let nextDueTime = existing.due_time || null;
    let nextNoteText = existing.note_text || null;
    let nextPriority = ALLOWED_PRIORITIES.includes(existing.priority) ? existing.priority : 'medium';
    let nextTagsJson = typeof existing.tags_json === 'string' ? existing.tags_json : '[]';
    let nextRecurrenceRule = ALLOWED_RECURRENCE_RULES.includes(existing.recurrence_rule) ? existing.recurrence_rule : 'none';
    let shouldCreateRecurringInstance = false;

    if (hasOwn(req.body || {}, 'text')) {
      const text = String(req.body.text || '').trim();
      if (!text) { await cleanupTaskUploads(req); res.status(400).json({ error: 'Gorev metni bos olamaz.' }); return; }
      if (text.length > 200) { await cleanupTaskUploads(req); res.status(400).json({ error: 'Gorev en fazla 200 karakter olabilir.' }); return; }
      updates.push('text = ?'); params.push(text); nextText = text;
    }
    if (hasOwn(req.body || {}, 'completed')) {
      const completed = parseBooleanInput(req.body.completed);
      if (completed === undefined) { await cleanupTaskUploads(req); res.status(400).json({ error: 'completed alani true/false olmali.' }); return; }
      updates.push('completed = ?'); params.push(completed ? 1 : 0);
      if (completed) { updates.push('completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)'); }
      else { updates.push('completed_at = NULL'); }
      shouldCreateRecurringInstance = !Boolean(existing.completed) && completed;
    }
    if (hasOwn(req.body || {}, 'due_date')) {
      const dueDateResult = parseDueDateInput(req.body.due_date);
      if (dueDateResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: dueDateResult.error }); return; }
      updates.push('due_date = ?'); params.push(dueDateResult.value); nextDueDateBase = dueDateResult.value;
    }
    if (hasOwn(req.body || {}, 'due_time')) {
      const dueTimeResult = parseDueTimeInput(req.body.due_time);
      if (dueTimeResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: dueTimeResult.error }); return; }
      updates.push('due_time = ?'); params.push(dueTimeResult.value); nextDueTime = dueTimeResult.value;
    }
    if (hasOwn(req.body || {}, 'note')) {
      const noteResult = parseNoteInput(req.body.note);
      if (noteResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: noteResult.error }); return; }
      updates.push('note_text = ?'); params.push(noteResult.value); nextNoteText = noteResult.value;
    }
    if (hasOwn(req.body || {}, 'priority')) {
      const priorityResult = parsePriorityInput(req.body.priority);
      if (priorityResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: priorityResult.error }); return; }
      updates.push('priority = ?'); params.push(priorityResult.value); nextPriority = priorityResult.value;
    }
    if (hasOwn(req.body || {}, 'tags')) {
      const tagsResult = parseTagsInput(req.body.tags);
      if (tagsResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: tagsResult.error }); return; }
      updates.push('tags_json = ?'); params.push(JSON.stringify(tagsResult.value)); nextTagsJson = JSON.stringify(tagsResult.value);
    }
    if (hasOwn(req.body || {}, 'recurrence')) {
      const recurrenceResult = parseRecurrenceInput(req.body.recurrence);
      if (recurrenceResult.error) { await cleanupTaskUploads(req); res.status(400).json({ error: recurrenceResult.error }); return; }
      updates.push('recurrence_rule = ?'); params.push(recurrenceResult.value); nextRecurrenceRule = recurrenceResult.value;
    }
    if (uploadedAssets.photoUrl) {
      updates.push('image_url = ?'); params.push(uploadedAssets.photoUrl);
      if (existing.image_url) shouldDeleteOldImage = true;
    } else if (hasOwn(req.body || {}, 'remove_photo')) {
      const removePhoto = parseBooleanInput(req.body.remove_photo);
      if (removePhoto === undefined) { await cleanupTaskUploads(req); res.status(400).json({ error: 'remove_photo alani true/false olmali.' }); return; }
      if (removePhoto) { updates.push('image_url = NULL'); if (existing.image_url) shouldDeleteOldImage = true; }
    }
    if (uploadedAssets.attachmentUrl) {
      updates.push('attachment_url = ?'); params.push(uploadedAssets.attachmentUrl);
      updates.push('attachment_name = ?'); params.push(String(uploadedAssets.attachment?.originalname || '').slice(0, 255) || null);
      updates.push('attachment_mime = ?'); params.push(uploadedAssets.attachment?.mimetype || null);
      if (existing.attachment_url) shouldDeleteOldAttachment = true;
    } else if (hasOwn(req.body || {}, 'remove_attachment')) {
      const removeAttachment = parseBooleanInput(req.body.remove_attachment);
      if (removeAttachment === undefined) { await cleanupTaskUploads(req); res.status(400).json({ error: 'remove_attachment alani true/false olmali.' }); return; }
      if (removeAttachment) {
        updates.push('attachment_url = NULL');
        updates.push('attachment_name = NULL');
        updates.push('attachment_mime = NULL');
        if (existing.attachment_url) shouldDeleteOldAttachment = true;
      }
    }

    if (updates.length === 0) {
      await cleanupTaskUploads(req);
      res.status(400).json({ error: 'Guncellenecek alan gonderilmedi.' }); return;
    }

    params.push(id, req.effectiveUserId);
    await run(`UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    shouldCleanupUploads = false;

    if (shouldCreateRecurringInstance && nextRecurrenceRule !== 'none') {
      const nextDueDate = computeNextDueDate(nextDueDateBase, nextRecurrenceRule);
      const orderRow = await get('SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM todos WHERE user_id = ?', [req.effectiveUserId]);
      const nextSortOrder = Number(orderRow?.max_sort_order || 0) + 1;
      await pool.query(
        `
          INSERT INTO todos (
            user_id, text, completed, image_url, attachment_url, attachment_name, attachment_mime,
            note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order
          ) VALUES ($1,$2,0,NULL,NULL,NULL,NULL,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          req.effectiveUserId,
          nextText,
          nextNoteText,
          nextDueDate,
          nextDueTime,
          nextPriority,
          nextTagsJson,
          nextRecurrenceRule,
          nextSortOrder
        ]
      );
    }

    const updated = await get(
      `
        SELECT
          id, text, completed, completed_at, image_url, attachment_url, attachment_name, attachment_mime,
          note_text, due_date, due_time, priority, tags_json, recurrence_rule, sort_order, created_at
        FROM todos
        WHERE id = ? AND user_id = ?
      `,
      [id, req.effectiveUserId]
    );
    if (shouldDeleteOldImage && existing.image_url && existing.image_url !== updated.image_url) {
      await deleteUploadedImage(existing.image_url);
    }
    if (shouldDeleteOldAttachment && existing.attachment_url && existing.attachment_url !== updated.attachment_url) {
      await deleteUploadedImage(existing.attachment_url);
    }
    res.json(transformTodo(updated));
  } catch (_error) {
    const uploadedAssets = getTaskUploadedAssets(req);
    const hasAnyUpload = Boolean(uploadedAssets.photoUrl || uploadedAssets.attachmentUrl);
    if (shouldCleanupUploads && hasAnyUpload) {
      await cleanupTaskUploads(req);
    }
    res.status(500).json({ error: 'Gorev guncellenemedi.' });
  }
});

app.delete('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Gecersiz gorev id.' }); return; }
    const existing = await get('SELECT id, image_url, attachment_url FROM todos WHERE id = ? AND user_id = ?', [id, req.effectiveUserId]);
    if (!existing) { res.status(404).json({ error: 'Gorev bulunamadi.' }); return; }
    await run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.effectiveUserId]);
    for (const url of getTodoAssetUrls(existing)) {
      await deleteUploadedImage(url);
    }
    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: 'Gorev silinemedi.' });
  }
});

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      if (_req.path === '/api/auth/profile-photo') {
        res.status(400).json({ error: 'Profil fotografi en fazla 5MB olabilir.' });
        return;
      }
      res.status(400).json({ error: 'Dosya en fazla 15MB olabilir.' });
      return;
    }
    res.status(400).json({ error: 'Dosya yukleme hatasi.' });
    return;
  }
  if (error && error.message === 'INVALID_IMAGE_TYPE') {
    res.status(400).json({ error: 'Sadece JPG, PNG, WEBP veya GIF yukleyebilirsin.' }); return;
  }
  if (error && error.message === 'INVALID_ATTACHMENT_TYPE') {
    res.status(400).json({ error: 'Ek dosyasi icin PDF, DOCX, XLSX, PPTX, TXT, CSV, JSON, ZIP veya gorsel yukleyebilirsin.' });
    return;
  }
  if (error && error.message === 'INVALID_UPLOAD_FIELD') {
    res.status(400).json({ error: 'Desteklenmeyen dosya alani gonderildi.' });
    return;
  }
  next(error);
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) { res.status(404).json({ error: 'API rotasi bulunamadi.' }); return; }
  res.sendFile(path.join(publicDir, 'index.html'));
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, HOST, () => {
      const localIps = getLocalIpv4Addresses();
      console.log(`Sunucu calisiyor: http://localhost:${PORT}`);
      if (localIps.length > 0) {
        console.log(`Ayni Wi-Fi icin: ${localIps.map((ip) => `http://${ip}:${PORT}`).join('  |  ')}`);
      }
    });
  } catch (error) {
    console.error('Sunucu baslatilamadi:', error);
    process.exit(1);
  }
}

startServer();

function shutdown() {
  pool.end(() => { process.exit(0); });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
