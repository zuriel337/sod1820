export default function handler(req, res) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const path = req.url || "";
  console.warn(`[honeypot] blocked probe: ip=${ip} path=${path} ua=${req.headers["user-agent"] || "-"}`);
  res.status(403).end();
}
