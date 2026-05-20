import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
const PLACEHOLDER = 'LOCATION_ID_PLACEHOLDER'
const MOCK_LOC = 'q9VHwhujUYrTkiqenfhm'

function captureWizardHtml(modulePath, extraQuery = {}) {
  const handler = _require(modulePath)
  const saved = process.env.DD_LOCATIONS
  process.env.DD_LOCATIONS = JSON.stringify([{
    id: MOCK_LOC,
    active: true,
    pit: 'mock-pit-for-template-gen',
    name: 'Your Tax Office',
    brand: { firmName: 'Your Tax Office', firmEmail: 'hello@karvonix.com' },
  }])
  let html = ''
  const mockReq = {
    method: 'GET',
    query: { loc: MOCK_LOC, firm: 'Your Tax Office', email: 'hello@karvonix.com', ...extraQuery },
  }
  const mockRes = {
    status() { return this },
    setHeader() { return this },
    send(c) { html = c; return this },
    json() { return this },
    end() { return this },
  }
  try { handler(mockReq, mockRes) } catch (e) { /* non-fatal */ }
  if (saved !== undefined) process.env.DD_LOCATIONS = saved
  else delete process.env.DD_LOCATIONS
  // Replace the real location ID with the placeholder wherever it appears
  return html.replace(new RegExp(MOCK_LOC, 'g'), PLACEHOLDER)
}

// Templates are generated once at module load time.
// They are full standalone HTML pages with LOCATION_ID_PLACEHOLDER
// where the customer's GHL Location ID should be injected.
export const CLIENT_WIZARD_TEMPLATE = captureWizardHtml('../api/wizard/client.js')
export const PREPARER_WIZARD_TEMPLATE = captureWizardHtml('../api/wizard/preparer.js')

export function generateEmbedCode(template, locationId) {
  return template.replace(/LOCATION_ID_PLACEHOLDER/g, locationId)
}
