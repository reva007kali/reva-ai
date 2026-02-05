require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-change-this',
  DB_PATH: path.join(__dirname, '../database.sqlite'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
