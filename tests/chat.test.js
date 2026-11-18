const test = require('node:test');
const assert = require('node:assert');

delete process.env.ANTHROPIC_API_KEY; // force demo mode
const app = require('../src/app');

let server, base;
test.before(() => new Promise((resolve) => {
  server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
test.after(() => { server.closeAllConnections?.(); server.close(); });

const post = (body) => fetch(base + '/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('health check works', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'ok');
});

test('rejects empty conversation', async () => {
  assert.equal((await post({ messages: [] })).status, 400);
});

test('rejects when last message is from the assistant', async () => {
  const r = await post({ messages: [{ role: 'assistant', content: 'hi' }] });
  assert.equal(r.status, 400);
});

test('rejects oversized message', async () => {
  const r = await post({ messages: [{ role: 'user', content: 'x'.repeat(4001) }] });
  assert.equal(r.status, 400);
});

test('streams a demo reply over SSE', async () => {
  const r = await post({ messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/event-stream/);
  const body = await r.text();
  assert.match(body, /"text"/);
  assert.match(body, /"done":true/);
});
