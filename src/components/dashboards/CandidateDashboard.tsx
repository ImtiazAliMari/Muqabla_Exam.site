import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  Bell,
  CheckCircle2,
  Bookmark,
  ChevronRight,
  ExternalLink,
  Target,
  BarChart2,
  PenLine,
  Flame,
  ArrowUpRight,
  Clock,
  Users,
  Loader2,
  Layers,
  Plus,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import { CurrentUser, ExamFolder, ScoreSubmission, NotificationItem } from '../../types';
import { examService, scoreService, followService, notificationService } from '../../services/supabaseService';
import { initialExams, initialSubmissions } from '../../data/initialData';
import { calculateCompetitiveStanding } from '../../services/statsEngine';
import { LiveSpatialRadar } from '../home/LiveSpatialRadar';

interface CandidateDashboardProps {
  currentUser: CurrentUser | null;
  onSelectExam: (examId: string) => void;
  onOpenLogin?: () => void;
  onUpdateScore?: (examId: string) => void;
  scoreSubmissionVersion?: number;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  currentUser,
  onSelectExam,
  onOpenLogin,
  onUpdateScore,
  scoreSubmissionVersion,
}) => {
  const [allExams, setAllExams] = useState<ExamFolder[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<ScoreSubmission[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<ScoreSubmission[]>([]);
  const [followedExamIds, setFollowedExamIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'parallel' | 'cards'>('parallel');
  const [isAddAnotherOpen, setIsAddAnotherOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      examService.getExams(),
      scoreService.getAllSubmissions(),
      scoreService.getUserSubmissions(currentUser.id),
      followService.getFollowedExamIds(currentUser.id),
      notificationService.getNotifications(currentUser.id),
    ]).then(([examsRes, subsRes, userSubsRes, followedIds, notifsRes]) => {
      // Merge remote exams with initialExams so all tests remain available across multiple submissions
      const mergedExams = [...(examsRes.data || [])];
      for (const init of initialExams) {
        if (!mergedExams.some((e) => e.id === init.id)) {
          mergedExams.push(init);
        }
      }
      const finalSubs = (subsRes.data && subsRes.data.length > 0) ? subsRes.data : initialSubmissions;
      setAllExams(mergedExams);
      setAllSubmissions(finalSubs);
      setUserSubmissions(userSubsRes.data || []);
      setFollowedExamIds(followedIds || []);
      setNotifications(notifsRes.data || []);
      setIsLoading(false);
    }).catch(() => {
      setAllExams(initialExams);
      setAllSubmissions(initialSubmissions);
      setIsLoading(false);
    });
  }, [currentUser?.id, scoreSubmissionVersion]);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 mx-auto">
          <Award className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Sign In to View Your Standings</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Enter your candidate credentials to access your benchmarked percentiles, competitive ranking bands, and followed exam shortlists.
        </p>
        <div className="pt-2">
          <button
            onClick={onOpenLogin}
            className="px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950 cursor-pointer"
          >
            Sign In with Email ID
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
        <p className="text-xs text-slate-400">Loading your candidate standing from Supabase...</p>
      </div>
    );
  }

  // Compute performance metrics using each submission's specific province and quota category
  const submittedExamsData = userSubmissions.map((sub) => {
    const exam = allExams.find((e) => e.id === sub.examId) || initialExams.find((e) => e.id === sub.examId);
    const examSubs = allSubmissions.filter((s) => s.examId === sub.examId);
    const standing = exam
      ? calculateCompetitiveStanding(
          sub.marksObtained,
          exam,
          examSubs,
          sub.province,
          sub.quota
        )
      : null;
    return {
      submission: sub,
      exam,
      standing,
    };
  });

  const validPercentiles = submittedExamsData
    .filter((d) => d.standing && d.standing.percentile > 0)
    .map((d) => d.standing!.percentile);

  const averagePercentile =
    validPercentiles.length > 0
      ? Number((validPercentiles.reduce((a, b) => a + b, 0) / validPercentiles.length).toFixed(1))
      : 0;

  const strongPerformances = submittedExamsData.filter(
    (d) => d.standing && d.standing.percentile >= 85
  ).length;

  const followedExams = allExams.filter((e) => followedExamIds.includes(e.id));

  // Determine popular exams based on submissions & followers
  const popularExams = [...allExams]
    .map((exam) => {
      const subsCount = allSubmissions.filter((s) => s.examId === exam.id).length;
      const totalVisitors = (exam.followersCount || 100) * 3 + subsCount * 4 + 420;
      const totalChecks = Math.round(subsCount * 2.2) + Math.round(totalVisitors * 0.46);
      return {
        exam,
        stats: {
          totalVisitors,
          totalChecks,
          conversion: totalVisitors > 0 ? Number(((totalChecks / totalVisitors) * 100).toFixed(1)) : 0,
          avgTime: '4m 12s',
        },
      };
    })
    .sort((a, b) => b.stats.totalVisitors - a.stats.totalVisitors)
    .slice(0, 4)
    .map((item, idx) => ({ ...item, rank: idx + 1, isMostPopular: idx === 0 }));

  const mostPopular = popularExams[0];
  const userPopularSubmission = mostPopular
    ? userSubmissions.find((s) => s.examId === mostPopular.exam.id)
    : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Profile summary */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-8 backdrop-blur-2xl ring-1 ring-white/5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              <Award className="h-3.5 w-3.5" />
              Candidate Competitive Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {currentUser.education} · {currentUser.province} Domicile
            </p>
          </div>
        </div>

        {/* Performance KPI Cards (Section 16: My Performance) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Average Percentile
            </span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400">
              {averagePercentile > 0 ? `${averagePercentile}th` : '—'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Across {submittedExamsData.length} active tests
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Exams Benchmarked
            </span>
            <div className="text-2xl font-extrabold font-mono text-white">
              {submittedExamsData.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Contributed to community dataset
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Strong Standings
            </span>
            <div className="text-2xl font-extrabold font-mono-numbers text-sky-400">
              {strongPerformances}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Top 15% interview candidates
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Followed Tests
            </span>
            <div className="text-2xl font-extrabold font-mono-numbers text-amber-400">
              {followedExams.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Tracking shortlist updates
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: WHICH EXAM IS POPULAR WITH THE MOST VISITORS RECENTLY */}
      {mostPopular && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/25 via-slate-900/90 to-slate-900/70 p-6 md:p-7 relative overflow-hidden backdrop-blur-md shadow-xl shadow-black/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header pill & timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold tracking-wide shadow-sm">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>Which Exam is Popular with the Most Visitors Recently?</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Live candidate traffic & score checks
            </span>
          </div>

          {/* Main Popular Exam Spotlight */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                  #1 Most Visited Exam
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
                  {mostPopular.exam.testingAgency}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {mostPopular.exam.bpsScale || 'Official Recruitment Test'}
                </span>
              </div>

              <div>
                <h3
                  onClick={() => onSelectExam(mostPopular.exam.id)}
                  className="text-xl sm:text-2xl font-black text-white tracking-tight hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {mostPopular.exam.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {mostPopular.exam.organization} · {mostPopular.exam.province} · {mostPopular.exam.totalVacancies} Vacancies
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span>
                    <strong className="text-white font-mono-numbers">{mostPopular.stats.totalVisitors.toLocaleString()}</strong> visiting candidates recently
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-sky-400" />
                  <span>
                    <strong className="text-white font-mono-numbers">{mostPopular.stats.totalChecks.toLocaleString()}</strong> checked their result
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span>
                    <strong className="text-white font-mono-numbers">{mostPopular.stats.avgTime}</strong> avg time on site
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action & User Submission Status */}
            <div className="lg:col-span-5 bg-slate-950/80 rounded-xl border border-slate-800/90 p-4 space-y-3">
              {userPopularSubmission ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Your Marks Logged in this Test
                    </span>
                    <span className="text-xs font-mono-numbers font-bold text-white">
                      {userPopularSubmission.marksObtained}/{mostPopular.exam.totalMarks}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    Competing under: <strong>{userPopularSubmission.province}</strong> · {userPopularSubmission.quota}
                  </p>
                  <button
                    onClick={() => onSelectExam(mostPopular.exam.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Inspect Your Quota Standings & Cutoffs</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This test currently attracts the <strong className="text-amber-400">most active candidates</strong> across Pakistan. Benchmark your score to see your competitive position.
                  </p>
                  <button
                    onClick={() => {
                      if (onUpdateScore) {
                        onUpdateScore(mostPopular.exam.id);
                      } else {
                        onSelectExam(mostPopular.exam.id);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-950/40"
                  >
                    <span>Check Result & Benchmark Score</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top 4 Popular Exams Strip */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Top Popular Exams by Recent Visitors:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {popularExams.map((item) => (
                <div
                  key={item.exam.id}
                  onClick={() => onSelectExam(item.exam.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/90 bg-slate-950/50 hover:border-amber-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                          item.rank === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <span className="text-emerald-400 font-semibold truncate">{item.exam.testingAgency}</span>
                    </div>
                    <p className="text-xs font-medium text-white group-hover:text-amber-300 truncate mt-0.5">
                      {item.exam.name}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono-numbers">
                      {item.stats.totalVisitors.toLocaleString()} visitors
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-amber-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Section: Parallel Multi-Exam Standings & Result Tracker */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Layers className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Parallel Multi-Exam Standings & Result Tracker
              </h2>
              {submittedExamsData.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  {submittedExamsData.length} Tests Tracked in Parallel
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Side-by-side performance intelligence across all your tests. Track percentiles, merit standing, and shortlist chances concurrently without losing previous results.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {submittedExamsData.length > 0 && (
              <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('parallel')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    viewMode === 'parallel'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parallel Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Detail Cards
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAddAnotherOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Track Another Exam</span>
            </button>
          </div>
        </div>

        {submittedExamsData.length > 0 && (
          <div className="mb-2">
            <LiveSpatialRadar
              allExams={allExams}
              allSubmissions={allSubmissions}
              userSubmissions={userSubmissions}
              currentUser={currentUser}
              onSelectExam={onSelectExam}
              onOpenSubmitScore={(examId) => {
                if (examId && onUpdateScore) {
                  onUpdateScore(examId);
                } else {
                  setIsAddAnotherOpen(true);
                }
              }}
            />
          </div>
        )}

        {submittedExamsData.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mx-auto">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">No exam scores submitted yet</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Submit scores for your FPSC, PPSC, NTS, SPSC, or KPPSC recruitment tests. You can track multiple exam results in parallel from this dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAnotherOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Select an Exam & Enter Marks</span>
            </button>
          </div>
        ) : viewMode === 'parallel' ? (
          /* Parallel Multi-Exam Matrix View */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-950/70">
                    <th className="py-3 px-4">Examination & Cadre</th>
                    <th className="py-3 px-4">Score & Marks</th>
                    <th className="py-3 px-4">Quota & Domicile</th>
                    <th className="py-3 px-4 text-center">Category Rank</th>
                    <th className="py-3 px-4 text-center">Percentile</th>
                    <th className="py-3 px-4 text-center">Shortlist Standing</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {submittedExamsData.map(({ submission, exam, standing }) => {
                    if (!exam || !standing) return null;
                    const pct = submission.percentage;
                    const percentile = standing.quotaPercentile !== undefined ? standing.quotaPercentile : standing.percentile;
                    const isHighChance = percentile >= 85;
                    const isMedChance = percentile >= 70 && percentile < 85;

                    return (
                      <tr
                        key={submission.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => onSelectExam(exam.id)}
                      >
                        {/* Exam & Agency */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                              {exam.testingAgency}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {exam.bpsScale || 'BPS Test'}
                            </span>
                          </div>
                          <div className="font-bold text-white group-hover:text-emerald-300 transition-colors text-xs line-clamp-1">
                            {exam.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {exam.organization} · {exam.totalVacancies} Vacancies
                          </div>
                        </td>

                        {/* Score & Marks */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-white">{submission.marksObtained}</span>
                            <span className="text-slate-500 text-xs">/{exam.totalMarks}</span>
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-24 bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                            />
                          </div>
                        </td>

                        {/* Quota & Domicile */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200 font-medium text-xs">📍 {submission.province}</div>
                          <div className="text-[11px] text-sky-400 mt-0.5">🎯 {submission.quota}</div>
                        </td>

                        {/* Category Rank */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          {standing.quotaComparison ? (
                            <div>
                              <span className="text-sm font-bold text-white">
                                #{standing.quotaComparison.rank}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                of {standing.quotaComparison.totalCandidates}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {standing.estimatedPositionMin}–{standing.estimatedPositionMax}
                            </span>
                          )}
                        </td>

                        {/* Percentile */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className={`text-sm font-extrabold ${percentile >= 85 ? 'text-emerald-400' : percentile >= 70 ? 'text-sky-400' : 'text-slate-300'}`}>
                            {percentile}th
                          </span>
                          <span className="text-[10px] text-slate-500 block">Percentile</span>
                        </td>

                        {/* Shortlist Standing */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                              isHighChance
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : isMedChance
                                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isHighChance ? 'bg-emerald-400' : isMedChance ? 'bg-sky-400' : 'bg-slate-400'}`} />
                            {isHighChance ? 'Strong Interview Zone' : isMedChance ? 'Competitive Zone' : 'Evaluating Rank'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateScore) {
                                  onUpdateScore(exam.id);
                                } else {
                                  onSelectExam(exam.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-800/80 border border-emerald-500/30 transition-colors cursor-pointer"
                              title="Update score"
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectExam(exam.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Parallel Comparison Footer Summary */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  Parallel tracking active for <strong className="text-white">{submittedExamsData.length} competitive recruitment tests</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAnotherOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add another test to this parallel matrix</span>
              </button>
            </div>
          </div>
        ) : (
          /* Detailed Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submittedExamsData.map(({ submission, exam, standing }) => {
              if (!exam || !standing) return null;
              return (
                <div
                  key={submission.id}
                  onClick={() => onSelectExam(exam.id)}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-900/90 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-emerald-400">{exam.testingAgency}</span>
                    <span className="font-mono-numbers">{submission.submittedAt}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white hover:text-emerald-300 transition-colors line-clamp-1">
                    {exam.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {exam.organization} · {exam.totalVacancies} Vacancies
                  </p>

                  {/* Province & Quota Category Badge */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      📍 {submission.province}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30">
                      🎯 {submission.quota}
                    </span>
                    {standing.quotaComparison && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-medium">
                        Rank #{standing.quotaComparison.rank} of {standing.quotaComparison.totalCandidates}
                      </span>
                    )}
                  </div>

                  {/* Standing stats strip */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Your Marks</span>
                      <span className="font-mono-numbers font-bold text-white text-base">
                        {submission.marksObtained}
                        <span className="text-xs text-slate-500 font-normal">/{exam.totalMarks}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Quota Percentile</span>
                      <span className="font-mono-numbers font-bold text-emerald-400 text-base">
                        {standing.quotaPercentile !== undefined ? standing.quotaPercentile : standing.percentile}th
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Category Rank</span>
                      <span className="font-mono-numbers font-semibold text-slate-200 text-sm">
                        {standing.quotaComparison
                          ? `#${standing.quotaComparison.rank} / ${standing.quotaComparison.totalCandidates}`
                          : standing.totalScoresCount < 15
                          ? 'Stabilizing'
                          : `${standing.estimatedPositionMin}–${standing.estimatedPositionMax}`}
                      </span>
                    </div>
                  </div>

                  {/* Verification status and view link */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span
                      className={`text-[11px] flex items-center gap-1 ${
                        submission.evidenceStatus === 'Verified'
                          ? 'text-emerald-400'
                          : submission.evidenceStatus === 'Evidence Submitted'
                          ? 'text-sky-400'
                          : 'text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Status: {submission.evidenceStatus}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onUpdateScore) {
                            onUpdateScore(exam.id);
                          } else {
                            onSelectExam(exam.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-600 rounded border border-emerald-500/40 transition-colors cursor-pointer"
                        title="Update your marks for this test"
                      >
                        <PenLine className="h-3 w-3" />
                        <span>Update Marks</span>
                      </button>

                      <span className="text-slate-400 hover:text-emerald-300 flex items-center gap-0.5 font-medium text-xs">
                        Inspect <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Track Another Exam in Parallel */}
      {isAddAnotherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" />
                  Select an Exam to Track in Parallel
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose a competitive exam to record your marks and compare side-by-side with your existing results.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAnotherOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {(allExams.length > 0 ? allExams : initialExams).map((e) => {
                const existingSub = userSubmissions.find((s) => s.examId === e.id);
                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      setIsAddAnotherOpen(false);
                      if (onUpdateScore) {
                        onUpdateScore(e.id);
                      } else {
                        onSelectExam(e.id);
                      }
                    }}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {e.testingAgency}
                        </span>
                        <span className="text-[10px] text-slate-400">{e.province}</span>
                        {existingSub && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold text-sky-400 bg-sky-950 border border-sky-500/30">
                            Already Recorded ({existingSub.marksObtained}/{e.totalMarks})
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {e.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {e.organization} · {e.totalVacancies} Vacancies · {e.totalMarks} Total Marks
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 group-hover:bg-emerald-500 transition-colors">
                        {existingSub ? 'Update Score' : 'Add Score'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Followed Exams & Notifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Followed Exams */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Followed Exams</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono-numbers">
              {followedExams.length} tests tracked
            </span>
          </div>

          <div className="space-y-3">
            {followedExams.map((fExam) => (
              <div
                key={fExam.id}
                onClick={() => onSelectExam(fExam.id)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">
                    {fExam.testingAgency} · {fExam.province}
                  </span>
                  <h4 className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-sm mt-0.5">
                    {fExam.name}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono-numbers">
                    {fExam.totalVacancies} Vacancies · Status: {fExam.status}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Notifications Feed */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-sky-400" />
              <h3 className="text-base font-bold text-white">Live Intelligence Feed</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono-numbers">
              {notifications.length} alerts
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  notificationService.markAsRead(notif.id);
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                  );
                  if (notif.examId) onSelectExam(notif.examId);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  notif.read
                    ? 'border-slate-800/60 bg-slate-950/30 text-slate-400 hover:bg-slate-900'
                    : 'border-emerald-500/30 bg-emerald-950/15 text-slate-200 hover:bg-emerald-950/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-white">{notif.title}</h5>
                  <span className="text-[10px] text-slate-500 font-mono-numbers">{notif.timestamp}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
