-- ==============================================================================
-- MUQABLA PLATFORM - COMPLETE ALL-IN-ONE SUPABASE DATABASE SETUP SCRIPT
-- Target Supabase Project: jucuderwsunqktiwpfyj
-- 
-- HOW TO RUN:
-- 1. In your Supabase Dashboard, click "SQL Editor" on the left menu (the >_ icon)
-- 2. Click "+ New query"
-- 3. Copy & paste this ENTIRE script and click "Run" (or Ctrl + Enter)
-- 4. Once it finishes, refresh your "Table Editor" — all tables and candidate data will appear!
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PUBLIC PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'admin', 'moderator')),
    domicile TEXT DEFAULT 'All Pakistan',
    education TEXT,
    degree TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    trust_score NUMERIC DEFAULT 100.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    agency TEXT NOT NULL,
    conducted_date DATE,
    expected_result_date DATE,
    result_announced_date DATE,
    status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Ongoing', 'Conducted', 'Results Awaited', 'Completed', 'Verified')),
    description TEXT,
    total_marks NUMERIC NOT NULL DEFAULT 100,
    negative_marking NUMERIC NOT NULL DEFAULT 0,
    expected_cutoff NUMERIC,
    official_cutoff NUMERIC,
    official_result_announced BOOLEAN NOT NULL DEFAULT FALSE,
    total_vacancies INTEGER DEFAULT 0,
    syllabus_topics JSONB DEFAULT '[]'::jsonb,
    provinces_breakdown JSONB DEFAULT '[]'::jsonb,
    quota_breakdown JSONB DEFAULT '[]'::jsonb,
    is_hot BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. EXAM UPDATES & HISTORICAL RECORDS
CREATE TABLE IF NOT EXISTS public.exam_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL DEFAULT 'General' CHECK (type IN ('Result', 'Answer Key', 'Merit List', 'Date Sheet', 'Cutoff', 'General')),
    official_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exam_historical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    vacancies INTEGER,
    cutoff NUMERIC,
    highest_score NUMERIC,
    average_score NUMERIC,
    total_applicants INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. SCORES TABLE
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    obtained_marks NUMERIC NOT NULL CHECK (obtained_marks >= 0),
    total_marks NUMERIC NOT NULL CHECK (total_marks > 0),
    accuracy_percentage NUMERIC GENERATED ALWAYS AS (ROUND((obtained_marks / total_marks) * 100, 2)) STORED,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Withdrawn')),
    province TEXT NOT NULL DEFAULT 'All Pakistan',
    domicile TEXT DEFAULT 'All Pakistan',
    quota_category TEXT NOT NULL DEFAULT 'Open Merit',
    category TEXT DEFAULT 'General',
    roll_number TEXT,
    cnic_last4 TEXT,
    evidence_url TEXT,
    evidence_name TEXT,
    verification_status TEXT NOT NULL DEFAULT 'Self-Reported' CHECK (verification_status IN ('Self-Reported', 'Pending', 'Verified', 'Approved', 'Rejected')),
    moderation_status TEXT NOT NULL DEFAULT 'Pending' CHECK (moderation_status IN ('Pending', 'Approved', 'Flagged', 'Removed')),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    admin_notes TEXT,
    rank INTEGER,
    percentile NUMERIC,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_candidate_exam_score UNIQUE (exam_id, candidate_id)
);

-- 6. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT DEFAULT 'candidate',
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    score_id UUID REFERENCES public.scores(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewing', 'Resolved', 'Dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. FOLLOWED EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.followed_exams (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, exam_id)
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_id TEXT REFERENCES public.exams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT,
    user_id UUID,
    visitor_id TEXT,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. HELPER FUNCTIONS & USER TRIGGER
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
        CASE 
            WHEN new.email = 'imtiazalimari534@gmail.com' THEN 'admin'
            ELSE 'candidate'
        END,
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. BACKFILL EXISTING REGISTERED USERS INTO PROFILES
-- Automatically registers any users already in auth.users (such as imtiazalimari534@gmail.com)
INSERT INTO public.profiles (id, email, name, role, domicile, education, degree)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
    CASE 
        WHEN email = 'imtiazalimari534@gmail.com' THEN 'admin'
        ELSE 'candidate'
    END,
    COALESCE(raw_user_meta_data->>'domicile', 'All Pakistan'),
    COALESCE(raw_user_meta_data->>'education', 'Bachelor of Science'),
    COALESCE(raw_user_meta_data->>'degree', 'Graduation')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name);

-- 13. PUBLIC SANITIZED VIEWS
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

CREATE OR REPLACE VIEW public.public_scores AS
SELECT 
    id,
    exam_id,
    candidate_name,
    domicile,
    province,
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

-- 14. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_historical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followed_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id OR public.is_admin());

-- Exams Policies (Everyone can view, admins can manage)
DROP POLICY IF EXISTS "Exams are viewable by all users" ON public.exams;
CREATE POLICY "Exams are viewable by all users" 
ON public.exams FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
CREATE POLICY "Admins can insert exams" 
ON public.exams FOR INSERT 
WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;
CREATE POLICY "Admins can update exams" 
ON public.exams FOR UPDATE 
USING (public.is_admin() OR auth.role() = 'authenticated');

-- Exam Updates & Historical Records Policies
DROP POLICY IF EXISTS "Exam updates viewable by all" ON public.exam_updates;
CREATE POLICY "Exam updates viewable by all" ON public.exam_updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Exam records viewable by all" ON public.exam_historical_records;
CREATE POLICY "Exam records viewable by all" ON public.exam_historical_records FOR SELECT USING (true);

