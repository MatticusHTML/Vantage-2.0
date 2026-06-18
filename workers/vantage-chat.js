/**
 * VANTAGE Chat Proxy — Cloudflare Worker
 *
 * Browser (GitHub Pages) → this Worker → OpenRouter
 * API key lives ONLY in Worker secrets: OPENROUTER_API_KEY
 *
 * Deploy: paste into Cloudflare dashboard, or use wrangler.toml in this folder.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
const ALLOWED_MODELS = new Set([
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-pro",
]);

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 32000;
const MAX_TOKENS_DEFAULT = 800;
const MAX_TOKENS_CAP = 1200;
const VALID_ROLES = new Set(["system", "user", "assistant"]);

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      if (!cors) return new Response(null, { status: 403 });
      return new Response(null, { headers: cors });
    }

    if (request.method === "GET") {
      return json({ ok: true, service: "vantage-chat", model: DEFAULT_MODEL }, 200, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    if (!cors) {
      return json({ error: "Origin not allowed" }, 403);
    }

    if (env.SQUAD_TOKEN) {
      const token = request.headers.get("X-Squad-Token") || "";
      if (token !== env.SQUAD_TOKEN) {
        return json({ error: "Unauthorized" }, 401, cors);
      }
    }

    if (!env.OPENROUTER_API_KEY) {
      return json({ error: "Server misconfigured: missing OPENROUTER_API_KEY" }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    let messages;
    try {
      messages = sanitizeMessages(body.messages);
    } catch (err) {
      return json({ error: err.message || "Invalid messages" }, 400, cors);
    }

    let model = typeof body.model === "string" ? body.model : DEFAULT_MODEL;
    if (!ALLOWED_MODELS.has(model)) model = DEFAULT_MODEL;

    const maxTokens = Math.min(
      Math.max(Number(body.max_tokens) || MAX_TOKENS_DEFAULT, 64),
      MAX_TOKENS_CAP
    );

    const referer = primaryOrigin(env) || "https://github.io";

    try {
      const upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": referer,
          "X-Title": "VANTAGE",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: clampNumber(body.temperature, 0, 1.2, 0.7),
        }),
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        const msg =
          data?.error?.message ||
          data?.error ||
          `OpenRouter returned ${upstream.status}`;
        return json({ error: "Upstream error", detail: String(msg) }, upstream.status, cors);
      }

      return json(data, 200, cors);
    } catch (err) {
      return json({ error: "Upstream request failed" }, 502, cors);
    }
  },
};

function allowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function primaryOrigin(env) {
  const list = allowedOrigins(env);
  return list[0] || "";
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins(env);
  if (!allowed.length) return null;
  if (origin && allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Squad-Token",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  if (!origin && request.method === "GET") {
    return {
      "Access-Control-Allow-Origin": allowed[0],
      "Content-Type": "application/json",
    };
  }
  return null;
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages array required");
  }
  const slice = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  const out = [];
  for (const m of slice) {
    if (!m || typeof m !== "object") continue;
    if (!VALID_ROLES.has(m.role)) continue;
    if (typeof m.content !== "string") continue;
    const content = m.content.slice(0, MAX_MESSAGE_CHARS);
    if (!content.trim()) continue;
    out.push({ role: m.role, content });
  }
  if (!out.length) throw new Error("No valid messages after sanitization");
  const hasUser = out.some((m) => m.role === "user");
  if (!hasUser) throw new Error("At least one user message required");
  return out;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function json(obj, status = 200, cors = {}) {
  const headers = { "Content-Type": "application/json", ...cors };
  return new Response(JSON.stringify(obj), { status, headers });
}
