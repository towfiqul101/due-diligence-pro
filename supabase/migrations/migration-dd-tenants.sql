CREATE TABLE IF NOT EXISTS dd_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  firm_name TEXT NOT NULL,
  owner_email TEXT,
  owner_user_id UUID REFERENCES auth.users(id),

  -- GHL credentials
  ghl_pit TEXT,
  location_id TEXT,

  -- Status: pending_setup | active | paused | cancelled
  status TEXT DEFAULT 'pending_setup',

  -- Setup tracking
  snapshot_sent BOOLEAN DEFAULT FALSE,
  snapshot_sent_at TIMESTAMPTZ,
  fields_verified BOOLEAN DEFAULT FALSE,
  fields_verified_at TIMESTAMPTZ,

  -- TaxIntake Pro integration (Phase 2)
  taxintake_enabled BOOLEAN DEFAULT FALSE,
  taxintake_slug TEXT,
  taxintake_location_id TEXT,

  -- Branding
  brand_color TEXT DEFAULT '0f172a',

  -- Internal notes (not visible to customer)
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dd_tenants_slug_idx ON dd_tenants(slug);
CREATE INDEX IF NOT EXISTS dd_tenants_owner_idx ON dd_tenants(owner_user_id);

ALTER TABLE dd_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own dd_tenant"
  ON dd_tenants FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Owners can update own dd_tenant"
  ON dd_tenants FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Service role bypasses RLS for admin panel
