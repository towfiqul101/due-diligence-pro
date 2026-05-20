function getLocations() {
  try { return JSON.parse(process.env.DD_LOCATIONS || '[]'); }
  catch(e) { return []; }
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.query.key || req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.DD_ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const locations = getLocations().map(loc => ({
    ...loc,
    pit: loc.pit ? '***' + loc.pit.slice(-8) : 'not set'
  }));

  return res.status(200).json({
    total: locations.length,
    active: locations.filter(l => l.active).length,
    locations
  });
}
