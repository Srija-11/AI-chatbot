const router = require('express').Router();
const { z } = require('zod');
const { streamReply, PERSONAS } = require('../services/llm');

const schema = z.object({
  persona: z.enum(Object.keys(PERSONAS)).default('assistant'),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long (max 4000 chars)'),
      })
    )
    .min(1, 'Send at least one message')
    .max(40, 'Conversation too long, start a new chat')
    .refine((m) => m.at(-1)?.role === 'user', 'Last message must be from the user'),
});

// POST /api/chat -> Server-Sent Events stream: data: {"text":"..."} ... data: {"done":true}
router.post('/', async (req, res, next) => {
  let input;
  try {
    input = schema.parse(req.body);
  } catch (e) {
    return next(e);
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Stop paying for tokens if the user closes the tab or hits "Stop"
  const ac = new AbortController();
  res.on('close', () => ac.abort());

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  try {
    await streamReply({ ...input, onText: (text) => send({ text }), signal: ac.signal });
    send({ done: true });
  } catch (e) {
    if (!ac.signal.aborted) {
      console.error('LLM error:', e.message);
      send({ error: 'The model request failed. Please try again.' });
    }
  } finally {
    res.end();
  }
});

module.exports = router;
