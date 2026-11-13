// Feedback and ideas from inside the app, emailed to the owner.
// Sends through Resend when RESEND_API_KEY is set on this Vercel project.
// With no key it answers 501 and the app opens the person's own mail app
// instead, so a note is never silently dropped.
const TO = process.env.FEEDBACK_TO || "shalom@collectivekindness.net";
const FROM = process.env.FEEDBACK_FROM || "CK App <app@collectivekindness.net>";
const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const clip = (s, n) => String(s || "").trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const b = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const text = clip(b.text, 4000);
  if (text.length < 3) return res.status(400).json({ error: "empty" });
  if (clip(b.website, 200)) return res.status(200).json({ ok: true }); // honeypot
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(501).json({ error: "no_mailer", to: TO });
  const kind = clip(b.kind, 40) || "Feedback";
  const who = clip(b.who, 120) || "Someone using the app";
  const door = clip(b.door, 40) || "app";
  const reply = clip(b.reply, 200);
  const where = clip(b.where, 200);
  const html = `<p><b>${esc(kind)}</b> from ${esc(who)} (${esc(door)})</p><p style="white-space:pre-wrap">${esc(text)}</p><hr><p style="color:#666;font-size:13px">${reply ? `Reply to: ${esc(reply)}<br>` : "No reply address given.<br>"}${where ? `Screen: ${esc(where)}<br>` : ""}${esc(clip(req.headers["user-agent"], 200))}</p>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], subject: `CK app ${kind.toLowerCase()}: ${text.slice(0, 60)}`, html, ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply) ? { reply_to: reply } : {}) }),
    });
    if (!r.ok) return res.status(502).json({ error: "send_failed" });
    return res.status(200).json({ ok: true });
  } catch { return res.status(502).json({ error: "send_failed" }); }
}
