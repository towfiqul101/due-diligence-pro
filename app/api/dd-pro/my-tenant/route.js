import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase'

export async function GET(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createServerClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabaseAdmin
    .from('dd_tenants')
    .select('id, slug, status, firm_name')
    .eq('owner_user_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  return NextResponse.json({ tenant })
}
