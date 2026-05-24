/**
 * DUE DILIGENCE PRO — Client Wizard Server
 * GET /api/wizard/client?loc=LOCATION_ID&color=4F46E5&firm=Smith+Tax&phone=555-123&email=info@firm.com
 * 
 * Serves the client wizard HTML dynamically with:
 * - License validation
 * - Brand color injection
 * - Firm name/contact injection
 * - Location ID baked into the API calls
 *
 * Buyer embed code:
 * <iframe src="https://dd-wizard-api.vercel.app/api/wizard/client?loc=XXX" style="width:100%;min-height:100vh;border:none;"></iframe>
 */

async function isLocationValid(locationId) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('dd_tenants')
      .select('id, ghl_pit, firm_name')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .single();
    if (data) return { valid: true, tenant: data };
    const locations = JSON.parse(process.env.DD_LOCATIONS || '[]');
    const found = locations.find(function(l) { return l.locationId === locationId; });
    if (found) return { valid: true, tenant: found };
    return { valid: false };
  } catch (err) {
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
  if (!loc) return res.status(400).send(errorPage('Missing location ID', 'The embed code is missing the loc parameter.'));

  var result = await isLocationValid(loc);
  if (!result.valid) return res.status(403).send(errorPage('Not Licensed', 'This location is not registered for Due Diligence Pro.'));

  var tenant = result.tenant;
  var color = req.query.color || '4F46E5';
  var firm = req.query.firm || tenant.firm_name || tenant.name || 'Your Tax Office';
  var firmPhone = req.query.phone || '';
  var firmEmail = req.query.email || '';

  // Sanitize inputs
  color = color.replace(/[^a-fA-F0-9]/g, '').substring(0, 6);
  firm = escHtml(decodeURIComponent(firm));
  firmPhone = escHtml(decodeURIComponent(firmPhone));
  firmEmail = escHtml(decodeURIComponent(firmEmail));

  // Generate color variants
  var colorR = parseInt(color.substring(0, 2), 16) || 79;
  var colorG = parseInt(color.substring(2, 4), 16) || 70;
  var colorB = parseInt(color.substring(4, 6), 16) || 229;
  var colorHover = darken(colorR, colorG, colorB, 15);
  var colorLight = 'rgba(' + colorR + ',' + colorG + ',' + colorB + ',0.08)';
  var colorGhost = 'rgba(' + colorR + ',' + colorG + ',' + colorB + ',0.15)';
  var colorGlow = 'rgba(' + colorR + ',' + colorG + ',' + colorB + ',0.15)';

  var html = buildClientWizard(loc, color, colorHover, colorLight, colorGhost, colorGlow, firm, firmPhone, firmEmail);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  return res.status(200).send(html);
};

function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function darken(r, g, b, pct) { var f = 1 - pct/100; return 'rgb(' + Math.round(r*f) + ',' + Math.round(g*f) + ',' + Math.round(b*f) + ')'; }

function errorPage(title, msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Due Diligence Pro</title></head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0"><div style="text-align:center;max-width:400px;padding:40px"><div style="font-size:48px;margin-bottom:16px">&#128274;</div><h2 style="color:#0f172a;margin-bottom:8px">' + title + '</h2><p style="color:#64748b;font-size:15px;line-height:1.6">' + msg + '</p><p style="color:#94a3b8;font-size:12px;margin-top:24px">Due Diligence Pro &bull; towfiqul.pro@gmail.com</p></div></body></html>';
}

