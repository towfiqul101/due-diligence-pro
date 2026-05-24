/**
 * DD Pro — TaxIntake Pre-fill Endpoint
 * GET /api/prefill?loc=LOCATION_ID&contactId=CONTACT_ID
 *
 * Fetches a GHL contact (created by TaxIntake Pro) and maps TI- prefixed
 * custom fields to DD- field keys for wizard pre-population.
 */

const https = require('https');

async function isLocationValid(locationId) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
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
      if (key.startsWith('contact.')) key = key.substring(8);
      if (key && f.id) map[f.id] = key;
    });
  }
  fieldMapCache[locationId] = map;
  return map;
}

// TaxIntake Pro GHL field key → DD field key mapping.
// TI field keys follow GHL convention: lowercase snake_case, e.g. "TI - First Name" → ti_first_name
var TI_TO_DD_MAP = {
  'ti_first_name':           'dd_client_name_first',
  'ti_last_name':            'dd_client_name_last',
  'ti_dob':                  'dd_client_dob',
  'ti_filing_status':        'dd_filing_status',
  'ti_email':                'dd_client_email',
  'ti_phone':                'dd_client_phone',
  'ti_eitc_denied_prior':    'dd_eic_prior_denial',
  'ti_hoh_qualifier':        'dd_hoh_qualifying_person',
  'ti_self_employment':      'dd_self_employed',
  'ti_se_business_type':     'dd_se_business_type',
  'ti_number_of_dependents': 'dd_dependent_count',
  'ti_has_dependents':       'dd_has_dependents',
};

// Dependent fields for 1-8
for (var _n = 1; _n <= 8; _n++) {
  TI_TO_DD_MAP['ti_dep' + _n + '_first_name']   = 'dd_dep_' + _n + '_name_first';
  TI_TO_DD_MAP['ti_dep' + _n + '_last_name']    = 'dd_dep_' + _n + '_name_last';
  TI_TO_DD_MAP['ti_dep' + _n + '_dob']          = 'dd_dep_' + _n + '_dob';
  TI_TO_DD_MAP['ti_dep' + _n + '_ssn']          = 'dd_dep_' + _n + '_ssn_last_4';
  TI_TO_DD_MAP['ti_dep' + _n + '_relationship'] = 'dd_dep_' + _n + '_relationship';
  TI_TO_DD_MAP['ti_dep' + _n + '_months_home']  = 'dd_dep_' + _n + '_residency_months';
  TI_TO_DD_MAP['ti_dep' + _n + '_school']       = 'dd_dep_' + _n + '_in_school';
  TI_TO_DD_MAP['ti_dep' + _n + '_disabled']     = 'dd_dep_' + _n + '_disabled';
}

// Months → Yes/No for residency fields
function normalizeResidency(val) {
  if (!val) return '';
  var months = parseInt(val, 10);
  if (!isNaN(months)) return months >= 6 ? 'Yes' : 'No';
  return val; // already Yes/No/Not Sure
}

