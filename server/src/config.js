require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-change-this',
  // Use absolute path if provided, otherwise default to adjacent database.sqlite
  DB_PATH: process.env.DB_PATH 
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(process.cwd(), process.env.DB_PATH))
    : path.join(__dirname, '../database.sqlite'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

console.log('Loaded Configuration:');
console.log('- DB_PATH:', module.exports.DB_PATH);
console.log('- PORT:', module.exports.PORT);