function buildClientWizard(loc, color, colorHover, colorLight, colorGhost, colorGlow, firm, firmPhone, firmEmail) {
  var apiUrl = 'https://dd-wizard-api.vercel.app/api/submit';
  
  // Footer brand line
  var footerBrand = firm;
  if (firmPhone || firmEmail) {
    footerBrand += ' &bull; ';
    if (firmPhone) footerBrand += firmPhone;
    if (firmPhone && firmEmail) footerBrand += ' &bull; ';
    if (firmEmail) footerBrand += firmEmail;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Due Diligence Interview — ${firm}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--dd-primary:#${color};--dd-primary-hover:${colorHover};--dd-primary-light:${colorLight};--dd-primary-ghost:${colorGhost};--dd-primary-glow:${colorGlow};--dd-accent:#10B981;--dd-accent-light:#ECFDF5;--dd-danger:#EF4444;--dd-danger-light:#FEF2F2;--dd-text:#0F172A;--dd-text-sec:#475569;--dd-text-muted:#94A3B8;--dd-bg:#FFF;--dd-bg-page:#F1F5F9;--dd-bg-sub:#F8FAFC;--dd-border:#E2E8F0;--dd-border-lt:#F1F5F9;--dd-shadow-sm:0 1px 2px rgba(0,0,0,0.05);--dd-shadow-md:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05);--dd-r:16px;--dd-rs:10px;--dd-font:'DM Sans',system-ui,sans-serif;--dd-font-d:'Plus Jakarta Sans','DM Sans',system-ui,sans-serif}
.dd *{margin:0;padding:0;box-sizing:border-box}
.dd{font-family:var(--dd-font);background:var(--dd-bg-page);color:var(--dd-text);max-width:640px;margin:0 auto;padding:24px 16px 40px;-webkit-font-smoothing:antialiased;min-height:100vh;position:relative}
.dd::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 20% 0%,rgba(${parseInt(color.substring(0,2),16)||79},${parseInt(color.substring(2,4),16)||70},${parseInt(color.substring(4,6),16)||229},0.03) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(16,185,129,0.03) 0%,transparent 50%);pointer-events:none;z-index:0}
.dd>*{position:relative;z-index:1}
.dd-hdr{text-align:center;margin-bottom:20px}
.dd-badge{display:inline-flex;align-items:center;gap:8px;background:var(--dd-primary);color:#fff;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 2px 12px var(--dd-primary-glow)}
.dd-firm{font-size:13px;color:var(--dd-text-sec);margin-top:6px}
.dd-prog{margin-bottom:8px;padding:0 4px}
.dd-prog-bar{height:5px;background:var(--dd-border);border-radius:5px;overflow:hidden}
.dd-prog-fill{height:100%;background:linear-gradient(90deg,var(--dd-primary),var(--dd-accent));border-radius:5px;transition:width 0.5s ease;position:relative;box-shadow:0 0 10px var(--dd-primary-glow)}
.dd-prog-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);animation:ddShim 2s infinite}
@keyframes ddShim{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.dd-prog-lbl{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--dd-text-muted);margin-top:6px}
.dd-prog-pct{color:var(--dd-primary);font-weight:700}
.dd-steps{display:flex;align-items:center;justify-content:center;margin-bottom:24px;padding:14px 18px;background:var(--dd-bg);border-radius:var(--dd-r);border:1px solid var(--dd-border);box-shadow:var(--dd-shadow-sm);overflow-x:auto}
.dd-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:var(--dd-bg-sub);color:var(--dd-text-muted);border:2px solid var(--dd-border);transition:all 0.4s;flex-shrink:0}
.dd-dot.on{background:var(--dd-primary);color:#fff;border-color:var(--dd-primary);box-shadow:0 0 0 4px var(--dd-primary-glow);transform:scale(1.12)}
.dd-dot.ok{background:var(--dd-accent);color:#fff;border-color:var(--dd-accent)}
.dd-line{width:20px;height:2px;background:var(--dd-border);flex-shrink:0;transition:background 0.4s}
.dd-line.ok{background:var(--dd-accent)}
.dd-pg{display:none;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-radius:var(--dd-r);padding:34px 30px;border:1px solid var(--dd-border);box-shadow:var(--dd-shadow-md);position:relative;overflow:hidden}
.dd-pg.on{display:block;animation:ddUp 0.45s cubic-bezier(0.16,1,0.3,1)}
@keyframes ddUp{from{opacity:0;transform:translateY(20px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.dd-pg::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--dd-primary),var(--dd-accent));background-size:200% 100%;animation:ddGrad 4s ease infinite}
@keyframes ddGrad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.dd-ico{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:24px;background:var(--dd-primary-light)}
.dd-ttl{font-family:var(--dd-font-d);font-size:23px;font-weight:700;margin-bottom:5px;letter-spacing:-0.3px}
.dd-desc{font-size:14px;color:var(--dd-text-sec);margin-bottom:24px;line-height:1.6}
.dd-info{background:var(--dd-primary-light);border:1px solid var(--dd-primary-ghost);padding:14px 16px;border-radius:var(--dd-rs);margin-bottom:24px;font-size:13.5px;line-height:1.6;color:var(--dd-text-sec);display:flex;gap:10px}
.dd-info-i{flex-shrink:0;width:20px;height:20px;background:var(--dd-primary);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1px}
.dd-f{margin-bottom:22px}.dd-f.hid{display:none}.dd-f.fade{animation:ddFade 0.3s ease}
@keyframes ddFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.dd-l{display:block;font-size:14px;font-weight:600;color:var(--dd-text);margin-bottom:8px;line-height:1.4}
.dd-req{color:var(--dd-danger)}
.dd-hint{font-size:12.5px;color:var(--dd-text-muted);margin-top:-4px;margin-bottom:8px;line-height:1.4}
.dd-inp,.dd-ta{width:100%;padding:13px 15px;font-size:15px;font-family:var(--dd-font);border:1.5px solid var(--dd-border);border-radius:var(--dd-rs);background:var(--dd-bg);color:var(--dd-text);outline:none;transition:all 0.25s}
.dd-inp:focus,.dd-ta:focus{border-color:var(--dd-primary);box-shadow:0 0 0 4px var(--dd-primary-glow)}
.dd-ta{min-height:80px;resize:vertical}
.dd-sel{width:100%;padding:13px 42px 13px 15px;font-size:15px;font-family:var(--dd-font);border:1.5px solid var(--dd-border);border-radius:var(--dd-rs);background:var(--dd-bg);color:var(--dd-text);cursor:pointer;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;transition:all 0.25s}
.dd-sel:focus{border-color:var(--dd-primary);box-shadow:0 0 0 4px var(--dd-primary-glow)}
.dd-rg{display:flex;gap:10px;flex-wrap:wrap}
.dd-rb{flex:1;min-width:80px;padding:13px 14px;font-size:13.5px;font-weight:500;font-family:var(--dd-font);text-align:center;border:1.5px solid var(--dd-border);border-radius:var(--dd-rs);background:var(--dd-bg);color:var(--dd-text-sec);cursor:pointer;transition:all 0.25s;user-select:none;position:relative}
.dd-rb:hover{border-color:var(--dd-primary);background:var(--dd-primary-light);color:var(--dd-primary);transform:translateY(-2px)}
.dd-rb.sel{border-color:var(--dd-primary);background:var(--dd-primary-light);color:var(--dd-primary);font-weight:600;box-shadow:0 0 0 2px var(--dd-primary-glow)}
.dd-rb.sel::after{content:'';position:absolute;top:7px;right:7px;width:16px;height:16px;background:var(--dd-primary);border-radius:50%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpath d='M5 13l4 4L19 7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
.dd-cg{display:flex;flex-direction:column;gap:8px}
.dd-ci{display:flex;align-items:center;gap:11px;padding:12px 14px;border:1.5px solid var(--dd-border);border-radius:var(--dd-rs);cursor:pointer;transition:all 0.25s;font-size:14px;font-weight:500;color:var(--dd-text-sec)}
.dd-ci:hover{border-color:var(--dd-primary);background:var(--dd-primary-light);transform:translateX(4px)}
.dd-ci.chk{border-color:var(--dd-primary);background:var(--dd-primary-light);color:var(--dd-primary);font-weight:600}
.dd-ci input{display:none}
.dd-ck{width:20px;height:20px;border:2px solid var(--dd-border);border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.25s}
.dd-ci.chk .dd-ck{background:var(--dd-primary);border-color:var(--dd-primary)}
.dd-ck svg{opacity:0;transition:opacity 0.2s}.dd-ci.chk .dd-ck svg{opacity:1}
.dd-f.err .dd-inp,.dd-f.err .dd-sel,.dd-f.err .dd-ta{border-color:var(--dd-danger);box-shadow:0 0 0 3px rgba(239,68,68,0.08)}
.dd-f.err .dd-rb{border-color:rgba(239,68,68,0.3)}.dd-f.err .dd-l{color:var(--dd-danger)}
.dd-errmsg{font-size:12px;color:var(--dd-danger);margin-top:4px;display:none;font-weight:500}.dd-f.err .dd-errmsg{display:block}
.dd-banner{display:none;padding:13px 16px;border-radius:var(--dd-rs);font-size:14px;font-weight:500;margin-bottom:14px;line-height:1.5}
.dd-banner.vis{display:flex;gap:10px;align-items:flex-start}.dd-banner.err{background:var(--dd-danger-light);border:1px solid var(--dd-danger);color:#b91c1c}
.dd-nav{display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding-top:20px;border-top:1px solid var(--dd-border-lt)}
.dd-btn{padding:12px 24px;font-size:15px;font-weight:600;font-family:var(--dd-font);border:none;border-radius:var(--dd-rs);cursor:pointer;transition:all 0.3s;display:inline-flex;align-items:center;gap:8px}
.dd-btn-bk{background:var(--dd-bg-sub);color:var(--dd-text-sec);border:1.5px solid var(--dd-border)}
.dd-btn-bk:hover{background:var(--dd-border-lt)}
.dd-btn-nx{background:var(--dd-primary);color:#fff;margin-left:auto;box-shadow:0 2px 8px var(--dd-primary-glow)}
.dd-btn-nx:hover{background:var(--dd-primary-hover);transform:translateY(-2px);box-shadow:0 6px 20px var(--dd-primary-glow)}
.dd-btn-sub{background:linear-gradient(135deg,var(--dd-accent),#059669);color:#fff;margin-left:auto;padding:14px 32px;font-size:16px;box-shadow:0 4px 14px rgba(16,185,129,0.3)}
.dd-btn-sub:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(16,185,129,0.35)}
.dd-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none!important}
.dd-dep-hdr{display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--dd-border-lt)}
.dd-dep-badge{width:42px;height:42px;background:linear-gradient(135deg,var(--dd-primary),var(--dd-primary-hover));color:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px var(--dd-primary-glow)}
.dd-sum{background:var(--dd-bg-sub);border:1px solid var(--dd-border);border-radius:var(--dd-rs);padding:18px;margin-bottom:14px}
.dd-sum h4{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--dd-text-muted);margin-bottom:10px}
.dd-sum-r{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--dd-border-lt);font-size:13.5px}
.dd-sum-r:last-child{border:none}
.dd-ok{text-align:center;padding:48px 24px}
.dd-ok-ico{width:80px;height:80px;background:linear-gradient(135deg,var(--dd-accent),#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 30px rgba(16,185,129,0.3);animation:ddPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275)}
@keyframes ddPop{0%{transform:scale(0) rotate(-45deg)}60%{transform:scale(1.1) rotate(0)}100%{transform:scale(1) rotate(0)}}
.dd-ok h2{font-family:var(--dd-font-d);font-size:24px;font-weight:700;margin-bottom:8px}
.dd-ok p{font-size:15px;color:var(--dd-text-sec);line-height:1.7;max-width:400px;margin:0 auto}
@keyframes ddSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.dd-spin{display:inline-block;width:20px;height:20px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:ddSpin 0.7s linear infinite}
.dd-row{display:flex;gap:12px}.dd-row>.dd-f{flex:1}
@media(max-width:480px){.dd{padding:16px 12px}.dd-pg{padding:26px 20px}.dd-rg{flex-direction:column}.dd-row{flex-direction:column}.dd-dot{width:26px;height:26px;font-size:10px}.dd-line{width:14px}}
</style>
</head><body style="margin:0;background:#F1F5F9">
<div class="dd" id="ddW">
  <div class="dd-hdr">
    <div class="dd-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg> Due Diligence Pro</div>
    <div class="dd-firm">${firm}</div>
  </div>
  <div class="dd-prog"><div class="dd-prog-bar"><div class="dd-prog-fill" id="ddPF" style="width:0%"></div></div><div class="dd-prog-lbl"><span id="ddPT">Step 1</span><span class="dd-prog-pct" id="ddPP">0%</span></div></div>
  <div class="dd-steps" id="ddST"></div>

  <!-- WELCOME -->
  <div class="dd-pg on" data-pg="welcome">
    <div class="dd-ico">&#128075;</div>
    <div class="dd-ttl">Welcome</div>
    <div class="dd-desc">This interview helps your tax preparer at <strong>${firm}</strong> verify your eligibility for tax credits, as required by the IRS.</div>
    <div class="dd-info"><div class="dd-info-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 16v-4M12 8h.01"/></svg></div><div>Required by IRS Form 8867. Confidential — shared only with your preparer. Takes 3–5 minutes.</div></div>
    <div class="dd-f" data-f="dd_client_consent" data-req="1"><label class="dd-l">Do you consent to this confidential interview? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes, I consent</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_tax_year" data-req="1"><label class="dd-l">Tax year <span class="dd-req">*</span></label><select class="dd-sel" onchange="I(this)"><option value="">Select</option><option>2025</option><option>2026</option><option>2027</option></select><div class="dd-errmsg">Required</div></div>
    <div class="dd-nav"><span></span><button class="dd-btn dd-btn-nx" onclick="NX()">Get Started &#8594;</button></div>
  </div>

  <!-- CLIENT INFO -->
  <div class="dd-pg" data-pg="client_info">
    <div class="dd-ico">&#128100;</div>
    <div class="dd-ttl">Your Information</div>
    <div class="dd-f" data-f="dd_client_email" data-req="1"><label class="dd-l">Email <span class="dd-req">*</span></label><input class="dd-inp" type="email" placeholder="your@email.com" oninput="I(this)" autocomplete="email"><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_client_phone" data-req="1"><label class="dd-l">Phone <span class="dd-req">*</span></label><input class="dd-inp" type="tel" placeholder="(555) 123-4567" oninput="I(this)" autocomplete="tel"><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_client_name" data-req="1"><label class="dd-l">Full Legal Name <span class="dd-req">*</span></label><input class="dd-inp" type="text" placeholder="First Middle Last" oninput="I(this)"><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_client_dob" data-req="1"><label class="dd-l">Date of Birth <span class="dd-req">*</span></label><input class="dd-inp" type="date" oninput="I(this)"><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_filing_status" data-req="1"><label class="dd-l">Filing Status <span class="dd-req">*</span></label><select class="dd-sel" onchange="I(this);D.dd_flag_hoh=this.value==='Head of Household'?'Yes':'No'"><option value="">Select</option><option>Single</option><option>Head of Household</option><option>Married Filing Joint</option><option>Married Filing Separate</option><option>Qualifying Surviving Spouse</option></select><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_address_changed"><label class="dd-l">Is your address the same as last year?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No, I moved</div></div></div>
    <div class="dd-f" data-f="dd_has_dependents" data-req="1"><label class="dd-l">Claiming dependents? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this);TG('ddDC',true)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this);TG('ddDC',false);D.dd_dependent_count=''">No</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f hid" data-f="dd_dependent_count" id="ddDC" data-req="1"><label class="dd-l">How many? <span class="dd-req">*</span></label><select class="dd-sel" onchange="I(this)"><option value="">Select</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select><div class="dd-errmsg">Required</div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- CREDITS -->
  <div class="dd-pg" data-pg="credits">
    <div class="dd-ico">&#11088;</div>
    <div class="dd-ttl">Tax Credits</div>
    <div class="dd-f" data-f="dd_flag_eic" data-req="1"><label class="dd-l">Earned Income Credit (EIC)? <span class="dd-req">*</span></label><div class="dd-hint">For working people with low-moderate income.</div><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_flag_ctc"><label class="dd-l">Child Tax Credit (CTC)?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div></div>
    <div class="dd-f" data-f="dd_flag_odc"><label class="dd-l">Other Dependents Credit (ODC)?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div></div>
    <div class="dd-f" data-f="dd_flag_aoc"><label class="dd-l">American Opportunity Credit (AOC)?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- DEPENDENT TEMPLATE -->
  <div class="dd-pg" data-pg="dep" data-dep-tmpl="1" style="display:none!important">
    <div class="dd-dep-hdr"><div class="dd-dep-badge"><span data-dn>1</span></div><div><div class="dd-ttl" style="margin:0;font-size:20px">Dependent <span data-dn>1</span></div></div></div>
    <div class="dd-f" data-f="dd_dep_N_name" data-req="1"><label class="dd-l">Full Name (First & Last) <span class="dd-req">*</span></label><input class="dd-inp" type="text" placeholder="First Last" oninput="I(this)"><div class="dd-errmsg">Required</div></div>
    <div class="dd-row"><div class="dd-f" data-f="dd_dep_N_dob" data-req="1"><label class="dd-l">Date of Birth <span class="dd-req">*</span></label><input class="dd-inp" type="date" oninput="I(this)"><div class="dd-errmsg">Required</div></div><div class="dd-f" data-f="dd_dep_N_ssn_last_4"><label class="dd-l">Last 4 SSN/ITIN</label><input class="dd-inp" type="text" placeholder="1234" maxlength="4" oninput="I(this)"></div></div>
    <div class="dd-f" data-f="dd_dep_N_relationship" data-req="1"><label class="dd-l">Relationship <span class="dd-req">*</span></label><select class="dd-sel" onchange="I(this)"><option value="">Select</option><option>Son</option><option>Daughter</option><option>Stepson</option><option>Stepdaughter</option><option>Foster Child</option><option>Brother</option><option>Sister</option><option>Grandchild</option><option>Niece</option><option>Nephew</option><option>Parent</option><option>Other</option></select><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_dep_N_residency" data-req="1"><label class="dd-l">Lived with you more than half the year? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_dep_N_residency_proof"><label class="dd-l">Residency proof available?</label><div class="dd-cg"><label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="School Records"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>School records</label><label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Medical Records"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Medical records</label><label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Lease/Utility"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Lease / utility bills</label><label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Daycare Records"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Daycare records</label></div></div>
    <div class="dd-f" data-f="dd_dep_N_support" data-req="1"><label class="dd-l">You provided more than half their support? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_dep_N_age_status" data-req="1"><label class="dd-l">At year end, this person was: <span class="dd-req">*</span></label><select class="dd-sel" onchange="I(this)"><option value="">Select</option><option>Under 17</option><option>17-18</option><option>19-23 Full-Time Student</option><option>24+</option><option>Permanently Disabled</option></select><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_dep_N_id_type" data-req="1"><label class="dd-l">Tax ID type <span class="dd-req">*</span></label><div class="dd-hint">SSN = CTC eligible. ITIN/ATIN = ODC only.</div><select class="dd-sel" onchange="I(this)"><option value="">Select</option><option>SSN</option><option>ITIN</option><option>ATIN</option><option>Not Sure</option></select><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_dep_N_competing_claim" data-req="1"><label class="dd-l">Could anyone else claim this person? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_dep_N_us_citizen" data-req="1"><label class="dd-l">U.S. citizen/resident? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- HOH -->
  <div class="dd-pg" data-pg="hoh">
    <div class="dd-ico">&#127968;</div>
    <div class="dd-ttl">Head of Household</div>
    <div class="dd-f" data-f="dd_hoh_married" data-req="1"><label class="dd-l">Married during the year? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this);TG('ddHD',true);TG('ddHS',true)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this);TG('ddHD',false);TG('ddHS',false)">No</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f hid" data-f="dd_hoh_divorced" id="ddHD"><label class="dd-l">Divorced/separated by Dec 31?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div></div></div>
    <div class="dd-f hid" data-f="dd_hoh_spouse_lived" id="ddHS"><label class="dd-l">Spouse in home last 6 months?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div></div></div>
    <div class="dd-f" data-f="dd_hoh_cost_support" data-req="1"><label class="dd-l">Paid more than half the cost of keeping up your home? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_hoh_other_adults"><label class="dd-l">Other adults in the home?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this);TG('ddHOA',true)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this);TG('ddHOA',false)">No</div></div></div>
    <div class="dd-f hid" data-f="dd_hoh_other_adults_detail" id="ddHOA"><label class="dd-l">Who and did they contribute to expenses?</label><input class="dd-inp" type="text" placeholder="e.g. My mother, she pays utilities" oninput="I(this)"></div>
    <div class="dd-f" data-f="dd_hoh_qualifying_person" data-req="1"><label class="dd-l">Who qualifies you for HOH? <span class="dd-req">*</span></label><input class="dd-inp" type="text" placeholder="e.g. My daughter, Sofia" oninput="I(this)"><div class="dd-errmsg">Required</div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- EIC -->
  <div class="dd-pg" data-pg="eic">
    <div class="dd-ico">&#128176;</div>
    <div class="dd-ttl">Earned Income Credit</div>
    <div class="dd-f" data-f="dd_eic_residency" data-req="1"><label class="dd-l">Did a qualifying child live with you in the U.S. for more than half the year? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_eic_joint_return_child"><label class="dd-l">Did any qualifying child file a joint return?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="N/A" onclick="R(this)">N/A</div></div></div>
    <div class="dd-f" data-f="dd_eic_investment_income" data-req="1"><label class="dd-l">Investment income under the IRS limit? <span class="dd-req">*</span></label><div class="dd-hint">2025 limit: $11,600</div><div class="dd-rg"><div class="dd-rb" data-v="Under Limit" onclick="R(this)">Under</div><div class="dd-rb" data-v="Over Limit" onclick="R(this)">Over</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_eic_income_supports_expenses" data-req="1"><label class="dd-l">Does your income support your household expenses? <span class="dd-req">*</span></label><div class="dd-hint">If income seems low for your living situation, explain how you cover the difference.</div><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this);TG('ddIE',false)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this);TG('ddIE',true)">No</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f hid" data-f="dd_eic_income_explanation" id="ddIE"><label class="dd-l">How do you cover the difference?</label><input class="dd-inp" type="text" placeholder="e.g. Savings, family help, loans" oninput="I(this)"></div>
    <div class="dd-f" data-f="dd_eic_prior_denial" data-req="1"><label class="dd-l">Has the IRS ever denied your EIC? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this);TG('ddE8',true)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this);TG('ddE8',false)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this);TG('ddE8',true)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f hid" data-f="dd_eic_form_8862" id="ddE8"><label class="dd-l">Form 8862 required?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="N/A" onclick="R(this)">N/A</div></div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- INCOME -->
  <div class="dd-pg" data-pg="income">
    <div class="dd-ico">&#128181;</div>
    <div class="dd-ttl">Income</div>
    <div class="dd-f" data-f="dd_income_sources" data-req="1"><label class="dd-l">Select all that apply <span class="dd-req">*</span></label><div class="dd-cg">
      <label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="W-2 Employment"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>W-2 Employment</label>
      <label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Self-Employment"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Self-Employment</label>
      <label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="1099-NEC/MISC"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>1099-NEC/MISC</label>
      <label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Social Security"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Social Security</label>
      <label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Investment"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Investment</label>
      <label class="dd-ci" onclick="CK(this)"><input type="checkbox" value="Other"><div class="dd-ck"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="white" stroke-width="2"/></svg></div>Other</label>
    </div><div class="dd-errmsg">Select at least one</div></div>
    <div class="dd-f" data-f="dd_self_employed" data-req="1"><label class="dd-l">Self-employment income? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this);TG('ddST',true);TG('ddSE',true);TG('ddSR',true);TG('ddSB',true)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this);TG('ddST',false);TG('ddSE',false);TG('ddSR',false);TG('ddSB',false)">No</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f hid" data-f="dd_se_business_type" id="ddST"><label class="dd-l">Type of work/business</label><input class="dd-inp" type="text" placeholder="e.g. Rideshare, hair braiding" oninput="I(this)"></div>
    <div class="dd-f hid" data-f="dd_se_has_expenses" id="ddSE"><label class="dd-l">Business expenses?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div></div>
    <div class="dd-f hid" data-f="dd_se_record_method" id="ddSR"><label class="dd-l">How do you track income?</label><div class="dd-rg" style="flex-direction:column"><div class="dd-rb" data-v="App/Software" onclick="R(this)" style="text-align:left">App/Software</div><div class="dd-rb" data-v="Bank Statements" onclick="R(this)" style="text-align:left">Bank Statements</div><div class="dd-rb" data-v="Hand-Written Ledger" onclick="R(this)" style="text-align:left">Hand-Written Ledger</div><div class="dd-rb" data-v="Estimates" onclick="R(this)" style="text-align:left">Estimates</div></div></div>
    <div class="dd-f hid" data-f="dd_se_separate_bank" id="ddSB"><label class="dd-l">Separate business bank account?</label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div></div></div>
    <div class="dd-f" data-f="dd_income_docs_provided" data-req="1"><label class="dd-l">Income docs provided? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Partial" onclick="R(this)">Some</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- AOTC -->
  <div class="dd-pg" data-pg="aotc">
    <div class="dd-ico">&#127891;</div>
    <div class="dd-ttl">Education Credit (AOC)</div>
    <div class="dd-f" data-f="dd_aoc_student_name"><label class="dd-l">Student's name</label><input class="dd-inp" type="text" placeholder="Who is attending school?" oninput="I(this)"></div>
    <div class="dd-f" data-f="dd_aoc_enrolled" data-req="1"><label class="dd-l">Enrolled at eligible school? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_half_time" data-req="1"><label class="dd-l">At least half-time? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_undergraduate" data-req="1"><label class="dd-l">Undergraduate? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_4_years_used" data-req="1"><label class="dd-l">AOC claimed 4+ years? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_1098t" data-req="1"><label class="dd-l">1098-T received? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Yet" onclick="R(this)">Not Yet</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_tuition_paid" data-req="1"><label class="dd-l">Tuition paid out of pocket? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_felony" data-req="1"><label class="dd-l">Felony drug conviction? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_aoc_prior_denial" data-req="1"><label class="dd-l">IRS ever denied AOC? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Continue &#8594;</button></div>
  </div>

  <!-- DOCUMENTS -->
  <div class="dd-pg" data-pg="documents">
    <div class="dd-ico">&#128196;</div>
    <div class="dd-ttl">Documents & Substantiation</div>
    <div class="dd-f" data-f="dd_docs_uploaded" data-req="1"><label class="dd-l">Have you provided supporting documents? <span class="dd-req">*</span></label><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">Later</div><div class="dd-rb" data-v="Partial" onclick="R(this)">Some</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_can_substantiate" data-req="1"><label class="dd-l">Could you provide documentation to prove eligibility if audited? <span class="dd-req">*</span></label><div class="dd-hint">IRS-required question your preparer must ask.</div><div class="dd-rg"><div class="dd-rb" data-v="Yes" onclick="R(this)">Yes</div><div class="dd-rb" data-v="No" onclick="R(this)">No</div><div class="dd-rb" data-v="Not Sure" onclick="R(this)">Not Sure</div></div><div class="dd-errmsg">Required</div></div>
    <div class="dd-f" data-f="dd_doc_types_provided"><label class="dd-l">What documents have you or will you provide?</label><textarea class="dd-ta" placeholder="e.g. Birth certs, W-2, 1099..." oninput="I(this)"></textarea></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-nx" onclick="NX()">Review & Submit &#8594;</button></div>
  </div>

  <!-- CONFIRM -->
  <div class="dd-pg" data-pg="confirm">
    <div class="dd-ico">&#9989;</div>
    <div class="dd-ttl">Review & Submit</div>
    <div class="dd-desc">Please confirm your information is accurate.</div>
    <div class="dd-banner" id="ddEB"></div>
    <div id="ddSum"></div>
    <div class="dd-info" style="margin-top:16px"><div class="dd-info-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 16v-4M12 8h.01"/></svg></div><div>By submitting, you confirm all information is true and accurate.</div></div>
    <div class="dd-nav"><button class="dd-btn dd-btn-bk" onclick="BK()">&#8592; Back</button><button class="dd-btn dd-btn-sub" id="ddSB2" onclick="SUB()">Submit My Answers &#10003;</button></div>
  </div>

  <!-- SUCCESS -->
  <div class="dd-pg" data-pg="success">
    <div class="dd-ok">
      <div class="dd-ok-ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h2>Interview Complete!</h2>
      <p>Thank you! Your preparer at <strong>${firm}</strong> will review everything and contact you if needed.</p>
      <div style="margin-top:20px;font-size:12px;color:var(--dd-text-muted)">Powered by <strong style="color:var(--dd-primary)">Due Diligence Pro</strong></div>
    </div>
  </div>
