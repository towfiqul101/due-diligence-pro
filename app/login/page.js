'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError(authErr.message); return }

      const res = await fetch('/api/dd-pro/my-tenant', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })
      const tenantData = await res.json()

      if (!tenantData.tenant) {
        setError('Account not configured yet. Contact hello@karvonix.com')
        return
      }
      router.push(`/portal/${tenantData.tenant.slug}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!email) { setError('Enter your email first'); return }
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email)
    if (resetErr) { setError(resetErr.message); return }
    setResetSent(true)
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-xl text-slate-900 mb-1">DD Pro</div>
          <h1 className="font-display font-bold text-2xl text-slate-900">Sign in to your portal</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
            />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
          {resetSent && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">Reset link sent to {email}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div className="flex justify-between items-center mt-4 text-sm">
          <Link href="/signup" className="text-slate-500 hover:text-slate-700">Don&apos;t have an account? <span className="text-amber-600 font-semibold">Sign up →</span></Link>
          <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 text-xs">Forgot password?</button>
        </div>
      </div>
    </div>
  )
}
