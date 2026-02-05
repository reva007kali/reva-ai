const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const { DB_PATH } = require('./src/config');

// Connect to DB
const db = new Database(path.resolve(__dirname, 'src', DB_PATH));

const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

if (!username || !password) {
  console.log('Usage: node create-user.js <username> <password>');
  process.exit(1);
}

try {
  // Hash password
  const hash = bcrypt.hashSync(password, 10);

  // Check if user exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  
  if (existing) {
    console.log(`User "${username}" exists. Updating password...`);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, existing.id);
    console.log('✅ Password updated successfully.');
  } else {
    // Insert user
    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
    console.log(`✅ Success! User "${username}" created with ID: ${info.lastInsertRowid}`);
  }

} catch (err) {
  console.error('Database Error:', err.message);
}
