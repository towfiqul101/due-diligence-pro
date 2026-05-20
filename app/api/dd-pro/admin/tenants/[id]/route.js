import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req) {
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key')
  return key === process.env.DD_ADMIN_SECRET
}

const ALLOWED_PATCH_FIELDS = [
  'firm_name', 'owner_email', 'ghl_pit', 'location_id', 'status',
  'snapshot_sent', 'snapshot_sent_at', 'taxintake_enabled',
  'taxintake_slug', 'taxintake_location_id', 'brand_color', 'notes',
]

export async function GET(req, { params }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('dd_tenants').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ tenant: data })
}

export async function PATCH(req, { params }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const updates = { updated_at: new Date().toISOString() }
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (key in body) updates[key] = body[key]
  }
  const { data, error } = await supabaseAdmin.from('dd_tenants').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tenant: data })
}

export async function DELETE(req, { params }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabaseAdmin.from('dd_tenants').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
