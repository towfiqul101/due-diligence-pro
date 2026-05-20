import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createDDCustomFields, verifyDDFields } from '@/lib/dd-ghl'

// BACKUP/REPAIR tool. Primary setup = GHL Snapshot import.
// Use when a customer's fields got deleted or they didn't import the snapshot correctly.

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

  let createResult
  try {
    createResult = await createDDCustomFields(tenant.location_id, tenant.ghl_pit)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }

  const verifyResult = await verifyDDFields(tenant.location_id, tenant.ghl_pit)

  if (verifyResult.verified) {
    await supabaseAdmin.from('dd_tenants').update({
      fields_verified: true,
      fields_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', tenantId)
  }

  return NextResponse.json({ ...createResult, ...verifyResult })
}
