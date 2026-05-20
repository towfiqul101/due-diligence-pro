'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-gray-700 shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function CodeBlock({ code }) {
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto max-h-48 font-mono">
        {code}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
    </div>
  )
}

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState(null)
  const [embedLoading, setEmbedLoading] = useState(false)
  const [embedCodes, setEmbedCodes] = useState(null)
  const [embedError, setEmbedError] = useState('')
  const [embedTab, setEmbedTab] = useState('client')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: t } = await supabase
        .from('dd_tenants')
        .select('id, firm_name, owner_email, location_id, status, fields_verified, snapshot_sent, created_at')
        .eq('slug', slug)
        .eq('owner_user_id', session.user.id)
        .single()

      if (!t) { router.replace('/login'); return }
      setTenant(t)
      setLoading(false)
    }
    init()
  }, [slug, router])

  async function loadEmbedCodes() {
    setEmbedLoading(true)
    setEmbedError('')
    try {
      const res = await fetch(`/api/dd-pro/embed-codes?tenantId=${tenant.id}`, {
        headers: { 'x-admin-key': '' },
      })
      if (res.status === 401) {
        setEmbedError('Embed codes require admin setup. Contact support.')
        return
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEmbedCodes(data)
    } catch (e) {
      setEmbedError(e.message)
    } finally {
      setEmbedLoading(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwLoading(true)
    setPwError('')
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) {
      setPwError(error.message)
    } else {
      setPwMsg('Password updated successfully.')
      setPwForm({ current: '', next: '', confirm: '' })
    }
    setPwLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#1B2B5E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const EMBED_TABS = ['client', 'preparer', 'iframe']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-[#1B2B5E] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/portal/${slug}`)} className="text-blue-300 hover:text-white text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Portal
          </button>
          <span className="text-white/40">/</span>
          <span className="font-semibold">Settings</span>
        </div>
        <button onClick={handleSignOut} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
          Sign Out
        </button>
      </nav>

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        {/* Firm Info */}
        <Section title="Firm Information" description="Your account details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Firm Name</p>
              <p className="text-sm font-medium text-gray-800">{tenant.firm_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Email</p>
              <p className="text-sm font-medium text-gray-800">{tenant.owner_email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Portal Slug</p>
              <p className="text-sm font-mono text-gray-700">{slug}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Member Since</p>
              <p className="text-sm text-gray-700">{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        </Section>

        {/* GHL Connection */}
        <Section title="GHL Connection" description="GoHighLevel integration status">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${tenant.location_id ? 'bg-green-500' : 'bg-yellow-400'}`} />
            <span className="text-sm text-gray-700">
              {tenant.location_id ? `Connected — Location ID: ${tenant.location_id}` : 'Not connected — contact support to complete setup'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${tenant.fields_verified ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-700">
              DD custom fields {tenant.fields_verified ? 'verified' : 'not yet verified'}
            </span>
          </div>
          {!tenant.location_id && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
              Your GHL integration is pending setup. Our team will configure your location ID after you complete onboarding.
            </div>
          )}
        </Section>

        {/* Embed Codes */}
        <Section title="Wizard Embed Codes" description="Paste these into GHL funnel Custom HTML elements">
          {!embedCodes && !embedError && (
            <button
              onClick={loadEmbedCodes}
              disabled={!tenant.location_id || embedLoading}
              className="px-4 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm disabled:opacity-50 hover:bg-[#152249] transition-colors"
            >
              {embedLoading ? 'Loading…' : 'Load Embed Codes'}
            </button>
          )}
          {!tenant.location_id && (
            <p className="text-sm text-gray-400 mt-2">Available after GHL connection is configured.</p>
          )}
          {embedError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{embedError}</div>
          )}
          {embedCodes && (
            <div>
              <div className="flex gap-0 border-b border-gray-100 mb-4">
                {EMBED_TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setEmbedTab(t)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                      embedTab === t ? 'border-[#1B2B5E] text-[#1B2B5E]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'iframe' ? 'iframe URLs' : `${t.charAt(0).toUpperCase() + t.slice(1)} Wizard`}
                  </button>
                ))}
              </div>
              {embedTab === 'client' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Paste into a GHL Custom HTML element on your client intake funnel page.</p>
                  <CodeBlock code={embedCodes.clientWizard} />
                </div>
              )}
              {embedTab === 'preparer' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Paste into a GHL Custom HTML element on your preparer verification page.</p>
                  <CodeBlock code={embedCodes.preparerWizard} />
                </div>
              )}
              {embedTab === 'iframe' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Client Wizard iframe</p>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs text-gray-700 break-all flex-1">{embedCodes.iframeClient}</code>
                      <CopyButton text={embedCodes.iframeClient} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Preparer Wizard iframe</p>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs text-gray-700 break-all flex-1">{embedCodes.iframePreparer}</code>
                      <CopyButton text={embedCodes.iframePreparer} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Password */}
        <Section title="Change Password" description="Update your account password">
          <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B5E]/30"
                placeholder="Min 8 characters"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B5E]/30"
                placeholder="Repeat password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            {pwError && <p className="text-xs text-red-600">{pwError}</p>}
            {pwMsg && <p className="text-xs text-green-600">{pwMsg}</p>}
            <button
              type="submit"
              disabled={pwLoading || !pwForm.next || !pwForm.confirm}
              className="px-4 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm disabled:opacity-50 hover:bg-[#152249] transition-colors"
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Section>

        {/* Account Status */}
        <Section title="Account Status">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              tenant.status === 'active' ? 'bg-green-100 text-green-700' :
              tenant.status === 'paused' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {tenant.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className="text-sm text-gray-500">
              {tenant.status === 'active' ? 'Your account is fully active.' :
               tenant.status === 'paused' ? 'Account paused — contact support.' :
               'Setup in progress — our team will reach out shortly.'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Need help? <a href="mailto:support@taxautomationsuite.com" className="text-[#1B2B5E] underline">support@taxautomationsuite.com</a>
          </p>
        </Section>
      </div>
    </div>
  )
}
