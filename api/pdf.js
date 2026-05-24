/**
 * DD WIZARD — PDF Generation Endpoint
 * GET /api/pdf?email=xxx&locationId=xxx
 * 
 * Generates a professional Due Diligence Worksheet PDF
 * from a contact's DD data. Uses the same lookup logic
 * as the lookup endpoint to fetch and map custom fields.
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
    if (data) return { valid: true, tenant: data };
    const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
    const found = locations.find(function(l) { return l.locationId === locationId; });
    if (found) return { valid: true, tenant: found };
    return { valid: false };
  } catch(err) {
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
    var req = https.request({
      hostname: 'services.leadconnectorhq.com', path: path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + pit, 'Version': '2021-07-28', 'Accept': 'application/json' }
    }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ ok: res.statusCode < 400, data: JSON.parse(d) }); }
        catch(e) { reject(new Error('Bad JSON')); }
      });
    });
    req.on('error', reject); req.end();
  });
}

// Cache
var _fieldMap = null;
async function getFieldMap(locationId, pit) {
  if (_fieldMap) return _fieldMap;
  var r = await ghlGet('/locations/' + locationId + '/customFields', pit);
  if (!r.ok) throw new Error('Cannot fetch fields');
  var map = {};
  (r.data.customFields || []).forEach(function(f) {
    var key = f.fieldKey || f.key || '';
    if (key.startsWith('contact.')) key = key.substring(8);
    if (key && f.id) map[f.id] = key;
  });
  _fieldMap = map;
  return map;
}

async function getContactDD(email, locationId, pit) {
  var fieldMap = await getFieldMap(locationId, pit);
  
  // Search
  var sr = await ghlGet('/contacts/?locationId=' + locationId + '&query=' + encodeURIComponent(email) + '&limit=1', pit);
  var cid = (sr.ok && sr.data.contacts && sr.data.contacts[0]) ? sr.data.contacts[0].id : null;
  if (!cid) {
    var dr = await ghlGet('/contacts/search/duplicate?locationId=' + locationId + '&email=' + encodeURIComponent(email), pit);
    if (dr.ok && dr.data.contact) cid = dr.data.contact.id;
  }
  if (!cid) return null;
  
  // Full contact
  var cr = await ghlGet('/contacts/' + cid, pit);
  if (!cr.ok) return null;
  var c = cr.data.contact || cr.data;
  
  // Extract
  var dd = { name: c.name || '', email: c.email || '', phone: c.phone || '' };
  (c.customFields || []).forEach(function(cf) {
    var key = fieldMap[cf.id] || '';
    if (key.startsWith('dd_') && cf.value !== null && cf.value !== undefined && cf.value !== '') {
      dd[key] = Array.isArray(cf.value) ? cf.value.join(', ') : String(cf.value);
    }
  });
  return dd;
}

/**
 * Generate PDF as HTML string (rendered as PDF by the browser or a headless renderer)
 * For Vercel serverless, we generate a nicely formatted HTML page optimized for print/PDF
 */
