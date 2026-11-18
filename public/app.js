const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'chatbot:v1';
const SUGGESTIONS = ['Explain closures in JavaScript', 'What is a REST API?', 'Quiz me on Node.js event loop'];

let state = { messages: [], persona: 'assistant' };
try { state = { ...state, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch {}
let controller = null; // AbortController for the in-flight request

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tiny, safe markdown: everything is escaped first, then code blocks / inline code / bold / newlines
function md(text) {
  return text.split('```').map((part, i) =>
    i % 2
      ? `<pre><code>${esc(part.replace(/^\w*\n/, ''))}</code></pre>`
      : esc(part)
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>')
  ).join('');
}

function render() {
  const chat = $('#chat');
  if (!state.messages.length) {
    chat.innerHTML = `<div class="empty"><h2>How can I help?</h2><div class="chips">${
      SUGGESTIONS.map((s) => `<button class="chip" type="button">${esc(s)}</button>`).join('')
    }</div></div>`;
    chat.querySelectorAll('.chip').forEach((b) => (b.onclick = () => send(b.textContent)));
    return;
  }
  chat.innerHTML = state.messages.map((m, i) => {
    const streaming = controller && i === state.messages.length - 1 && m.role === 'assistant';
    return `<div class="msg ${m.role}${m.error ? ' error' : ''}${streaming ? ' typing' : ''}">${md(m.content)}</div>`;
  }).join('');
  chat.scrollTop = chat.scrollHeight;
}

function setBusy(busy) {
  const btn = $('#send');
  btn.textContent = busy ? 'Stop' : 'Send';
  btn.classList.toggle('stop', busy);
  btn.type = busy ? 'button' : 'submit';
  $('#persona').disabled = busy;
}

async function send(text) {
  text = text.trim();
  if (!text || controller) return;

  state.messages.push({ role: 'user', content: text });
  const history = state.messages.map(({ role, content }) => ({ role, content }));
  state.messages.push({ role: 'assistant', content: '' });
  const reply = state.messages[state.messages.length - 1];

  controller = new AbortController();
  setBusy(true);
  $('#input').value = '';
  render();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, persona: state.persona }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop(); // keep the incomplete tail
      for (const ev of events) {
        if (!ev.startsWith('data: ')) continue;
        const data = JSON.parse(ev.slice(6));
        if (data.text) { reply.content += data.text; render(); }
        if (data.error) throw new Error(data.error);
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') { reply.content = err.message; reply.error = true; }
  } finally {
    if (!reply.content) state.messages.pop(); // drop an empty bubble (e.g. stopped immediately)
    controller = null;
    setBusy(false);
    save();
    render();
  }
}

$('#form').addEventListener('submit', (e) => { e.preventDefault(); send($('#input').value); });
$('#send').addEventListener('click', () => { if (controller) controller.abort(); });
$('#input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); }
});
$('#input').addEventListener('input', (e) => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
});
$('#persona').value = state.persona;
$('#persona').onchange = (e) => { state.persona = e.target.value; save(); };
$('#clear').onclick = () => { if (controller) controller.abort(); state.messages = []; save(); render(); };

render();
