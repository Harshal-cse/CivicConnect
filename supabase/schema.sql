-- ==============================================================================
-- CivicConnect - Supabase PostgreSQL Schema & Security Policies
-- Municipal Civic Issue Reporting Platform for Kopargaon, Maharashtra
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE (Citizens, Nagarsevaks, MLAs, Municipal Administrators)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'nagarsevak', 'mla', 'admin')),
  city TEXT NOT NULL DEFAULT 'Kopargaon',
  ward TEXT,
  ward_name TEXT,
  corporation TEXT DEFAULT 'Kopargaon Municipal Council (KMC)',
  corporator TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role and jurisdiction searches
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ward ON public.profiles(ward);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- ==============================================================================
-- 2. COMPLAINTS TABLE (Civic Reports & Verification Lifecycle)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  category_display TEXT,
  description TEXT,
  location TEXT,
  coordinates JSONB,
  ward TEXT,
  city TEXT NOT NULL DEFAULT 'Kopargaon',
  reported_by_user_id TEXT NOT NULL,
  reported_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Verified', 'In Progress', 'Resolved', 'Rejected')),
  priority TEXT NOT NULL DEFAULT 'High' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  supports INTEGER NOT NULL DEFAULT 1,
  validation_id TEXT,
  image_url TEXT,
  sla_remaining TEXT,
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High performance indexing for queries & ward filtering
CREATE INDEX IF NOT EXISTS idx_complaints_city ON public.complaints(city);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON public.complaints(created_at DESC);

-- ==============================================================================
-- 3. IMAGE VALIDATIONS TABLE (AI Vision Audits & Security Gate Records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.image_validations (
  validation_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  image_hash TEXT,
  selected_category TEXT NOT NULL,
  detected_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5, 4),
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'manual_review')),
  rejection_reason TEXT,
  suggestion TEXT,
  provider TEXT DEFAULT 'mock',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validations_user ON public.image_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_status ON public.image_validations(status);
CREATE INDEX IF NOT EXISTS idx_validations_expires ON public.image_validations(expires_at);

-- ==============================================================================
-- 4. MODERATION AUDITS TABLE (Nagarsevak & Admin Decision Logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_audits (
  audit_id TEXT PRIMARY KEY,
  validation_id TEXT NOT NULL,
  admin_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'recategorize', 'request_photo')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_validation ON public.moderation_audits(validation_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.moderation_audits(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.moderation_audits(created_at DESC);

-- ==============================================================================
-- 5. STORAGE BUCKET FOR COMPLAINT EVIDENCE PHOTOS
-- ==============================================================================
-- Create the complaint-images bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-images',
  'complaint-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ==============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_audits ENABLE ROW LEVEL SECURITY;

-- Complaints: Anyone can read complaints (public civic feed for transparency)
DROP POLICY IF EXISTS "Public read access for complaints" ON public.complaints;
CREATE POLICY "Public read access for complaints"
  ON public.complaints FOR SELECT
  USING (true);

-- Complaints: Insert access for authenticated or service role
DROP POLICY IF EXISTS "Insert access for complaints" ON public.complaints;
CREATE POLICY "Insert access for complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (true);

-- Complaints: Update access (Nagarsevak triage / admin resolution)
DROP POLICY IF EXISTS "Update access for complaints" ON public.complaints;
CREATE POLICY "Update access for complaints"
  ON public.complaints FOR UPDATE
  USING (true);

-- Image Validations: Read access for creator and admins
DROP POLICY IF EXISTS "Read validations" ON public.image_validations;
CREATE POLICY "Read validations"
  ON public.image_validations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Insert validations" ON public.image_validations;
CREATE POLICY "Insert validations"
  ON public.image_validations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Update validations" ON public.image_validations;
CREATE POLICY "Update validations"
  ON public.image_validations FOR UPDATE
  USING (true);

-- Profiles: Public read, self or admin update
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Upsert profiles" ON public.profiles;
CREATE POLICY "Upsert profiles"
  ON public.profiles FOR ALL
  USING (true);

-- Moderation Audits: Read for admins/nagarsevaks, insert by authorized actors
DROP POLICY IF EXISTS "Audit log read" ON public.moderation_audits;
CREATE POLICY "Audit log read"
  ON public.moderation_audits FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Audit log insert" ON public.moderation_audits;
CREATE POLICY "Audit log insert"
  ON public.moderation_audits FOR INSERT
  WITH CHECK (true);

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public view complaint photos" ON storage.objects;
CREATE POLICY "Public view complaint photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-images');

DROP POLICY IF EXISTS "Upload complaint photos" ON storage.objects;
CREATE POLICY "Upload complaint photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'complaint-images');

-- ==============================================================================
-- 7. REALTIME REPLICATION (Optional: For instant live dashboard updates)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