function normalizeYesNo(val) {
  if (!val) return val;
  var v = String(val).toLowerCase().trim();
  if (v === 'yes' || v === 'true' || v === '1') return 'Yes';
  if (v === 'no' || v === 'false' || v === '0') return 'No';
  return val;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  var loc = req.query.loc;
  var contactId = (req.query.contactId || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);

  if (!loc) return res.status(400).json({ error: 'Missing loc param' });
  if (!contactId) return res.status(400).json({ error: 'Missing contactId param' });

  var locResult = await isLocationValid(loc);
  if (!locResult.valid) return res.status(403).json({ error: 'Location not registered or not active' });

  var pit = locResult.tenant.ghl_pit || locResult.tenant.pit;
  console.log('[Prefill] loc=' + loc + ' PIT=' + (pit ? 'SET(' + String(pit).substring(0,8) + '...)' : 'MISSING') + ' contactId=' + contactId);
  if (!pit) return res.status(500).json({ error: 'GHL token not configured for this location. Set ghl_pit in dd_tenants.' });

  try {
    var fieldMap = await getFieldMap(loc, pit);

    var contactRes = await ghlGet('/contacts/' + encodeURIComponent(contactId), pit);
    if (!contactRes.ok) {
      return res.status(contactRes.status === 404 ? 404 : 502).json({
        error: 'Contact not found in GHL'
      });
    }
    var contact = contactRes.data.contact || contactRes.data;

    // Translate custom field IDs → keys → values
    var tiFields = {};
    var rawCF = contact.customFields || [];
    if (Array.isArray(rawCF)) {
      rawCF.forEach(function(cf) {
        var key = fieldMap[cf.id] || '';
        if (key && cf.value !== null && cf.value !== undefined && cf.value !== '') {
          tiFields[key] = Array.isArray(cf.value) ? cf.value.join(', ') : String(cf.value);
        }
      });
    }

    // Apply TI → DD mapping
    var raw = {};
    Object.keys(TI_TO_DD_MAP).forEach(function(tiKey) {
      var ddKey = TI_TO_DD_MAP[tiKey];
      if (tiFields[tiKey] !== undefined) raw[ddKey] = tiFields[tiKey];
    });

    var prefill = {};
    var missing = [];

    // Client name: combine first + last, fall back to GHL native name
    var firstName = raw.dd_client_name_first || '';
    var lastName  = raw.dd_client_name_last  || '';
    if (firstName || lastName) {
      prefill.dd_client_name = (firstName + ' ' + lastName).trim();
    } else if (contact.name || contact.contactName) {
      prefill.dd_client_name = (contact.name || contact.contactName).trim();
    } else {
      missing.push('dd_client_name');
    }

    // Email / phone: TI field first, fall back to GHL native
    if (raw.dd_client_email) prefill.dd_client_email = raw.dd_client_email;
    else if (contact.email) prefill.dd_client_email = contact.email;
    else missing.push('dd_client_email');

    if (raw.dd_client_phone) prefill.dd_client_phone = raw.dd_client_phone;
    else if (contact.phone) prefill.dd_client_phone = contact.phone;
    else missing.push('dd_client_phone');

    // Scalar fields
    if (raw.dd_client_dob)    prefill.dd_client_dob    = raw.dd_client_dob;
    else missing.push('dd_client_dob');

    if (raw.dd_filing_status) prefill.dd_filing_status = raw.dd_filing_status;
    else missing.push('dd_filing_status');

    if (raw.dd_eic_prior_denial)       prefill.dd_eic_prior_denial      = normalizeYesNo(raw.dd_eic_prior_denial);
    if (raw.dd_hoh_qualifying_person)  prefill.dd_hoh_qualifying_person = raw.dd_hoh_qualifying_person;
    if (raw.dd_has_dependents)         prefill.dd_has_dependents        = normalizeYesNo(raw.dd_has_dependents);
    if (raw.dd_dependent_count)        prefill.dd_dependent_count       = raw.dd_dependent_count;
    if (raw.dd_self_employed)          prefill.dd_self_employed         = normalizeYesNo(raw.dd_self_employed);
    if (raw.dd_se_business_type)       prefill.dd_se_business_type      = raw.dd_se_business_type;

    // Dependents
    for (var i = 1; i <= 8; i++) {
      var depFirst = raw['dd_dep_' + i + '_name_first'] || '';
      var depLast  = raw['dd_dep_' + i + '_name_last']  || '';
      if (depFirst || depLast) {
        prefill['dd_dep_' + i + '_name'] = (depFirst + ' ' + depLast).trim();
      }

      var depDob = raw['dd_dep_' + i + '_dob'];
      if (depDob) prefill['dd_dep_' + i + '_dob'] = depDob;

      var depSsn = raw['dd_dep_' + i + '_ssn_last_4'];
      if (depSsn) prefill['dd_dep_' + i + '_ssn_last_4'] = depSsn;

      var depRel = raw['dd_dep_' + i + '_relationship'];
      if (depRel) prefill['dd_dep_' + i + '_relationship'] = depRel;

      var depResMonths = raw['dd_dep_' + i + '_residency_months'];
      if (depResMonths) prefill['dd_dep_' + i + '_residency'] = normalizeResidency(depResMonths);

      // Age/disability status
      var depInSchool  = raw['dd_dep_' + i + '_in_school'];
      var depDisabled  = raw['dd_dep_' + i + '_disabled'];
      if (depInSchool && normalizeYesNo(depInSchool) === 'Yes') {
        prefill['dd_dep_' + i + '_age_status'] = '19-23 Full-Time Student';
      } else if (depDisabled && normalizeYesNo(depDisabled) === 'Yes') {
        prefill['dd_dep_' + i + '_age_status'] = 'Permanently Disabled';
      }
    }

    var contactName = prefill.dd_client_name || contact.name || contact.contactName || contactId;

    return res.status(200).json({
      success: true,
      contactId: contactId,
      contactName: contactName,
      prefill: prefill,
      source: 'taxintake',
      missingFields: missing
    });

  } catch(e) {
    console.error('[Prefill] Error:', e.message);
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
