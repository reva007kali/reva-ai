const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('../db');
const { generateResponse } = require('./ai');

const clients = new Map(); // sessionId -> Client
const statuses = new Map(); // sessionId -> { status, qr }

function initSessionManager(io) {
  // Load existing sessions from DB
  const sessions = db.prepare('SELECT session_id FROM sessions').all();
  
  // If no sessions exist, create a default one
  if (sessions.length === 0) {
    createSession(io, 'default', 'Primary Device');
  } else {
    sessions.forEach(s => createSession(io, s.session_id));
  }
}

function createSession(io, sessionId, description = '') {
  if (clients.has(sessionId)) return;

  // Persist if new
  const exists = db.prepare('SELECT session_id FROM sessions WHERE session_id = ?').get(sessionId);
  if (!exists) {
    db.prepare('INSERT INTO sessions (session_id, description) VALUES (?, ?)').run(sessionId, description);
  }

  console.log(`Initializing session: ${sessionId}`);
  statuses.set(sessionId, { status: 'initializing', qr: '' });
  broadcastStatus(io, sessionId);

  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', 
      '--disable-gpu'
    ]
  };

  // Try to find system Chrome/Chromium if available (more stable on VPS)
  if (process.platform === 'linux') {
    const fs = require('fs');
    if (fs.existsSync('/usr/bin/google-chrome-stable')) {
      puppeteerConfig.executablePath = '/usr/bin/google-chrome-stable';
    } else if (fs.existsSync('/usr/bin/chromium-browser')) {
      puppeteerConfig.executablePath = '/usr/bin/chromium-browser';
    }
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId, dataPath: './sessions_data' }),
    puppeteer: puppeteerConfig,
    qrMaxRetries: 10,
    authTimeoutMs: 60000,
  });

  client.on('qr', (qr) => {
    statuses.set(sessionId, { status: 'scan_qr', qr });
    broadcastStatus(io, sessionId);
    console.log(`QR for ${sessionId}`);
  });

  client.on('ready', () => {
    statuses.set(sessionId, { status: 'online', qr: '' });
    broadcastStatus(io, sessionId);
    console.log(`${sessionId} is ready!`);
  });

  client.on('authenticated', () => {
    statuses.set(sessionId, { status: 'authenticated', qr: '' });
    broadcastStatus(io, sessionId);
  });

  client.on('auth_failure', msg => {
    statuses.set(sessionId, { status: 'auth_failure', qr: '' });
    broadcastStatus(io, sessionId);
    console.error(`Auth failure for ${sessionId}:`, msg);
  });

  client.on('disconnected', (reason) => {
    statuses.set(sessionId, { status: 'disconnected', qr: '' });
    broadcastStatus(io, sessionId);
    console.log(`${sessionId} disconnected:`, reason);
  });

  client.on('message_create', async (message) => {
    if (message.fromMe || message.isStatus) return;

    const botEnabled = db.prepare("SELECT value FROM settings WHERE key = 'bot_enabled'").get().value === 'true';
    const remoteJid = message.from;
    const userMsg = message.body;

    // Log User Message
    db.prepare("INSERT INTO chats (remote_jid, local_jid, role, message) VALUES (?, ?, ?, ?)").run(remoteJid, sessionId, 'user', userMsg);
    io.emit('new_message', { remote_jid: remoteJid, local_jid: sessionId, role: 'user', message: userMsg, timestamp: new Date() });

    if (!botEnabled) return;

    // Response
    const chat = await message.getChat();
    chat.sendStateTyping();

    const aiResponse = await generateResponse(userMsg, remoteJid);

    await message.reply(aiResponse);

    // Log Assistant Message
    db.prepare("INSERT INTO chats (remote_jid, local_jid, role, message) VALUES (?, ?, ?, ?)").run(remoteJid, sessionId, 'assistant', aiResponse);
    io.emit('new_message', { remote_jid: remoteJid, local_jid: sessionId, role: 'assistant', message: aiResponse, timestamp: new Date() });
  });

  client.initialize();
  clients.set(sessionId, client);
}

async function deleteSession(sessionId) {
  const client = clients.get(sessionId);
  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      console.error('Error destroying client:', e);
    }
    clients.delete(sessionId);
  }
  statuses.delete(sessionId);
  db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
}

function broadcastStatus(io, sessionId) {
  const status = statuses.get(sessionId);
  io.emit('session_update', { sessionId, ...status });
}

function getAllStatuses() {
  const result = [];
  const dbSessions = db.prepare('SELECT * FROM sessions').all();
  
  dbSessions.forEach(s => {
    const status = statuses.get(s.session_id) || { status: 'disconnected', qr: '' };
    result.push({
      session_id: s.session_id,
      description: s.description,
      ...status
    });
  });
  return result;
}

module.exports = { initSessionManager, createSession, deleteSession, getAllStatuses };
