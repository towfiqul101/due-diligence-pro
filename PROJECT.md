# DD Wizard API — Project Overview

## What Is It?

**Due Diligence Pro** is a multi-tenant SaaS backend that serves interactive interview wizards to help tax preparers collect and document IRS-required due diligence information. It generates IRS Form 8867 compliance records, stores client answers in GoHighLevel (GHL) CRM, and uses Google Gemini AI to flag risks in submitted data.

The product is sold to individual tax offices ("locations"). Each licensed location gets a branded, embeddable wizard they place in their own sites or GHL funnels.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥18, Vercel Serverless Functions |
| CRM / Data Store | GoHighLevel (GHL) via REST API (`services.leadconnectorhq.com`) |
| AI Validation | Google Gemini 2.5 Flash (`generativelanguage.googleapis.com`) |
| Frontend | Vanilla HTML/CSS/JS (server-rendered, no framework) |
| Fonts | DM Sans, Plus Jakarta Sans (Google Fonts) |
| Hosting | Vercel (Hobby plan, 30s function timeout) |
| Config | Environment variables only — no database |

---

## Architecture

```
Client Browser
      │
      ▼
Vercel Serverless Functions  (/api/*)
      │
      ├── GoHighLevel CRM  (contacts, custom fields, tags)
      │
      └── Gemini AI  (risk analysis, preparer notes)
```

- **No database.** GHL is the data store. All `dd_` prefixed custom fields on GHL contacts hold the interview answers.
- **Multi-tenancy via env var.** Licensed locations live in `DD_LOCATIONS` (a JSON array in the environment). License is validated on every request.
- **Server-renders both wizard UIs.** The HTML is built server-side with brand colors and location ID baked in, then served as a response. No separate frontend deployment needed.

---

## API Endpoints

### `GET /api/status`
Health check. With `?locationId=xxx` also returns license status and enabled features.

### `GET /api/admin?key=SECRET`
Lists all licensed locations. Requires `DD_ADMIN_KEY`. Masks the last 8 characters of each location's private integration token (PIT).

### `GET /api/lookup?email=xxx&locationId=xxx`
Looks up a client in GHL by email, fetches their contact record, and returns all `dd_` custom field values mapped by key name. Used by the preparer wizard to pre-fill a returning client's data.

Steps:
1. Fetch custom field definitions from GHL to build an `id → key` map (cached per lambda instance).
2. Search for contact by email (falls back to duplicate-search endpoint).
3. Fetch full contact record.
4. Map raw custom field IDs to named keys, extract `dd_*` fields only.

### `GET /api/pdf?email=xxx&locationId=xxx`
Generates a print-ready HTML Due Diligence Worksheet for a client. Returned as `text/html` with a "Print / Save as PDF" button. Sections rendered conditionally: HOH section only if filing status is HOH; EIC section only if EIC is flagged; AOC section only if AOC is flagged; dependent blocks repeated per `dd_dependent_count`.

### `POST /api/submit`
Accepts completed wizard answers and saves them to GHL. Three modes:

| Mode | Behavior |
|---|---|
| `client` | Full submit — upsert contact, run AI validation, write AI results back, tag `dd-clear` or `dd-flagged` |
| `preparer` | Same as client |
| `send-link` | Upsert contact with minimal data and tag `dd_iv_link_sent`, skip AI |

### `GET /api/wizard/client?loc=XXX&color=4F46E5&firm=Smith+Tax&phone=...&email=...`
Returns the full client self-service wizard HTML page. Brand color, firm name, phone, and email are injected. Color can be overridden per-embed or pulled from the location config. The page is designed to be embedded in an `<iframe>`.

### `GET /api/wizard/preparer?loc=XXX&firm=Smith+Tax`
Returns the tax-preparer-facing wizard HTML. Dark professional theme (navy/amber), wider layout (720px vs 640px for client). Includes a client email lookup tool to pre-fill returning clients.

---

## Questions Asked — Client Wizard

The wizard is a multi-step flow. Steps shown depend on answers.

### Welcome
- Consent to confidential interview (Yes / No)
- Tax year

### Your Information
- Email, phone, full legal name, date of birth
- Filing status (Single / HOH / MFJ / MFS / QSS)
- Address changed since last year?
- Claiming dependents? → How many?

### Tax Credits
- Earned Income Credit (EIC)? Yes / No / Not Sure
- Child Tax Credit (CTC)?
- Other Dependents Credit (ODC)?
- American Opportunity Credit (AOC)?

_(Head of Household is auto-set from filing status.)_

### Dependent (repeated per dependent count)
- Full name, date of birth, last 4 of SSN/ITIN
- Relationship (Son, Daughter, Grandchild, etc.)
- Lived with you more than half the year?
- Residency proof available? (checkboxes: school, medical, lease, daycare)
- You provided more than half their support?
- Age status at year end (Under 17, 17-18, 19-23 student, 24+, disabled)
- Tax ID type (SSN / ITIN / ATIN / Not Sure)
- Could anyone else claim this person?
- U.S. citizen or resident?

### Head of Household _(only if HOH filing status)_
- Married during the year?
- Divorced/separated by Dec 31? _(conditional)_
- Spouse in home last 6 months? _(conditional)_
- Paid more than half the cost of keeping home?
- Other adults in home? → Who and did they contribute?
- Who qualifies you for HOH?