-- Scores Policies (Candidates manage own, viewable by owner or admin; public uses sanitized view)
DROP POLICY IF EXISTS "Candidates view own score or admins view all" ON public.scores;
CREATE POLICY "Candidates view own score or admins view all" 
ON public.scores FOR SELECT 
USING (auth.uid() = candidate_id OR public.is_admin());

DROP POLICY IF EXISTS "Candidates can insert their own score" ON public.scores;
CREATE POLICY "Candidates can insert their own score" 
ON public.scores FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Candidates can update their own score" ON public.scores;
CREATE POLICY "Candidates can update their own score" 
ON public.scores FOR UPDATE 
USING (auth.uid() = candidate_id OR public.is_admin());

-- Comments Policies
DROP POLICY IF EXISTS "Comments viewable by all" ON public.comments;
CREATE POLICY "Comments viewable by all" 
ON public.comments FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" 
ON public.comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Reports Policies
DROP POLICY IF EXISTS "Users can view their reports or admin views all" ON public.reports;
CREATE POLICY "Users can view their reports or admin views all" 
ON public.reports FOR SELECT 
USING (auth.uid() = reporter_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports" 
ON public.reports FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Followed Exams Policies
DROP POLICY IF EXISTS "Users can view followed exams" ON public.followed_exams;
CREATE POLICY "Users can view followed exams" 
ON public.followed_exams FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can follow exams" ON public.followed_exams;
CREATE POLICY "Users can follow exams" 
ON public.followed_exams FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow exams" ON public.followed_exams;
CREATE POLICY "Users can unfollow exams" 
ON public.followed_exams FOR DELETE 
USING (auth.uid() = user_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Analytics Policies
DROP POLICY IF EXISTS "Anyone can log analytics" ON public.analytics_events;
CREATE POLICY "Anyone can log analytics" 
ON public.analytics_events FOR INSERT 
WITH CHECK (true);

-- 15. STORAGE BUCKET: score-evidence
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
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Candidates can upload own evidence" ON storage.objects;
        DROP POLICY IF EXISTS "Users can view own evidence or admins view all" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update own evidence" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete own evidence or admins delete" ON storage.objects;

        CREATE POLICY "Candidates can upload own evidence"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'score-evidence'
            AND split_part(name, '/', 1) = 'evidence'
            AND split_part(name, '/', 2) = auth.uid()::text
        );

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

        CREATE POLICY "Users can update own evidence"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'score-evidence'
            AND split_part(name, '/', 1) = 'evidence'
            AND split_part(name, '/', 2) = auth.uid()::text
        );

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

-- 16. SEED INITIAL COMPETITIVE EXAM CATALOG
INSERT INTO public.exams (id, title, category, agency, conducted_date, expected_result_date, status, description, total_marks, negative_marking, total_vacancies)
VALUES 
(
    'nts-wapda-ae-2026',
    'NTS Assistant Engineer (BPS-17) — WAPDA 2026',
    'Engineering & Technical Posts',
    'NTS',
    '2026-09-20',
    '2026-10-01',
    'Verified',
    'Water and Power Development Authority (WAPDA) Power Generation Wing Assistant Engineer Recruitment.',
    100,
    0,
    50
),
(
    'fpsc-inspector-customs-2026',
    'FPSC Inspector Customs & Intelligence Officer (BS-16) — FBR 2026',
    'Federal Revenue & Intelligence',
    'FPSC',
    '2026-08-15',
    '2026-09-10',
    'Verified',
    'Federal Board of Revenue (FBR) Inspector Customs Intelligence Officers recruitment screening test.',
    100,
    0,
    78
),
(
    'ppsc-tehsildar-revenue-2026',
    'PPSC Tehsildar & Consolidation Officer (BS-16) — Punjab Revenue 2026',
    'Provincial Executive & Revenue',
    'PPSC',
    '2026-07-28',
    '2026-08-25',
    'Verified',
    'Punjab Revenue Department Tehsildar and Consolidation Officers recruitment screening.',
    100,
    0.25,
    32
),
(
    'spsc-municipal-officer-2026',
    'SPSC Municipal Officer (BPS-17) — Sindh Local Govt 2026',
    'Local Government & Administration',
    'SPSC',
    '2026-09-05',
    '2026-09-30',
    'Verified',
    'Sindh Public Service Commission Municipal Officers Grade-17 screening test.',
    100,
    0,
    115
),
(
    'sts-iba-jest-2026',
    'STS Junior Elementary School Teacher (JEST BPS-14) — School Education 2026',
    'Education & Teaching Cadre',
    'STS',
    '2026-08-22',
    '2026-09-15',
    'Verified',
    'Sukkur IBA Testing Services Junior Elementary School Teachers recruitment screening.',
    100,
    0,
    320
),
(
    'fpsc-css-mpt-2026',
    'FPSC CSS Competitive Examination 2026 (Screening MPT)',
    'Federal Civil Superior Services',
    'FPSC',
    '2026-11-17',
    '2026-12-05',
    'Upcoming',
    'Preliminary Multiple Choice Questions Based Preliminary Test (MPT) for CSS Examination 2026.',
    200,
    0,
    250
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    agency = EXCLUDED.agency,
    total_marks = EXCLUDED.total_marks,
    total_vacancies = EXCLUDED.total_vacancies;

-- 17. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
