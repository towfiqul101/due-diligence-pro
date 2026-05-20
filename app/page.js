import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div>
          <span className="font-display font-bold text-xl text-white">DD Pro</span>
          <span className="ml-2 text-slate-400 text-sm">TaxAutomationSuite</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl transition-colors">
            Get DD Pro →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          Part of TaxAutomationSuite ↗
        </div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight mb-5">
          IRS Due Diligence Compliance<br />— Done Right
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          Stop worrying about Form 8867 audits. DD Pro guides you through every required question, catches red flags with AI, and documents your compliance automatically — all inside your GoHighLevel account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link href="/signup" className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-lg rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-500/20">
            Get DD Pro — $99 →
          </Link>
          <a href="#pricing" className="px-8 py-4 border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold text-lg rounded-xl transition-colors">
            See Bundle — $249
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
          {['No monthly fees', 'Works with any GHL plan', 'Your data stays in YOUR GHL account', 'IRS Form 8867 compliant'].map(t => (
            <span key={t} className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>{t}</span>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="border-y border-slate-800 py-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm mb-6">Trusted by independent tax professionals on GoHighLevel</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { stat: 'EITC / HOH / CTC / ODC / AOC', label: 'Full credit coverage' },
              { stat: 'Gemini AI', label: 'Risk analysis on every submission' },
              { stat: 'Form 8867', label: 'Compliance documentation built in' },
            ].map(({ stat, label }) => (
              <div key={stat} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <div className="font-display font-bold text-lg text-amber-400 mb-1">{stat}</div>
                <div className="text-slate-400 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-center mb-3">Everything you need for due diligence compliance</h2>
        <p className="text-slate-400 text-center mb-12">Built specifically for GHL-based tax firms.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '🛡️', title: 'Full Form 8867 Coverage', body: 'Every credit, every question. EITC, HOH, CTC, ODC, and AOC — nothing the IRS requires gets missed.' },
            { icon: '🤖', title: 'AI Risk Analysis', body: 'Gemini AI reviews every submission and flags inconsistencies before they become audit problems.' },
            { icon: '👥', title: 'Client Self-Service Option', body: 'Send clients a branded interview link. They complete it on their own — you review and sign off.' },
            { icon: '📄', title: 'PDF Worksheet Generator', body: 'One-click due diligence worksheet ready to print or save. Your audit defense file, built automatically.' },
            { icon: '🔗', title: 'Lives Inside Your GHL Account', body: 'All data writes directly to your GHL contact record. No separate database. No extra logins.' },
            { icon: '⚡', title: 'TaxIntake Pro Integration', body: 'Bundle with TaxIntake Pro and client data pre-fills automatically. Zero double-entry between tools.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-amber-500/30 transition-colors">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-display font-bold text-base mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-800/30 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display font-bold text-3xl text-center mb-12">How it works</h2>
          <div className="space-y-8">
            {[
              { n: '1', title: 'Import Your GHL Snapshot', body: 'One click imports all required fields and workflows into your GoHighLevel account. Setup takes 5 minutes.' },
              { n: '2', title: 'Run Client Interviews', body: 'Use the preparer wizard yourself or send clients a self-service interview link — your choice per client.' },
              { n: '3', title: 'AI Reviews and Documents Everything', body: 'Gemini AI flags risks, writes preparer notes, and creates your Form 8867 compliance record automatically.' },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-6">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-display font-bold text-slate-900 flex-shrink-0 mt-0.5">{n}</div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-1">Step {n} — {title}</h3>
                  <p className="text-slate-400 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-center mb-2">Simple, one-time pricing</h2>
        <p className="text-slate-400 text-center mb-12">No monthly fees. No subscriptions. Buy once.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Standalone */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <span className="inline-block bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">Get Started</span>
            <div className="font-display font-extrabold text-4xl mb-1">$99</div>
            <div className="text-slate-400 text-sm mb-6">one-time</div>
            <ul className="space-y-2 mb-8 text-sm text-slate-300">
              {['Full EITC / HOH / CTC / ODC / AOC wizard','Client self-service interview mode','Gemini AI risk analysis','PDF worksheet generator','GHL Snapshot included (fields + workflows)','Up to 8 dependents per client','12 months of feature updates'].map(f => (
                <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup" className="block text-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors">Get DD Pro — $99</Link>
          </div>
          {/* Bundle */}
          <div className="bg-slate-800/50 border-2 border-amber-500 rounded-2xl p-8 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">⭐ Most Popular</span>
            <span className="inline-block bg-amber-500/10 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">Best Value — Save $49</span>
            <div className="font-display font-extrabold text-4xl mb-1">$249</div>
            <div className="text-slate-400 text-sm mb-6">one-time</div>
            <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">Everything in DD Pro, plus:</p>
            <ul className="space-y-2 mb-8 text-sm text-slate-300">
              {['TaxIntake Pro — 13-step client intake form','Client portal with pipeline management','Document collection with magic links','Auto pre-fill: TaxIntake → DD Pro','One-click DD Pro launch from intake portal','Shared GHL contact data — zero double entry','12 months of feature updates'].map(f => (
                <li key={f} className="flex gap-2"><span className="text-amber-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup" className="block text-center px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors">Get the Bundle — $249</Link>
          </div>
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">All plans include lifetime access to current version + 12 months of feature updates. Your client data never leaves your GHL account.</p>
      </section>

      {/* FAQ */}
      <section className="bg-slate-800/30 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display font-bold text-3xl text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              { q: 'Do I need GoHighLevel to use DD Pro?', a: 'Yes. DD Pro stores all compliance data directly in your GHL account using custom fields and workflows. Any GHL plan works — Starter, Pro, or higher.' },
              { q: 'How does GHL setup work?', a: 'We provide a GHL Snapshot. Import it with one click and all required custom fields and workflows appear in your account automatically. Setup takes under 5 minutes. We also provide the wizard HTML to paste into your GHL funnel pages.' },
              { q: 'What does the TaxIntake Pro bundle include?', a: 'TaxIntake Pro is our client intake system — a 13-step intake form, client document portal, GHL pipeline management, and AI-powered tax analysis. When bundled, client data from intake auto-fills into DD Pro so you never enter information twice.' },
              { q: 'Is there a monthly fee after purchase?', a: 'No monthly fees. Your one-time payment includes lifetime access to the current version plus 12 months of feature updates. After 12 months, updates are optional at $79/year — the tool keeps working either way.' },
            ].map(({ q, a }) => (
              <details key={q} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden group">
                <summary className="px-6 py-4 font-semibold cursor-pointer list-none flex justify-between items-center hover:text-amber-400 transition-colors">
                  {q} <span className="text-slate-500 group-open:rotate-180 transition-transform">↓</span>
                </summary>
                <div className="px-6 pb-5 text-slate-400 leading-relaxed text-sm">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
            <div>
              <div className="font-display font-bold text-white">DD Pro · Due Diligence Pro</div>
              <div className="text-slate-500 text-sm">Part of TaxAutomationSuite</div>
            </div>
            <div className="flex gap-5 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">TaxIntake Pro</a>
              <a href="#" className="hover:text-white transition-colors">TaxAutomationSuite</a>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
            <div className="text-sm text-slate-400 text-right">
              <div>hello@karvonix.com</div>
              <div>© 2025 Karvonix. All rights reserved.</div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 text-center text-slate-600 text-xs">
            Your client data never leaves your GoHighLevel account.
          </div>
        </div>
      </footer>
    </div>
  )
}
