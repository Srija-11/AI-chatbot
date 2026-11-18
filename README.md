
# 💬 Chatbot-Live demo
https://ai-chatbot-nine-plum.vercel.app/

A streaming AI chatbot. Express and Nodejs backend, vanilla JS frontend, no database, deployable on Vercel.

## Features
- Token-by-token streaming over Server-Sent Events (SSE) with a Stop button
- Three personas (assistant, coding tutor, interview coach) via system prompts
- Server-side input validation (Zod), rate limiting, Helmet, API key kept on the server
- Cancels the upstream model call when the client disconnects
- Safe markdown rendering (escape first, then format), chat history in localStorage
- Demo mode when no API key is set, plus automated tests (`npm test`)

## Run locally
```bash
npm install
cp .env.example .env     # add ANTHROPIC_API_KEY (or leave empty for demo mode)
npm run dev              # http://localhost:3000
npm test
```

## Deploy to Vercel
1. Push this folder to GitHub and import the repo in Vercel.
2. Add env var `ANTHROPIC_API_KEY` (optionally `MODEL`).
3. Deploy. `public/` is served statically, `api/index.js` runs the Express app.

## API
`POST /api/chat` with `{ "persona": "assistant", "messages": [{ "role": "user", "content": "Hi" }] }`
returns an SSE stream: `data: {"text":"..."}` ... `data: {"done":true}`.
`GET /api/health` returns status and whether demo mode is on.

## Structure
```
api/index.js          Vercel entry
public/               frontend (HTML, CSS, JS)
src/app.js            Express app, middleware
src/routes/chat.js    validation + SSE streaming
src/services/llm.js   model client, personas, demo mode
tests/                node:test integration tests
```
=======

