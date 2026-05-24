import { createClient } from '@supabase/supabase-js';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

async function isLocationValid(locationId) {
  try {
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
    if (data) return { valid: true, tenant: data };
    const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
    const found = locations.find(l => l.locationId === locationId);
    if (found) return { valid: true, tenant: found };
    return { valid: false };
  } catch (err) {
    try {
      const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
      const found = locations.find(l => l.locationId === locationId);
      if (found) return { valid: true, tenant: found };
    } catch(e) {}
    return { valid: false };
  }
}

async function ghlRequest(method, path, pit, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Content-Type': 'application/json',
      'Version': API_VERSION,
      'Accept': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${GHL_BASE}${path}`, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(`GHL ${r.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

async function upsertContact(pit, locationId, contact, customFields, tags) {
  const cfArray = Object.entries(customFields)
    .filter(([k, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => ({ key: k, field_value: v }));

  return await ghlRequest('POST', '/contacts/upsert', pit, {
    locationId,
    ...(contact.name && { name: contact.name }),
    ...(contact.email && { email: contact.email }),
    ...(contact.phone && { phone: contact.phone }),
    customFields: cfArray,
    source: 'DD Wizard',
    tags: tags || ['dd-wizard-submitted']
  });
}

async function addTag(pit, contactId, tag) {
  return await ghlRequest('POST', `/contacts/${contactId}/tags`, pit, { tags: [tag] });
}

async function updateContact(pit, contactId, customFields) {
  const cfArray = Object.entries(customFields)
    .filter(([k, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ({ key: k, field_value: v }));
  return await ghlRequest('PUT', `/contacts/${contactId}`, pit, { customFields: cfArray });
}

function generateBasicNotes(data) {
  const credits = [];
  if (data.dd_flag_hoh === 'Yes') credits.push('HOH');
  if (data.dd_flag_eic === 'Yes') credits.push('EIC');
  if (data.dd_flag_ctc === 'Yes') credits.push('CTC');
  if (data.dd_flag_odc === 'Yes') credits.push('ODC');
  if (data.dd_flag_aoc === 'Yes') credits.push('AOC');
  const dc = parseInt(data.dd_dependent_count) || 0;
  return `Client ${data.dd_client_name || '[name]'} completed DD interview on ${new Date().toLocaleDateString()}. Filing: ${data.dd_filing_status || 'N/A'}. ${dc} dependent(s). Credits: ${credits.join(', ') || 'none'}. ${data.dd_self_employed === 'Yes' ? 'Self-employed (' + (data.dd_se_business_type || 'N/A') + ').' : ''} Docs: ${data.dd_docs_uploaded || 'N/A'}. Manual review recommended.`;
}

async function validateWithAI(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI] No GEMINI_API_KEY, using basic notes');
    return { status: 'clean', risk_count: 0, flags: [], preparer_notes: generateBasicNotes(data) };
  }

  const depSummary = [];
  const dc = parseInt(data.dd_dependent_count) || 0;
  for (let i = 1; i <= dc; i++) {
    depSummary.push(`Dep${i}: ${data['dd_dep_'+i+'_name']||'?'}, ${data['dd_dep_'+i+'_relationship']||'?'}, resid=${data['dd_dep_'+i+'_residency']||'?'}, age=${data['dd_dep_'+i+'_age_status']||'?'}, id=${data['dd_dep_'+i+'_id_type']||'?'}, competing=${data['dd_dep_'+i+'_competing_claim']||'?'}`);
  }

  const prompt = `You are an IRS due diligence expert. Analyze these tax client responses for inconsistencies and red flags.

Filing: ${data.dd_filing_status}, Dependents: ${data.dd_has_dependents} (${dc}), HOH: ${data.dd_flag_hoh}, EIC: ${data.dd_flag_eic}, CTC: ${data.dd_flag_ctc}, AOC: ${data.dd_flag_aoc}
${depSummary.join('\n')}
HOH: married=${data.dd_hoh_married}, divorced=${data.dd_hoh_divorced}, spouse_lived=${data.dd_hoh_spouse_lived}, cost=${data.dd_hoh_cost_support}
EIC: residency=${data.dd_eic_residency}, investment=${data.dd_eic_investment_income}, prior_denial=${data.dd_eic_prior_denial}
Income: sources=${data.dd_income_sources}, SE=${data.dd_self_employed}, expenses=${data.dd_se_has_expenses}
AOC: enrolled=${data.dd_aoc_enrolled}, halftime=${data.dd_aoc_half_time}, undergrad=${data.dd_aoc_undergraduate}, 4yrs=${data.dd_aoc_4_years_used}, felony=${data.dd_aoc_felony}

Respond ONLY with valid JSON, no markdown, no code fences, no explanation before or after:
{"status":"clean" or "flagged","risk_count":number,"flags":[{"severity":"high" or "medium" or "low","description":"..."}],"preparer_notes":"Professional summary for preparer audit defense documentation. Include client name, filing status, credits, dependents, and any issues. 2-3 sentences."}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json'
        }
      })
    });

    const result = await r.json();
    console.log('[AI] Gemini HTTP status:', r.status);

    if (!r.ok) {
      console.error('[AI] Gemini error response:', JSON.stringify(result).substring(0, 300));
      return { status: 'error', risk_count: 0, flags: [], preparer_notes: generateBasicNotes(data) };
    }

    // Extract text from candidates — handle thinking models that have multiple parts
    let text = '';
    const candidates = result.candidates || [];
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      // Find the text part (skip "thought" parts from thinking models)
      for (const part of parts) {
        if (part.text && !part.thought) {
          text = part.text;
          break;
        }
      }
      // Fallback: just grab the last text part
      if (!text) {
        for (const part of parts.reverse()) {
          if (part.text) { text = part.text; break; }
        }
      }
    }

    console.log('[AI] Extracted text (first 200):', text.substring(0, 200));

    if (!text) {
      console.error('[AI] No text in Gemini response');
      return { status: 'error', risk_count: 0, flags: [], preparer_notes: generateBasicNotes(data) };
    }

    // Clean and parse JSON — remove code fences, whitespace, any prefix text
    let cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
    // If the response starts with non-JSON text, try to find the JSON object
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleaned);
    console.log('[AI] Parsed result — status:', parsed.status, 'risks:', parsed.risk_count);
    return parsed;

  } catch(e) {
    console.error('[AI] Gemini error:', e.message);
    return { status: 'error', risk_count: 0, flags: [], preparer_notes: generateBasicNotes(data) };
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { locationId, mode, contact, answers, prefillContactId, prefillSource } = req.body;
    if (!locationId) return res.status(400).json({ error: 'Missing locationId' });
    if (!contact?.email && !contact?.phone) return res.status(400).json({ error: 'Email or phone required' });
    if (!answers) return res.status(400).json({ error: 'No answers' });

    const license = await isLocationValid(locationId);
    if (!license.valid) return res.status(403).json({ error: 'License failed', reason: 'Not licensed' });

    const pit = license.tenant.ghl_pit || license.tenant.pit;
    const enriched = { ...answers, dd_interview_mode: mode === 'preparer' ? 'Preparer Interview' : mode === 'send-link' ? 'Client Self-Service' : 'Client Self-Service', dd_interview_date: new Date().toISOString().split('T')[0], dd_interview_status: mode === 'send-link' ? 'Link Sent' : 'Complete' };

    // Upsert contact with mode-specific tags
    const upsertTags = mode === 'send-link' ? ['dd_iv_link_sent'] : ['dd-wizard-submitted'];
    let result;
    try {
      result = await upsertContact(pit, locationId, { email: contact.email, phone: contact.phone, name: answers.dd_client_name }, enriched, upsertTags);
    } catch(e) { return res.status(502).json({ error: 'GHL save failed', detail: e.message }); }

    const contactId = result.contact?.id;

    // Skip AI and tagging for send-link mode — just create the contact
    if (mode === 'send-link') {
      return res.status(200).json({
        success: true, contactId, isNew: result.new || false, mode: 'send-link'
      });
    }

    // AI validation (only for client/preparer modes)
    let ai;
    try { ai = await validateWithAI(enriched); } catch(e) { ai = { status: 'error', risk_count: 0, flags: [], preparer_notes: generateBasicNotes(enriched) }; }

    // Write AI results back
    try {
      await updateContact(pit, contactId, {
        dd_ai_result: ai.status === 'flagged' ? 'Flagged' : ai.status === 'clean' ? 'Clean' : 'Error',
        dd_ai_flags: ai.flags?.map(f => `[${(f.severity||'').toUpperCase()}] ${f.description}`).join('\n') || '',
        dd_risk_count: String(ai.risk_count || 0),
        dd_review_required: (ai.risk_count || 0) > 0 ? 'Yes' : 'No',
        dd_preparer_notes: ai.preparer_notes || ''
      });
    } catch(e) { /* non-fatal */ }

    // Add tags
    try {
      await addTag(pit, contactId, (ai.risk_count || 0) > 0 ? 'dd-flagged' : 'dd-clear');
    } catch(e) { /* non-fatal */ }

    // Write-back DD completion status to the originating TaxIntake contact
    if (prefillContactId && prefillSource === 'taxintake') {
      try {
        const today = new Date().toISOString().split('T')[0];
        await updateContact(pit, prefillContactId, {
          dd_interview_status: 'Complete',
          dd_interview_date: today,
          dd_ai_result: ai.status === 'flagged' ? 'Flagged' : ai.status === 'clean' ? 'Clean' : 'Error',
        });
        console.log('[Submit] Wrote DD status back to TI contact', prefillContactId);
      } catch(e) {
        console.warn('[Submit] Write-back to TI contact failed (non-fatal):', e.message);
      }
    }

    return res.status(200).json({
      success: true, contactId, isNew: result.new || false,
      aiResult: { status: ai.status, riskCount: ai.risk_count, flagCount: ai.flags?.length || 0 }
    });

  } catch(e) { return res.status(500).json({ error: e.message }); }
}
