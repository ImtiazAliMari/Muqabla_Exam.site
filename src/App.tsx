import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { HowItWorks } from './components/home/HowItWorks';
import { HistoricalAccuracySection } from './components/home/HistoricalAccuracySection';
import { ExamCard } from './components/exam/ExamCard';
import { ExamDetailView } from './components/exam/ExamDetailView';
import { ScoreSubmissionModal } from './components/exam/ScoreSubmissionModal';
import { ReportModal } from './components/exam/ReportModal';
import { CandidateDashboard } from './components/dashboards/CandidateDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { useAuth } from './context/AuthContext';
import { examService, scoreService } from './services/supabaseService';
import { ExamFolder, ScoreSubmission } from './types';
import { initialExams, initialSubmissions } from './data/initialData';
import { Search, Award, Loader2, RefreshCw, Database, Sparkles } from 'lucide-react';

export default function App() {
  const { user: currentUser } = useAuth();

  const [allExams, setAllExams] = useState<ExamFolder[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<ScoreSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Navigation state: clean candidate portal
  const [activeTab, setActiveTab] = useState<'browse' | 'candidate-dash'>('browse');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [isSubmitScoreOpen, setIsSubmitScoreOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [scoreSubmissionVersion, setScoreSubmissionVersion] = useState(0);

  // Detect email confirmation from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    const isConfirmedLink = 
      searchParams.get('confirmed') === 'true' || 
      hash.includes('type=signup') || 
      hash.includes('type=email_change') || 
      (hash.includes('access_token=') && !currentUser);

    if (isConfirmedLink) {
      setConfirmationNotice('Your email address has been verified successfully! Please log in to access your candidate dashboard.');
      setIsLoginOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('All');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'most-active' | 'newest' | 'highest-seats'>('most-active');

  const examsSectionRef = useRef<HTMLDivElement>(null);

  const [isUsingFallbackCatalog, setIsUsingFallbackCatalog] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<ScoreSubmission[]>([]);

  // Load authoritative data from Supabase
  const loadDatabaseData = async () => {
    setIsLoadingData(true);
    setDataError(null);

    try {
      const promises: Promise<any>[] = [
        examService.getExams(),
        scoreService.getAllSubmissions(),
      ];

      if (currentUser?.id) {
        promises.push(scoreService.getUserSubmissions(currentUser.id));
      }

      const [examsRes, subsRes, userSubsRes] = await Promise.all(promises);

      // Merge remote exams with initialExams so all categories remain available
      const mergedExams = [...(examsRes.data || [])];
      for (const init of initialExams) {
        if (!mergedExams.some((e) => e.id === init.id)) {
          mergedExams.push(init);
        }
      }

      setAllExams(mergedExams);
      setAllSubmissions(subsRes.data || []);
      setIsUsingFallbackCatalog(false);
      setDataError(null);

      if (userSubsRes?.data) {
        setUserSubmissions(userSubsRes.data);
      } else if (currentUser?.id) {
        const localSubs = await scoreService.getUserSubmissions(currentUser.id);
        setUserSubmissions(localSubs.data || []);
      }
    } catch (err: any) {
      setAllExams(initialExams);
      setAllSubmissions(initialSubmissions);
      setIsUsingFallbackCatalog(true);
      setDataError(err?.message || 'Unable to connect to Supabase database.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, [currentUser?.id, scoreSubmissionVersion]);

  const scrollToExams = () => {
    setActiveTab('browse');
    setSelectedExamId(null);
    setTimeout(() => {
      examsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Selected Exam Object
  const currentExam = useMemo(() => {
    if (!selectedExamId) return null;
    return allExams.find((e) => e.id === selectedExamId) || null;
  }, [selectedExamId, allExams]);

  // Filtered and sorted exams
  const filteredExams = useMemo(() => {
    return allExams
      .filter((exam) => {
        // Query match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = exam.name.toLowerCase().includes(q);
          const matchOrg = exam.organization.toLowerCase().includes(q);
          const matchPost = exam.jobPost.toLowerCase().includes(q);
          const matchAgency = exam.testingAgency.toLowerCase().includes(q);
          const matchDept = (exam.department || '').toLowerCase().includes(q);
          if (!matchName && !matchOrg && !matchPost && !matchAgency && !matchDept) return false;
        }

        // Agency match
        if (selectedAgency !== 'All') {
          if (exam.testingAgency.toLowerCase() !== selectedAgency.toLowerCase()) return false;
        }

        // Province match
        if (selectedProvince !== 'All') {
          if (!exam.province.toLowerCase().includes(selectedProvince.toLowerCase())) return false;
        }

        // Status match
        if (selectedStatus !== 'All') {
          if (selectedStatus === 'Verified' && !exam.isVerified) return false;
          if (selectedStatus === 'Community' && exam.isVerified) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'most-active') {
          const aCount = allSubmissions.filter((s) => s.examId === a.id).length;
          const bCount = allSubmissions.filter((s) => s.examId === b.id).length;
          return bCount - aCount;
        }
        if (sortBy === 'highest-seats') {
          return (b.totalVacancies || 0) - (a.totalVacancies || 0);
        }
        // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [allExams, allSubmissions, searchQuery, selectedAgency, selectedProvince, selectedStatus, sortBy]);

  const handleSelectExam = (examId: string) => {
    setSelectedExamId(examId);
    setActiveTab('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans relative selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Spatial Background Mesh and Depth Planes */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0"
      />
      <div
        aria-hidden="true"
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-[140px] pointer-events-none z-0"
      />

      {/* Floating Spatial Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedExamId(null);
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        onSelectExam={handleSelectExam}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        {selectedExamId && currentExam ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <ExamDetailView
              exam={currentExam}
              currentUser={currentUser}
              allExams={allExams}
              scoreSubmissionVersion={scoreSubmissionVersion}
              onBack={() => setSelectedExamId(null)}
              onSubmitScore={() => setIsSubmitScoreOpen(true)}
              onReport={() => setIsReportOpen(true)}
              onOpenLogin={() => setIsLoginOpen(true)}
              onSelectOtherExam={(examId) => setSelectedExamId(examId)}
            />
          </div>
        ) : activeTab === 'candidate-dash' ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <CandidateDashboard
              currentUser={currentUser}
              scoreSubmissionVersion={scoreSubmissionVersion}
              onSelectExam={handleSelectExam}
              onOpenLogin={() => setIsLoginOpen(true)}
              onUpdateScore={(examId) => {
                setSelectedExamId(examId);
                setIsSubmitScoreOpen(true);
              }}
            />
          </div>
        ) : (
          <>
            {/* Landing Hero */}
            <Hero
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedAgency={selectedAgency}
              setSelectedAgency={setSelectedAgency}
              onScrollToExams={scrollToExams}
              totalExamsCount={allExams.length}
              totalSubmissionsCount={allSubmissions.length}
              allExams={allExams}
              allSubmissions={allSubmissions}
              userSubmissions={userSubmissions}
              currentUser={currentUser}
              onSelectExam={handleSelectExam}
              onOpenSubmitScore={(examId) => {
                if (examId) setSelectedExamId(examId);
                setIsSubmitScoreOpen(true);
              }}
            />

            {/* How It Works */}
            <HowItWorks />

            {/* Competitive Exams Directory Section */}
            <section ref={examsSectionRef} className="py-16 sm:py-20 border-b border-white/10 relative">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Live Examination Intelligence Directory</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                      Browse Active Exam Intelligence Folders
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-400 max-w-2xl leading-relaxed">
                      Select an exam folder to inspect vacancies, test syllabi, official gazette dates, and candidate score benchmarks.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={loadDatabaseData}
                      disabled={isLoadingData}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition-all cursor-pointer backdrop-blur-md shadow-sm"
                      title="Sync from Supabase"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-medium">Sync Data</span>
                    </button>
                  </div>
                </div>

                {/* Spatial Search & Filter Console */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/5 space-y-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by exam title, agency (FPSC, NTS, PPSC), department, or post..."
                        className="w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 py-3 text-xs text-white placeholder-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <select
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Agencies</option>
                        <option value="FPSC">FPSC</option>
                        <option value="NTS">NTS</option>
                        <option value="PPSC">PPSC</option>
                        <option value="SPSC">SPSC</option>
                        <option value="KPPSC">KPPSC</option>
                        <option value="BPSC">BPSC</option>
                      </select>

                      <select
                        value={selectedProvince}
                        onChange={(e) => setSelectedProvince(e.target.value)}
                        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Regions</option>
                        <option value="Federal">Federal</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Sindh">Sindh</option>
                        <option value="KPK">KPK</option>
                        <option value="Balochistan">Balochistan</option>
                      </select>

                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Verified">Verified Folders</option>
                        <option value="Community">Community Folders</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none cursor-pointer"
                      >
                        <option value="most-active">Most Active</option>
                        <option value="newest">Newest First</option>
                        <option value="highest-seats">Most Vacancies</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notice if remote database has unmigrated schema */}
                {isUsingFallbackCatalog && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs backdrop-blur-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-300">Examination Intelligence Directory Active</span>
                        <p className="text-slate-400 mt-0.5">
                          Displaying live Pakistani competitive exam folders (FPSC, NTS, PPSC, SPSC, STS).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={loadDatabaseData}
                      disabled={isLoadingData}
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingData ? 'animate-spin' : ''}`} />
                      <span>Sync Supabase</span>
                    </button>
                  </div>
                )}

                {/* State Views: Loading / Empty / Grid */}
                {isLoadingData ? (
                  <div className="py-24 text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
                    <p className="text-xs text-slate-400">Loading official exam folders...</p>
                  </div>
                ) : filteredExams.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center space-y-4 backdrop-blur-xl">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-slate-400 mx-auto">
                      <Search className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      No matching exam folders found
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Could not find an exam matching &ldquo;{searchQuery}&rdquo;.
                    </p>
                    {(searchQuery || selectedAgency !== 'All' || selectedProvince !== 'All' || selectedStatus !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedAgency('All');
                          setSelectedProvince('All');
                          setSelectedStatus('All');
                        }}
                        className="px-4 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer border border-emerald-500/30"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExams.map((exam) => {
                      const subs = allSubmissions.filter((s) => s.examId === exam.id);
                      const userSub =
                        userSubmissions.find((s) => s.examId === exam.id) ||
                        (currentUser ? subs.find((s) => s.userId === currentUser.id) : undefined);
                      return (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          submissionsCount={subs.length}
                          userSubmission={userSub}
                          onSelect={() => handleSelectExam(exam.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Historical Intelligence Section */}
            <HistoricalAccuracySection onSelectExam={handleSelectExam} exams={allExams} />
          </>
        )}
      </main>

      {/* Global Footer */}
      <Footer onExploreExams={scrollToExams} />

      {/* Candidate Action Modals */}
      {currentExam && currentUser && (
        <ScoreSubmissionModal
          exam={currentExam}
          currentUser={currentUser}
          isOpen={isSubmitScoreOpen}
          onClose={() => setIsSubmitScoreOpen(false)}
          onSubmitted={() => {
            setScoreSubmissionVersion((v) => v + 1);
            loadDatabaseData();
          }}
        />
      )}

      {currentExam && currentUser && (
        <ReportModal
          exam={currentExam}
          currentUser={currentUser}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      <LoginModal
        isOpen={isLoginOpen}
        confirmationNotice={confirmationNotice}
        onClose={() => {
          setIsLoginOpen(false);
          setConfirmationNotice(null);
        }}
        onSuccess={() => {
          loadDatabaseData();
          setIsLoginOpen(false);
          setConfirmationNotice(null);
        }}
      />
    </div>
  );
}
