-- ==============================================================================
-- MUQABLA PLATFORM - PRIVACY, ROW-LEVEL SECURITY & STORAGE HARDENING
-- Migration Date: 2026-10-08
-- Target Project: jucuderwsunqktiwpfyj
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER FUNCTIONS WITH EXPLICIT SEARCH PATHS
-- Prevents search_path hijacking in security-critical procedures
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        domicile,
        education,
        degree
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        'candidate', -- STRICT: ALWAYS initialize as candidate. Only direct DB/admin can promote.
        COALESCE(new.raw_user_meta_data->>'domicile', 'All Pakistan'),
        COALESCE(new.raw_user_meta_data->>'education', 'Bachelor of Science'),
        COALESCE(new.raw_user_meta_data->>'degree', 'Graduation')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(public.profiles.name, EXCLUDED.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Security Violation: Normal candidates cannot modify user roles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.protect_score_moderation()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        -- Prevent changing verification or moderation status
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR
           NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR
           NEW.verified_by IS DISTINCT FROM OLD.verified_by OR
           NEW.verified_at IS DISTINCT FROM OLD.verified_at OR
           NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
            RAISE EXCEPTION 'Security Violation: Candidates cannot alter verification, moderation, or audit notes.';
        END IF;

        -- Prevent changing ownership or exam
        IF NEW.candidate_id IS DISTINCT FROM OLD.candidate_id OR NEW.exam_id IS DISTINCT FROM OLD.exam_id THEN
            RAISE EXCEPTION 'Security Violation: Cannot alter score ownership or target exam.';
        END IF;
    END IF;

    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 2. PROFILE PRIVACY: PROTECT PRIVATE PROFILES & EXPOSE SANITIZED VIEW
-- ==============================================================================
-- Revoke the permissive SELECT policy on public.profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all" 
ON public.profiles FOR SELECT 
USING (
    auth.uid() = id OR public.is_admin()
);

-- Create Sanitized Public Profile View
-- Exposes ONLY non-sensitive display fields (id, name, domicile, education, degree, is_verified)
-- Strips private email, trust_score, and internal metadata
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    name,
    domicile,
    education,
    degree,
    is_verified,
    created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ==============================================================================
-- 3. SCORE PRIVACY: PROTECT SENSITIVE SCORE DATA & EXPOSE COMPETITION VIEW
-- ==============================================================================
-- Revoke the permissive SELECT policy on public.scores
DROP POLICY IF EXISTS "Scores are viewable by all candidates" ON public.scores;
DROP POLICY IF EXISTS "Candidates view own score or admins view all" ON public.scores;

CREATE POLICY "Candidates view own score or admins view all" 
ON public.scores FOR SELECT 
USING (
    auth.uid() = candidate_id OR public.is_admin()
);

-- Create Sanitized Public Competition Score View
-- Exposes ONLY anonymous competitive intelligence needed for ranking and percentile benchmarking
-- Strips roll_number, cnic_last4, evidence_url, evidence_name, moderation_status, admin_notes, and verified_by
CREATE OR REPLACE VIEW public.public_scores AS
SELECT 
    id,
    exam_id,
    candidate_name,
    domicile,
    quota_category,
    category,
    obtained_marks,
    total_marks,
    accuracy_percentage,
    percentile,
    rank,
    status,
    verification_status,
    submitted_at,
    created_at,
    (auth.uid() = candidate_id) AS is_own
FROM public.scores
WHERE status = 'Active' AND moderation_status != 'Removed';

GRANT SELECT ON public.public_scores TO anon, authenticated;

-- ==============================================================================
-- 4. SUPABASE STORAGE EVIDENCE BUCKET & ROW-LEVEL SECURITY
-- ==============================================================================
-- Ensure the score-evidence bucket exists and is PRIVATE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'score-evidence',
            'score-evidence',
            false, -- STRICT: Private bucket
            10485760, -- 10MB limit
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = false,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        -- Enable RLS on storage.objects
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Drop old policies if they exist
        DROP POLICY IF EXISTS "Candidates can upload own evidence" ON storage.objects;
        DROP POLICY IF EXISTS "Users can view own evidence or admins view all" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update own evidence" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete own evidence or admins delete" ON storage.objects;

        -- 1. Upload policy: Authenticated candidate can ONLY upload to evidence/{auth.uid()}/...
        CREATE POLICY "Candidates can upload own evidence"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'score-evidence'
            AND split_part(name, '/', 1) = 'evidence'
            AND split_part(name, '/', 2) = auth.uid()::text
        );

        -- 2. Read policy: Candidates can ONLY read their own evidence; Admins can read all for moderation
        CREATE POLICY "Users can view own evidence or admins view all"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'score-evidence'
            AND (
                (split_part(name, '/', 1) = 'evidence' AND split_part(name, '/', 2) = auth.uid()::text)
                OR public.is_admin()
            )
        );

        -- 3. Update policy: Candidates can update their own evidence
        CREATE POLICY "Users can update own evidence"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'score-evidence'
            AND split_part(name, '/', 1) = 'evidence'
            AND split_part(name, '/', 2) = auth.uid()::text
        )
        WITH CHECK (
            bucket_id = 'score-evidence'
            AND split_part(name, '/', 1) = 'evidence'
            AND split_part(name, '/', 2) = auth.uid()::text
        );

        -- 4. Delete policy: Candidates can delete their own evidence; Admins can delete
        CREATE POLICY "Users can delete own evidence or admins delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'score-evidence'
            AND (
                (split_part(name, '/', 1) = 'evidence' AND split_part(name, '/', 2) = auth.uid()::text)
                OR public.is_admin()
            )
        );
    END IF;
END $$;
