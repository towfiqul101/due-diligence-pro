/**
 * Diagnostic endpoint — checks env vars, Supabase connection, and GHL token.
 * GET /api/test-connection
 * Remove or gate this endpoint before going to production.
 */

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      DD_LOCATIONS: process.env.DD_LOCATIONS || 'NOT SET',
    }
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test Supabase connection
  try {
    const { createClient } = require('@supabase/supabase-js');
    if (!supabaseUrl || !supabaseKey) {
      results.supabase = { connected: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars' };
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('dd_tenants')
        .select('id, slug, location_id, status, ghl_pit, firm_name')
        .limit(10);

      results.supabase = {
        connected: !error,
        url: supabaseUrl,
        error: error?.message || null,
        tenants: data ? data.map(function(t) {
          return {
            id: t.id,
            slug: t.slug,
            location_id: t.location_id,
            status: t.status,
            firm_name: t.firm_name,
            has_pit: !!t.ghl_pit,
            pit_preview: t.ghl_pit ? (String(t.ghl_pit).substring(0, 8) + '...') : null
          };
        }) : []
      };
    }
  } catch (e) {
    results.supabase = { connected: false, error: e.message };
  }

  // Test GHL connection for the demo location
  const TEST_LOCATION = 'q9VHwhujUYrTkiqenfhm';
  try {
    const { createClient } = require('@supabase/supabase-js');
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: tenant, error } = await supabase
        .from('dd_tenants')
        .select('id, ghl_pit, location_id, firm_name')
        .eq('location_id', TEST_LOCATION)
        .eq('status', 'active')
        .single();

      if (error || !tenant) {
        results.ghl = { error: 'Tenant not found for location ' + TEST_LOCATION + (error ? ': ' + error.message : '') };
      } else if (!tenant.ghl_pit) {
        results.ghl = { error: 'ghl_pit is NULL for tenant ' + tenant.id + ' (' + tenant.firm_name + '). Set it in Supabase dd_tenants.' };
      } else {
        const ghlRes = await fetch(
          'https://services.leadconnectorhq.com/locations/' + tenant.location_id,
          {
            headers: {
              'Authorization': 'Bearer ' + tenant.ghl_pit,
              'Version': '2021-07-28',
              'Accept': 'application/json'
            }
          }
        );
        const ghlBody = await ghlRes.json().catch(function() { return {}; });
        results.ghl = {
          location_id: TEST_LOCATION,
          tenant_id: tenant.id,
          firm_name: tenant.firm_name,
          pit_set: true,
          status: ghlRes.status,
          ok: ghlRes.ok,
          location_name: ghlBody.location?.name || ghlBody.name || null,
          error: ghlRes.ok ? null : (ghlBody.message || 'GHL returned ' + ghlRes.status)
        };
      }
    } else {
      results.ghl = { error: 'Cannot test GHL — Supabase env vars missing' };
    }
  } catch (e) {
    results.ghl = { error: e.message };
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(results);
};
