import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CLIENT_WIZARD_TEMPLATE, PREPARER_WIZARD_TEMPLATE, generateEmbedCode } from '@/lib/dd-embed-templates'

function checkAdmin(req) {
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key')
  return key === process.env.DD_ADMIN_SECRET
}

const BASE = process.env.NEXT_PUBLIC_WIZARD_BASE_URL || 'https://dd-wizard-api.vercel.app'

export async function GET(req) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = new URL(req.url).searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

  const { data: tenant, error } = await supabaseAdmin.from('dd_tenants').select('*').eq('id', tenantId).single()
  if (error || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (!tenant.location_id) return NextResponse.json({ error: 'Location ID not set' }, { status: 400 })

  return NextResponse.json({
    locationId: tenant.location_id,
    clientWizard: generateEmbedCode(CLIENT_WIZARD_TEMPLATE, tenant.location_id),
    preparerWizard: generateEmbedCode(PREPARER_WIZARD_TEMPLATE, tenant.location_id),
    iframeClient: `${BASE}/api/wizard/client?loc=${tenant.location_id}`,
    iframePreparer: `${BASE}/api/wizard/preparer?loc=${tenant.location_id}`,
  })
}
