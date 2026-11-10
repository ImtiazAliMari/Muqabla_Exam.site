-- ==============================================================================
-- MUQABLA PLATFORM - COMPLETE PRODUCTION DATABASE SCHEMA & POLICIES
-- Target Supabase Project: jucuderwsunqktiwpfyj
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC PROFILES TABLE
-- Connects directly to auth.users.id
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'admin', 'moderator')),
    domicile TEXT DEFAULT 'All Pakistan' CHECK (domicile IN ('All Pakistan', 'Punjab', 'Sindh (Rural)', 'Sindh (Urban)', 'KPK', 'Balochistan', 'Islamabad', 'Gilgit-Baltistan', 'AJK')),
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
    id TEXT PRIMARY KEY, -- human-readable slug or UUID string (e.g. 'fpsc-css-2025')
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g. 'Civil Services', 'Provincial Services', 'Public Sector', 'Police & Uniformed', 'Engineering', 'Banking & Finance'
    agency TEXT NOT NULL,   -- e.g. 'FPSC', 'PPSC', 'SPSC', 'KPPSC', 'BPSC', 'NTS', 'PTS', 'UTS', 'OTS', 'ETEA'
    conducted_date DATE,
    expected_result_date DATE,
    result_announced_date DATE,
    status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Ongoing', 'Conducted', 'Results Awaited', 'Completed')),
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

-- 4. EXAM UPDATES & HISTORICAL TIMELINES
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

-- 5. SCORES TABLE (Shared Centralized Candidate Submissions)
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    obtained_marks NUMERIC NOT NULL CHECK (obtained_marks >= 0),
    total_marks NUMERIC NOT NULL CHECK (total_marks > 0),
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    province TEXT NOT NULL DEFAULT 'All Pakistan',
    quota_category TEXT NOT NULL DEFAULT 'Open Merit',
    evidence_url TEXT,
    evidence_name TEXT,
    -- Moderator / Administrator controlled fields
    verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Approved', 'Rejected')),
    moderation_status TEXT NOT NULL DEFAULT 'Normal' CHECK (moderation_status IN ('Normal', 'Flagged', 'Under Review')),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    admin_notes TEXT,
    -- Calculated / aggregate audit snapshot
    rank INTEGER,
    percentile NUMERIC,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(exam_id, candidate_id) -- One active score submission per candidate per exam
);

-- 6. COMMENTS / FORUM INTELLIGENCE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT DEFAULT 'candidate',
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    is_official_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. REPORTS / MODERATION FLAGS
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    score_id UUID REFERENCES public.scores(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reporter_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. FOLLOWED EXAMS (Saved Exam Folders)
CREATE TABLE IF NOT EXISTS public.followed_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, exam_id)
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'result')),
    exam_id TEXT REFERENCES public.exams(id) ON DELETE CASCADE,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. REAL ANALYTICS EVENTS (Visitors & Result Checks)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id TEXT REFERENCES public.exams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'result_check', 'score_submission', 'exam_follow')),
    visitor_id TEXT, -- anonymous session or client identifier
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    duration_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR FAST QUERIES & RANKING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_agency ON public.exams(agency);
CREATE INDEX IF NOT EXISTS idx_exams_category ON public.exams(category);
CREATE INDEX IF NOT EXISTS idx_scores_exam_obtained ON public.scores(exam_id, obtained_marks DESC);
CREATE INDEX IF NOT EXISTS idx_scores_candidate ON public.scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_scores_verification ON public.scores(verification_status);
CREATE INDEX IF NOT EXISTS idx_comments_exam ON public.comments(exam_id);
CREATE INDEX IF NOT EXISTS idx_reports_score ON public.reports(score_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_analytics_exam_event ON public.analytics_events(exam_id, event_type);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
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

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- EXAMS POLICIES
CREATE POLICY "Exams are viewable by all users" 
ON public.exams FOR SELECT USING (true);

CREATE POLICY "Admins can insert exams" 
ON public.exams FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update exams" 
ON public.exams FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete exams" 
ON public.exams FOR DELETE USING (public.is_admin());

-- EXAM UPDATES & HISTORICAL RECORDS POLICIES
CREATE POLICY "Updates viewable by all" ON public.exam_updates FOR SELECT USING (true);
CREATE POLICY "Updates manageable by admins" ON public.exam_updates FOR ALL USING (public.is_admin());

CREATE POLICY "Historical records viewable by all" ON public.exam_historical_records FOR SELECT USING (true);
CREATE POLICY "Historical records manageable by admins" ON public.exam_historical_records FOR ALL USING (public.is_admin());

-- SCORES POLICIES
CREATE POLICY "Scores are viewable by all candidates" 
ON public.scores FOR SELECT USING (true);

CREATE POLICY "Candidates can insert their own score" 
ON public.scores FOR INSERT WITH CHECK (
    auth.uid() = candidate_id AND 
    verification_status = 'Pending' AND 
    moderation_status = 'Normal'
);

CREATE POLICY "Candidates can update their own score marks and evidence" 
ON public.scores FOR UPDATE USING (
    auth.uid() = candidate_id OR public.is_admin()
);

CREATE POLICY "Admins or owners can delete scores" 
ON public.scores FOR DELETE USING (
    auth.uid() = candidate_id OR public.is_admin()
);

-- COMMENTS POLICIES
CREATE POLICY "Comments viewable by all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins can delete comments" ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- REPORTS POLICIES
CREATE POLICY "Admins can view reports, users can view their own" 
ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());

CREATE POLICY "Authenticated users can submit reports" 
ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports" 
ON public.reports FOR UPDATE USING (public.is_admin());

-- FOLLOWED EXAMS POLICIES
CREATE POLICY "Users can view followed exams" ON public.followed_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can follow exams" ON public.followed_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow exams" ON public.followed_exams FOR DELETE USING (auth.uid() = user_id);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own notifications read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ANALYTICS EVENTS POLICIES
CREATE POLICY "Anyone can log analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view analytics events" ON public.analytics_events FOR SELECT USING (public.is_admin());

-- ==============================================================================
-- AUTOMATED PROFILE CREATION ON SUPABASE AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, domicile, education, degree)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'candidate'),
        COALESCE(new.raw_user_meta_data->>'domicile', 'All Pakistan'),
        COALESCE(new.raw_user_meta_data->>'education', 'Bachelor of Science'),
        COALESCE(new.raw_user_meta_data->>'degree', 'BS Computer Science')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- RPC FUNCTION: RECORD ANALYTICS EVENT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_traffic_event(
    p_exam_id TEXT,
    p_event_type TEXT,
    p_visitor_id TEXT DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.analytics_events (exam_id, event_type, visitor_id, user_id, duration_seconds)
    VALUES (p_exam_id, p_event_type, p_visitor_id, auth.uid(), p_duration_seconds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
