import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req) {
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key')
  return key === process.env.DD_ADMIN_SECRET
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export async function GET(req) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('dd_tenants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tenants: data })
}

export async function POST(req) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { firm_name, owner_email, location_id, ghl_pit, status } = body

  let slug = slugify(firm_name || 'firm')
  let attempt = 0
  while (attempt < 10) {
    const candidate = attempt === 0 ? slug : `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
    const { data: existing } = await supabaseAdmin.from('dd_tenants').select('id').eq('slug', candidate).maybeSingle()
    if (!existing) { slug = candidate; break }
    attempt++
  }

  const { data, error } = await supabaseAdmin.from('dd_tenants').insert({
    slug, firm_name, owner_email, location_id, ghl_pit,
    status: status || 'pending_setup',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tenant: data }, { status: 201 })
}
