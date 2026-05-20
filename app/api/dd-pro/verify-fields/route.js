import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyDDFields } from '@/lib/dd-ghl'

function checkAdmin(req) {
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key')
  return key === process.env.DD_ADMIN_SECRET
}

export async function POST(req) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tenantId } = await req.json()

  const { data: tenant, error } = await supabaseAdmin.from('dd_tenants').select('*').eq('id', tenantId).single()
  if (error || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (!tenant.ghl_pit || !tenant.location_id) return NextResponse.json({ error: 'GHL credentials not configured' }, { status: 400 })

  let result
  try {
    result = await verifyDDFields(tenant.location_id, tenant.ghl_pit)
  } catch (e) {
    return NextResponse.json({ error: `Cannot connect to GHL — check PIT token: ${e.message}` }, { status: 502 })
  }

  if (result.verified) {
    await supabaseAdmin.from('dd_tenants').update({
      fields_verified: true,
      fields_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', tenantId)
  }

  return NextResponse.json(result)
}
