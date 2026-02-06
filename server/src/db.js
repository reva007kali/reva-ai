const Database = require('better-sqlite3');
const { DB_PATH } = require('./config');
const bcrypt = require('bcrypt');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function initDB() {
  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      logo_path TEXT
    )
  `);

  // Migration: Add new columns if they don't exist
  try { db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE users ADD COLUMN display_name TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE users ADD COLUMN logo_path TEXT").run(); } catch (e) {}

  // Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    )
  `);

  // Knowledge Table
  // embedding will be stored as a JSON string of floats
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      content TEXT NOT NULL,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Chat Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_jid TEXT NOT NULL,
      local_jid TEXT, -- which bot received this
      role TEXT NOT NULL, -- 'user' or 'assistant'
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions Table (Multi-Device Support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add local_jid if missing
  try { db.prepare("ALTER TABLE chats ADD COLUMN local_jid TEXT").run(); } catch (e) {}

  // Initialize Default Admin
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
    console.log('Default admin user created: admin / admin123');
  }

  // Initialize Default Settings
  const defaults = [
    { key: 'bot_enabled', value: 'true' },
    { key: 'schedule_enabled', value: 'false' },
    { key: 'schedule_start', value: '09:00' }, // 24h format
    { key: 'schedule_end', value: '17:00' },
    { key: 'openai_model', value: 'gpt-3.5-turbo' },
    { key: 'system_prompt', value: 'You are a helpful assistant.' },
    { key: 'temperature', value: '0.7' },
    { key: 'token_limit_daily', value: '10000' },
    { key: 'tokens_used_today', value: '0' },
    { key: 'last_token_reset', value: new Date().toISOString().split('T')[0] }
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  defaults.forEach(setting => insertSetting.run(setting.key, setting.value));

  // Initialize Default Categories
  const defaultCats = ['Personal Information', 'Contact Information', 'Business Information', 'Services Information'];
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
  defaultCats.forEach(cat => insertCat.run(cat, `${cat} category`));
  
  console.log('Database initialized successfully.');
}

initDB();

module.exports = db;
