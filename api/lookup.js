/**
 * DD WIZARD — Contact Lookup Endpoint
 * GET /api/lookup?email=xxx&locationId=xxx
 * 
 * GHL custom fields on contacts only have {id, value} — no key.
 * So we fetch field definitions from /locations/:id/customFields
 * to build an ID→key mapping, then translate.
 */

const https = require('https');

function getLocations() {
  try { return JSON.parse(process.env.DD_LOCATIONS || '[]'); }
  catch(e) { return []; }
}

function validateLicense(locationId) {
  var locations = getLocations();
  var loc = locations.find(function(l) { return l.id === locationId; });
  if (!loc) return { valid: false, reason: 'Location not found' };
  if (!loc.active) return { valid: false, reason: 'License inactive' };
  if (!loc.pit) return { valid: false, reason: 'No API token configured' };
  return { valid: true, location: loc };
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

    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!locationId) return res.status(400).json({ error: 'Location ID is required' });

    var license = validateLicense(locationId);
    if (!license.valid) {
      return res.status(403).json({ error: 'License validation failed', reason: license.reason });
    }
    var pit = license.location.pit;

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

    var searchRes = await ghlGet(
      '/contacts/?locationId=' + locationId + '&query=' + encodeURIComponent(email) + '&limit=1',
      pit
    );
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

    if (ddCount === 0) {
      return res.status(404).json({ error: 'Client found but no DD data on file.' });
    }

    return res.status(200).json({
      success: true,
      contact: ddFields,
      contactId: contactId,
      fieldCount: ddCount
    });

  } catch(e) {
    console.error('[Lookup] Error:', e.message);
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
