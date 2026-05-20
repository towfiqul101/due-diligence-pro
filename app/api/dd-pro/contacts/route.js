import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase'
import { getContactsByTags } from '@/lib/dd-ghl'

const PAGE_SIZE = 20

export async function GET(req) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const filter = url.searchParams.get('filter') || 'all'
  const q = (url.searchParams.get('q') || '').toLowerCase()

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createServerClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabaseAdmin
    .from('dd_tenants')
    .select('*')
    .eq('slug', slug)
    .eq('owner_user_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (tenant.status !== 'active') return NextResponse.json({ pending: true, status: tenant.status })

  let contacts
  try {
    contacts = await getContactsByTags(tenant.location_id, tenant.ghl_pit, [
      'dd-wizard-submitted', 'dd-clear', 'dd-flagged',
    ])
  } catch (e) {
    return NextResponse.json({ error: `GHL error: ${e.message}` }, { status: 502 })
  }

  if (filter === 'flagged') contacts = contacts.filter(c => c.dd_ai_result === 'Flagged')
  else if (filter === 'clean') contacts = contacts.filter(c => c.dd_ai_result === 'Clean')
  else if (filter === 'pending') contacts = contacts.filter(c => !c.dd_ai_result)

  if (q) contacts = contacts.filter(c =>
    (c.dd_client_name || c.name || '').toLowerCase().includes(q) ||
    (c.dd_client_email || c.email || '').toLowerCase().includes(q)
  )

  const total = contacts.length
  const start = (page - 1) * PAGE_SIZE
  const paged = contacts.slice(start, start + PAGE_SIZE)

  return NextResponse.json({ contacts: paged, total, page, hasMore: start + PAGE_SIZE < total })
}
