/**
 * DD WIZARD — Contact Lookup Endpoint
 * GET /api/lookup?email=xxx&locationId=xxx
 * 
 * GHL custom fields on contacts only have {id, value} — no key.
 * So we fetch field definitions from /locations/:id/customFields
 * to build an ID→key mapping, then translate.
 */

const https = require('https');

async function isLocationValid(locationId) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('dd_tenants')
      .select('id, ghl_pit, firm_name')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .single();
    if (data) {
      console.log('[Location] Tenant found:', data.id, 'PIT:', data.ghl_pit ? 'SET' : 'MISSING');
      return { valid: true, tenant: data };
    }
    console.log('[Location] Not found in Supabase, checking DD_LOCATIONS fallback');
    const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
    const found = locations.find(function(l) { return l.locationId === locationId; });
    if (found) return { valid: true, tenant: found };
    return { valid: false };
  } catch (err) {
    console.error('[Location] Supabase error:', err.message, '— trying DD_LOCATIONS fallback');
    try {
      const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
      const found = locations.find(function(l) { return l.locationId === locationId; });
      if (found) return { valid: true, tenant: found };
    } catch(e) {}
    return { valid: false };
  }
}

function ghlGet(path, pit) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + pit,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          reject(new Error('Bad JSON from GHL (' + res.statusCode + '): ' + data.substring(0, 200)));
        }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.end();
  });
}

// Cache field mappings per location (lives for duration of lambda)
var fieldMapCache = {};

async function getFieldMap(locationId, pit) {
  if (fieldMapCache[locationId]) return fieldMapCache[locationId];
  
  var res = await ghlGet('/locations/' + locationId + '/customFields', pit);
  if (!res.ok) throw new Error('Cannot fetch field definitions: ' + res.status);
  
  var map = {};
  var fields = res.data.customFields || res.data || [];
  if (Array.isArray(fields)) {
    fields.forEach(function(f) {
      var key = f.fieldKey || f.key || '';
      // GHL prefixes fieldKey with "contact." — strip it
      if (key.startsWith('contact.')) key = key.substring(8);
      if (key && f.id) {
        map[f.id] = key;
      }
    });
  }
  
  fieldMapCache[locationId] = map;
  return map;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var email = req.query.email;
    var locationId = req.query.locationId;

    console.log('LOOKUP called with:', { locationId, email });

    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!locationId) return res.status(400).json({ error: 'Location ID is required' });

    var license = await isLocationValid(locationId);
    if (!license.valid) {
      return res.status(403).json({ error: 'License validation failed', reason: 'Not licensed' });
    }
    console.log('Tenant from Supabase:', JSON.stringify(license.tenant));
    var pit = license.tenant.ghl_pit || license.tenant.pit;
    console.log('GHL PIT:', pit ? 'SET' : 'MISSING');
    console.log('[Lookup] loc=' + locationId + ' PIT=' + (pit ? 'SET' : 'MISSING'));
    if (!pit) return res.status(500).json({ error: 'GHL token not configured for this location. Set ghl_pit in dd_tenants.' });

    // ===== STEP 1: Build field ID → key mapping =====
    var fieldMap;
    try {
      fieldMap = await getFieldMap(locationId, pit);
      console.log('[Lookup] Field map loaded:', Object.keys(fieldMap).length, 'fields');
    } catch(e) {
      console.error('[Lookup] Field map error:', e.message);
      return res.status(502).json({ error: 'Cannot load custom field definitions. Check token scopes.' });
    }

    // ===== STEP 2: Find contact by email =====
    var contactId = null;

    var searchPath = '/contacts/?locationId=' + locationId + '&query=' + encodeURIComponent(email) + '&limit=1';
    console.log('GHL search URL:', 'https://services.leadconnectorhq.com' + searchPath);
    var searchRes = await ghlGet(searchPath, pit);
    console.log('GHL response status:', searchRes.status, 'contacts:', searchRes.data?.contacts?.length || 0);
    if (searchRes.ok && searchRes.data.contacts && searchRes.data.contacts.length > 0) {
      contactId = searchRes.data.contacts[0].id;
    }

    if (!contactId) {
      var dupRes = await ghlGet(
        '/contacts/search/duplicate?locationId=' + locationId + '&email=' + encodeURIComponent(email),
        pit
      );
      if (dupRes.ok && dupRes.data.contact) {
        contactId = dupRes.data.contact.id;
      }
    }

    if (!contactId) {
      return res.status(404).json({ error: 'No client found with this email.' });
    }

    // ===== STEP 3: Fetch full contact =====
    var contactRes = await ghlGet('/contacts/' + contactId, pit);
    if (!contactRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch contact: ' + contactRes.status });
    }
    var contact = contactRes.data.contact || contactRes.data;

    // ===== STEP 4: Map custom field IDs to keys and extract dd_ values =====
    var ddFields = {};
    ddFields.name = contact.name || contact.contactName || '';
    ddFields.email = contact.email || '';
    ddFields.phone = contact.phone || '';

    var rawCF = contact.customFields || [];
    if (Array.isArray(rawCF)) {
      rawCF.forEach(function(cf) {
        var fieldKey = fieldMap[cf.id] || '';
        if (fieldKey.startsWith('dd_')) {
          var val = cf.value;
          if (Array.isArray(val)) {
            ddFields[fieldKey] = val.join(', ');
          } else if (val !== null && val !== undefined && val !== '') {
            ddFields[fieldKey] = String(val);
          }
        }
      });
    }

    var ddCount = Object.keys(ddFields).filter(function(k) { return k.startsWith('dd_'); }).length;
    console.log('[Lookup] Extracted', ddCount, 'dd_ fields for', ddFields.name || email);

    return res.status(200).json({
      success: true,
      contact: ddFields,
      contactId: contactId,
      fieldCount: ddCount,
      noData: ddCount === 0
    });

  } catch(e) {
    console.error('[Lookup] Error:', e.message);
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
