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
// Actual GHL fieldKey format: contact.ti__<name> (double underscore after ti)
var TI_TO_DD_MAP = {
  'ti__first_name':                 'dd_client_name_first',
  'ti__last_name':                  'dd_client_name_last',
  'ti__date_of_birth':              'dd_client_dob',
  'ti__filing_status':              'dd_filing_status',
  'ti__email':                      'dd_client_email',
  'ti__phone':                      'dd_client_phone',
  'ti__ever_denied_eitc':           'dd_eic_prior_denial',
  'ti__hoh_unmarried_confirmation': 'dd_hoh_married',
  'ti__self_employed':              'dd_self_employed',
  'ti__business_type':              'dd_se_business_type',
  'ti__num_dependents':             'dd_dependent_count',
  'ti__has_dependents':             'dd_has_dependents',
};

// Dependent fields for 1-10
for (var _n = 1; _n <= 10; _n++) {
  TI_TO_DD_MAP['ti__dependent_' + _n + '_name']          = 'dd_dep_' + _n + '_name';
  TI_TO_DD_MAP['ti__dependent_' + _n + '_dob']           = 'dd_dep_' + _n + '_dob';
  TI_TO_DD_MAP['ti__dependent_' + _n + '_ssn']           = 'dd_dep_' + _n + '_ssn_last_4';
  TI_TO_DD_MAP['ti__dependent_' + _n + '_relationship']  = 'dd_dep_' + _n + '_relationship';
  TI_TO_DD_MAP['ti__dependent_' + _n + '_months_in_home']= 'dd_dep_' + _n + '_residency_months';
  TI_TO_DD_MAP['ti__dependent_' + _n + '_in_school']     = 'dd_dep_' + _n + '_in_school';
  TI_TO_DD_MAP['ti__dependent_' + _n + '_disabled']      = 'dd_dep_' + _n + '_disabled';
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

  console.log('PREFILL called with:', { loc, contactId: req.query.contactId });

  if (!loc) return res.status(400).json({ error: 'Missing loc param' });
  if (!contactId) return res.status(400).json({ error: 'Missing contactId param' });

  var locResult = await isLocationValid(loc);
  if (!locResult.valid) return res.status(403).json({ error: 'Location not registered or not active' });

  console.log('Tenant found:', JSON.stringify(locResult.tenant));
  var pit = locResult.tenant.ghl_pit || locResult.tenant.pit;
  console.log('[Prefill] loc=' + loc + ' PIT=' + (pit ? 'SET(' + String(pit).substring(0,8) + '...)' : 'MISSING') + ' contactId=' + contactId);
  if (!pit) return res.status(500).json({ error: 'GHL token not configured for this location. Set ghl_pit in dd_tenants.' });

  try {
    var fieldMap = await getFieldMap(loc, pit);

    var ghlContactUrl = 'https://services.leadconnectorhq.com/contacts/' + encodeURIComponent(contactId);
    console.log('GHL fetch URL:', ghlContactUrl);
    var contactRes = await ghlGet('/contacts/' + encodeURIComponent(contactId), pit);
    console.log('GHL response status:', contactRes.status);
    if (!contactRes.ok) {
      console.error('GHL contact fetch failed:', JSON.stringify(contactRes.data).substring(0, 300));
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
    for (var i = 1; i <= 10; i++) {
      // TI sends full dependent name as a single field
      if (raw['dd_dep_' + i + '_name']) {
        prefill['dd_dep_' + i + '_name'] = raw['dd_dep_' + i + '_name'];
      }

      var depDob = raw['dd_dep_' + i + '_dob'];
      if (depDob) prefill['dd_dep_' + i + '_dob'] = depDob;

      var depSsn = raw['dd_dep_' + i + '_ssn_last_4'];
      if (depSsn) prefill['dd_dep_' + i + '_ssn_last_4'] = depSsn;

      var depRel = raw['dd_dep_' + i + '_relationship'];
      if (depRel) prefill['dd_dep_' + i + '_relationship'] = depRel;

      var depResMonths = raw['dd_dep_' + i + '_residency_months'];
      if (depResMonths) prefill['dd_dep_' + i + '_residency'] = normalizeResidency(depResMonths);

      var depInSchool = raw['dd_dep_' + i + '_in_school'];
      var depDisabled = raw['dd_dep_' + i + '_disabled'];
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
