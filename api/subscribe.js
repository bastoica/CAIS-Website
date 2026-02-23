module.exports = async function handler(req, res) {
  // CORS — allow production domain and Vercel preview deployments
  const origin = req.headers.origin || "";
  const isAllowed =
    origin === "https://caisconf.org" ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost:");

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, name, affiliation } = req.body || {};

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required." });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    console.error("BUTTONDOWN_API_KEY is not set");
    return res.status(500).json({ ok: false, error: "Server configuration error." });
  }

  // Forward visitor IP for Buttondown spam detection
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || undefined;

  try {
    const payload = {
      email_address: email,
      type: "regular",
    };
    if (ip) {
      payload.ip_address = ip;
    }
    if (name && typeof name === "string" && name.trim()) {
      payload.metadata = { name: name.trim() };
    }
    if (affiliation && typeof affiliation === "string" && affiliation.trim()) {
      payload.tags = [affiliation.trim()];
    }

    const response = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return res.status(200).json({ ok: true });
    }

    // Buttondown returns 409 if already subscribed — treat as success
    if (response.status === 409) {
      return res.status(200).json({ ok: true });
    }

    const body = await response.text();
    console.error(`Buttondown API error ${response.status}: ${body}`);
    return res.status(502).json({ ok: false, error: "Subscription failed. Please try again." });
  } catch (err) {
    console.error("Buttondown API request failed:", err);
    return res.status(502).json({ ok: false, error: "Subscription failed. Please try again." });
  }
};
