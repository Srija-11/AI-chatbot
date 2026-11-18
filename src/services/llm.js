
const config = require('../config');

// No key -> demo mode, so the app still runs end to end
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

  const text = `**Demo mode** (no Gemini API key set). You said: "${last.slice(
    0,
    200
  )}". Add GEMINI_API_KEY to get real answers.`;

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

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.model
    )}:streamGenerateContent`
  );

  url.searchParams.set('alt', 'sse');
  url.searchParams.set('key', config.apiKey);

  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: PERSONAS[persona] || PERSONAS.assistant }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: config.maxTokens,
      },
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Gemini returned an empty response stream.');
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
      throw new Error(chunk.error.message || 'Gemini API request failed.');
    }

    const text = chunk.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('');

    if (text) onText(text);
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
