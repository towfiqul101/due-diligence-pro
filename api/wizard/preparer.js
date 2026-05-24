/**
 * DUE DILIGENCE PRO — Preparer Wizard Server
 * GET /api/wizard/preparer?loc=LOCATION_ID&firm=Smith+Tax
 * 
 * Serves the preparer wizard HTML inline (no template file needed).
 * Same approach as the client wizard endpoint.
 */

async function isLocationValid(locationId) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('dd_tenants')
      .select('id, ghl_pit, firm_name')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .single();
    if (data) {
      console.log('[Location] Tenant found:', data.id, 'PIT:', data.ghl_pit ? 'SET' : 'MISSING');
      return { valid: true, tenant: data };
    }
    console.log('[Location] Not found in Supabase, checking DD_LOCATIONS fallback');
    const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
    const found = locations.find(function(l) { return l.locationId === locationId; });
    if (found) return { valid: true, tenant: found };
    return { valid: false };
  } catch (err) {
    console.error('[Location] Supabase error:', err.message, '— trying DD_LOCATIONS fallback');
    try {
      const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
      const found = locations.find(function(l) { return l.locationId === locationId; });
      if (found) return { valid: true, tenant: found };
    } catch(e) {}
    return { valid: false };
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  var loc = req.query.loc || '';
  if (!loc) return res.status(400).send(errPg('Missing location ID', 'The embed code is missing the loc parameter.'));

  var result = await isLocationValid(loc);
  if (!result.valid) return res.status(403).send(errPg('Not Licensed', 'This location is not registered for Due Diligence Pro.'));

  var tenant = result.tenant;
  var firm = req.query.firm || tenant.firm_name || tenant.name || 'Tax Office';
  var firmEmail = req.query.email || 'towfiqul.pro@gmail.com';
  firm = decodeURIComponent(firm).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  firmEmail = decodeURIComponent(firmEmail).replace(/</g, '&lt;');

  var contactId = (req.query.contactId || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);
  var html = buildPreparerWizard(loc, firm, firmEmail, contactId);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  return res.status(200).send(html);
};

function errPg(title, msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0"><div style="text-align:center;max-width:400px;padding:40px"><div style="font-size:48px;margin-bottom:16px">&#128274;</div><h2 style="color:#0f172a;margin-bottom:8px">' + title + '</h2><p style="color:#64748b;font-size:15px;line-height:1.6">' + msg + '</p></div></body></html>';
}

