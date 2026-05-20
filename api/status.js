function getLocations() {
  try { return JSON.parse(process.env.DD_LOCATIONS || '[]'); }
  catch(e) { return []; }
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { locationId } = req.query;

  if (!locationId) {
    return res.status(200).json({
      service: 'DD Wizard API',
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  const loc = getLocations().find(l => l.id === locationId);
  if (!loc) return res.status(200).json({ locationId, licensed: false, reason: 'Not registered' });
  if (!loc.active) return res.status(200).json({ locationId, licensed: false, reason: 'Inactive' });

  return res.status(200).json({
    locationId,
    licensed: true,
    name: loc.name,
    features: { aiValidation: !!process.env.GEMINI_API_KEY, pdfGeneration: false }
  });
}
