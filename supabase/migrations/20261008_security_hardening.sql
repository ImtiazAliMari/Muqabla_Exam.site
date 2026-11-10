-- ==============================================================================
-- MUQABLA PLATFORM - SECURITY HARDENING, ROLE INTEGRITY & STORAGE MIGRATION
-- Migration Date: 2026-10-08
-- Target Project: jucuderwsunqktiwpfyj
-- ==============================================================================

-- 1. HARDEN PROFILE CREATION & PREVENT ROLE ESCALATION
-- Normal candidates MUST NOT be able to grant themselves admin via raw_user_meta_data
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent any non-admin from modifying user roles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Security Violation: Normal candidates cannot modify user roles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_escalation();

-- 2. HARDEN EXAMS POLICIES - ONLY ADMINS CAN CREATE/MODIFY/DELETE EXAMS
DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can delete exams" ON public.exams;

CREATE POLICY "Admins can insert exams" 
ON public.exams FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update exams" 
ON public.exams FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete exams" 
ON public.exams FOR DELETE USING (public.is_admin());

-- 3. HARDEN SCORES POLICIES & PREVENT CANDIDATE SELF-VERIFICATION
-- Ensure obtained_marks <= total_marks constraint
ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS chk_score_bounds;
ALTER TABLE public.scores ADD CONSTRAINT chk_score_bounds CHECK (obtained_marks <= total_marks);

-- Trigger to prevent normal candidates from modifying verification or moderation fields
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_score_moderation ON public.scores;
CREATE TRIGGER trg_protect_score_moderation
    BEFORE UPDATE ON public.scores
    FOR EACH ROW EXECUTE PROCEDURE public.protect_score_moderation();

-- Recreate score update policy
DROP POLICY IF EXISTS "Candidates can update their own score marks and evidence" ON public.scores;
CREATE POLICY "Candidates can update their own score marks and evidence" 
ON public.scores FOR UPDATE 
USING (
    auth.uid() = candidate_id OR public.is_admin()
)
WITH CHECK (
    auth.uid() = candidate_id OR public.is_admin()
);

-- 4. HARDEN NOTIFICATIONS - CANDIDATES CANNOT INSERT ARBITRARY NOTIFICATIONS
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications" 
ON public.notifications FOR INSERT WITH CHECK (public.is_admin());

-- 5. SUPABASE STORAGE BUCKET CONFIGURATION FOR EVIDENCE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'score-evidence',
            'score-evidence',
            false,
            10485760, -- 10MB limit
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = false,
            file_size_limit = 10485760;
    END IF;
END $$;

-- 6. SEED INITIAL OFFICIAL COMPETITIVE EXAMS (IDEMPOTENT)
-- Provides instant production directory data without relying on localStorage
INSERT INTO public.exams (
    id, title, category, agency, conducted_date, expected_result_date, status, description,
    total_marks, negative_marking, expected_cutoff, total_vacancies, is_hot
)
VALUES 
(
    'nts-wapda-ae-2026',
    'NTS Assistant Engineer (BPS-17) — WAPDA 2026',
    'Engineering & Technical',
    'NTS',
    '2026-09-20',
    '2026-10-15',
    'Results Awaited',
    'Water and Power Development Authority (WAPDA) Power Generation & Hydro Planning Wing',
    100,
    0,
    68.5,
    50,
    true
),
(
    'fpsc-inspector-customs-2026',
    'FPSC Inspector Customs & Intelligence Officer (BPS-16) — 2026',
    'Federal Services',
    'FPSC',
    '2026-08-14',
    '2026-10-30',
    'Results Awaited',
    'Federal Board of Revenue (FBR) Customs & Intelligence Wing',
    100,
    0,
    74.0,
    85,
    true
),
(
    'ppsc-pms-gk-2026',
    'PPSC Provincial Management Service (PMS) — General Knowledge 2026',
    'Provincial Civil Services',
    'PPSC',
    '2026-09-05',
    '2026-11-10',
    'Results Awaited',
    'Punjab Services & General Administration Department (S&GAD)',
    100,
    0.25,
    62.0,
    42,
    true
),
(
    'spsc-cce-preliminary-2026',
    'SPSC Combined Competitive Examination (CCE) Screening 2026',
    'Provincial Civil Services',
    'SPSC',
    '2026-07-28',
    '2026-09-15',
    'Completed',
    'Sindh Public Service Commission Assistant Commissioner / Section Officer',
    100,
    0.25,
    58.0,
    120,
    false
),
(
    'kppsc-tehsildar-2026',
    'KPPSC Tehsildar & Naib Tehsildar (BPS-16) — 2026',
    'Revenue & Administration',
    'KPPSC',
    '2026-10-12',
    '2026-12-01',
    'Upcoming',
    'Khyber Pakhtunkhwa Board of Revenue & Estate Department',
    100,
    0.25,
    65.0,
    30,
    false
),
(
    'bpsc-assistant-director-2026',
    'BPSC Assistant Director (BPS-17) Environment & Climate 2026',
    'Provincial Services',
    'BPSC',
    '2026-08-25',
    '2026-10-20',
    'Results Awaited',
    'Balochistan Environment Protection Agency & Climate Change Department',
    100,
    0,
    54.0,
    14,
    false
)
ON CONFLICT (id) DO NOTHING;
