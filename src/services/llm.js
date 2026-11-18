
const config = require('../config');

const PERSONAS = {
  assistant:
    'You are a helpful, concise assistant. Use markdown code blocks for code.',
  tutor:
    'You are a patient coding tutor. Explain step by step, give small examples, and ask a check-for-understanding question at the end.',
  interviewer:
    'You are a technical interviewer for a software engineering role. Ask one question at a time, wait for the answer, then give brief feedback and a follow-up.',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function demoReply(messages, onText, signal) {
  const last = messages[messages.length - 1].content;

  const text = `**Demo mode** (no Groq API key set). You said: "${last.slice(
    0,
    200
  )}". Add GROQ_API_KEY to get real answers.`;

  for (const word of text.split(' ')) {
    if (signal?.aborted) return;
    onText(word + ' ');
    await sleep(30);
  }
}

async function streamReply({ messages, persona, onText, signal }) {
  if (!config.apiKey) {
    return demoReply(messages, onText, signal);
  }

  const groqMessages = [
    {
      role: 'system',
      content: PERSONAS[persona] || PERSONAS.assistant,
    },
    ...messages,
  ];

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: groqMessages,
        max_completion_tokens: config.maxTokens,
        stream: true,
      }),
      signal,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Groq returned an empty response stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function handleLine(line) {
    if (!line.startsWith('data:')) return;

    const data = line.slice(5).trim();

    if (!data || data === '[DONE]') return;

    const chunk = JSON.parse(data);

    if (chunk.error) {
      throw new Error(chunk.error.message || 'Groq request failed.');
    }

    const text = chunk.choices?.[0]?.delta?.content;

    if (typeof text === 'string' && text.length > 0) {
      onText(text);
    }
  }

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }

      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        handleLine(line.trim());
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      handleLine(buffer.trim());
    }
  } finally {
    reader.releaseLock();
  }
}

module.exports = { streamReply, PERSONAS };
