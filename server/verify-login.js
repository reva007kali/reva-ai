const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { DB_PATH } = require('./src/config');

console.log('Connecting to database at:', DB_PATH);
const db = new Database(DB_PATH);

const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

if (!username || !password) {
  console.log('Usage: node verify-login.js <username> <password>');
  console.log('\n--- Existing Users ---');
  const users = db.prepare('SELECT id, username FROM users').all();
  console.table(users);
  process.exit(1);
}

try {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    console.error(`❌ User "${username}" not found.`);
    process.exit(1);
  }

  console.log(`User found (ID: ${user.id}). Verifying password...`);
  
  const isValid = bcrypt.compareSync(password, user.password);
  
  if (isValid) {
    console.log('✅ Password is CORRECT!');
  } else {
    console.log('❌ Password is INCORRECT.');
    console.log('Hash in DB:', user.password);
  }

} catch (err) {
  console.error('Database Error:', err.message);
}