</div>

<script>
(function(){
'use strict';
var CFG={loc:'${loc}',api:'${apiUrl}'};
var D={},P=[],C=0,DP=[];
function bF(){var p=['welcome','client_info','credits'];var dc=parseInt(D.dd_dependent_count)||0;for(var i=1;i<=dc;i++)p.push('dep_'+i);if(D.dd_filing_status==='Head of Household')p.push('hoh');if(D.dd_flag_eic==='Yes'||D.dd_flag_eic==='Not Sure')p.push('eic');p.push('income');if(D.dd_flag_aoc==='Yes'||D.dd_flag_aoc==='Not Sure')p.push('aotc');p.push('documents','confirm');P=p}
function bS(){var el=document.getElementById('ddST'),h='';P.forEach(function(pg,i){if(i>0)h+='<div class="dd-line'+(i<=C?' ok':'')+'"></div>';var cls=i<C?'ok':(i===C?'on':'');var ic=i<C?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>':(i+1);h+='<div class="dd-dot '+cls+'">'+ic+'</div>'});el.innerHTML=h}
function uP(){var t=P.length,pct=t>1?Math.round((C/(t-1))*100):0;document.getElementById('ddPF').style.width=pct+'%';document.getElementById('ddPP').textContent=pct+'%';document.getElementById('ddPT').textContent='Step '+(C+1)+' of '+t}
function eD(){var dc=parseInt(D.dd_dependent_count)||0;var tmpl=document.querySelector('[data-dep-tmpl="1"]');DP.forEach(function(p){p.remove()});DP=[];for(var i=1;i<=dc;i++){var c=tmpl.cloneNode(true);c.removeAttribute('data-dep-tmpl');c.setAttribute('data-pg','dep_'+i);c.style.cssText='';c.classList.remove('on');c.querySelectorAll('[data-dn]').forEach(function(el){el.textContent=i});c.querySelectorAll('[data-f]').forEach(function(el){el.setAttribute('data-f',el.getAttribute('data-f').replace('_N_','_'+i+'_'))});c.querySelectorAll('.dd-rb').forEach(function(b){b.setAttribute('onclick','R(this)')});c.querySelectorAll('.dd-ci').forEach(function(b){b.setAttribute('onclick','CK(this)')});document.querySelector('[data-pg="hoh"]').before(c);DP.push(c)}}
function gE(n){return document.querySelector('.dd-pg[data-pg="'+n+'"]')}
function show(idx){document.querySelectorAll('.dd-pg').forEach(function(p){p.classList.remove('on')});C=idx;var el=gE(P[idx]);if(el){el.classList.add('on');el.scrollIntoView({behavior:'smooth',block:'start'})}bS();uP()}
function val(pg){if(!pg)return true;var ok=true;pg.querySelectorAll('.dd-f[data-req="1"]').forEach(function(f){if(f.classList.contains('hid'))return;var v=D[f.getAttribute('data-f')];if(!v||!v.trim()){f.classList.add('err');ok=false}else f.classList.remove('err')});if(!ok){var e=pg.querySelector('.dd-f.err');if(e)e.scrollIntoView({behavior:'smooth',block:'center'})}return ok}

window.R=function(b){b.parentElement.querySelectorAll('.dd-rb').forEach(function(x){x.classList.remove('sel')});b.classList.add('sel');var f=b.closest('.dd-f');if(f){D[f.getAttribute('data-f')]=b.getAttribute('data-v');f.classList.remove('err')}};
window.I=function(inp){var f=inp.closest('.dd-f');if(f){D[f.getAttribute('data-f')]=inp.value;f.classList.remove('err')}};
window.CK=function(lbl){var cb=lbl.querySelector('input');cb.checked=!cb.checked;lbl.classList.toggle('chk',cb.checked);var f=lbl.closest('.dd-f');if(f){D[f.getAttribute('data-f')]=Array.from(f.querySelectorAll('input:checked')).map(function(c){return c.value}).join(', ');f.classList.remove('err')}};
window.TG=function(id,s){var e=document.getElementById(id);if(e){e.classList.toggle('hid',!s);if(s)e.classList.add('fade')}};
window.NX=function(){var el=gE(P[C]);if(!val(el))return;var pg=P[C];if(pg==='welcome'&&D.dd_client_consent==='No'){alert('You must consent to continue.');return}if(pg==='client_info'||pg==='credits'){eD();bF()}if(C<P.length-1){if(P[C+1]==='confirm')bSum();show(C+1)}};
window.BK=function(){if(C>0)show(C-1)};
function bSum(){var h='';function r(l,v){return '<div class="dd-sum-r"><span style="color:var(--dd-text-sec)">'+l+'</span><span style="font-weight:600">'+(v||'\\u2014')+'</span></div>'}h+='<div class="dd-sum"><h4>Client Info</h4>'+r('Name',D.dd_client_name)+r('DOB',D.dd_client_dob)+r('Email',D.dd_client_email)+r('Filing',D.dd_filing_status)+r('Dependents',D.dd_has_dependents==='Yes'?(D.dd_dependent_count||0)+' claimed':'None')+'</div>';var cr=[];if(D.dd_flag_hoh==='Yes')cr.push('HOH');if(D.dd_flag_eic==='Yes')cr.push('EIC');if(D.dd_flag_ctc==='Yes')cr.push('CTC');if(D.dd_flag_odc==='Yes')cr.push('ODC');if(D.dd_flag_aoc==='Yes')cr.push('AOC');h+='<div class="dd-sum"><h4>Credits & Income</h4>'+r('Credits',cr.join(', ')||'None')+r('Self-Employed',D.dd_self_employed||'\\u2014')+r('Sources',D.dd_income_sources||'\\u2014')+'</div>';var dc=parseInt(D.dd_dependent_count)||0;if(dc>0){h+='<div class="dd-sum"><h4>Dependents</h4>';for(var i=1;i<=dc;i++)h+=r('Dep '+i,(D['dd_dep_'+i+'_name']||'\\u2014')+' (DOB: '+(D['dd_dep_'+i+'_dob']||'\\u2014')+')');h+='</div>'}document.getElementById('ddSum').innerHTML=h}
window.SUB=function(){var btn=document.getElementById('ddSB2'),eb=document.getElementById('ddEB');eb.classList.remove('vis');btn.disabled=true;btn.innerHTML='<span class="dd-spin"></span> Submitting...';D.dd_interview_mode='Client Self-Service';D.dd_interview_date=new Date().toISOString().split('T')[0];D.dd_interview_status='Complete';var ans={};Object.keys(D).forEach(function(k){if(k.indexOf('dd_')===0&&D[k])ans[k]=D[k]});var payload={locationId:CFG.loc,mode:'client',contact:{email:D.dd_client_email,phone:D.dd_client_phone,name:D.dd_client_name},answers:ans};fetch(CFG.api,{method:'POST',headers:{'Content-Type':'application/json','X-Location-Id':CFG.loc},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Failed');return d})}).then(function(){document.querySelectorAll('.dd-pg').forEach(function(p){p.classList.remove('on')});gE('success').classList.add('on');document.getElementById('ddST').style.display='none';document.querySelector('.dd-prog').style.display='none'}).catch(function(err){eb.textContent=err.message;eb.className='dd-banner vis err';btn.disabled=false;btn.innerHTML='Submit My Answers &#10003;'})};
bF();bS();uP();
})();
<\/script>
</body></html>`;
}
