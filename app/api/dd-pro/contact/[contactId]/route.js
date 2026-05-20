import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase'
import { getContact } from '@/lib/dd-ghl'

export async function GET(req, { params }) {
  const slug = new URL(req.url).searchParams.get('slug')

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createServerClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabaseAdmin
    .from('dd_tenants')
    .select('location_id, ghl_pit, status')
    .eq('slug', slug)
    .eq('owner_user_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const contact = await getContact(tenant.location_id, tenant.ghl_pit, params.contactId)
    return NextResponse.json({ contact })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
