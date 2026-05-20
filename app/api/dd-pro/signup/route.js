import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { slug: baseSlug, firm_name, owner_email, owner_user_id } = await req.json()

    // Find a unique slug
    let slug = baseSlug || 'firm'
    let attempt = 0
    while (attempt < 10) {
      const candidate = attempt === 0 ? slug : `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
      const { data: existing } = await supabaseAdmin
        .from('dd_tenants')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (!existing) { slug = candidate; break }
      attempt++
    }

    const { data, error } = await supabaseAdmin.from('dd_tenants').insert({
      slug,
      firm_name,
      owner_email,
      owner_user_id,
      status: 'pending_setup',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ tenant: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
