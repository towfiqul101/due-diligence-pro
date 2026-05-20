const GHL_BASE = 'https://services.leadconnectorhq.com'
const API_VERSION = '2021-07-28'

const fieldMapCache = {}

const REQUIRED_DD_FIELDS = [
  'dd_client_name', 'dd_client_email', 'dd_client_dob',
  'dd_filing_status', 'dd_flag_eic', 'dd_flag_hoh',
  'dd_flag_ctc', 'dd_flag_odc', 'dd_flag_aoc',
  'dd_has_dependents', 'dd_dependent_count',
  'dd_interview_status', 'dd_interview_date',
  'dd_ai_result', 'dd_preparer_notes',
  'dd_dep_1_name', 'dd_dep_1_dob', 'dd_dep_1_relationship',
  'dd_eic_residency', 'dd_hoh_married',
  'dd_income_sources', 'dd_self_employed',
  'dd_docs_uploaded', 'dd_preparer_name', 'dd_preparer_ptin',
]

export async function ghlRequest(method, path, pit, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Content-Type': 'application/json',
      'Version': API_VERSION,
      'Accept': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(`${GHL_BASE}${path}`, opts)
  const data = await r.json()
  if (!r.ok) throw new Error(`GHL ${r.status}: ${data.message || JSON.stringify(data)}`)
  return data
}

export async function buildFieldMap(locationId, pit) {
  if (fieldMapCache[locationId]) return fieldMapCache[locationId]
  const data = await ghlRequest('GET', `/locations/${locationId}/customFields`, pit)
  const fields = data.customFields || data || []
  const map = {}
  if (Array.isArray(fields)) {
    fields.forEach(f => {
      let key = f.fieldKey || f.key || ''
      if (key.startsWith('contact.')) key = key.substring(8)
      if (key && f.id) map[f.id] = key
    })
  }
  fieldMapCache[locationId] = map
  return map
}

export function mapContactFields(contact, fieldMap) {
  const result = {}
  const rawCF = contact.customFields || []
  if (Array.isArray(rawCF)) {
    rawCF.forEach(cf => {
      const key = fieldMap[cf.id] || ''
      if (key.startsWith('dd_')) {
        const val = cf.value
        if (Array.isArray(val)) {
          if (val.length > 0) result[key] = val.join(', ')
        } else if (val !== null && val !== undefined && val !== '') {
          result[key] = String(val)
        }
      }
    })
  }
  return result
}

export async function getContactsByTags(locationId, pit, tags) {
  const fieldMap = await buildFieldMap(locationId, pit)
  const data = await ghlRequest('GET', `/contacts/?locationId=${locationId}&query=&limit=50`, pit)
  const contacts = data.contacts || []
  return contacts
    .filter(c => {
      const contactTags = c.tags || []
      return tags.some(t => contactTags.includes(t))
    })
    .map(c => ({
      id: c.id,
      name: c.name || c.contactName || '',
      email: c.email || '',
      phone: c.phone || '',
      tags: c.tags || [],
      ...mapContactFields(c, fieldMap),
    }))
}

export async function getContact(locationId, pit, contactId) {
  const fieldMap = await buildFieldMap(locationId, pit)
  const data = await ghlRequest('GET', `/contacts/${contactId}`, pit)
  const contact = data.contact || data
  return {
    id: contact.id,
    name: contact.name || contact.contactName || '',
    email: contact.email || '',
    phone: contact.phone || '',
    tags: contact.tags || [],
    ...mapContactFields(contact, fieldMap),
  }
}

export async function verifyDDFields(locationId, pit) {
  const data = await ghlRequest('GET', `/locations/${locationId}/customFields`, pit)
  const fields = data.customFields || data || []
  const foundKeys = new Set()
  if (Array.isArray(fields)) {
    fields.forEach(f => {
      let key = f.fieldKey || f.key || ''
      if (key.startsWith('contact.')) key = key.substring(8)
      if (key) foundKeys.add(key)
    })
  }
  const missing = REQUIRED_DD_FIELDS.filter(k => !foundKeys.has(k))
  const verified = missing.length === 0
  return {
    verified,
    found: REQUIRED_DD_FIELDS.length - missing.length,
    missing,
    total: REQUIRED_DD_FIELDS.length,
  }
}

