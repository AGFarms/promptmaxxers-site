/**
 * PromptMaxxers — Cal.com booking webhook → Telegram notification.
 *
 * Route: POST /cal  (custom domain: webhook.promptmaxxers.com/cal)
 * Verifies HMAC-SHA256 signature from Cal.com using shared secret CAL_WEBHOOK_SECRET,
 * formats a 5-line booking summary, posts to Telegram Bot API.
 *
 * Also: POST /click — lightweight beacon endpoint for landing-page click telemetry (no PII).
 *
 * Secrets (set via `wrangler secret put`):
 *   CAL_WEBHOOK_SECRET   — random 32+ hex; matches the secret you paste into Cal.com webhook config
 *   TELEGRAM_BOT_TOKEN   — bot token from BotFather
 *   TELEGRAM_CHAT_ID     — destination chat / channel id (numeric or @channel)
 */

interface Env {
  CAL_WEBHOOK_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

const ALLOWLIST = new Set<string>([
  "api.telegram.org"
]);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response("promptmaxxers webhook ok", { status: 200 });
    }

    if (req.method === "POST" && url.pathname === "/cal") {
      return handleCal(req, env);
    }

    if (req.method === "POST" && url.pathname === "/click") {
      return handleClick(req, env);
    }

    return new Response("not found", { status: 404 });
  }
};

// ---------- Cal.com booking webhook ----------

async function handleCal(req: Request, env: Env): Promise<Response> {
  const raw = await req.text();

  // Cal.com signs payloads as: X-Cal-Signature-256: <hex>  (sha256 hmac, hex digest only — no algorithm prefix)
  // See https://cal.com/docs/developing/guides/automation/webhooks
  const sigHeader = req.headers.get("x-cal-signature-256") || "";
  const ok = await verifyHmac(env.CAL_WEBHOOK_SECRET, raw, sigHeader);
  if (!ok) {
    return new Response("bad signature", { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); }
  catch { return new Response("bad json", { status: 400 }); }

  const trigger = body?.triggerEvent || "UNKNOWN";
  const p = body?.payload || {};

  // Only alert on monetarily-interesting events. Cal.com fires BOOKING_PAID once Stripe confirms,
  // BOOKING_CREATED for free events, etc.
  const interesting = new Set([
    "BOOKING_CREATED",
    "BOOKING_PAID",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED"
  ]);
  if (!interesting.has(trigger)) {
    return new Response("ignored", { status: 200 });
  }

  const attendee = (p.attendees && p.attendees[0]) || {};
  const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(" ") || attendee.name || "Someone";
  const email = attendee.email || "(no email)";
  const tz = attendee.timeZone || p?.organizer?.timeZone || "UTC";
  const title = p.title || p.type || "Booking";
  const start = formatWhen(p.startTime, tz);
  const end = formatWhen(p.endTime, tz);
  const uid = p.uid || p.bookingId || "";
  const amt = p?.paymentInfo?.amount;
  const cur = (p?.paymentInfo?.currency || "usd").toUpperCase();
  const paid = (typeof amt === "number") ? `$${(amt / 100).toFixed(2)} ${cur}` : "—";

  const emoji =
    trigger === "BOOKING_PAID" ? "💰" :
    trigger === "BOOKING_CREATED" ? "📅" :
    trigger === "BOOKING_RESCHEDULED" ? "🔄" :
    trigger === "BOOKING_CANCELLED" ? "❌" : "•";

  const lines = [
    `${emoji} [promptmaxxers] ${trigger}`,
    `${name} — ${title}`,
    `🗓 ${start} → ${end} (${tz})`,
    `💰 ${paid}`,
    `✉️ ${email}` + (uid ? `   🔗 cal.com/booking/${uid}` : "")
  ];

  await postTelegram(env, lines.join("\n"));
  return new Response("ok", { status: 200 });
}

function formatWhen(iso: string | undefined, tz: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(d);
  } catch {
    return iso;
  }
}

// ---------- Click telemetry (sendBeacon target) ----------

async function handleClick(req: Request, env: Env): Promise<Response> {
  // No PII. We just count clicks on Stripe/Cal CTAs.
  // Best-effort: parse, log to Telegram in batches via a future KV-backed flusher (v0.2).
  // For v0.1, drop the body — return 204 fast so the beacon doesn't slow nav.
  try { await req.text(); } catch {}
  return new Response(null, { status: 204 });
}

// ---------- HMAC + Telegram ----------

async function verifyHmac(secret: string, body: string, signatureHex: string): Promise<boolean> {
  if (!secret || !signatureHex) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = hexToBytes(signatureHex);
  if (!sig) return false;
  return await crypto.subtle.verify("HMAC", key, sig, enc.encode(body));
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().replace(/^sha256=/, "");
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

async function postTelegram(env: Env, text: string): Promise<void> {
  const host = "api.telegram.org";
  if (!ALLOWLIST.has(host)) return; // safety: enforce egress allowlist
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

  const url = `https://${host}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  });
}
