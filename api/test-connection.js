/**
 * Diagnostic endpoint — checks env vars, Supabase, GHL scopes, and contacts.
 * GET /api/test-connection
 * GET /api/test-connection?email=client@email.com   (also tests contact lookup)
 */

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var testEmail = req.query.email || null;
  var results = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      DD_LOCATIONS: process.env.DD_LOCATIONS || 'NOT SET',
    },
    timestamp: new Date().toISOString()
  };

  var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  var tenantPit = null;
  var tenantLocationId = 'q9VHwhujUYrTkiqenfhm';

  // ── Supabase ────────────────────────────────────────────────────────────────
  try {
    var { createClient } = require('@supabase/supabase-js');
    if (!supabaseUrl || !supabaseKey) {
      results.supabase = { connected: false, error: 'Missing SUPABASE URL or SERVICE_ROLE_KEY' };
    } else {
      var supabase = createClient(supabaseUrl, supabaseKey);
      var { data, error } = await supabase
        .from('dd_tenants')
        .select('id, slug, location_id, status, ghl_pit, firm_name')
        .limit(10);

      results.supabase = {
        connected: !error,
        url: supabaseUrl,
        error: error ? error.message : null,
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

      // Grab the PIT for further GHL tests
      if (data) {
        var karvonix = data.find(function(t) { return t.location_id === tenantLocationId && t.status === 'active'; });
        if (karvonix) tenantPit = karvonix.ghl_pit;
      }
    }
  } catch (e) {
    results.supabase = { connected: false, error: e.message };
  }

  if (!tenantPit) {
    results.ghl = { error: 'No active tenant with PIT found for ' + tenantLocationId };
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(results);
  }

  var GHL_BASE = 'https://services.leadconnectorhq.com';
  var GHL_HEADERS = {
    'Authorization': 'Bearer ' + tenantPit,
    'Version': '2021-07-28',
    'Accept': 'application/json'
  };

  async function ghlFetch(path) {
    try {
      var r = await fetch(GHL_BASE + path, { headers: GHL_HEADERS });
      var body = await r.json().catch(function() { return {}; });
      return { status: r.status, ok: r.ok, body: body };
    } catch (e) {
      return { status: 0, ok: false, error: e.message };
    }
  }

  // ── GHL: location ping ───────────────────────────────────────────────────────
  var locRes = await ghlFetch('/locations/' + tenantLocationId);
  results.ghl_location = {
    status: locRes.status,
    ok: locRes.ok,
    name: locRes.body.location ? locRes.body.location.name : (locRes.body.name || null),
    error: locRes.ok ? null : (locRes.body.message || 'HTTP ' + locRes.status)
  };

  // ── GHL: custom fields (needed by lookup + prefill) ──────────────────────────
  var cfRes = await ghlFetch('/locations/' + tenantLocationId + '/customFields');
  results.ghl_custom_fields = {
    status: cfRes.status,
    ok: cfRes.ok,
    field_count: cfRes.ok ? (cfRes.body.customFields || []).length : null,
    error: cfRes.ok ? null : (cfRes.body.message || 'HTTP ' + cfRes.status),
    note: cfRes.ok ? null : 'SCOPE MISSING — token needs locations/customFields.readonly'
  };

  // ── GHL: contacts list (needed by lookup) ────────────────────────────────────
  var searchQuery = testEmail || 'test';
  var contactsRes = await ghlFetch('/contacts/?locationId=' + tenantLocationId + '&query=' + encodeURIComponent(searchQuery) + '&limit=3');
  results.ghl_contacts = {
    status: contactsRes.status,
    ok: contactsRes.ok,
    contacts_returned: contactsRes.ok ? (contactsRes.body.contacts || []).length : null,
    sample: contactsRes.ok && contactsRes.body.contacts && contactsRes.body.contacts.length > 0
      ? contactsRes.body.contacts.slice(0, 2).map(function(c) {
          return { id: c.id, name: c.name || c.contactName, email: c.email };
        })
      : null,
    error: contactsRes.ok ? null : (contactsRes.body.message || 'HTTP ' + contactsRes.status),
    note: contactsRes.ok ? null : 'SCOPE MISSING — token needs contacts.readonly'
  };

  // ── Summary ──────────────────────────────────────────────────────────────────
  results.summary = {
    supabase_ok: results.supabase.connected,
    ghl_location_ok: results.ghl_location.ok,
    ghl_custom_fields_ok: results.ghl_custom_fields.ok,
    ghl_contacts_ok: results.ghl_contacts.ok,
    ready_for_lookup: results.ghl_custom_fields.ok && results.ghl_contacts.ok,
    ready_for_prefill: results.ghl_custom_fields.ok,
    diagnosis: (function() {
      if (!results.supabase.connected) return 'FAIL: Supabase not connected';
      if (!results.ghl_location.ok) return 'FAIL: GHL PIT invalid or expired';
      if (!results.ghl_custom_fields.ok) return 'FAIL: GHL token missing locations/customFields.readonly scope';
      if (!results.ghl_contacts.ok) return 'FAIL: GHL token missing contacts.readonly scope';
      return 'ALL OK — if wizard still fails, check Vercel function logs for the specific error';
    })()
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(results);
};