function buildPreparerWizard(loc, firm, firmEmail, contactId) {
  var apiBase = 'https://due-diligence-pro-phi.vercel.app/api';
  contactId = (contactId || '').replace(/[^a-zA-Z0-9_-]/g, '');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Due Diligence Pro — ${firm}</title>
-->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--pp-primary:#0f172a;--pp-primary-hover:#1e293b;--pp-accent:#f59e0b;--pp-accent-light:#fef3c7;--pp-accent-glow:rgba(245,158,11,0.15);--pp-green:#10b981;--pp-green-light:#ecfdf5;--pp-red:#ef4444;--pp-red-light:#fef2f2;--pp-blue:#3b82f6;--pp-blue-light:#eff6ff;--pp-purple:#8b5cf6;--pp-pink:#ec4899;--pp-text:#0f172a;--pp-text-sec:#475569;--pp-text-muted:#94a3b8;--pp-bg:#fff;--pp-bg-page:#f8fafc;--pp-bg-sub:#f1f5f9;--pp-border:#e2e8f0;--pp-border-lt:#f1f5f9;--pp-shadow-sm:0 1px 3px rgba(0,0,0,0.04),0 1px 2px rgba(0,0,0,0.06);--pp-shadow-md:0 4px 16px -2px rgba(0,0,0,0.08),0 2px 6px -2px rgba(0,0,0,0.04);--pp-shadow-lg:0 12px 40px -8px rgba(0,0,0,0.1),0 4px 12px -4px rgba(0,0,0,0.05);--pp-r:16px;--pp-rs:12px;--pp-font:'DM Sans',system-ui,sans-serif;--pp-font-d:'Plus Jakarta Sans','DM Sans',system-ui,sans-serif}
.pp *{margin:0;padding:0;box-sizing:border-box}
.pp{font-family:var(--pp-font);background:var(--pp-bg-page);color:var(--pp-text);max-width:720px;margin:0 auto;padding:24px 16px 40px;-webkit-font-smoothing:antialiased;min-height:100vh;position:relative}
.pp::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 20% 0%,rgba(245,158,11,0.04) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(59,130,246,0.04) 0%,transparent 50%);pointer-events:none;z-index:0}
.pp>*{position:relative;z-index:1}
.pp-hdr{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:22px 28px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);border-radius:var(--pp-r);color:#fff;box-shadow:var(--pp-shadow-lg);position:relative;overflow:hidden}
.pp-hdr::after{content:'';position:absolute;top:-50%;right:-20%;width:200px;height:200px;background:radial-gradient(circle,rgba(245,158,11,0.15) 0%,transparent 70%);border-radius:50%;pointer-events:none}
.pp-hdr-ico{width:48px;height:48px;background:linear-gradient(135deg,var(--pp-accent),#d97706);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 4px 16px rgba(245,158,11,0.3);animation:ppFloat 3s ease-in-out infinite}
@keyframes ppFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.pp-hdr h1{font-family:var(--pp-font-d);font-size:21px;font-weight:800;letter-spacing:-0.4px}
.pp-hdr-sub{font-size:13px;color:rgba(255,255,255,0.5);margin-top:3px}
.pp-prog{margin-bottom:10px;padding:0 4px}
.pp-prog-bar{height:5px;background:var(--pp-border);border-radius:5px;overflow:hidden}
.pp-prog-fill{height:100%;background:linear-gradient(90deg,var(--pp-accent),var(--pp-green));border-radius:5px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);position:relative;box-shadow:0 0 12px rgba(245,158,11,0.3)}
.pp-prog-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent);animation:ppShim 1.8s infinite}
@keyframes ppShim{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.pp-prog-lbl{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--pp-text-muted);margin-top:8px}
.pp-prog-pct{color:var(--pp-accent);font-weight:700}
.pp-pg{display:none;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-radius:var(--pp-r);padding:36px 32px;border:1px solid rgba(226,232,240,0.8);box-shadow:var(--pp-shadow-md);position:relative;overflow:hidden;transition:box-shadow 0.3s}
.pp-pg:hover{box-shadow:var(--pp-shadow-lg)}
.pp-pg.active{display:block;animation:ppUp 0.5s cubic-bezier(0.16,1,0.3,1)}
@keyframes ppUp{from{opacity:0;transform:translateY(24px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.pp-pg::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--pp-primary),var(--pp-accent),var(--pp-green));background-size:200% 100%;animation:ppGrad 4s ease infinite}
@keyframes ppGrad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.pp-pg-ico{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:26px;background:linear-gradient(135deg,var(--pp-accent-light),#fff);border:1px solid rgba(245,158,11,0.15);box-shadow:0 4px 12px rgba(245,158,11,0.1)}
.pp-ttl{font-family:var(--pp-font-d);font-size:24px;font-weight:800;margin-bottom:6px;letter-spacing:-0.4px;background:linear-gradient(135deg,var(--pp-text),#334155);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.pp-desc{font-size:14.5px;color:var(--pp-text-sec);margin-bottom:26px;line-height:1.65}
.pp-f{margin-bottom:24px}
.pp-f.hidden{display:none}
.pp-f.fade{animation:ppFade 0.35s ease-out}
@keyframes ppFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.pp-lbl{display:block;font-size:14px;font-weight:600;color:var(--pp-text);margin-bottom:8px;line-height:1.4}
.pp-req{color:var(--pp-red)}
.pp-hint{font-size:12.5px;color:var(--pp-text-muted);margin-top:-4px;margin-bottom:8px;line-height:1.4}
.pp-inp,.pp-ta{width:100%;padding:13px 16px;font-size:15px;font-family:var(--pp-font);border:1.5px solid var(--pp-border);border-radius:var(--pp-rs);background:var(--pp-bg);color:var(--pp-text);outline:none;transition:all 0.25s}
.pp-inp:hover,.pp-ta:hover{border-color:#cbd5e1}
.pp-inp:focus,.pp-ta:focus{border-color:var(--pp-accent);box-shadow:0 0 0 4px var(--pp-accent-glow);transform:translateY(-1px)}
.pp-ta{min-height:80px;resize:vertical}
.pp-sel{width:100%;padding:13px 44px 13px 16px;font-size:15px;font-family:var(--pp-font);border:1.5px solid var(--pp-border);border-radius:var(--pp-rs);background:var(--pp-bg);color:var(--pp-text);cursor:pointer;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;transition:all 0.25s}
.pp-sel:focus{border-color:var(--pp-accent);box-shadow:0 0 0 4px var(--pp-accent-glow)}
.pp-rg{display:flex;gap:10px;flex-wrap:wrap}
.pp-rb{flex:1;min-width:80px;padding:14px 16px;font-size:14px;font-weight:500;font-family:var(--pp-font);text-align:center;border:1.5px solid var(--pp-border);border-radius:var(--pp-rs);background:var(--pp-bg);color:var(--pp-text-sec);cursor:pointer;transition:all 0.25s;user-select:none;position:relative}
.pp-rb:hover{border-color:var(--pp-accent);background:var(--pp-accent-light);color:#92400e;transform:translateY(-2px);box-shadow:var(--pp-shadow-sm)}
.pp-rb:active{transform:translateY(0) scale(0.96)}
.pp-rb.sel{border-color:var(--pp-accent);background:linear-gradient(135deg,var(--pp-accent-light),#fff8e1);color:#92400e;font-weight:600;box-shadow:0 0 0 2px var(--pp-accent-glow),0 4px 12px rgba(245,158,11,0.12)}
.pp-rb.sel::after{content:'';position:absolute;top:7px;right:7px;width:18px;height:18px;background:var(--pp-accent);border-radius:50%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpath d='M5 13l4 4L19 7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center;animation:ppChk 0.3s cubic-bezier(0.175,0.885,0.32,1.275)}
@keyframes ppChk{0%{transform:scale(0)}100%{transform:scale(1)}}
.pp-cg{display:flex;flex-direction:column;gap:8px}
.pp-ci{display:flex;align-items:center;gap:12px;padding:13px 16px;border:1.5px solid var(--pp-border);border-radius:var(--pp-rs);cursor:pointer;transition:all 0.25s;font-size:14px;font-weight:500;color:var(--pp-text-sec)}
.pp-ci:hover{border-color:var(--pp-accent);background:var(--pp-accent-light);transform:translateX(6px)}
.pp-ci.chk{border-color:var(--pp-accent);background:linear-gradient(135deg,var(--pp-accent-light),#fff8e1);color:#92400e;font-weight:600}
.pp-ci input{display:none}
.pp-ck{width:22px;height:22px;border:2px solid var(--pp-border);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.25s}
.pp-ci.chk .pp-ck{background:var(--pp-accent);border-color:var(--pp-accent);animation:ppChk 0.3s cubic-bezier(0.175,0.885,0.32,1.275)}
.pp-ck svg{opacity:0;transition:opacity 0.2s}
.pp-ci.chk .pp-ck svg{opacity:1}
.pp-f.err .pp-inp,.pp-f.err .pp-sel,.pp-f.err .pp-ta{border-color:var(--pp-red);box-shadow:0 0 0 4px rgba(239,68,68,0.08);animation:ppShake 0.4s ease}
@keyframes ppShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
.pp-f.err .pp-rb{border-color:rgba(239,68,68,0.3)}
.pp-f.err .pp-lbl{color:var(--pp-red)}
.pp-errmsg{font-size:12px;color:var(--pp-red);margin-top:5px;display:none;font-weight:500}
.pp-f.err .pp-errmsg{display:block;animation:ppFade 0.2s ease}
.pp-banner{display:none;padding:14px 18px;border-radius:var(--pp-rs);font-size:14px;font-weight:500;margin-bottom:16px;line-height:1.5}
.pp-banner.vis{display:flex;gap:10px;align-items:flex-start;animation:ppFade 0.3s ease}
.pp-banner.err{background:var(--pp-red-light);border:1px solid var(--pp-red);color:#b91c1c}
.pp-banner.ok{background:var(--pp-green-light);border:1px solid var(--pp-green);color:#166534}
.pp-banner.info{background:var(--pp-blue-light);border:1px solid var(--pp-blue);color:#1e40af}
.pp-nav{display:flex;justify-content:space-between;align-items:center;margin-top:30px;padding-top:22px;border-top:1px solid var(--pp-border-lt)}
.pp-btn{padding:13px 26px;font-size:15px;font-weight:600;font-family:var(--pp-font);border:none;border-radius:var(--pp-rs);cursor:pointer;transition:all 0.3s;display:inline-flex;align-items:center;gap:8px}
.pp-btn-bk{background:var(--pp-bg-sub);color:var(--pp-text-sec);border:1.5px solid var(--pp-border)}
.pp-btn-bk:hover{background:var(--pp-border-lt);transform:translateX(-2px)}
.pp-btn-nx{background:linear-gradient(135deg,var(--pp-primary),#1e293b);color:#fff;margin-left:auto;box-shadow:0 2px 8px rgba(15,23,42,0.15)}
.pp-btn-nx:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(15,23,42,0.2)}
.pp-btn-sub{background:linear-gradient(135deg,var(--pp-green),#059669);color:#fff;margin-left:auto;padding:15px 36px;font-size:16px;box-shadow:0 4px 16px rgba(16,185,129,0.25)}
.pp-btn-sub:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(16,185,129,0.3)}
.pp-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none!important}
.pp-search{display:flex;gap:10px}
.pp-search .pp-inp{flex:1}
.pp-search-btn{padding:13px 28px;background:linear-gradient(135deg,var(--pp-accent),#d97706);color:#0f172a;font-weight:700;border:none;border-radius:var(--pp-rs);cursor:pointer;font-family:var(--pp-font);font-size:15px;transition:all 0.25s;white-space:nowrap;box-shadow:0 2px 10px rgba(245,158,11,0.25)}
.pp-search-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(245,158,11,0.3)}
.pp-search-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.pp-or{text-align:center;padding:18px 0;font-size:12px;color:var(--pp-text-muted);font-weight:600;text-transform:uppercase;letter-spacing:1.5px;position:relative}
.pp-or::before,.pp-or::after{content:'';position:absolute;top:50%;width:calc(50% - 30px);height:1px;background:var(--pp-border)}
.pp-or::before{left:0}
.pp-or::after{right:0}
.pp-add-btn{width:100%;padding:16px;background:var(--pp-bg);border:2px dashed var(--pp-border);border-radius:var(--pp-rs);font-size:15px;font-weight:600;font-family:var(--pp-font);color:var(--pp-text-sec);cursor:pointer;transition:all 0.25s;display:flex;align-items:center;justify-content:center;gap:8px}
.pp-add-btn:hover{border-color:var(--pp-accent);color:var(--pp-accent);background:var(--pp-accent-light);transform:translateY(-2px)}
.pp-client-card{background:linear-gradient(135deg,var(--pp-bg-sub),#fff);border:1px solid var(--pp-border);border-radius:var(--pp-rs);padding:22px;margin-top:16px;display:none;box-shadow:var(--pp-shadow-sm)}
.pp-client-card.vis{display:block;animation:ppFade 0.35s ease}
.pp-client-card h3{font-size:18px;font-weight:700;margin-bottom:4px;font-family:var(--pp-font-d)}
.pp-client-card p{font-size:13px;color:var(--pp-text-sec);margin-bottom:14px}
.pp-client-card .pp-btn-nx{width:100%;justify-content:center}
.pp-sum-sec{margin-bottom:18px;transition:transform 0.2s}
.pp-sum-sec:hover{transform:translateY(-1px)}
.pp-sum-hdr{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;padding:10px 16px;border-radius:var(--pp-rs) var(--pp-rs) 0 0;color:#fff}
.pp-sum-tbl{width:100%;border:1px solid var(--pp-border);border-top:none;border-radius:0 0 var(--pp-rs) var(--pp-rs);border-collapse:collapse;background:var(--pp-bg)}
.pp-sum-tbl td{padding:9px 16px;font-size:13px;border-bottom:1px solid var(--pp-border-lt)}
.pp-sum-tbl tr:last-child td{border-bottom:none}
.pp-sum-tbl td:first-child{color:var(--pp-text-muted);width:42%}
.pp-sum-tbl td:last-child{color:var(--pp-text);font-weight:600}
.pp-dep-hdr{display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--pp-border-lt)}
.pp-dep-badge{width:44px;height:44px;background:linear-gradient(135deg,var(--pp-purple),#7c3aed);color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(139,92,246,0.25)}
.pp-attest{background:linear-gradient(135deg,var(--pp-accent-light),#fffbeb);border:2px solid var(--pp-accent);border-radius:var(--pp-rs);padding:24px;margin-bottom:20px;box-shadow:0 4px 16px rgba(245,158,11,0.08)}
.pp-attest-txt{font-size:14px;color:#92400e;line-height:1.7;margin-bottom:16px}
.pp-ok{text-align:center;padding:52px 24px}
.pp-ok-ico{width:88px;height:88px;background:linear-gradient(135deg,var(--pp-green),#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;box-shadow:0 8px 40px rgba(16,185,129,0.3),0 0 0 8px rgba(16,185,129,0.08);animation:ppPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275)}
@keyframes ppPop{0%{transform:scale(0) rotate(-45deg)}60%{transform:scale(1.1) rotate(0)}100%{transform:scale(1) rotate(0)}}
.pp-ok h2{font-family:var(--pp-font-d);font-size:26px;font-weight:800;margin-bottom:10px}
.pp-ok p{font-size:15px;color:var(--pp-text-sec);line-height:1.7;max-width:420px;margin:0 auto}
@keyframes ppSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.pp-spin{display:inline-block;width:20px;height:20px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:ppSpin 0.7s linear infinite}
.pp-row{display:flex;gap:12px}
.pp-row>.pp-f{flex:1}
@media(max-width:480px){.pp{padding:16px 12px}.pp-pg{padding:26px 20px}.pp-rg{flex-direction:column}.pp-search{flex-direction:column}.pp-hdr{flex-direction:column;text-align:center}.pp-or::before,.pp-or::after{display:none}.pp-row{flex-direction:column}}
.pp-prefill-banner{background:linear-gradient(135deg,#fef3c7,#fffbeb);border:2px solid var(--pp-accent);border-radius:var(--pp-rs);padding:14px 20px;margin-bottom:16px;display:none;align-items:flex-start;gap:12px}
.pp-prefill-banner.vis{display:flex;animation:ppFade 0.4s ease}
.pp-prefill-badge{background:var(--pp-accent);color:#0f172a;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0;letter-spacing:0.3px;margin-top:1px}
.pp-prefill-info{flex:1;min-width:0}
.pp-prefill-name{font-size:15px;font-weight:700;color:#92400e}
.pp-prefill-sub{font-size:12.5px;color:#92400e;margin-top:2px;line-height:1.4}
.pp-prefilled .pp-inp,.pp-prefilled .pp-sel,.pp-prefilled .pp-ta{background:#fef9c3!important;border-color:#f59e0b!important}
.pp-prefill-dep-card{background:linear-gradient(135deg,var(--pp-green-light),#f0fdf4);border:1px solid var(--pp-green);border-radius:var(--pp-rs);padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px;font-size:13.5px;color:#166534;font-weight:500}
</style>

<div class="pp" id="ppW">
  <div class="pp-hdr">
    <div class="pp-hdr-ico">&#128209;</div>
    <div><h1>Due Diligence Pro</h1><div class="pp-hdr-sub">${firm} — Preparer Portal</div></div>
  </div>
  <div class="pp-prog"><div class="pp-prog-bar"><div class="pp-prog-fill" id="ppPF" style="width:0%"></div></div><div class="pp-prog-lbl"><span id="ppPT">Step 1</span><span class="pp-prog-pct" id="ppPP">0%</span></div></div>

  <div id="ppPrefillBanner" class="pp-prefill-banner">
    <div class="pp-prefill-badge">&#10003; Pre-filled from TaxIntake</div>
    <div class="pp-prefill-info">
      <div class="pp-prefill-name" id="ppPrefillName">—</div>
      <div class="pp-prefill-sub">Some steps have been pre-filled. Review and complete compliance questions.</div>
    </div>
    <button onclick="ppPrefillExpand()" style="background:none;border:none;font-size:12.5px;font-weight:600;color:#92400e;text-decoration:underline;cursor:pointer;font-family:var(--pp-font);white-space:nowrap;flex-shrink:0">Edit pre-filled data</button>
  </div>

  <!-- P1: FIND OR CREATE -->
  <div class="pp-pg active" data-pg="lookup">
    <div class="pp-pg-ico">&#128270;</div>
    <div class="pp-ttl">Find or Add Client</div>
    <div class="pp-desc">Search for an existing client or start a new interview.</div>
    <div class="pp-f"><label class="pp-lbl">Search by email, phone, or name</label><div class="pp-search"><input class="pp-inp" type="text" id="ppSearch" placeholder="client@email.com or phone or name" autocomplete="off"><button class="pp-search-btn" id="ppSearchBtn" onclick="ppLookup()">&#128269; Find</button></div></div>
    <div class="pp-banner" id="ppSearchStatus"></div>
    <div class="pp-client-card" id="ppClientCard"><h3 id="ppCardName">—</h3><p id="ppCardInfo">—</p><button class="pp-btn pp-btn-nx" onclick="ppGo('summary')">Review This Client &#8594;</button></div>
    <div id="ppSendPanel" style="display:none;margin-top:16px;background:var(--pp-blue-light);border:1px solid #bfdbfe;border-radius:var(--pp-rs);padding:20px;animation:ppFade 0.3s ease">
      <div style="font-size:14px;font-weight:600;color:#1e40af;margin-bottom:12px">&#128233; Send Client Interview Link</div>
      <div style="font-size:13px;color:#1e40af;margin-bottom:14px;line-height:1.5">Client will receive a link to complete the DD interview on their own.</div>
      <div class="pp-f" style="margin-bottom:12px"><label class="pp-lbl" style="font-size:13px">Client Email <span class="pp-req">*</span></label><input class="pp-inp" type="email" id="ppSendEmail" placeholder="client@email.com" style="font-size:14px;padding:10px 12px"></div>
      <div class="pp-f" style="margin-bottom:12px"><label class="pp-lbl" style="font-size:13px">Client Phone</label><input class="pp-inp" type="tel" id="ppSendPhone" placeholder="(555) 123-4567" style="font-size:14px;padding:10px 12px"></div>
      <div class="pp-f" style="margin-bottom:14px"><label class="pp-lbl" style="font-size:13px">Client Name</label><input class="pp-inp" type="text" id="ppSendName" placeholder="First Last" style="font-size:14px;padding:10px 12px"></div>
      <button id="ppSendBtn" onclick="ppSendLink()" style="width:100%;padding:12px;background:#3b82f6;color:#fff;border:none;border-radius:var(--pp-rs);font-size:14px;font-weight:600;font-family:var(--pp-font);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">&#128233; Send Interview Link</button>
      <div id="ppSendStatus" class="pp-banner" style="margin-top:12px"></div>
      <div id="ppSendActions" style="display:none;gap:10px;margin-top:12px"><button onclick="ppResendLink()" style="flex:1;padding:10px;background:var(--pp-blue);color:#fff;border:none;border-radius:var(--pp-rs);font-size:13px;font-weight:600;font-family:var(--pp-font);cursor:pointer">&#128260; Resend</button><button onclick="ppSendAnother()" style="flex:1;padding:10px;background:var(--pp-bg);color:var(--pp-text-sec);border:1.5px solid var(--pp-border);border-radius:var(--pp-rs);font-size:13px;font-weight:600;font-family:var(--pp-font);cursor:pointer">&#10133; Send Another</button></div>
    </div>
    <div class="pp-or">— or —</div>
    <button class="pp-add-btn" onclick="ppGo('client_info')">&#10133; Start New Client Interview</button>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--pp-border-lt);text-align:center"><p style="font-size:11px;color:var(--pp-text-muted);margin-bottom:2px">Powered by <strong style="color:var(--pp-accent)">Due Diligence Pro</strong></p><p style="font-size:11px;color:var(--pp-text-muted)">${firmEmail}</p></div>
  </div>

  <!-- P2: CLIENT INFO (with DOB, address) -->
  <div class="pp-pg" data-pg="client_info">
    <div class="pp-pg-ico">&#128100;</div>
    <div class="pp-ttl">Client Information</div>
    <div class="pp-desc">Enter the client's details.</div>
    <div class="pp-f" data-f="dd_client_email" data-req="1"><label class="pp-lbl">Email <span class="pp-req">*</span></label><input class="pp-inp" type="email" placeholder="client@email.com" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_client_phone" data-req="1"><label class="pp-lbl">Phone <span class="pp-req">*</span></label><input class="pp-inp" type="tel" placeholder="(555) 123-4567" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_client_name" data-req="1"><label class="pp-lbl">Full Legal Name <span class="pp-req">*</span></label><input class="pp-inp" type="text" placeholder="First Middle Last" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_client_dob" data-req="1"><label class="pp-lbl">Date of Birth <span class="pp-req">*</span></label><input class="pp-inp" type="date" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_tax_year" data-req="1"><label class="pp-lbl">Tax Year <span class="pp-req">*</span></label><select class="pp-sel" onchange="ppIn(this)"><option value="">Select</option><option>2025</option><option>2026</option><option>2027</option></select><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_filing_status" data-req="1"><label class="pp-lbl">Filing Status <span class="pp-req">*</span></label><select class="pp-sel" onchange="ppIn(this);S.data.dd_flag_hoh=this.value==='Head of Household'?'Yes':'No'"><option value="">Select</option><option>Single</option><option>Head of Household</option><option>Married Filing Joint</option><option>Married Filing Separate</option><option>Qualifying Surviving Spouse</option></select><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_address_changed"><label class="pp-lbl">Is the address the same as last year?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No, moved</div></div></div>
    <div class="pp-f" data-f="dd_has_dependents" data-req="1"><label class="pp-lbl">Claiming dependents? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this);ppToggle('ppDepCnt',true)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this);ppToggle('ppDepCnt',false);S.data.dd_dependent_count=''">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f hidden" data-f="dd_dependent_count" id="ppDepCnt" data-req="1"><label class="pp-lbl">How many? <span class="pp-req">*</span></label><select class="pp-sel" onchange="ppIn(this)"><option value="">Select</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select><div class="pp-errmsg">Required</div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppGo('lookup')">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- P3: CREDITS -->
  <div class="pp-pg" data-pg="credits">
    <div class="pp-pg-ico">&#11088;</div>
    <div class="pp-ttl">Tax Credits</div>
    <div class="pp-f" data-f="dd_flag_eic" data-req="1"><label class="pp-lbl">EIC? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_flag_ctc"><label class="pp-lbl">CTC?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div></div>
    <div class="pp-f" data-f="dd_flag_odc"><label class="pp-lbl">ODC?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div></div>
    <div class="pp-f" data-f="dd_flag_aoc"><label class="pp-lbl">AOC?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- DEPENDENT TEMPLATE (full name + DOB + last4 + residency proof) -->
  <div class="pp-pg" data-pg="dep_tmpl" data-dep-tmpl="1" style="display:none!important">
    <div class="pp-dep-hdr"><div class="pp-dep-badge"><span data-dep-n>1</span></div><div><div class="pp-ttl" style="margin:0;font-size:20px">Dependent <span data-dep-n>1</span></div><div style="font-size:13px;color:var(--pp-text-muted);margin-top:2px">Details about this person</div></div></div>
    <div class="pp-f" data-f="dd_dep_N_name" data-req="1"><label class="pp-lbl">Full Name (First & Last) <span class="pp-req">*</span></label><input class="pp-inp" type="text" placeholder="First Last" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-row">
      <div class="pp-f" data-f="dd_dep_N_dob" data-req="1"><label class="pp-lbl">Date of Birth <span class="pp-req">*</span></label><input class="pp-inp" type="date" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
      <div class="pp-f" data-f="dd_dep_N_ssn_last_4"><label class="pp-lbl">Last 4 SSN/ITIN</label><input class="pp-inp" type="text" placeholder="1234" maxlength="4" oninput="ppIn(this)"></div>
    </div>
    <div class="pp-f" data-f="dd_dep_N_relationship" data-req="1"><label class="pp-lbl">Relationship <span class="pp-req">*</span></label><select class="pp-sel" onchange="ppIn(this)"><option value="">Select</option><option>Son</option><option>Daughter</option><option>Stepson</option><option>Stepdaughter</option><option>Foster Child</option><option>Brother</option><option>Sister</option><option>Grandchild</option><option>Niece</option><option>Nephew</option><option>Parent</option><option>Other</option></select><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_dep_N_residency" data-req="1"><label class="pp-lbl">Lived with client >6 months? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_dep_N_residency_proof"><label class="pp-lbl">Residency proof available?</label><div class="pp-cg"><label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="School Records"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>School records</label><label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Medical Records"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Medical records</label><label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Lease/Utility"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Lease / utility bills</label><label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Daycare Records"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Daycare records</label><label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="None"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>None available</label></div></div>
    <div class="pp-f" data-f="dd_dep_N_support" data-req="1"><label class="pp-lbl">Client provided >50% support? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_dep_N_age_status" data-req="1"><label class="pp-lbl">Age at year end <span class="pp-req">*</span></label><select class="pp-sel" onchange="ppIn(this)"><option value="">Select</option><option>Under 17</option><option>17-18</option><option>19-23 Full-Time Student</option><option>24+</option><option>Permanently Disabled</option></select><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_dep_N_id_type" data-req="1"><label class="pp-lbl">Tax ID type <span class="pp-req">*</span></label><select class="pp-sel" onchange="ppIn(this)"><option value="">Select</option><option>SSN</option><option>ITIN</option><option>ATIN</option><option>Not Sure</option></select><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_dep_N_competing_claim" data-req="1"><label class="pp-lbl">Could anyone else claim? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_dep_N_us_citizen" data-req="1"><label class="pp-lbl">U.S. citizen/resident? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- HOH (with other adults) -->
  <div class="pp-pg" data-pg="hoh">
    <div class="pp-pg-ico">&#127968;</div>
    <div class="pp-ttl">Head of Household</div>
    <div class="pp-f" data-f="dd_hoh_married" data-req="1"><label class="pp-lbl">Married during year? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this);ppToggle('ppHD',true);ppToggle('ppHS',true)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this);ppToggle('ppHD',false);ppToggle('ppHS',false)">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f hidden" data-f="dd_hoh_divorced" id="ppHD"><label class="pp-lbl">Divorced/separated by Dec 31?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div></div></div>
    <div class="pp-f hidden" data-f="dd_hoh_spouse_lived" id="ppHS"><label class="pp-lbl">Spouse in home last 6 months?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div></div></div>
    <div class="pp-f" data-f="dd_hoh_cost_support" data-req="1"><label class="pp-lbl">Paid >50% home costs? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_hoh_other_adults"><label class="pp-lbl">Other adults in the home?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this);ppToggle('ppHOA',true)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this);ppToggle('ppHOA',false)">No</div></div></div>
    <div class="pp-f hidden" data-f="dd_hoh_other_adults_detail" id="ppHOA"><label class="pp-lbl">Who and did they contribute?</label><input class="pp-inp" type="text" placeholder="e.g. Mother, pays utilities" oninput="ppIn(this)"></div>
    <div class="pp-f" data-f="dd_hoh_qualifying_person" data-req="1"><label class="pp-lbl">Qualifying person <span class="pp-req">*</span></label><input class="pp-inp" type="text" placeholder="e.g. My daughter, Sofia" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- EIC (with income supports expenses) -->
  <div class="pp-pg" data-pg="eic">
    <div class="pp-pg-ico">&#128176;</div>
    <div class="pp-ttl">Earned Income Credit</div>
    <div class="pp-f" data-f="dd_eic_residency" data-req="1"><label class="pp-lbl">Qualifying child lived w/ client in US >6 mo? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_eic_joint_return_child"><label class="pp-lbl">Child filed joint return?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="N/A" onclick="ppRad(this)">N/A</div></div></div>
    <div class="pp-f" data-f="dd_eic_investment_income" data-req="1"><label class="pp-lbl">Investment income under limit? <span class="pp-req">*</span></label><div class="pp-hint">2025 limit: $11,600</div><div class="pp-rg"><div class="pp-rb" data-v="Under Limit" onclick="ppRad(this)">Under</div><div class="pp-rb" data-v="Over Limit" onclick="ppRad(this)">Over</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_eic_income_supports_expenses" data-req="1"><label class="pp-lbl">Does reported income support household expenses? <span class="pp-req">*</span></label><div class="pp-hint">IRS requires this question — if income seems low for living situation.</div><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this);ppToggle('ppIE',false)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this);ppToggle('ppIE',true)">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f hidden" data-f="dd_eic_income_explanation" id="ppIE"><label class="pp-lbl">How are expenses covered?</label><input class="pp-inp" type="text" placeholder="e.g. Savings, family help, loans" oninput="ppIn(this)"></div>
    <div class="pp-f" data-f="dd_eic_prior_denial" data-req="1"><label class="pp-lbl">IRS ever denied EIC? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this);ppToggle('ppE8',true)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this);ppToggle('ppE8',false)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this);ppToggle('ppE8',true)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f hidden" data-f="dd_eic_form_8862" id="ppE8"><label class="pp-lbl">Form 8862 required?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="N/A" onclick="ppRad(this)">N/A</div></div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- INCOME (with SE record reconstruction) -->
  <div class="pp-pg" data-pg="income">
    <div class="pp-pg-ico">&#128181;</div>
    <div class="pp-ttl">Income</div>
    <div class="pp-f" data-f="dd_income_sources" data-req="1"><label class="pp-lbl">Income sources <span class="pp-req">*</span></label><div class="pp-cg">
      <label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="W-2 Employment"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>W-2 Employment</label>
      <label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Self-Employment"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Self-Employment</label>
      <label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="1099-NEC/MISC"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>1099-NEC/MISC</label>
      <label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Social Security"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Social Security</label>
      <label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Investment"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Investment</label>
      <label class="pp-ci" onclick="ppChk(this)"><input type="checkbox" value="Other"><div class="pp-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Other</label>
    </div><div class="pp-errmsg">Select at least one</div></div>
    <div class="pp-f" data-f="dd_self_employed" data-req="1"><label class="pp-lbl">Self-employment income? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this);ppToggle('ppST',true);ppToggle('ppSE',true);ppToggle('ppSR',true);ppToggle('ppSBK',true)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this);ppToggle('ppST',false);ppToggle('ppSE',false);ppToggle('ppSR',false);ppToggle('ppSBK',false)">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f hidden" data-f="dd_se_business_type" id="ppST"><label class="pp-lbl">Business type</label><input class="pp-inp" type="text" placeholder="e.g. Rideshare, cleaning" oninput="ppIn(this)"></div>
    <div class="pp-f hidden" data-f="dd_se_has_expenses" id="ppSE"><label class="pp-lbl">Business expenses?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div></div>
    <div class="pp-f hidden" data-f="dd_se_record_method" id="ppSR"><label class="pp-lbl">How are records tracked?</label><div class="pp-hint">IRS requires Schedule C verification.</div><div class="pp-rg" style="flex-direction:column"><div class="pp-rb" data-v="App/Software" onclick="ppRad(this)" style="text-align:left">App/Software</div><div class="pp-rb" data-v="Bank Statements" onclick="ppRad(this)" style="text-align:left">Bank Statements</div><div class="pp-rb" data-v="Hand-Written Ledger" onclick="ppRad(this)" style="text-align:left">Hand-Written Ledger</div><div class="pp-rb" data-v="Estimates" onclick="ppRad(this)" style="text-align:left">Estimates</div></div></div>
    <div class="pp-f hidden" data-f="dd_se_separate_bank" id="ppSBK"><label class="pp-lbl">Separate business bank account?</label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div></div></div>
    <div class="pp-f" data-f="dd_income_docs_provided" data-req="1"><label class="pp-lbl">Income docs provided? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Partial" onclick="ppRad(this)">Some</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- AOTC (with student name) -->
  <div class="pp-pg" data-pg="aotc">
    <div class="pp-pg-ico">&#127891;</div>
    <div class="pp-ttl">Education Credit (AOC)</div>
    <div class="pp-f" data-f="dd_aoc_student_name"><label class="pp-lbl">Student's name</label><input class="pp-inp" type="text" placeholder="Who is attending school?" oninput="ppIn(this)"></div>
    <div class="pp-f" data-f="dd_aoc_enrolled" data-req="1"><label class="pp-lbl">Enrolled at eligible school? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_half_time" data-req="1"><label class="pp-lbl">At least half-time? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_undergraduate" data-req="1"><label class="pp-lbl">Undergraduate? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_4_years_used" data-req="1"><label class="pp-lbl">AOC claimed 4+ years? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_1098t" data-req="1"><label class="pp-lbl">1098-T received? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Yet" onclick="ppRad(this)">Not Yet</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_tuition_paid" data-req="1"><label class="pp-lbl">Tuition paid out of pocket? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_felony" data-req="1"><label class="pp-lbl">Felony drug conviction? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_aoc_prior_denial" data-req="1"><label class="pp-lbl">IRS ever denied AOC? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- DOCUMENTS (with substantiation) -->
  <div class="pp-pg" data-pg="documents">
    <div class="pp-pg-ico">&#128196;</div>
    <div class="pp-ttl">Documents & Substantiation</div>
    <div class="pp-f" data-f="dd_docs_uploaded" data-req="1"><label class="pp-lbl">Supporting docs provided? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">Later</div><div class="pp-rb" data-v="Partial" onclick="ppRad(this)">Some</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_can_substantiate" data-req="1"><label class="pp-lbl">Could client provide documentation if audited? <span class="pp-req">*</span></label><div class="pp-hint">IRS Form 8867 requires this question be asked.</div><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Not Sure" onclick="ppRad(this)">Not Sure</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_doc_types_provided"><label class="pp-lbl">What documents?</label><textarea class="pp-ta" placeholder="e.g. Birth certs, W-2, 1099..." oninput="ppIn(this)"></textarea></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue to Review &#8594;</button></div>
  </div>

  <!-- SUMMARY -->
  <div class="pp-pg" data-pg="summary">
    <div class="pp-pg-ico">&#128203;</div>
    <div class="pp-ttl">Client Interview Summary</div>
    <div class="pp-desc" id="ppSumDesc">Review all client answers below.</div>
    <div id="ppSumContent"></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" id="ppSumBack" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Begin Preparer Review &#8594;</button></div>
  </div>

  <!-- PREPARER VERIFICATION (with narrative prompts + tiebreaker + substantiation) -->
  <div class="pp-pg" data-pg="verify">
    <div class="pp-pg-ico">&#9989;</div>
    <div class="pp-ttl">Preparer Verification</div>
    <div class="pp-desc">IRS Form 8867 requires documenting your professional judgment.</div>
    <div class="pp-f" data-f="dd_prep_answers_reasonable" data-req="1"><label class="pp-lbl">Are the client's answers reasonable and consistent? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="Partially" onclick="ppRad(this)">Partially</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_prep_docs_verified" data-req="1"><label class="pp-lbl">Have you reviewed supporting documents? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">Pending</div><div class="pp-rb" data-v="Partial" onclick="ppRad(this)">Some</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_prep_substantiation_asked" data-req="1"><label class="pp-lbl">Did you ask if client can substantiate eligibility if audited? <span class="pp-req">*</span></label><div class="pp-hint">IRS Form 8867 Line 6 — must be asked and documented.</div><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_prep_tiebreaker_explained"><label class="pp-lbl">Did you explain tiebreaker rules? (if competing claim exists)</label><div class="pp-hint">Required when a child could be claimed by more than one person.</div><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div><div class="pp-rb" data-v="N/A" onclick="ppRad(this)">N/A</div></div></div>
    <div class="pp-f" data-f="dd_prep_residency_verification"><label class="pp-lbl">How did you verify dependent residency?</label><div class="pp-hint">Narrative: "Client showed 2026 school registration at home address"</div><textarea class="pp-ta" placeholder="Describe how residency was verified..." oninput="ppIn(this)"></textarea></div>
    <div class="pp-f" data-f="dd_prep_income_verification"><label class="pp-lbl">How did you verify business income? (if SE)</label><div class="pp-hint">Narrative: "Reviewed Uber driver history and weekly payout summaries"</div><textarea class="pp-ta" placeholder="Describe how income was verified..." oninput="ppIn(this)"></textarea></div>
    <div class="pp-f" data-f="dd_prep_additional_inquiries"><label class="pp-lbl">Additional inquiries made? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No, sufficient</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_prep_inquiry_notes"><label class="pp-lbl">Notes / concerns</label><textarea class="pp-ta" placeholder="Any concerns, inconsistencies, follow-up..." oninput="ppIn(this)"></textarea></div>
    <div class="pp-f" data-f="dd_doc_audit_ready" data-req="1"><label class="pp-lbl">Docs sufficient for audit? <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">Yes</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">No</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_prep_knowledge_base" data-req="1"><label class="pp-lbl">Basis for eligibility determination <span class="pp-req">*</span></label><div class="pp-rg" style="flex-direction:column"><div class="pp-rb" data-v="Client interview + documents" onclick="ppRad(this)" style="text-align:left">Client interview + supporting documents</div><div class="pp-rb" data-v="Prior year knowledge + current docs" onclick="ppRad(this)" style="text-align:left">Prior year knowledge + current docs</div><div class="pp-rb" data-v="Interview only" onclick="ppRad(this)" style="text-align:left">Interview only (docs pending)</div><div class="pp-rb" data-v="Other" onclick="ppRad(this)" style="text-align:left">Other (see notes)</div></div><div class="pp-errmsg">Required</div></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Continue &#8594;</button></div>
  </div>

  <!-- PREPARER INFO -->
  <div class="pp-pg" data-pg="prepinfo">
    <div class="pp-pg-ico">&#128188;</div>
    <div class="pp-ttl">Preparer Information</div>
    <div class="pp-f" data-f="dd_preparer_name" data-req="1"><label class="pp-lbl">Full Name <span class="pp-req">*</span></label><input class="pp-inp" type="text" placeholder="Jane Doe, EA" oninput="ppIn(this)"><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_preparer_ptin" data-req="1"><label class="pp-lbl">PTIN <span class="pp-req">*</span></label><input class="pp-inp" type="text" placeholder="P00000000" oninput="ppIn(this)" style="max-width:220px"><div class="pp-errmsg">Required</div></div>
    <div class="pp-f" data-f="dd_preparer_firm"><label class="pp-lbl">Firm / Office</label><input class="pp-inp" type="text" placeholder="Your tax office" oninput="ppIn(this)"></div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-nx" onclick="ppNext()">Review & Sign &#8594;</button></div>
  </div>

  <!-- SIGN-OFF -->
  <div class="pp-pg" data-pg="signoff">
    <div class="pp-pg-ico">&#128221;</div>
    <div class="pp-ttl">Attestation & Sign-Off</div>
    <div class="pp-banner" id="ppErrBanner"></div>
    <div class="pp-attest">
      <div class="pp-attest-txt">I, <strong id="ppAName">___</strong> (PTIN: <strong id="ppAPtin">___</strong>), certify that I have:<br><br>&#9745; Interviewed the taxpayer or reviewed their self-service responses<br>&#9745; Made reasonable inquiries to determine eligibility<br>&#9745; Asked whether documentation can substantiate claims if audited<br>&#9745; Reviewed available supporting documentation<br>&#9745; Documented my knowledge and basis for positions taken<br>&#9745; Retained records as required under IRC &sect;6695(g)</div>
      <div class="pp-f" data-f="dd_preparer_signature" data-req="1"><label class="pp-lbl">I certify the above <span class="pp-req">*</span></label><div class="pp-rg"><div class="pp-rb" data-v="Yes" onclick="ppRad(this)">&#9989; Yes, I certify</div><div class="pp-rb" data-v="No" onclick="ppRad(this)">&#10060; No</div></div><div class="pp-errmsg">You must certify</div></div>
    </div>
    <div class="pp-nav"><button class="pp-btn pp-btn-bk" onclick="ppBack()">&#8592; Back</button><button class="pp-btn pp-btn-sub" id="ppSubBtn" onclick="ppSubmit()">Submit & Complete &#9989;</button></div>
  </div>

  <!-- SUCCESS -->
  <div class="pp-pg" data-pg="success">
    <div class="pp-ok">
      <div class="pp-ok-ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h2>Due Diligence Complete</h2>
      <p>The DD record for <strong id="ppOkName">this client</strong> has been finalized.</p>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:28px;max-width:340px;margin-left:auto;margin-right:auto">
        <button onclick="ppOpenPDF()" style="padding:14px 24px;background:var(--pp-primary);color:#fff;border:none;border-radius:var(--pp-rs);font-size:15px;font-weight:600;font-family:var(--pp-font);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">&#128196; Download DD Worksheet PDF</button>
        <button onclick="ppViewAI()" style="padding:14px 24px;background:var(--pp-accent);color:#0f172a;border:none;border-radius:var(--pp-rs);font-size:15px;font-weight:600;font-family:var(--pp-font);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">&#129302; View AI Analysis</button>
        <button onclick="location.reload()" style="padding:12px 24px;background:var(--pp-bg-sub);color:var(--pp-text-sec);border:1.5px solid var(--pp-border);border-radius:var(--pp-rs);font-size:14px;font-weight:600;font-family:var(--pp-font);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">&#10133; Start New Interview</button>
      </div>
      <div id="ppAIPanel" style="display:none;margin-top:24px;text-align:left;background:var(--pp-bg-sub);border:1px solid var(--pp-border);border-radius:var(--pp-rs);padding:20px;max-width:500px;margin-left:auto;margin-right:auto"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--pp-text-muted);margin-bottom:8px">&#129302; AI Analysis</div><div id="ppAINotes" style="font-size:14px;color:var(--pp-text);line-height:1.7;white-space:pre-wrap"></div></div>
    </div>
  </div>
</div>

<script>
(function(){
'use strict';
var CFG={loc:'${loc}',api:'${apiBase}',prefillContactId:'${contactId}'};
var S={cur:0,pages:[],data:{},depPgs:[],mode:'new',clientData:null,clientEmail:'',isPrefill:false,prefillData:null};

function buildFlow(){
  var p;
  if(S.mode==='existing'){p=['lookup','summary','verify','prepinfo','signoff']}
  else{
    p=['lookup','client_info','credits'];
    var dc=parseInt(S.data.dd_dependent_count)||0;
    for(var i=1;i<=dc;i++) p.push('dep_'+i);
    if(S.data.dd_filing_status==='Head of Household') p.push('hoh');
    if(S.data.dd_flag_eic==='Yes'||S.data.dd_flag_eic==='Not Sure') p.push('eic');
    p.push('income');
    if(S.data.dd_flag_aoc==='Yes'||S.data.dd_flag_aoc==='Not Sure') p.push('aotc');
    p.push('documents','summary','verify','prepinfo','signoff');
  }
  S.pages=p;
}
function updateProg(){var t=S.pages.length,pct=t>1?Math.round((S.cur/(t-1))*100):0;document.getElementById('ppPF').style.width=pct+'%';document.getElementById('ppPP').textContent=pct+'%';document.getElementById('ppPT').textContent='Step '+(S.cur+1)+' of '+t}
function getEl(n){return document.querySelector('.pp-pg[data-pg="'+n+'"]')}
function show(idx){document.querySelectorAll('.pp-pg').forEach(function(p){p.classList.remove('active')});S.cur=idx;var el=getEl(S.pages[idx]);if(el){el.classList.add('active');el.scrollIntoView({behavior:'smooth',block:'start'})}updateProg();if(S.pages[idx]==='summary')buildSummary();if(S.pages[idx]==='signoff'){document.getElementById('ppAName').textContent=S.data.dd_preparer_name||'___';document.getElementById('ppAPtin').textContent=S.data.dd_preparer_ptin||'___'}}
function validate(pgName){var pg=getEl(pgName);if(!pg)return true;var ok=true;pg.querySelectorAll('.pp-f[data-req="1"]').forEach(function(f){if(f.classList.contains('hidden'))return;var v=S.data[f.getAttribute('data-f')];if(!v||!v.trim()){f.classList.add('err');ok=false}else f.classList.remove('err')});if(!ok){var e=pg.querySelector('.pp-f.err');if(e)e.scrollIntoView({behavior:'smooth',block:'center'})}return ok}
function ensureDeps(){var dc=parseInt(S.data.dd_dependent_count)||0;var tmpl=document.querySelector('[data-dep-tmpl="1"]');S.depPgs.forEach(function(p){p.remove()});S.depPgs=[];for(var i=1;i<=dc;i++){var c=tmpl.cloneNode(true);c.removeAttribute('data-dep-tmpl');c.setAttribute('data-pg','dep_'+i);c.style.cssText='';c.classList.remove('active');c.querySelectorAll('[data-dep-n]').forEach(function(el){el.textContent=i});c.querySelectorAll('[data-f]').forEach(function(el){el.setAttribute('data-f',el.getAttribute('data-f').replace('_N_','_'+i+'_'))});c.querySelectorAll('.pp-rb').forEach(function(b){b.setAttribute('onclick','ppRad(this)')});c.querySelectorAll('.pp-ci').forEach(function(b){b.setAttribute('onclick','ppChk(this)')});getEl('hoh').before(c);S.depPgs.push(c)}}

window.ppIn=function(inp){var f=inp.closest('.pp-f');if(f){S.data[f.getAttribute('data-f')]=inp.value;f.classList.remove('err')}};
window.ppRad=function(btn){btn.parentElement.querySelectorAll('.pp-rb').forEach(function(b){b.classList.remove('sel')});btn.classList.add('sel');var f=btn.closest('.pp-f');if(f){S.data[f.getAttribute('data-f')]=btn.getAttribute('data-v');f.classList.remove('err')}};
window.ppChk=function(lbl){var cb=lbl.querySelector('input');cb.checked=!cb.checked;lbl.classList.toggle('chk',cb.checked);var f=lbl.closest('.pp-f');if(f){S.data[f.getAttribute('data-f')]=Array.from(f.querySelectorAll('input:checked')).map(function(c){return c.value}).join(', ');f.classList.remove('err')}};
window.ppToggle=function(id,s){var e=document.getElementById(id);if(e){e.classList.toggle('hidden',!s);if(s)e.classList.add('fade')}};
window.ppNext=function(){var pg=S.pages[S.cur];if(pg!=='lookup'&&!validate(pg))return;if(pg==='client_info'||pg==='credits'){ensureDeps();buildFlow()}if(S.cur<S.pages.length-1)show(S.cur+1)};
window.ppBack=function(){if(S.cur>0)show(S.cur-1)};
window.ppGo=function(name){if(name==='summary'&&S.mode==='existing'){S.pages=['lookup','summary','verify','prepinfo','signoff'];show(1);return}if(name==='client_info'){S.mode='new';S.clientData=null;buildFlow();var idx=S.pages.indexOf('client_info');if(idx>=0)show(idx);return}var idx=S.pages.indexOf(name);if(idx>=0)show(idx)};

window.ppLookup=function(){var q=document.getElementById('ppSearch').value.trim();var st=document.getElementById('ppSearchStatus');var card=document.getElementById('ppClientCard');var btn=document.getElementById('ppSearchBtn');if(!q){st.className='pp-banner vis err';st.textContent='Enter an email, phone, or name.';card.classList.remove('vis');return}btn.disabled=true;btn.textContent='Searching...';st.className='pp-banner vis info';st.textContent='Looking up client...';card.classList.remove('vis');
fetch(CFG.api+'/lookup?email='+encodeURIComponent(q)+'&locationId='+CFG.loc).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(res){if(!res.ok)throw new Error(res.d.error||'Not found');S.clientData=res.d.contact;S.clientEmail=res.d.contact.email||q;S.mode='existing';Object.keys(res.d.contact).forEach(function(k){if(k.startsWith('dd_'))S.data[k]=res.d.contact[k]});st.className='pp-banner vis ok';st.textContent='Client found! '+res.d.fieldCount+' DD fields on file.';card.classList.add('vis');document.getElementById('ppCardName').textContent=res.d.contact.dd_client_name||res.d.contact.name||q;document.getElementById('ppCardInfo').textContent=(res.d.contact.dd_filing_status||'Status unknown')+' | '+(res.d.contact.dd_interview_date||'Date unknown');document.getElementById('ppSendPanel').style.display='none';buildFlow()}).catch(function(err){st.className='pp-banner vis err';st.textContent=err.message;card.classList.remove('vis');var panel=document.getElementById('ppSendPanel');panel.style.display='block';if(q.includes('@'))document.getElementById('ppSendEmail').value=q}).finally(function(){btn.disabled=false;btn.innerHTML='&#128269; Find'})};
document.getElementById('ppSearch').addEventListener('keydown',function(e){if(e.key==='Enter')ppLookup()});

window.ppSendLink=function(){var email=document.getElementById('ppSendEmail').value.trim();var phone=document.getElementById('ppSendPhone').value.trim();var name=document.getElementById('ppSendName').value.trim();var btn=document.getElementById('ppSendBtn');var st=document.getElementById('ppSendStatus');if(!email){st.className='pp-banner vis err';st.textContent='Email is required.';return}btn.disabled=true;btn.innerHTML='<span class="pp-spin"></span> Sending...';st.className='pp-banner vis info';st.textContent='Creating contact and sending link...';
var payload={locationId:CFG.loc,mode:'send-link',contact:{email:email,phone:phone,name:name},answers:{dd_interview_status:'Link Sent',dd_interview_mode:'Client Self-Service',dd_client_name:name,dd_client_email:email,dd_client_phone:phone}};
fetch(CFG.api+'/submit',{method:'POST',headers:{'Content-Type':'application/json','X-Location-Id':CFG.loc},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Failed');return d})}).then(function(res){st.className='pp-banner vis ok';st.innerHTML='<strong>Link sent!</strong> Client will receive the DD interview link at '+email+'.';btn.disabled=true;btn.innerHTML='&#9989; Link Sent';var actions=document.getElementById('ppSendActions');if(actions)actions.style.display='flex'}).catch(function(err){st.className='pp-banner vis err';st.textContent='Error: '+err.message;btn.disabled=false;btn.innerHTML='&#128233; Send Interview Link'})};
window.ppResendLink=function(){document.getElementById('ppSendBtn').disabled=false;document.getElementById('ppSendBtn').innerHTML='&#128233; Send Interview Link';document.getElementById('ppSendStatus').className='pp-banner';var a=document.getElementById('ppSendActions');if(a)a.style.display='none'};
window.ppSendAnother=function(){document.getElementById('ppSendEmail').value='';document.getElementById('ppSendPhone').value='';document.getElementById('ppSendName').value='';ppResendLink();document.getElementById('ppSendEmail').focus()};

function buildSummary(){var d=S.mode==='existing'?(S.clientData||S.data):S.data;var h='';
function sec(t,cls,rows){h+='<div class="pp-sum-sec"><div class="pp-sum-hdr" style="background:'+cls+'">'+t+'</div><table class="pp-sum-tbl">';rows.forEach(function(r){var v=d[r[1]]||S.data[r[1]]||'';h+='<tr><td>'+r[0]+'</td><td>'+(v||'<span style="color:var(--pp-text-muted)">\u2014</span>')+'</td></tr>'});h+='</table></div>'}
sec('&#128100; Client Info','#3b82f6',[['Name','dd_client_name'],['DOB','dd_client_dob'],['Email','dd_client_email'],['Phone','dd_client_phone'],['Tax Year','dd_tax_year'],['Filing Status','dd_filing_status'],['Address Changed','dd_address_changed'],['Dependents','dd_has_dependents'],['Count','dd_dependent_count']]);
sec('&#11088; Credits','#f59e0b',[['HOH','dd_flag_hoh'],['EIC','dd_flag_eic'],['CTC','dd_flag_ctc'],['ODC','dd_flag_odc'],['AOC','dd_flag_aoc']]);
var dc=parseInt(d.dd_dependent_count||S.data.dd_dependent_count)||0;
for(var i=1;i<=dc;i++) sec('&#128106; Dependent '+i,'#8b5cf6',[['Name','dd_dep_'+i+'_name'],['DOB','dd_dep_'+i+'_dob'],['Last 4','dd_dep_'+i+'_ssn_last_4'],['Relationship','dd_dep_'+i+'_relationship'],['Residency','dd_dep_'+i+'_residency'],['Proof','dd_dep_'+i+'_residency_proof'],['Support','dd_dep_'+i+'_support'],['Age','dd_dep_'+i+'_age_status'],['Tax ID','dd_dep_'+i+'_id_type'],['Competing','dd_dep_'+i+'_competing_claim'],['US Citizen','dd_dep_'+i+'_us_citizen']]);
if((d.dd_filing_status||S.data.dd_filing_status)==='Head of Household'||(d.dd_flag_hoh||S.data.dd_flag_hoh)==='Yes')sec('&#127968; HOH','#0ea5e9',[['Married','dd_hoh_married'],['Divorced','dd_hoh_divorced'],['Spouse Home','dd_hoh_spouse_lived'],['Cost','dd_hoh_cost_support'],['Other Adults','dd_hoh_other_adults'],['Detail','dd_hoh_other_adults_detail'],['Qualifying','dd_hoh_qualifying_person']]);
if((d.dd_flag_eic||S.data.dd_flag_eic)==='Yes'||(d.dd_flag_eic||S.data.dd_flag_eic)==='Not Sure')sec('&#128176; EIC','#10b981',[['Residency','dd_eic_residency'],['Joint Return','dd_eic_joint_return_child'],['Investment','dd_eic_investment_income'],['Income Supports Expenses','dd_eic_income_supports_expenses'],['Explanation','dd_eic_income_explanation'],['Prior Denial','dd_eic_prior_denial'],['Form 8862','dd_eic_form_8862']]);
sec('&#128181; Income','#6366f1',[['Sources','dd_income_sources'],['Self-Employed','dd_self_employed'],['Business','dd_se_business_type'],['Expenses','dd_se_has_expenses'],['Records','dd_se_record_method'],['Separate Bank','dd_se_separate_bank'],['Docs','dd_income_docs_provided']]);
if((d.dd_flag_aoc||S.data.dd_flag_aoc)==='Yes'||(d.dd_flag_aoc||S.data.dd_flag_aoc)==='Not Sure')sec('&#127891; Education','#ec4899',[['Student','dd_aoc_student_name'],['Enrolled','dd_aoc_enrolled'],['Half-Time','dd_aoc_half_time'],['Undergrad','dd_aoc_undergraduate'],['4+ Years','dd_aoc_4_years_used'],['1098-T','dd_aoc_1098t'],['Tuition','dd_aoc_tuition_paid'],['Felony','dd_aoc_felony'],['Denial','dd_aoc_prior_denial']]);
sec('&#128196; Documents','#64748b',[['Uploaded','dd_docs_uploaded'],['Can Substantiate','dd_can_substantiate'],['Types','dd_doc_types_provided']]);
document.getElementById('ppSumContent').innerHTML=h;document.getElementById('ppSumDesc').textContent=S.mode==='existing'?'Submitted via client self-service.':'Review the answers entered above.'}

window.ppSubmit=function(){if(!validate('signoff'))return;if(S.data.dd_preparer_signature!=='Yes'){var f=getEl('signoff').querySelector('[data-f="dd_preparer_signature"]');if(f)f.classList.add('err');return}var btn=document.getElementById('ppSubBtn'),banner=document.getElementById('ppErrBanner');banner.classList.remove('vis');btn.disabled=true;btn.innerHTML='<span class="pp-spin"></span> Submitting...';
var answers={};Object.keys(S.data).forEach(function(k){if(k.startsWith('dd_')&&S.data[k])answers[k]=S.data[k]});var email=S.clientEmail||S.data.dd_client_email||'';
var payload={locationId:CFG.loc,mode:'preparer',contact:{email:email,phone:S.data.dd_client_phone||'',name:S.data.dd_client_name||''},answers:answers};
if(CFG.prefillContactId){payload.prefillContactId=CFG.prefillContactId;payload.prefillSource=CFG.prefillSource||'taxintake';answers.dd_prefill_source=CFG.prefillSource||'taxintake';answers.dd_prefill_contact_id=CFG.prefillContactId;answers.dd_prefill_date=new Date().toISOString().split('T')[0];}
fetch(CFG.api+'/submit',{method:'POST',headers:{'Content-Type':'application/json','X-Location-Id':CFG.loc},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||d.message||'Failed');return d})}).then(function(res){document.getElementById('ppOkName').textContent=S.data.dd_client_name||S.clientEmail||'the client';document.querySelectorAll('.pp-pg').forEach(function(p){p.classList.remove('active')});getEl('success').classList.add('active');document.querySelector('.pp-hdr').style.display='none';document.querySelector('.pp-prog').style.display='none'}).catch(function(err){banner.textContent=err.message;banner.className='pp-banner vis err';btn.disabled=false;btn.innerHTML='Submit & Complete &#9989;'})};

window.ppOpenPDF=function(){var email=S.clientEmail||S.data.dd_client_email||'';if(!email){alert('No client email');return}window.open(CFG.api+'/pdf?email='+encodeURIComponent(email)+'&locationId='+CFG.loc,'_blank')};
window.ppViewAI=function(){var panel=document.getElementById('ppAIPanel');var notes=document.getElementById('ppAINotes');if(panel.style.display==='none'){var n=S.data.dd_preparer_notes||'';if(n){notes.textContent=n;panel.style.display='block'}else{var email=S.clientEmail||S.data.dd_client_email||'';notes.textContent='Loading...';panel.style.display='block';fetch(CFG.api+'/lookup?email='+encodeURIComponent(email)+'&locationId='+CFG.loc).then(function(r){return r.json()}).then(function(d){if(d.success&&d.contact.dd_preparer_notes){notes.textContent=d.contact.dd_preparer_notes;if(d.contact.dd_ai_result)notes.textContent+='\n\nAI Result: '+d.contact.dd_ai_result;if(d.contact.dd_risk_count)notes.textContent+='\nRisk Flags: '+d.contact.dd_risk_count}else notes.textContent='No AI analysis available yet.'}).catch(function(){notes.textContent='Failed to load.'})}}else panel.style.display='none'};

// ── Pre-fill mode ──────────────────────────────────────────────────────────────
function ppInitPrefill(){
  var lkPg=getEl('lookup');
  if(lkPg){
    var ov=document.createElement('div');
    ov.id='ppPFLoading';
    ov.innerHTML='<div style="text-align:center;padding:48px 16px"><div style="display:inline-block;width:44px;height:44px;border:4px solid rgba(245,158,11,0.2);border-top-color:#f59e0b;border-radius:50%;animation:ppSpin 0.8s linear infinite"></div><div style="margin-top:18px;font-size:16px;font-weight:600;color:var(--pp-text)">Loading client data from TaxIntake Pro...</div><div style="font-size:13px;color:var(--pp-text-muted);margin-top:6px">Connecting to GHL...</div></div>';
    Array.from(lkPg.children).forEach(function(el){el.style.display='none'});
    lkPg.appendChild(ov);
  }
  fetch(CFG.api+'/prefill?loc='+encodeURIComponent(CFG.loc)+'&contactId='+encodeURIComponent(CFG.prefillContactId))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})})
    .then(function(res){
      if(!res.ok)throw new Error(res.d.error||'Pre-fill failed');
      ppApplyPrefill(res.d);
    })
    .catch(function(err){
      console.error('[Prefill]',err.message);
      var pg=getEl('lookup');
      if(pg){
        var ov2=document.getElementById('ppPFLoading');
        if(ov2)ov2.remove();
        Array.from(pg.children).forEach(function(el){el.style.display=''});
      }
      var st=document.getElementById('ppSearchStatus');
      if(st){st.className='pp-banner vis err';st.textContent='Pre-fill error: '+err.message;}
    });
}

function ppApplyPrefill(data){
  S.prefillData=data.prefill||{};
  Object.keys(S.prefillData).forEach(function(k){S.data[k]=S.prefillData[k]});
  if(S.data.dd_filing_status==='Head of Household')S.data.dd_flag_hoh='Yes';
  if(S.data.dd_has_dependents==='Yes'&&S.data.dd_dependent_count){
    var dcEl=document.getElementById('ppDepCnt');
    if(dcEl)dcEl.classList.remove('hidden');
  }
  ensureDeps();buildFlow();
  var banner=document.getElementById('ppPrefillBanner');
  if(banner){banner.classList.add('vis');document.getElementById('ppPrefillName').textContent=data.contactName||'Client';}
  var clientInfoComplete=S.data.dd_client_name&&S.data.dd_client_dob&&S.data.dd_filing_status&&S.data.dd_has_dependents;
  var startPg=clientInfoComplete?'credits':'client_info';
  var startIdx=S.pages.indexOf(startPg);
  show(startIdx>=0?startIdx:1);
  setTimeout(ppPopulateFormFields,80);
}

function ppPopulateFormFields(){
  if(!S.prefillData)return;
  Object.keys(S.prefillData).forEach(function(key){
    var val=S.prefillData[key];
    if(!val)return;
    document.querySelectorAll('.pp-f[data-f="'+key+'"]').forEach(function(fieldEl){
      fieldEl.classList.add('pp-prefilled');
      var inp=fieldEl.querySelector('.pp-inp,.pp-ta');
      if(inp){inp.value=val;return;}
      var sel=fieldEl.querySelector('.pp-sel');
      if(sel){
        for(var i=0;i<sel.options.length;i++){
          if(sel.options[i].value===val||sel.options[i].text===val){sel.selectedIndex=i;break;}
        }
        return;
      }
      fieldEl.querySelectorAll('.pp-rb').forEach(function(rb){
        rb.classList.remove('sel');
        if(rb.getAttribute('data-v')===val)rb.classList.add('sel');
      });
    });
  });
  if(S.data.dd_has_dependents==='Yes')ppToggle('ppDepCnt',true);
  if(S.data.dd_self_employed==='Yes'){ppToggle('ppST',true);ppToggle('ppSE',true);ppToggle('ppSR',true);ppToggle('ppSBK',true);}
  S.depPgs.forEach(function(depPg,idx){
    var n=idx+1;
    if(S.prefillData['dd_dep_'+n+'_name']&&!depPg.querySelector('.pp-prefill-dep-card')){
      var card=document.createElement('div');
      card.className='pp-prefill-dep-card';
      card.innerHTML='<span style="font-size:18px">&#10003;</span><span><strong>Pre-filled from TaxIntake Pro</strong> — review the fields below and complete any required answers.</span>';
      var hdr=depPg.querySelector('.pp-dep-hdr');
      if(hdr)hdr.after(card);
    }
  });
}

window.ppPrefillExpand=function(){
  var idx=S.pages.indexOf('client_info');
  show(idx>=0?idx:1);
  setTimeout(ppPopulateFormFields,50);
};
// ── End pre-fill mode ───────────────────────────────────────────────────────────

buildFlow();updateProg();
(function(){
  // Client-side URL param detection — handles source=taxintake and iframe launches
  var _p=new URLSearchParams(window.location.search);
  var _cid=CFG.prefillContactId||_p.get('contactId');
  var _src=_p.get('source');
  if(_cid){
    CFG.prefillContactId=_cid;
    // Record source for submit payload
    CFG.prefillSource=_src||'taxintake';
    S.isPrefill=true;
    ppInitPrefill();
  }
})();
})();
</script>

`;
}
