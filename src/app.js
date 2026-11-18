const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', demoMode: !config.apiKey }));

app.use(
  '/api/chat',
  rateLimit({ windowMs: 60_000, limit: config.rateLimit, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many messages, slow down a little.' } }),
  require('./routes/chat')
);

// Local dev only: on Vercel the /public folder is served statically
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