### Earned Income Credit _(only if EIC = Yes or Not Sure)_
- Qualifying child lived with you in U.S. for more than half the year?
- Did any qualifying child file a joint return?
- Investment income under IRS limit? (2025 limit: $11,600)
- Does your income support your household expenses? → If No: explain how you cover the difference
- Has the IRS ever denied your EIC? → If Yes/Not Sure: Form 8862 required?

### Income
- Income sources (checkboxes: W-2, Self-Employment, 1099-NEC/MISC, Social Security, Investment, Other)
- Self-employment income? → If Yes: business type, expenses?, income tracking method, separate bank account?
- Income documents provided?

### Education Credit — AOC _(only if AOC = Yes or Not Sure)_
- Student's name
- Enrolled at eligible school?
- At least half-time?
- Undergraduate program?
- AOC claimed 4+ years?
- 1098-T received?
- Tuition paid out of pocket?
- Felony drug conviction?
- IRS ever denied AOC?

### Documents & Substantiation
- Have you provided supporting documents?
- Could you provide documentation if audited? _(IRS-required question)_
- What documents have you or will you provide? (free text)

### Review & Submit
- Summary of key answers shown before submission.

---

## Questions Asked — Preparer Wizard

The preparer wizard mirrors the client wizard but adds:

- **Client lookup by email** at the start (pre-fills returning client data)
- **Preparer Verification section:**
  - Answers appear consistent and reasonable?
  - Supporting documents reviewed?
  - Additional inquiries made?
  - Inquiry notes (free text)
  - File audit-ready?
  - Knowledge base consulted?
- **Preparer Credentials:**
  - Preparer name, PTIN, firm/office, certification/signature

Submit modes from preparer wizard: `preparer` (full) or `send-link` (email link to client).

---

## AI Validation (Gemini)

When a submission arrives in `client` or `preparer` mode, the answers are sent to Gemini 2.5 Flash with a prompt asking it to act as an IRS due diligence expert and identify inconsistencies or red flags.

Gemini returns structured JSON:
```json
{
  "status": "clean" | "flagged",
  "risk_count": 2,
  "flags": [
    { "severity": "high" | "medium" | "low", "description": "..." }
  ],
  "preparer_notes": "Professional 2-3 sentence summary for audit defense."
}
```

Results are written back to the GHL contact as:
- `dd_ai_result` — Clean / Flagged / Error
- `dd_ai_flags` — Formatted flag list
- `dd_risk_count` — Number of risks
- `dd_review_required` — Yes / No
- `dd_preparer_notes` — AI-generated preparer summary

If `GEMINI_API_KEY` is not set, a basic summary is generated locally instead.

---

## Multi-Tenancy & Licensing

Locations are stored as a JSON array in the `DD_LOCATIONS` environment variable:

```json
[
  {
    "id": "GHL_LOCATION_ID",
    "name": "Smith Tax Services",
    "active": true,
    "pit": "GHL_PRIVATE_INTEGRATION_TOKEN",
    "brand": {
      "color": "4F46E5",
      "firmName": "Smith Tax",
      "firmPhone": "555-123-4567",
      "firmEmail": "info@smithtax.com"
    }
  }
]
```

Every API endpoint validates the `locationId` against this list before doing anything. Inactive or unregistered locations receive a 403.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DD_LOCATIONS` | JSON array of licensed locations (id, name, active, pit, brand) |
| `DD_ADMIN_KEY` | Secret key for `/api/admin` endpoint |
| `GEMINI_API_KEY` | Google Gemini API key for AI risk analysis |

---

## Data Flow

```
Wizard (browser)
  → POST /api/submit { locationId, mode, contact, answers }
    → Validate license
    → Upsert GHL contact with all dd_* answers
    → (if not send-link) → Gemini AI analysis
    → Write AI results back to GHL contact
    → Tag contact (dd-clear / dd-flagged / dd_iv_link_sent)
  ← { success, contactId, aiResult }
```

---

## Embed Code (for buyers)

**Client wizard:**
```html
<iframe
  src="https://dd-wizard-api.vercel.app/api/wizard/client?loc=LOCATION_ID"
  style="width:100%;min-height:100vh;border:none;">
</iframe>
```

**Preparer wizard:**
```html
<iframe
  src="https://dd-wizard-api.vercel.app/api/wizard/preparer?loc=LOCATION_ID"
  style="width:100%;min-height:100vh;border:none;">
</iframe>
```

Optional query params: `color`, `firm`, `phone`, `email`.

---

## File Structure

```
dd-wizard-api/
├── api/
│   ├── status.js          — Health check & license status
│   ├── admin.js           — Admin: list all locations
│   ├── lookup.js          — Look up client by email in GHL
│   ├── pdf.js             — Generate print-ready DD Worksheet HTML
│   ├── submit.js          — Save answers to GHL + AI validation
│   └── wizard/
│       ├── client.js      — Serves branded client interview HTML
│       └── preparer.js    — Serves preparer interview HTML
├── vercel.json            — Vercel config: 30s timeout, CORS headers
├── package.json           — Project metadata (no npm dependencies)
└── .env.local             — Local env (Vercel OIDC token)
```

> **No npm dependencies.** The API uses only Node.js built-ins (`https` module) and the native `fetch` available in Node 18+.

---

## Branching

This project has **no git repository** initialized. There are no branches.