const DD_FIELDS_FULL = [
  // Core
  { name: 'Client Consent', fieldKey: 'dd_client_consent', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Tax Year', fieldKey: 'dd_tax_year', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Client Name', fieldKey: 'dd_client_name', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Client DOB', fieldKey: 'dd_client_dob', dataType: 'DATE', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Client Email', fieldKey: 'dd_client_email', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Client Phone', fieldKey: 'dd_client_phone', dataType: 'PHONE', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Client SSN Last 4', fieldKey: 'dd_client_ssn_last4', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Filing Status', fieldKey: 'dd_filing_status', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Address Changed', fieldKey: 'dd_address_changed', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Has Dependents', fieldKey: 'dd_has_dependents', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Dependent Count', fieldKey: 'dd_dependent_count', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Flag HOH', fieldKey: 'dd_flag_hoh', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Flag EIC', fieldKey: 'dd_flag_eic', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Flag CTC', fieldKey: 'dd_flag_ctc', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Flag ODC', fieldKey: 'dd_flag_odc', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Flag AOC', fieldKey: 'dd_flag_aoc', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Interview Mode', fieldKey: 'dd_interview_mode', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Interview Date', fieldKey: 'dd_interview_date', dataType: 'DATE', parentId: null, folderName: 'Due Diligence - Core' },
  { name: 'Interview Status', fieldKey: 'dd_interview_status', dataType: 'TEXT', parentId: null, folderName: 'Due Diligence - Core' },
  // AI Results
  { name: 'AI Result', fieldKey: 'dd_ai_result', dataType: 'TEXT', parentId: null, folderName: 'DD AI Results' },
  { name: 'AI Flags', fieldKey: 'dd_ai_flags', dataType: 'LARGE_TEXT', parentId: null, folderName: 'DD AI Results' },
  { name: 'Risk Count', fieldKey: 'dd_risk_count', dataType: 'TEXT', parentId: null, folderName: 'DD AI Results' },
  { name: 'Review Required', fieldKey: 'dd_review_required', dataType: 'TEXT', parentId: null, folderName: 'DD AI Results' },
  { name: 'Preparer Notes', fieldKey: 'dd_preparer_notes', dataType: 'LARGE_TEXT', parentId: null, folderName: 'DD AI Results' },
  // Preparer Verification
  { name: 'Prep Answers Reasonable', fieldKey: 'dd_prep_answers_reasonable', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Docs Verified', fieldKey: 'dd_prep_docs_verified', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Substantiation Asked', fieldKey: 'dd_prep_substantiation_asked', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Tiebreaker Explained', fieldKey: 'dd_prep_tiebreaker_explained', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Residency Verification', fieldKey: 'dd_prep_residency_verification', dataType: 'LARGE_TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Income Verification', fieldKey: 'dd_prep_income_verification', dataType: 'LARGE_TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Additional Inquiries', fieldKey: 'dd_prep_additional_inquiries', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Inquiry Notes', fieldKey: 'dd_prep_inquiry_notes', dataType: 'LARGE_TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Doc Audit Ready', fieldKey: 'dd_doc_audit_ready', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Prep Knowledge Base', fieldKey: 'dd_prep_knowledge_base', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Preparer Name', fieldKey: 'dd_preparer_name', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Preparer PTIN', fieldKey: 'dd_preparer_ptin', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Preparer Firm', fieldKey: 'dd_preparer_firm', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  { name: 'Preparer Signature', fieldKey: 'dd_preparer_signature', dataType: 'TEXT', parentId: null, folderName: 'DD Preparer Verification' },
  // HOH
  { name: 'HOH Married', fieldKey: 'dd_hoh_married', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  { name: 'HOH Divorced', fieldKey: 'dd_hoh_divorced', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  { name: 'HOH Spouse Lived', fieldKey: 'dd_hoh_spouse_lived', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  { name: 'HOH Cost Support', fieldKey: 'dd_hoh_cost_support', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  { name: 'HOH Other Adults', fieldKey: 'dd_hoh_other_adults', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  { name: 'HOH Other Adults Detail', fieldKey: 'dd_hoh_other_adults_detail', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  { name: 'HOH Qualifying Person', fieldKey: 'dd_hoh_qualifying_person', dataType: 'TEXT', parentId: null, folderName: 'DD HOH' },
  // EIC
  { name: 'EIC Residency', fieldKey: 'dd_eic_residency', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  { name: 'EIC Joint Return Child', fieldKey: 'dd_eic_joint_return_child', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  { name: 'EIC Investment Income', fieldKey: 'dd_eic_investment_income', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  { name: 'EIC Income Supports Expenses', fieldKey: 'dd_eic_income_supports_expenses', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  { name: 'EIC Income Explanation', fieldKey: 'dd_eic_income_explanation', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  { name: 'EIC Prior Denial', fieldKey: 'dd_eic_prior_denial', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  { name: 'EIC Form 8862', fieldKey: 'dd_eic_form_8862', dataType: 'TEXT', parentId: null, folderName: 'DD EIC' },
  // Income
  { name: 'Income Sources', fieldKey: 'dd_income_sources', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  { name: 'Self Employed', fieldKey: 'dd_self_employed', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  { name: 'SE Business Type', fieldKey: 'dd_se_business_type', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  { name: 'SE Has Expenses', fieldKey: 'dd_se_has_expenses', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  { name: 'SE Record Method', fieldKey: 'dd_se_record_method', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  { name: 'SE Separate Bank', fieldKey: 'dd_se_separate_bank', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  { name: 'Income Docs Provided', fieldKey: 'dd_income_docs_provided', dataType: 'TEXT', parentId: null, folderName: 'DD Income' },
  // Education (AOC)
  { name: 'AOC Student Name', fieldKey: 'dd_aoc_student_name', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC Enrolled', fieldKey: 'dd_aoc_enrolled', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC Half Time', fieldKey: 'dd_aoc_half_time', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC Undergraduate', fieldKey: 'dd_aoc_undergraduate', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC 4 Years Used', fieldKey: 'dd_aoc_4_years_used', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC 1098-T', fieldKey: 'dd_aoc_1098t', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC Tuition Paid', fieldKey: 'dd_aoc_tuition_paid', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC Felony', fieldKey: 'dd_aoc_felony', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  { name: 'AOC Prior Denial', fieldKey: 'dd_aoc_prior_denial', dataType: 'TEXT', parentId: null, folderName: 'DD Education (AOC)' },
  // Documents
  { name: 'Docs Uploaded', fieldKey: 'dd_docs_uploaded', dataType: 'TEXT', parentId: null, folderName: 'DD Documents' },
  { name: 'Can Substantiate', fieldKey: 'dd_can_substantiate', dataType: 'TEXT', parentId: null, folderName: 'DD Documents' },
  { name: 'Doc Types Provided', fieldKey: 'dd_doc_types_provided', dataType: 'LARGE_TEXT', parentId: null, folderName: 'DD Documents' },
]

// Generate dependent fields for N=1..8
for (let n = 1; n <= 8; n++) {
  const depFields = [
    ['Name', 'dd_dep_N_name', 'TEXT'],
    ['DOB', 'dd_dep_N_dob', 'DATE'],
    ['SSN Last 4', 'dd_dep_N_ssn_last_4', 'TEXT'],
    ['Relationship', 'dd_dep_N_relationship', 'TEXT'],
    ['Residency', 'dd_dep_N_residency', 'TEXT'],
    ['Residency Proof', 'dd_dep_N_residency_proof', 'TEXT'],
    ['Support', 'dd_dep_N_support', 'TEXT'],
    ['Age Status', 'dd_dep_N_age_status', 'TEXT'],
    ['ID Type', 'dd_dep_N_id_type', 'TEXT'],
    ['Competing Claim', 'dd_dep_N_competing_claim', 'TEXT'],
    ['US Citizen', 'dd_dep_N_us_citizen', 'TEXT'],
  ]
  depFields.forEach(([label, keyTpl, type]) => {
    DD_FIELDS_FULL.push({
      name: `Dep ${n} ${label}`,
      fieldKey: keyTpl.replace('_N_', `_${n}_`),
      dataType: type,
      parentId: null,
      folderName: 'DD Dependents',
    })
  })
}

export async function createDDCustomFields(locationId, pit) {
  // BACKUP/REPAIR tool — primary setup is GHL Snapshot import.
  // Use when a customer's fields got deleted or snapshot wasn't imported correctly.
  let created = 0
  let skipped = 0
  const errors = []

  for (const field of DD_FIELDS_FULL) {
    try {
      await ghlRequest('POST', `/locations/${locationId}/customFields`, pit, {
        name: field.name,
        fieldKey: field.fieldKey,
        dataType: field.dataType,
      })
      created++
    } catch (e) {
      if (e.message.includes('409') || e.message.toLowerCase().includes('already exists') || e.message.toLowerCase().includes('duplicate')) {
        skipped++
      } else {
        errors.push({ field: field.fieldKey, error: e.message })
      }
    }
  }

  // Bust cache so next verify call fetches fresh
  delete fieldMapCache[locationId]

  return { created, skipped, errors }
}
