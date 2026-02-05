const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal'); // Fallback for console
const db = require('../db');
const { generateResponse } = require('./ai');

let client;
let currentStatus = 'disconnected';
let currentQR = '';

function initWhatsApp(io) {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    // qrcode.generate(qr, { small: true }); // Optional: Log to console
    currentQR = qr;
    currentStatus = 'scan_qr';
    io.emit('qr_code', qr);
    io.emit('status', 'scan_qr');
    console.log('QR Code generated');
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    currentStatus = 'online';
    currentQR = '';
    io.emit('status', 'online');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Authenticated');
    currentStatus = 'authenticated';
    currentQR = '';
    io.emit('status', 'authenticated');
  });
  
  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    currentStatus = 'auth_failure';
    io.emit('status', 'auth_failure');
  });

  client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    currentStatus = 'disconnected';
    io.emit('status', 'disconnected');
  });

  client.on('message', async (message) => {
  if (message.isStatus) return;

  console.log('📩 Incoming message:', message.body);

    const botEnabled = db.prepare("SELECT value FROM settings WHERE key = 'bot_enabled'").get().value === 'true';
    
    // Log User Message
    const remoteJid = message.from;
    const userMsg = message.body;
    db.prepare("INSERT INTO chats (remote_jid, role, message) VALUES (?, ?, ?)").run(remoteJid, 'user', userMsg);
    
    // Notify Admin Panel
    io.emit('new_message', { remote_jid: remoteJid, role: 'user', message: userMsg, timestamp: new Date() });

    if (!botEnabled) return;

    // Generate Response
    // Send "typing..."
    const chat = await message.getChat();
    chat.sendStateTyping();

    const aiResponse = await generateResponse(userMsg, remoteJid);

    // Send Reply
    await message.reply(aiResponse);

    // Log Assistant Message
    db.prepare("INSERT INTO chats (remote_jid, role, message) VALUES (?, ?, ?)").run(remoteJid, 'assistant', aiResponse);
    
    // Notify Admin Panel
    io.emit('new_message', { remote_jid: remoteJid, role: 'assistant', message: aiResponse, timestamp: new Date() });
  });

  client.initialize();
}

function getClient() {
  return client;
}

function getStatus() {
  return { status: currentStatus, qr: currentQR };
}

module.exports = { initWhatsApp, getClient, getStatus };
