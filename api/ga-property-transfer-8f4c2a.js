// Temporary one-shot config bridge. GA property id is an identifier, not a credential.
export default function handler(req, res) {
  const propertyId = String(process.env.GA_PROPERTY_ID || '').trim();
  if (!propertyId) {
    res.status(500).json({ ok: false, configured: false });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, property_id: propertyId.replace(/^properties\//, '') });
}
