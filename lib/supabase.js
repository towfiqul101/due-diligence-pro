import { createClient } from '@supabase/supabase-js'

let _supabase = null
let _supabaseAdmin = null

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _supabase
}

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabaseAdmin
}

// Creates a request-scoped client that carries the user's JWT.
// Use this in API route handlers: createServerClient(req.headers.get('authorization')?.replace('Bearer ', ''))
export function createServerClient(accessToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
}

// Lazy proxy — createClient is deferred until first call, so module-level
// import never throws even in client bundles where SUPABASE_SERVICE_ROLE_KEY
// is stripped by Next.js.
export const supabase = {
  get auth() { return getSupabase().auth },
  from: (...args) => getSupabase().from(...args),
}

export const supabaseAdmin = {
  from: (...args) => getSupabaseAdmin().from(...args),
}
