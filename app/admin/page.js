'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUS_BADGE = {
  pending_setup: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
}

function Badge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

function GhlSetupBadge({ t }) {
  if (t.fields_verified) return <span className="text-green-600 text-xs font-semibold">🟢 Fields OK</span>
  if (t.snapshot_sent) return <span className="text-amber-600 text-xs font-semibold">🟡 Snapshot Sent</span>
  return <span className="text-red-500 text-xs font-semibold">🔴 Not Setup</span>
}

function NewTenantModal({ onClose, onCreated, adminKey }) {
  const [form, setForm] = useState({
    firm_name: '',
    owner_email: '',
    location_id: '',
    ghl_pit: '',
    status: 'pending_setup',
    notes: '',
  })
  const [showPit, setShowPit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!form.firm_name || !form.owner_email) { setError('Firm name and email are required'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/dd-pro/admin/tenants?key=${adminKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setError(d.error || 'Failed to create tenant'); return }
    onCreated(d.tenant)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 className="font-display font-bold text-lg">Add New Client Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {[
            { label: 'Firm Name', key: 'firm_name', type: 'text', required: true },
            { label: 'Owner Email', key: 'owner_email', type: 'email', required: true },
            { label: 'Location ID', key: 'location_id', type: 'text', hint: 'GHL Settings → Business Profile' },
          ].map(({ label, key, type, hint, required }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">GHL Private Integration Token</label>
            <div className="flex gap-2">
              <input type={showPit ? 'text' : 'password'} value={form.ghl_pit}
                onChange={e => setForm(f => ({ ...f, ghl_pit: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Optional — can be added later" />
              <button onClick={() => setShowPit(v => !v)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-500">
                {showPit ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="pending_setup">pending_setup</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Onboarding notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[60px] resize-y" />
          </div>

          {error && <div className="text-sm px-3 py-2 rounded-xl bg-red-50 text-red-700">{error}</div>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmbedModal({ tenant, onClose, adminKey }) {
  const [tab, setTab] = useState('client')
  const [codes, setCodes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    fetch(`/api/dd-pro/embed-codes?tenantId=${tenant.id}&key=${adminKey}`)
      .then(r => r.json())
      .then(d => { setCodes(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tenant.id, adminKey])

  function copy(text, label) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 className="font-display font-bold text-lg">Embed Codes — {tenant.firm_name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-2 mb-4">
            {['client', 'preparer', 'iframe'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t === 'client' ? 'Client Wizard' : t === 'preparer' ? 'Preparer Wizard' : 'Iframe Embed'}
              </button>
            ))}
          </div>

          {loading && <div className="py-8 text-center text-slate-400">Generating embed codes…</div>}

          {!loading && codes && (
            <div className="space-y-4 pb-6">
              {tab === 'client' && (
                <>
                  <p className="text-sm text-slate-500">Paste this into a GHL Custom HTML element on your client-facing funnel page.</p>
                  <textarea readOnly value={codes.clientWizard || ''} className="w-full h-80 font-mono text-xs border border-slate-200 rounded-xl p-3 resize-none bg-slate-50" />
                  <button onClick={() => copy(codes.clientWizard, 'client')} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl">
                    {copied === 'client' ? '✓ Copied!' : '📋 Copy to Clipboard'}
                  </button>
                </>
              )}
              {tab === 'preparer' && (
                <>
                  <p className="text-sm text-slate-500">Paste this into a GHL Custom HTML element on your preparer-facing funnel page.</p>
                  <textarea readOnly value={codes.preparerWizard || ''} className="w-full h-80 font-mono text-xs border border-slate-200 rounded-xl p-3 resize-none bg-slate-50" />
                  <button onClick={() => copy(codes.preparerWizard, 'preparer')} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl">
                    {copied === 'preparer' ? '✓ Copied!' : '📋 Copy to Clipboard'}
                  </button>
                </>
              )}
              {tab === 'iframe' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Alternative: embed as iframe instead of pasting HTML directly.</p>
                  {[
                    { label: 'Client Wizard URL', val: codes.iframeClient },
                    { label: 'Preparer Wizard URL', val: codes.iframePreparer },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>
                      <div className="flex gap-2">
                        <input readOnly value={val || ''} className="flex-1 font-mono text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50" />
                        <button onClick={() => copy(val, label)} className="px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap">
                          {copied === label ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Iframe Snippet</div>
                    <textarea readOnly value={`<iframe\n  src="${codes.iframePreparer}"\n  style="width:100%;min-height:100vh;border:none;">\n</iframe>`}
                      className="w-full h-24 font-mono text-xs border border-slate-200 rounded-xl p-3 resize-none bg-slate-50" />
                    <button onClick={() => copy(`<iframe\n  src="${codes.iframePreparer}"\n  style="width:100%;min-height:100vh;border:none;">\n</iframe>`, 'iframe')}
                      className="mt-2 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl">
                      {copied === 'iframe' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
                ⚠️ Keep the Location ID private. Anyone with this ID can submit data to your GHL account.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditModal({ tenant, onClose, onSaved, adminKey }) {
  const [form, setForm] = useState({
    firm_name: tenant.firm_name || '',
    owner_email: tenant.owner_email || '',
    ghl_pit: tenant.ghl_pit || '',
    location_id: tenant.location_id || '',
    status: tenant.status || 'pending_setup',
    snapshot_sent: tenant.snapshot_sent || false,
    notes: tenant.notes || '',
    taxintake_enabled: tenant.taxintake_enabled || false,
    taxintake_slug: tenant.taxintake_slug || '',
    taxintake_location_id: tenant.taxintake_location_id || '',
  })
  const [showPit, setShowPit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/dd-pro/admin/tenants/${tenant.id}?key=${adminKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(`Error: ${d.error}`); return }
    setMsg('Saved!')
    setTimeout(() => { onSaved(d.tenant); onClose() }, 800)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 className="font-display font-bold text-lg">Edit — {tenant.firm_name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {[
            { label: 'Firm Name', key: 'firm_name', type: 'text' },
            { label: 'Owner Email', key: 'owner_email', type: 'email' },
            { label: 'Location ID', key: 'location_id', type: 'text', hint: 'Found in GHL Settings → Business Profile' },
          ].map(({ label, key, type, hint }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
              {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">GHL Private Integration Token</label>
            <p className="text-xs text-slate-400 mb-1">Keep this secret — grants API access to GHL</p>
            <div className="flex gap-2">
              <input type={showPit ? 'text' : 'password'} value={form.ghl_pit}
                onChange={e => setForm(f => ({ ...f, ghl_pit: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button onClick={() => setShowPit(v => !v)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-500">
                {showPit ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="pending_setup">pending_setup</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.snapshot_sent}
              onChange={e => setForm(f => ({ ...f, snapshot_sent: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-amber-500" />
            <div>
              <div className="text-sm font-semibold text-slate-700">✓ GHL Snapshot has been sent and imported</div>
              <div className="text-xs text-slate-400">Tick this manually after you send them the Snapshot import link and they confirm import</div>
            </div>
          </label>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Internal notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Onboarding notes, support history..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[80px] resize-y" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.taxintake_enabled}
              onChange={e => setForm(f => ({ ...f, taxintake_enabled: e.target.checked }))}
              className="w-4 h-4 accent-amber-500" />
            <span className="text-sm font-semibold text-slate-700">Enable TaxIntake Pro integration</span>
          </label>
          {form.taxintake_enabled && (
            <div className="space-y-3 pl-7">
              {[
                { label: 'TaxIntake Slug', key: 'taxintake_slug' },
                { label: 'TaxIntake Location ID', key: 'taxintake_location_id' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              ))}
            </div>
          )}

          {msg && <div className={`text-sm px-3 py-2 rounded-xl ${msg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

          <button onClick={save} disabled={saving}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(false)
  const [editTenant, setEditTenant] = useState(null)
  const [embedTenant, setEmbedTenant] = useState(null)
  const [verifyState, setVerifyState] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showNewTenant, setShowNewTenant] = useState(false)

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('key')
    if (k) { setAdminKey(k); setAuthed(true) }
  }, [])

  const loadTenants = useCallback(async (key) => {
    setLoading(true)
    const res = await fetch(`/api/dd-pro/admin/tenants?key=${key}`)
    if (!res.ok) { setAuthed(false); setLoading(false); return }
    const d = await res.json()
    setTenants(d.tenants || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (authed && adminKey) loadTenants(adminKey) }, [authed, adminKey, loadTenants])

  function login() {
    setAdminKey(keyInput)
    setAuthed(true)
  }

  async function verifyFields(tenant) {
    setVerifyState(v => ({ ...v, [tenant.id]: { loading: true } }))
    const res = await fetch('/api/dd-pro/verify-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ tenantId: tenant.id }),
    })
    const d = await res.json()
    setVerifyState(v => ({ ...v, [tenant.id]: { result: d, loading: false } }))
    if (d.verified) loadTenants(adminKey)
  }

  async function deleteTenant(id) {
    await fetch(`/api/dd-pro/admin/tenants/${id}?key=${adminKey}`, { method: 'DELETE' })
    setTenants(t => t.filter(x => x.id !== id))
    setDeleteConfirm(null)
  }

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    pending: tenants.filter(t => t.status === 'pending_setup').length,
    other: tenants.filter(t => t.status === 'paused' || t.status === 'cancelled').length,
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm w-full">
          <h1 className="font-display font-bold text-xl text-slate-900 mb-6 text-center">DD Pro Admin</h1>
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Admin secret key"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4" />
          <button onClick={login} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Enter</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {showNewTenant && (
        <NewTenantModal adminKey={adminKey} onClose={() => setShowNewTenant(false)}
          onCreated={t => setTenants(ts => [t, ...ts])} />
      )}
      {editTenant && (
        <EditModal tenant={editTenant} adminKey={adminKey} onClose={() => setEditTenant(null)}
          onSaved={updated => setTenants(t => t.map(x => x.id === updated.id ? updated : x))} />
      )}
      {embedTenant && <EmbedModal tenant={embedTenant} adminKey={adminKey} onClose={() => setEmbedTenant(null)} />}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Delete {deleteConfirm.firm_name}?</h3>
            <p className="text-slate-500 text-sm mb-5">This cannot be undone. Their GHL data is not affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={() => deleteTenant(deleteConfirm.id)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display font-bold text-2xl text-slate-900">DD Pro Admin</h1>
            <p className="text-slate-500 text-sm">Manage all Due Diligence Pro tenants</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewTenant(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-xl transition-colors">+ Add Client</button>
            <button onClick={() => loadTenants(adminKey)} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl">↻ Refresh</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tenants', val: stats.total, color: 'bg-slate-100 text-slate-700' },
            { label: 'Active', val: stats.active, color: 'bg-green-50 text-green-700' },
            { label: 'Pending Setup', val: stats.pending, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Paused / Cancelled', val: stats.other, color: 'bg-gray-100 text-gray-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className={`rounded-2xl p-5 ${color}`}>
              <div className="text-3xl font-display font-bold">{val}</div>
              <div className="text-sm font-semibold mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Firm Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">GHL Setup</th>
                    <th className="px-4 py-3">Snapshot</th>
                    <th className="px-4 py-3">TaxIntake</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{t.firm_name}</div>
                        <div className="text-xs text-slate-400">{t.owner_email}</div>
                      </td>
                      <td className="px-4 py-3"><Badge status={t.status} /></td>
                      <td className="px-4 py-3"><GhlSetupBadge t={t} /></td>
                      <td className="px-4 py-3 text-xs">{t.snapshot_sent ? '✓ Sent' : '○ Pending'}</td>
                      <td className="px-4 py-3 text-xs">{t.taxintake_enabled ? '✓ Linked' : '— Not linked'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => setEditTenant(t)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">Edit</button>
                          <button onClick={() => verifyFields(t)} disabled={verifyState[t.id]?.loading}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg disabled:opacity-50">
                            {verifyState[t.id]?.loading ? '…' : 'Verify Fields'}
                          </button>
                          <button onClick={() => setEmbedTenant(t)} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">Embed Codes</button>
                          <a href={`/portal/${t.slug}`} target="_blank" className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg">Open Portal</a>
                          <button onClick={() => setDeleteConfirm(t)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">Delete</button>
                        </div>
                        {verifyState[t.id]?.result && (
                          <div className={`mt-1.5 text-xs px-2 py-1 rounded ${verifyState[t.id].result.verified ? 'bg-green-50 text-green-700' : verifyState[t.id].result.error ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                            {verifyState[t.id].result.verified
                              ? `✅ All ${verifyState[t.id].result.found} core fields verified`
                              : verifyState[t.id].result.error
                              ? `❌ ${verifyState[t.id].result.error}`
                              : `⚠️ ${verifyState[t.id].result.found}/${verifyState[t.id].result.total} found — missing: ${(verifyState[t.id].result.missing || []).slice(0, 3).join(', ')}${(verifyState[t.id].result.missing || []).length > 3 ? '…' : ''}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No tenants yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
