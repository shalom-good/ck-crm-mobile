// Roughly where this visitor is, from the connection (Vercel's own headers).
// Used only to preselect the donor's area on "Where should it land?".
// Nothing is stored and nothing is sent anywhere else.
export default function handler(req, res) {
  const h = req.headers || {};
  const dec = (v) => { try { return decodeURIComponent(String(v || "")); } catch { return String(v || ""); } };
  res.setHeader("cache-control", "private, no-store");
  res.status(200).json({
    country: dec(h["x-vercel-ip-country"]) || null,
    state: dec(h["x-vercel-ip-country-region"]) || null,
    city: dec(h["x-vercel-ip-city"]) || null,
  });
}
