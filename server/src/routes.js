const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');
const { authenticateToken } = require('./services/auth');
const { getEmbedding } = require('./services/ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const { createSession, deleteSession, getAllStatuses } = require('./services/sessionManager');

// ... (existing imports)

// --- Session Management ---
router.get('/sessions', authenticateToken, (req, res) => {
  res.json(getAllStatuses());
});

router.post('/sessions', authenticateToken, (req, res) => {
  const { session_id, description } = req.body;
  const io = req.app.get('socketio');
  
  try {
    createSession(io, session_id, description);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    await deleteSession(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// --- Auth ---
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, display_name, logo_path FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// --- Account Management ---
router.post('/account/update', authenticateToken, upload.single('logo'), (req, res) => {
  const { display_name, email } = req.body;
  const userId = req.user.id;
  
  let updateQuery = 'UPDATE users SET display_name = ?, email = ?';
  let params = [display_name, email];

  if (req.file) {
    updateQuery += ', logo_path = ?';
    params.push(`/uploads/${req.file.filename}`);
  }

  updateQuery += ' WHERE id = ?';
  params.push(userId);

  try {
    db.prepare(updateQuery).run(...params);
    res.json({ success: true, logo_path: req.file ? `/uploads/${req.file.filename}` : undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/account/password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
  
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
  
  res.json({ success: true });
});

// --- Settings ---
router.get('/settings', authenticateToken, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => settingsObj[s.key] = s.value);
  res.json(settingsObj);
});

router.post('/settings', authenticateToken, (req, res) => {
  const { key, value } = req.body;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value.toString());
  res.json({ success: true });
});

router.post('/settings/bulk', authenticateToken, (req, res) => {
  const updates = req.body; // { key: value, ... }
  const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((items) => {
    for (const [key, value] of Object.entries(items)) {
      insert.run(key, value.toString());
    }
  });
  updateMany(updates);
  res.json({ success: true });
});

// --- Categories ---
router.get('/categories', authenticateToken, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

router.post('/categories', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  try {
    const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Knowledge ---
router.get('/knowledge', authenticateToken, (req, res) => {
  const items = db.prepare(`
    SELECT k.id, k.content, k.created_at, c.name as category_name, k.category_id 
    FROM knowledge k 
    LEFT JOIN categories c ON k.category_id = c.id
    ORDER BY k.created_at DESC
  `).all();
  res.json(items);
});

router.post('/knowledge', authenticateToken, async (req, res) => {
  const { category_id, content } = req.body;
  try {
    const embedding = await getEmbedding(content);
    const info = db.prepare('INSERT INTO knowledge (category_id, content, embedding) VALUES (?, ?, ?)')
      .run(category_id, content, JSON.stringify(embedding));
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

router.put('/knowledge/:id', authenticateToken, async (req, res) => {
  const { content } = req.body;
  try {
    const embedding = await getEmbedding(content);
    db.prepare('UPDATE knowledge SET content = ?, embedding = ? WHERE id = ?')
      .run(content, JSON.stringify(embedding), req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update knowledge' });
  }
});

router.delete('/knowledge/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM knowledge WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Chat History ---
router.get('/conversations', authenticateToken, (req, res) => {
  // Get unique JIDs with their last message and timestamp
  const conversations = db.prepare(`
    SELECT remote_jid, MAX(timestamp) as last_activity
    FROM chats 
    GROUP BY remote_jid 
    ORDER BY last_activity DESC
  `).all();

  // Fetch the actual last message content for each (SQLite group_concat trick is messy, separate query is safer/cleaner here)
  const result = conversations.map(conv => {
    const lastMsg = db.prepare('SELECT message FROM chats WHERE remote_jid = ? ORDER BY timestamp DESC LIMIT 1').get(conv.remote_jid);
    return {
      remote_jid: conv.remote_jid,
      timestamp: conv.last_activity,
      last_message: lastMsg ? lastMsg.message : ''
    };
  });

  res.json(result);
});

router.get('/chats/:jid', authenticateToken, (req, res) => {
  const { jid } = req.params;
  const chats = db.prepare('SELECT * FROM chats WHERE remote_jid = ? ORDER BY timestamp ASC').all(jid);
  res.json(chats);
});

router.get('/chats', authenticateToken, (req, res) => {
  // Legacy or Full Dump
  const chats = db.prepare('SELECT * FROM chats ORDER BY timestamp DESC LIMIT 100').all();
  res.json(chats);
});

module.exports = router;
