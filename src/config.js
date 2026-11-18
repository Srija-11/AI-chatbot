
require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  apiKey: process.env.GROQ_API_KEY || '',
  model: process.env.MODEL || 'openai/gpt-oss-20b',
  maxTokens: Number(process.env.MAX_TOKENS) || 1024,
  rateLimit: Number(process.env.RATE_LIMIT_PER_MIN) || 20,
};
