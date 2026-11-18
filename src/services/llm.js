const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

// No key -> demo mode, so the app still runs end to end
const client = config.apiKey ? new Anthropic({ apiKey: config.apiKey }) : null;

const PERSONAS = {
  assistant: 'You are a helpful, concise assistant. Use markdown code blocks for code.',
  tutor: 'You are a patient coding tutor. Explain step by step, give small examples, and ask a check-for-understanding question at the end.',
  interviewer: 'You are a technical interviewer for a software engineering role. Ask one question at a time, wait for the answer, then give brief feedback and a follow-up.',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function demoReply(messages, onText, signal) {
  const last = messages[messages.length - 1].content;
  const text = `**Demo mode** (no API key set). You said: "${last.slice(0, 200)}". Add ANTHROPIC_API_KEY to get real answers.`;
  for (const word of text.split(' ')) {
    if (signal?.aborted) return;
    onText(word + ' ');
    await sleep(30);
  }
}

async function streamReply({ messages, persona, onText, signal }) {
  if (!client) return demoReply(messages, onText, signal);
  const stream = client.messages.stream(
    {
      model: config.model,
      max_tokens: config.maxTokens,
      system: PERSONAS[persona] || PERSONAS.assistant,
      messages,
    },
    { signal }
  );
  stream.on('text', onText);
  await stream.finalMessage();
}

module.exports = { streamReply, PERSONAS };