function generatePDFHtml(d) {
  var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  function val(k) { return d[k] || '—'; }
  function row(label, key) {
    return '<tr><td style="padding:6px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;width:45%">' + label + '</td><td style="padding:6px 12px;font-size:12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0">' + val(key) + '</td></tr>';
  }
  function section(title, color, rows) {
    return '<div style="margin-bottom:16px;page-break-inside:avoid"><div style="background:' + color + ';color:#fff;padding:6px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-radius:6px 6px 0 0">' + title + '</div><table style="width:100%;border:1px solid #e2e8f0;border-top:none;border-collapse:collapse;border-radius:0 0 6px 6px">' + rows + '</table></div>';
  }

  var depCount = parseInt(d.dd_dependent_count) || 0;
  var depHtml = '';
  for (var i = 1; i <= depCount; i++) {
    depHtml += section('Dependent ' + i, '#8b5cf6',
      row('Name', 'dd_dep_' + i + '_name') +
      row('Relationship', 'dd_dep_' + i + '_relationship') +
      row('Residency >6 months', 'dd_dep_' + i + '_residency') +
      row('Support >50%', 'dd_dep_' + i + '_support') +
      row('Age Status', 'dd_dep_' + i + '_age_status') +
      row('Tax ID Type', 'dd_dep_' + i + '_id_type') +
      row('Competing Claim', 'dd_dep_' + i + '_competing_claim') +
      row('US Citizen/Resident', 'dd_dep_' + i + '_us_citizen')
    );
  }

  var hohHtml = '';
  if (d.dd_filing_status === 'Head of Household' || d.dd_flag_hoh === 'Yes') {
    hohHtml = section('Head of Household', '#0ea5e9',
      row('Married During Year', 'dd_hoh_married') +
      row('Divorced/Separated', 'dd_hoh_divorced') +
      row('Spouse in Home Last 6 Mo', 'dd_hoh_spouse_lived') +
      row('Paid >50% Home Costs', 'dd_hoh_cost_support') +
      row('Qualifying Person', 'dd_hoh_qualifying_person')
    );
  }

  var eicHtml = '';
  if (d.dd_flag_eic === 'Yes' || d.dd_flag_eic === 'Not Sure') {
    eicHtml = section('Earned Income Credit', '#10b981',
      row('Child Residency >6 Mo in US', 'dd_eic_residency') +
      row('Child Filed Joint Return', 'dd_eic_joint_return_child') +
      row('Investment Income', 'dd_eic_investment_income') +
      row('Prior EIC Denial', 'dd_eic_prior_denial') +
      row('Form 8862 Required', 'dd_eic_form_8862')
    );
  }

  var aocHtml = '';
  if (d.dd_flag_aoc === 'Yes' || d.dd_flag_aoc === 'Not Sure') {
    aocHtml = section('American Opportunity Credit', '#ec4899',
      row('Enrolled at Eligible School', 'dd_aoc_enrolled') +
      row('At Least Half-Time', 'dd_aoc_half_time') +
      row('Undergraduate Program', 'dd_aoc_undergraduate') +
      row('AOC Claimed 4+ Years', 'dd_aoc_4_years_used') +
      row('1098-T Received', 'dd_aoc_1098t') +
      row('Tuition Paid Out of Pocket', 'dd_aoc_tuition_paid') +
      row('Felony Drug Conviction', 'dd_aoc_felony') +
      row('Prior AOC Denial', 'dd_aoc_prior_denial')
    );
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Due Diligence Worksheet - ' + val('dd_client_name') + '</title>' +
    '<style>@page{size:letter;margin:0.5in}body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:24px}' +
    '@media print{body{padding:0}.no-print{display:none}}</style></head><body>' +

    // Header
    '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:20px">' +
    '<div><div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px">Due Diligence Worksheet</div>' +
    '<div style="font-size:12px;color:#64748b;margin-top:2px">IRS Form 8867 Compliance Documentation</div></div>' +
    '<div style="text-align:right"><div style="font-size:12px;color:#64748b">Generated: ' + today + '</div>' +
    '<div style="font-size:12px;color:#64748b">Tax Year: ' + val('dd_tax_year') + '</div></div></div>' +

    // Client Info
    section('Client Information', '#3b82f6',
      row('Full Legal Name', 'dd_client_name') +
      row('Email', 'email') +
      row('Phone', 'phone') +
      row('Filing Status', 'dd_filing_status') +
      row('Dependents Claimed', 'dd_has_dependents') +
      row('Number of Dependents', 'dd_dependent_count') +
      row('Consent Given', 'dd_client_consent') +
      row('Interview Date', 'dd_interview_date') +
      row('Interview Mode', 'dd_interview_mode')
    ) +

    // Credits
    section('Credits Under Review', '#f59e0b',
      row('Head of Household', 'dd_flag_hoh') +
      row('Earned Income Credit (EIC)', 'dd_flag_eic') +
      row('Child Tax Credit (CTC)', 'dd_flag_ctc') +
      row('Other Dependents Credit (ODC)', 'dd_flag_odc') +
      row('American Opportunity (AOC)', 'dd_flag_aoc')
    ) +

    depHtml + hohHtml + eicHtml +

    // Income
    section('Income & Self-Employment', '#6366f1',
      row('Income Sources', 'dd_income_sources') +
      row('Self-Employed', 'dd_self_employed') +
      row('Business Type', 'dd_se_business_type') +
      row('Business Expenses', 'dd_se_has_expenses') +
      row('Income Docs Provided', 'dd_income_docs_provided')
    ) +

    aocHtml +

    // Documents
    section('Supporting Documentation', '#64748b',
      row('Documents Uploaded', 'dd_docs_uploaded') +
      row('Document Types', 'dd_doc_types_provided')
    ) +

    // Preparer Section
    section('Preparer Verification', '#0f172a',
      row('Answers Reasonable', 'dd_prep_answers_reasonable') +
      row('Documents Verified', 'dd_prep_docs_verified') +
      row('Additional Inquiries', 'dd_prep_additional_inquiries') +
      row('Inquiry Notes', 'dd_prep_inquiry_notes') +
      row('Audit Ready', 'dd_doc_audit_ready') +
      row('Knowledge Base', 'dd_prep_knowledge_base')
    ) +

    // Preparer Info
    section('Preparer Credentials', '#0f172a',
      row('Preparer Name', 'dd_preparer_name') +
      row('PTIN', 'dd_preparer_ptin') +
      row('Firm/Office', 'dd_preparer_firm') +
      row('Certification', 'dd_preparer_signature')
    ) +

    // AI Analysis
    (d.dd_preparer_notes ? section('System Analysis & Notes', '#475569',
      '<tr><td colspan="2" style="padding:10px 12px;font-size:12px;color:#374151;line-height:1.6;border-bottom:1px solid #e2e8f0">' + 
      d.dd_preparer_notes.replace(/\n/g, '<br>') + '</td></tr>' +
      row('AI Result', 'dd_ai_result') +
      row('Risk Count', 'dd_risk_count')
    ) : '') +

    // Signature line
    '<div style="margin-top:32px;page-break-inside:avoid">' +
    '<div style="display:flex;gap:40px">' +
    '<div style="flex:1;border-top:2px solid #0f172a;padding-top:8px">' +
    '<div style="font-size:11px;color:#64748b">Preparer Signature</div>' +
    '<div style="font-size:13px;font-weight:600;margin-top:4px">' + val('dd_preparer_name') + '</div></div>' +
    '<div style="flex:1;border-top:2px solid #0f172a;padding-top:8px">' +
    '<div style="font-size:11px;color:#64748b">Date</div>' +
    '<div style="font-size:13px;font-weight:600;margin-top:4px">' + today + '</div></div>' +
    '<div style="width:180px;border-top:2px solid #0f172a;padding-top:8px">' +
    '<div style="font-size:11px;color:#64748b">PTIN</div>' +
    '<div style="font-size:13px;font-weight:600;margin-top:4px">' + val('dd_preparer_ptin') + '</div></div>' +
    '</div></div>' +

    // Footer
    '<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">' +
    'Generated by DD Wizard &bull; IRS Due Diligence Compliance System &bull; IRC &sect;6695(g) Documentation' +
    '</div>' +

    // Print button (no-print)
    '<div class="no-print" style="text-align:center;margin-top:24px">' +
    '<button onclick="window.print()" style="padding:12px 32px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">&#128424; Print / Save as PDF</button></div>' +

    '</body></html>';
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var email = req.query.email;
    var locationId = req.query.locationId;

    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!locationId) return res.status(400).json({ error: 'Location ID is required' });

    var license = await isLocationValid(locationId);
    if (!license.valid) return res.status(403).json({ error: 'License invalid' });

    var pit = license.tenant.ghl_pit || license.tenant.pit;
    if (!pit) return res.status(500).json({ error: 'GHL token not configured for this location' });

    var dd = await getContactDD(email, locationId, pit);
    if (!dd) return res.status(404).json({ error: 'Contact not found or no DD data' });

    var html = generatePDFHtml(dd);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);

  } catch(e) {
    console.error('[PDF] Error:', e.message);
    return res.status(500).json({ error: 'PDF generation error: ' + e.message });
  }
};
