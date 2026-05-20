'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FILTER_TABS = ['all', 'flagged', 'clean', 'pending']

function Badge({ value }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>
  const map = {
    Flagged: 'bg-red-100 text-red-700',
    Clean: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[value] || 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  )
}

function CreditPill({ label }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
      {label}
    </span>
  )
}

function StatusPill({ status }) {
  const map = {
    'Link Sent': 'bg-yellow-100 text-yellow-700',
    'Completed': 'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status || 'Unknown'}
    </span>
  )
}

function getCredits(c) {
  const credits = []
  if (c.dd_flag_eic === 'Yes' || c.dd_flag_eic === 'true') credits.push('EIC')
  if (c.dd_flag_ctc === 'Yes' || c.dd_flag_ctc === 'true') credits.push('CTC')
  if (c.dd_flag_hoh === 'Yes' || c.dd_flag_hoh === 'true') credits.push('HOH')
  if (c.dd_flag_aoc === 'Yes' || c.dd_flag_aoc === 'true') credits.push('AOC')
  if (c.dd_flag_odc === 'Yes' || c.dd_flag_odc === 'true') credits.push('ODC')
  return credits
}

function DrawerTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-[#1B2B5E] text-[#1B2B5E]' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )
}

function ContactDrawer({ contactId, slug, token, onClose }) {
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    if (!contactId) return
    setLoading(true)
    fetch(`/api/dd-pro/contact/${contactId}?slug=${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setContact(d.contact); setLoading(false) })
      .catch(() => setLoading(false))
  }, [contactId, slug, token])

  const c = contact || {}
  const depCount = parseInt(c.dd_dependent_count || '0', 10)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{c.dd_client_name || c.name || 'Client'}</h2>
            <p className="text-xs text-gray-500">{c.dd_client_email || c.email || ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex border-b px-2">
          {['overview', 'dependents', 'compliance', 'ai'].map(t => (
            <DrawerTab
              key={t}
              label={t === 'ai' ? 'AI Analysis' : t.charAt(0).toUpperCase() + t.slice(1)}
              active={tab === t}
              onClick={() => setTab(t)}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#1B2B5E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name" value={c.dd_client_name || c.name} />
                <Field label="Date of Birth" value={c.dd_client_dob} />
                <Field label="Email" value={c.dd_client_email || c.email} />
                <Field label="Phone" value={c.dd_client_phone || c.phone} />
                <Field label="Filing Status" value={c.dd_filing_status} />
                <Field label="Tax Year" value={c.dd_tax_year} />
                <Field label="Interview Status" value={c.dd_interview_status} />
                <Field label="Interview Date" value={c.dd_interview_date} />
                <Field label="Interview Mode" value={c.dd_interview_mode} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Credits Claimed</p>
                <div className="flex flex-wrap gap-1">
                  {getCredits(c).length
                    ? getCredits(c).map(cr => <CreditPill key={cr} label={cr} />)
                    : <span className="text-sm text-gray-400">None flagged</span>}
                </div>
              </div>
              {c.dd_preparer_notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Preparer Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{c.dd_preparer_notes}</p>
                </div>
              )}
            </div>
          ) : tab === 'dependents' ? (
            <div className="space-y-4">
              <Field label="Has Dependents" value={c.dd_has_dependents} />
              <Field label="Dependent Count" value={c.dd_dependent_count} />
              {depCount > 0 && Array.from({ length: Math.min(depCount, 8) }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Dependent {i + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name" value={c[`dd_dep_${i + 1}_name`]} />
                    <Field label="Date of Birth" value={c[`dd_dep_${i + 1}_dob`]} />
                    <Field label="Relationship" value={c[`dd_dep_${i + 1}_relationship`]} />
                    <Field label="Months in Home" value={c[`dd_dep_${i + 1}_months`]} />
                    <Field label="SSN Last 4" value={c[`dd_dep_${i + 1}_ssn4`]} />
                    <Field label="Full-Time Student" value={c[`dd_dep_${i + 1}_student`]} />
                    <Field label="Disabled" value={c[`dd_dep_${i + 1}_disabled`]} />
                    <Field label="Income" value={c[`dd_dep_${i + 1}_income`]} />
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'compliance' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="EIC Residency Confirmed" value={c.dd_eic_residency} />
                <Field label="HOH Married Status" value={c.dd_hoh_married} />
                <Field label="Income Sources" value={c.dd_income_sources} />
                <Field label="Self-Employed" value={c.dd_self_employed} />
                <Field label="Docs Uploaded" value={c.dd_docs_uploaded} />
                <Field label="Preparer Name" value={c.dd_preparer_name} />
                <Field label="Preparer PTIN" value={c.dd_preparer_ptin} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">AI Result:</p>
                <Badge value={c.dd_ai_result} />
              </div>
              {c.dd_ai_flags && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Flags</p>
                  <p className="text-sm text-gray-700 bg-red-50 rounded p-3">{c.dd_ai_flags}</p>
                </div>
              )}
              {c.dd_ai_summary && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-line">{c.dd_ai_summary}</p>
                </div>
              )}
              {!c.dd_ai_result && (
                <p className="text-sm text-gray-400 text-center py-8">No AI analysis yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SendLinkModal({ slug, token, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/dd-pro/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSent(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Link Sent</h3>
            <p className="text-sm text-gray-500 mb-4">Contact has been created/updated in GHL.</p>
            <button onClick={onClose} className="px-4 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Send Client Self-Service Link</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client Name</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B5E]/30" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B5E]/30" placeholder="jane@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B5E]/30" placeholder="+1 555 000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={sending || (!form.email && !form.phone)} className="flex-1 px-4 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm disabled:opacity-50">
                  {sending ? 'Sending…' : 'Send Link'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function PortalPage() {
  const { slug } = useParams()
  const router = useRouter()
  const tokenRef = useRef(null)

  const [tenantStatus, setTenantStatus] = useState(null)
  const [tenantError, setTenantError] = useState('')
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [showSendLink, setShowSendLink] = useState(false)
  const [filterCounts, setFilterCounts] = useState({ all: 0, flagged: 0, clean: 0, pending: 0 })

  // Verify session + tenant ownership on mount
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      tokenRef.current = session.access_token

      const res = await fetch('/api/dd-pro/my-tenant', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()

      if (!data.tenant) {
        setTenantError('not_found')
        setLoading(false)
        return
      }
      if (data.tenant.slug !== slug) {
        setTenantError('forbidden')
        setLoading(false)
        return
      }

      setTenantStatus(data.tenant.status)
      setLoading(false)
    }
    init()
  }, [router, slug])

  const fetchContacts = useCallback(async (pg = 1, flt = filter, search = q) => {
    if (!tokenRef.current) return
    setContactsLoading(true)
    try {
      const res = await fetch(
        `/api/dd-pro/contacts?slug=${slug}&page=${pg}&filter=${flt}&q=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      )
      const data = await res.json()
      if (data.error) return
      setContacts(data.contacts || [])
      setTotal(data.total || 0)
      setHasMore(data.hasMore || false)
      setPage(pg)
    } finally {
      setContactsLoading(false)
    }
  }, [slug, filter, q])

  const fetchAllCounts = useCallback(async () => {
    if (!tokenRef.current) return
    const results = await Promise.all(
      ['all', 'flagged', 'clean', 'pending'].map(f =>
        fetch(
          `/api/dd-pro/contacts?slug=${slug}&page=1&filter=${f}&q=`,
          { headers: { Authorization: `Bearer ${tokenRef.current}` } }
        )
          .then(r => r.json())
          .then(d => [f, d.total || 0])
          .catch(() => [f, 0])
      )
    )
    setFilterCounts(Object.fromEntries(results))
  }, [slug])

  useEffect(() => {
    if (!loading && tenantStatus === 'active') {
      fetchContacts(1, filter, q)
      fetchAllCounts()
    }
  }, [loading, tenantStatus, filter, fetchAllCounts])

  function handleSearch(val) {
    setQ(val)
    fetchContacts(1, filter, val)
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

  if (tenantError === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Portal Not Found</h2>
          <p className="text-gray-600 mb-6">No account was found for your login. Contact support.</p>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600 underline">Sign out</button>
        </div>
      </div>
    )
  }

  if (tenantError === 'forbidden') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don&apos;t have access to this portal.</p>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600 underline">Sign out</button>
        </div>
      </div>
    )
  }

  if (tenantStatus === 'pending_setup' || tenantStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Pending Setup</h2>
          <p className="text-gray-600 mb-6">Your DD Pro account is being configured. Our team will reach out within 1 business day to complete your GHL integration.</p>
          <p className="text-sm text-gray-400">Questions? Email <a href="mailto:support@taxautomationsuite.com" className="text-[#1B2B5E] underline">support@taxautomationsuite.com</a></p>
          <button onClick={handleSignOut} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline">Sign out</button>
        </div>
      </div>
    )
  }

  if (tenantStatus === 'paused' || tenantStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Paused</h2>
          <p className="text-gray-600 mb-6">Your DD Pro account is currently paused. Please contact support to reactivate.</p>
          <a href="mailto:support@taxautomationsuite.com" className="inline-block px-6 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm">Contact Support</a>
          <div className="mt-4">
            <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600 underline">Sign out</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-[#1B2B5E] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">DD Pro</span>
          <span className="text-blue-300 text-sm hidden sm:inline">/ Due Diligence Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSendLink(true)}
            className="px-3 py-1.5 bg-[#F5A623] text-white rounded-lg text-sm font-medium hover:bg-[#e09510] transition-colors"
          >
            Send Client Link
          </button>
          <button
            onClick={() => router.push(`/portal/${slug}/settings`)}
            className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Client Interviews</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total records</p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-4 px-4 pt-4 pb-0">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B5E]/30"
                placeholder="Search by name or email…"
                value={q}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-0 px-4 border-b border-gray-100 mt-3">
            {FILTER_TABS.map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); fetchContacts(1, f, q) }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize flex items-center gap-1.5 ${
                  filter === f ? 'border-[#1B2B5E] text-[#1B2B5E]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-[#1B2B5E] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {filterCounts[f] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {contactsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-[#1B2B5E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-sm">No clients found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Filing Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Credits</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">AI Result</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden xl:table-cell">Date</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedContactId(c.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{c.dd_client_name || c.name || '—'}</p>
                      <p className="text-xs text-gray-400">{c.dd_client_email || c.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{c.dd_filing_status || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {getCredits(c).map(cr => <CreditPill key={cr} label={cr} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge value={c.dd_ai_result} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><StatusPill status={c.dd_interview_status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                      {c.dd_interview_date || (c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-xs text-[#1B2B5E] hover:underline"
                        onClick={e => { e.stopPropagation(); setSelectedContactId(c.id) }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(page > 1 || hasMore) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                disabled={page <= 1}
                onClick={() => fetchContacts(page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page}</span>
              <button
                disabled={!hasMore}
                onClick={() => fetchContacts(page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedContactId && (
        <ContactDrawer
          contactId={selectedContactId}
          slug={slug}
          token={tokenRef.current}
          onClose={() => setSelectedContactId(null)}
        />
      )}

      {showSendLink && (
        <SendLinkModal
          slug={slug}
          token={tokenRef.current}
          onClose={() => setShowSendLink(false)}
        />
      )}
    </div>
  )
}
