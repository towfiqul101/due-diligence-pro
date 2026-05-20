import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase'

export async function POST(req) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createServerClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let slug = 'karvonix-demo'
  try {
    const body = await req.json()
    if (body.slug) slug = body.slug
  } catch {}

  const { data, error } = await supabaseAdmin
    .from('dd_tenants')
    .update({ owner_user_id: user.id })
    .eq('slug', slug)
    .select('id, slug, status, firm_name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  return NextResponse.json({ success: true, tenant: data })
}
