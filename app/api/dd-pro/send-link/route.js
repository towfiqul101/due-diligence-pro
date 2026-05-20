import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase'
import { ghlRequest } from '@/lib/dd-ghl'

export async function POST(req) {
  const { slug, email, phone, name } = await req.json()

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createServerClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabaseAdmin
    .from('dd_tenants')
    .select('location_id, ghl_pit')
    .eq('slug', slug)
    .eq('owner_user_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cfArray = [
    { key: 'dd_interview_status', field_value: 'Link Sent' },
    { key: 'dd_interview_mode', field_value: 'Client Self-Service' },
    ...(name ? [{ key: 'dd_client_name', field_value: name }] : []),
    ...(email ? [{ key: 'dd_client_email', field_value: email }] : []),
    ...(phone ? [{ key: 'dd_client_phone', field_value: phone }] : []),
  ]

  try {
    const result = await ghlRequest('POST', '/contacts/upsert', tenant.ghl_pit, {
      locationId: tenant.location_id,
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      customFields: cfArray,
      source: 'DD Portal',
      tags: ['dd_iv_link_sent'],
    })
    return NextResponse.json({ success: true, contactId: result.contact?.id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
