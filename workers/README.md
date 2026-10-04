# VANTAGE Chat Worker

Cloudflare Worker proxy: **GitHub Pages → OpenRouter** (`deepseek/deepseek-v4-flash`).

The OpenRouter API key **never** goes in this repo or in `vantage.js`.

---

## 1. Rotate your API key (if it was pasted in chat)

If your OpenRouter key was shared in Discord, Cursor, or screenshots:

1. [OpenRouter → Keys](https://openrouter.ai/keys)
2. **Revoke** the exposed key
3. Create a **new** key named `vantage-chat`
4. Use the new key only in Cloudflare (step 3 below)

---

## 2. Cloudflare Dashboard setup

1. **Workers & Pages** → your worker → **Edit code**
2. Replace the Hello World script with the contents of [`vantage-chat.js`](vantage-chat.js)
3. **Save and deploy**

### Environment variables

**Settings → Variables and Secrets**

| Name | Type | Value |
|------|------|--------|
| `OPENROUTER_API_KEY` | **Secret** (Encrypt) | Your `sk-or-v1-...` key |
| `ALLOWED_ORIGINS` | Plain text | `https://YOUR_USERNAME.github.io` |

For local Live Server testing, add a second origin (comma-separated):

```text
https://YOUR_USERNAME.github.io,http://127.0.0.1:5500
```

Optional squad gate:

| Name | Type | Value |
|------|------|--------|
| `SQUAD_TOKEN` | Secret | Shared password the site sends as `X-Squad-Token` |

**Save and deploy** after every variable change.

---

## 3. Test before wiring the website

Replace `YOUR_WORKER_URL` with your workers.dev URL.

### Health check

```powershell
curl "https://YOUR_WORKER_URL.workers.dev"
```

Expected: `{"ok":true,"service":"vantage-chat","model":"deepseek/deepseek-v4-flash"}`

### Chat test

```powershell
curl -X POST "https://YOUR_WORKER_URL.workers.dev" `
  -H "Content-Type: application/json" `
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in one sentence as a tactical coach.\"}]}"
```

Expected: JSON with `choices[0].message.content`.

---

## 4. Wrangler CLI (optional)

From this `workers/` folder:

```powershell
npm create cloudflare@latest . -- --type=hello-world
# Or if already initialized:
npm install -D wrangler
copy .dev.vars.example .dev.vars
# Edit .dev.vars with your key (local only)
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

Edit `wrangler.toml` → set `ALLOWED_ORIGINS` to your real GitHub Pages origin.

---

## Security built into the script

- **POST only** for chat (GET is health check only)
- **CORS** locked to `ALLOWED_ORIGINS` (no `*` wildcard)
- **Model allowlist** — only DeepSeek V4 Flash / Pro; unknown models fall back to Flash
- **Message sanitization** — roles, length caps, no empty payloads
- **Context retention** — preserves the system prompt plus up to 23 recent conversation messages; system context is accepted intact up to 160,000 characters, with larger contexts rejected instead of silently cut
- **max_tokens** capped at 1200
- Optional **SQUAD_TOKEN** header gate

---

## Updating the chat context fix

Publish the website files through GitHub Desktop as usual, and separately replace the code in the existing **vantagesecurity** Cloudflare Worker with `workers/vantage-chat.js`, then **Save and deploy**. A GitHub Pages publish does not deploy the Worker. Preserve its existing secrets and origin settings; `wrangler.toml` still contains setup placeholders.

The website sends operator and recent-match rows with shared column schemas, preserving all their values while reducing context size. Closed player and squad season reports are included automatically. Conversation history resets on the next question after switching seasons.

The final Y11S2 OVERSIGHT context also includes both related accounts, the verified seven-account summary, and probable shared-session evidence. The current prompt is about 113,000 characters; the seven-player growth fixture with 77 operators, 17 maps, and 40-sentence reviews is about 131,000. The 160,000-character cap accommodates both without changing the supplied stats or truncating the final review.

Run the local context checks from the repo root with `node --test tools/chat_context.test.mjs`. These checks use mocked upstream responses and do not call OpenRouter.

---

## Next step

When curl works, tell VANTAGE:

> Wire OVERSIGHT chat to `https://YOUR_WORKER_URL.workers.dev`
