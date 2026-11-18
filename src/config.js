
require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.MODEL || 'gemini-2.5-flash',
  maxTokens: Number(process.env.MAX_TOKENS) || 1024,
  rateLimit: Number(process.env.RATE_LIMIT_PER_MIN) || 20,
};
