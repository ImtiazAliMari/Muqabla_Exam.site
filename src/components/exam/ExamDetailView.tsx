import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  Users,
  Calendar,
  Award,
  Bell,
  BellOff,
  Flag,
  Share2,
  TrendingUp,
  FileText,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  Send,
  HelpCircle,
  SlidersHorizontal,
  MapPin,
  RotateCcw,
  Trophy,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import {
  ExamFolder,
  ScoreSubmission,
  CurrentUser,
  CompetitiveStanding,
  OfficialUpdate,
  ExamComment,
} from '../../types';
import {
  calculateCompetitiveStanding,
  matchesProvince,
  matchesQuota,
} from '../../services/statsEngine';
import { scoreService, commentService, updateService, followService, analyticsService } from '../../services/supabaseService';
import { initialSubmissions, initialExams } from '../../data/initialData';
import { ScoreDistributionChart } from './ScoreDistributionChart';

interface ExamDetailViewProps {
  exam: ExamFolder;
  currentUser: CurrentUser | null;
  allExams?: ExamFolder[];
  scoreSubmissionVersion?: number;
  onBack: () => void;
  onSubmitScore: () => void;
  onReport: () => void;
  onOpenLogin?: () => void;
  onSelectOtherExam?: (examId: string) => void;
}

export const ExamDetailView: React.FC<ExamDetailViewProps> = ({
  exam,
  currentUser,
  allExams,
  scoreSubmissionVersion,
  onBack,
  onSubmitScore,
  onReport,
  onOpenLogin,
  onSelectOtherExam,
}) => {
  const [allSubmissions, setAllSubmissions] = useState<ScoreSubmission[]>([]);
  const [comments, setComments] = useState<ExamComment[]>([]);
  const [officialUpdates, setOfficialUpdates] = useState<OfficialUpdate[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [userSubmission, setUserSubmission] = useState<ScoreSubmission | undefined>(undefined);
  const [userAllSubmissions, setUserAllSubmissions] = useState<ScoreSubmission[]>([]);

  // Selected Province & Quota Category for comparative calculation
  const [selectedProvince, setSelectedProvince] = useState<string>(() => {
    return currentUser?.province || 'All';
  });

  const [selectedQuota, setSelectedQuota] = useState<string>('All');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load live Supabase data for this exam
  const loadExamData = () => {
    setIsLoadingData(true);
    const promises: Promise<any>[] = [
      scoreService.getScoresByExam(exam.id),
      commentService.getComments(exam.id),
      updateService.getUpdatesByExam(exam.id),
    ];

    if (currentUser?.id) {
      promises.push(followService.getFollowedExamIds(currentUser.id));
      promises.push(scoreService.getUserSubmissionForExam(exam.id, currentUser.id));
      promises.push(scoreService.getUserSubmissions(currentUser.id));
    }

    Promise.all(promises).then(([scoresRes, commentsRes, updatesRes, followedIds, userSub, allUserSubsRes]) => {
      const benchmarkSubs = initialSubmissions.filter((s) => s.examId === exam.id);
      let finalSubs = [...(scoresRes.data || [])];
      for (const b of benchmarkSubs) {
        if (!finalSubs.some((s) => s.userId === b.userId)) {
          finalSubs.push(b);
        }
      }
      if (userSub) {
        const existingIdx = finalSubs.findIndex((s) => s.userId === userSub.userId);
        if (existingIdx >= 0) {
          finalSubs[existingIdx] = userSub;
        } else {
          finalSubs.unshift(userSub);
        }
      }
      setAllSubmissions(finalSubs.length > 0 ? finalSubs : benchmarkSubs);
      setComments(commentsRes.data || []);
      setOfficialUpdates(updatesRes.data || []);
      if (followedIds && Array.isArray(followedIds)) {
        setIsFollowing(followedIds.includes(exam.id));
      }
      if (userSub) {
        setUserSubmission(userSub);
      } else {
        setUserSubmission(undefined);
      }
      if (allUserSubsRes?.data) {
        setUserAllSubmissions(allUserSubsRes.data);
      } else {
        setUserAllSubmissions([]);
      }
      setIsLoadingData(false);
    }).catch(() => {
      setIsLoadingData(false);
    });
  };

  useEffect(() => {
    loadExamData();
    analyticsService.logEvent(exam.id, 'page_view');
  }, [exam.id, currentUser?.id, scoreSubmissionVersion]);

  useEffect(() => {
    if (userSubmission) {
      setSelectedProvince(userSubmission.province);
      setSelectedQuota(userSubmission.quota);
      analyticsService.logEvent(exam.id, 'result_check');
    }
  }, [userSubmission?.id, userSubmission?.province, userSubmission?.quota]);

  // Calculate statistics according to selected province & quota category in comparison of other candidates
  const effectiveUserScore = userSubmission ? userSubmission.marksObtained : 75;
  const standing: CompetitiveStanding = calculateCompetitiveStanding(
    effectiveUserScore,
    exam,
    allSubmissions,
    selectedProvince,
    selectedQuota
  );

  // Submissions matching the selected province and quota category for visible candidate comparison
  const categorySubmissions = allSubmissions
    .filter(
      (s) =>
        s.evidenceStatus !== 'Rejected' &&
        matchesProvince(s.province, selectedProvince) &&
        matchesQuota(s.quota, selectedQuota)
    )
    .sort((a, b) => b.marksObtained - a.marksObtained);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      onOpenLogin?.();
      return;
    }
    if (isFollowing) {
      await followService.unfollowExam(currentUser.id, exam.id);
      setIsFollowing(false);
    } else {
      await followService.followExam(currentUser.id, exam.id);
      setIsFollowing(true);
      analyticsService.logEvent(exam.id, 'exam_follow');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmitScoreClick = () => {
    if (!currentUser) {
      onOpenLogin?.();
    } else {
      onSubmitScore();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin?.();
      return;
    }
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    const res = await commentService.addComment({
      examId: exam.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      content: newCommentText.trim(),
    });
    setIsSubmittingComment(false);

    if (res.success) {
      setNewCommentText('');
      const commentsRes = await commentService.getComments(exam.id);
      setComments(commentsRes.data || []);
    }
  };

  const handleLikeComment = async (cmt: ExamComment) => {
    await commentService.likeComment(cmt.id, cmt.likes);
    setComments((prev) =>
      prev.map((c) => (c.id === cmt.id ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  // Provinces list
  const provinceOptions = [
    'All',
    'Punjab',
    'Sindh Urban',
    'Sindh Rural',
    'KPK',
    'Balochistan',
    'Islamabad',
    'Gilgit-Baltistan',
    'AJK',
  ];

  // Quota list
  const quotaOptions = [
    'All',
    'Open Merit',
    'Provincial Quota',
    'Women Quota',
    'Minority Quota',
    'Disabled Quota',
  ];

  const isCustomComparison =
    userSubmission &&
    (selectedProvince !== userSubmission.province || selectedQuota !== userSubmission.quota);

  return (
    <div className="space-y-8 pb-16">
      {/* Top back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Exams</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{exam.testingAgency}</span>
          <span aria-hidden="true">·</span>
          <span>{exam.bpsScale || 'Cadre'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-numbers">Folder #{exam.id.slice(0, 14)}</span>
        </div>
      </div>

      {/* Main Exam Header Spatial Glass Card */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-8 backdrop-blur-2xl ring-1 ring-white/5 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3">
            {/* Status & agency indicators */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                {exam.testingAgency} Commission Test
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <div className="flex items-center gap-1.5">
                {exam.isVerified ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Official Test Folder
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-teal-400 text-xs font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    Community Submitted Test Folder
                  </span>
                )}
              </div>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">{exam.status}</span>
            </div>

            {/* Exam Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {exam.name}
            </h1>

            {/* Organization / Post / Department */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
              <span className="font-medium text-slate-200">{exam.organization}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">{exam.jobPost}</span>
              {exam.department && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{exam.department}</span>
                </>
              )}
            </div>

            {/* Key Parameters Row with classification labels */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  Test Date
                </span>
                <span className="font-mono-numbers font-semibold text-slate-200 text-sm">
                  {exam.testDate}
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  Total Marks
                </span>
                <span className="font-mono-numbers font-semibold text-slate-200 text-sm">
                  {exam.totalMarks} Marks
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Official Seats
                  </span>
                  <span className="text-[9px] uppercase font-bold text-sky-400">OFFICIAL</span>
                </div>
                <span className="font-mono-numbers font-semibold text-slate-200 text-sm">
                  {exam.totalVacancies} Vacancies
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Community Scores
                  </span>
                  <span className="text-[9px] uppercase font-bold text-emerald-400">COMMUNITY</span>
                </div>
                <span className="font-mono-numbers font-semibold text-emerald-400 text-sm">
                  {allSubmissions.length.toLocaleString()} Candidates
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs right column */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 pt-2 lg:pt-0">
            <button
              onClick={handleSubmitScoreClick}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950 cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>{userSubmission ? 'Update My Score' : 'Submit My Score'}</span>
            </button>

            <button
              onClick={handleToggleFollow}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isFollowing
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isFollowing ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
              <span>{isFollowing ? 'Following Updates' : 'Follow Exam'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
              </button>

              <button
                onClick={onReport}
                className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Report Incorrect Information"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Source Attribution Classification Banner */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <span><strong className="text-slate-200">OFFICIAL:</strong> Posts & advertisement criteria</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span><strong className="text-slate-200">COMMUNITY REPORTED:</strong> Candidate score submissions</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span><strong className="text-slate-200">PLATFORM ESTIMATE:</strong> Statistical percentiles & cutoffs</span>
          </div>
        </div>
      </div>

      {/* Parallel Multi-Exam Tracking Portfolio Bar */}
      {userAllSubmissions.filter((s) => s.examId !== exam.id).length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 p-4 md:p-5 backdrop-blur-xl ring-1 ring-emerald-500/20 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Parallel Multi-Exam Tracking Active
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                    {userAllSubmissions.length} Exams Tracked
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  You are tracking scores for multiple recruitment tests simultaneously. Switch between your results below:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {userAllSubmissions.filter((s) => s.examId !== exam.id).map((otherSub) => {
                const otherExam =
                  allExams?.find((e) => e.id === otherSub.examId) ||
                  initialExams.find((e) => e.id === otherSub.examId);
                return (
                  <button
                    key={otherSub.id}
                    onClick={() => onSelectOtherExam?.(otherSub.examId)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 text-xs text-slate-200 transition-all cursor-pointer group shadow-sm"
                    title={`Switch to ${otherExam?.name || 'Exam'}`}
                  >
                    <span className="font-bold text-emerald-400">{otherExam?.testingAgency || 'Test'}</span>
                    <span className="font-mono text-white">{otherSub.marksObtained}/{otherSub.totalMarks}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-300 transition-colors">
                      ({otherSub.percentage}%)
                    </span>
                    <ArrowRightLeft className="h-3 w-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: PROVINCE & QUOTA CATEGORY COMPARISON SELECTOR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Province & Quota Category Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Switch Province and Quota Category to calculate and compare against other candidates in that specific bracket.
              </p>
            </div>
          </div>

          {isCustomComparison && (
            <button
              onClick={() => {
                setSelectedProvince(userSubmission.province);
                setSelectedQuota(userSubmission.quota);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset to My Submission ({userSubmission.province} · {userSubmission.quota})</span>
            </button>
          )}
        </div>

        {/* Selectors grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {/* Province selector */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                Province / Domicile:
              </span>
              {selectedProvince !== 'All' && (
                <span className="text-[10px] text-emerald-400 font-normal">Active Filter</span>
              )}
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p === 'All' ? 'All Pakistan / Federal' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Quota Category selector */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-sky-400" />
                Quota Category:
              </span>
              {selectedQuota !== 'All' && (
                <span className="text-[10px] text-sky-400 font-normal">Active Filter</span>
              )}
            </label>
            <select
              value={selectedQuota}
              onChange={(e) => setSelectedQuota(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              {quotaOptions.map((q) => (
                <option key={q} value={q}>
                  {q === 'All' ? 'All Quota Categories' : q}
                </option>
              ))}
            </select>
          </div>

          {/* Quick status display */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-300">
              Comparing In Category:
            </label>
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs flex items-center justify-between">
              <span className="font-semibold text-emerald-300 truncate">
                {selectedProvince === 'All' ? 'All Pakistan' : selectedProvince} ·{' '}
                {selectedQuota === 'All' ? 'All Quotas' : selectedQuota}
              </span>
              <span className="text-[11px] font-mono-numbers text-slate-400 shrink-0 ml-2">
                {categorySubmissions.length} candidates
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: YOUR COMPETITIVE STANDING IN SELECTED CATEGORY */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Performance Intelligence
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                PLATFORM ESTIMATE
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
              Your Standing in {selectedProvince === 'All' ? 'All Pakistan' : selectedProvince} ·{' '}
              {selectedQuota === 'All' ? 'All Quotas' : selectedQuota}
            </h2>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Confidence Level Badge */}
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                standing.confidence === 'Very High' || standing.confidence === 'High'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : standing.confidence === 'Medium'
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : standing.confidence === 'Low'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
              }`}
              title={standing.confidenceReason}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>Confidence: {standing.confidence}</span>
            </div>

            {/* Shortlist Probability Badge */}
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                standing.callingConfidence === 'Very High' || standing.callingConfidence === 'High'
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-300'
                  : standing.callingConfidence === 'Moderate'
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : standing.callingConfidence === 'Low'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
              }`}
              title={standing.callingConfidenceReason}
            >
              <span>Shortlist: {standing.callingConfidence}</span>
            </div>

            {/* Dataset Sample Size */}
            <div
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-slate-700/60 bg-slate-800/50 text-slate-400"
              title={`${standing.totalScoresCount} submissions. Algorithm weighs recent high scores against the aggregate mean.`}
            >
              Sample: {standing.totalScoresCount} submissions
            </div>
          </div>
        </div>

        {/* If user hasn't submitted a score yet, show prompt banner */}
        {!userSubmission && (
          <div className="my-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-amber-200">
                Preview Mode: Showing baseline benchmark ({effectiveUserScore} marks)
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Submit your actual test marks to see your personalized percentile and estimated candidate rank.
              </p>
            </div>
            <button
              onClick={handleSubmitScoreClick}
              className="px-4 py-1.5 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Enter My Marks
            </button>
          </div>
        )}

        {/* Core Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          {/* Card 1: Your Score */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Your Marks</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono-numbers text-white">
                {userSubmission ? userSubmission.marksObtained : '—'}
              </span>
              <span className="text-xs font-mono-numbers text-slate-500">
                / {exam.totalMarks}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono-numbers block mt-1">
              {userSubmission ? `${userSubmission.percentage}% obtained` : 'No score submitted'}
            </span>
          </div>

          {/* Card 2: Percentile */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Category Percentile
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-numbers text-emerald-400">
              {standing.quotaPercentile !== undefined
                ? `${standing.quotaPercentile}th`
                : `${standing.percentile}th`}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Higher than{' '}
              {standing.quotaPercentile !== undefined
                ? `${standing.quotaPercentile}%`
                : `${standing.percentile}%`}{' '}
              of matching candidates
            </span>
          </div>

          {/* Card 3: Exact Rank in this Category */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Category Rank
            </span>
            {standing.quotaComparison ? (
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono-numbers text-white">
                  #{standing.quotaComparison.rank}
                </span>
                <span className="text-xs font-mono-numbers text-slate-400 ml-1.5">
                  of {standing.quotaComparison.totalCandidates}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {standing.quotaComparison.scoresAbove} scored higher
                </span>
              </div>
            ) : userSubmission ? (
              <div>
                <span className="text-lg sm:text-2xl font-extrabold font-mono-numbers text-white">
                  {standing.estimatedPositionMin.toLocaleString()}–{standing.estimatedPositionMax.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Projected overall bracket
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">Enter score to unlock</span>
            )}
          </div>

          {/* Card 4: Shortlist Prospect in Category */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-400 block">
                Shortlist Prospect
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  standing.confidence === 'Very High' || standing.confidence === 'High'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : standing.confidence === 'Medium'
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}
                title={`Confidence Level: ${standing.confidence} - ${standing.confidenceReason}`}
              >
                {standing.confidence} Confidence
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-sm sm:text-base font-extrabold ${
                  standing.callingConfidence === 'Very High' || standing.callingConfidence === 'High'
                    ? 'text-emerald-400'
                    : standing.callingConfidence === 'Moderate'
                    ? 'text-sky-400'
                    : standing.callingConfidence === 'Low'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {standing.callingConfidence}
              </span>
              <span className="text-[11px] text-slate-400">
                ({standing.competitiveLevel.split(' ')[0]})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
              {standing.confidenceReason}
            </span>
          </div>
        </div>

        {/* Detailed Province & Quota Relative Standing Box */}
        {standing.quotaComparison && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-emerald-300 text-sm">
                  {standing.quotaComparison.positionDescription}
                </h3>
              </div>

              {standing.quotaComparison.allocatedSeats ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  {standing.quotaComparison.allocatedSeats} Official Seats Allocated
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-emerald-500/20">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Competing In Category</span>
                <span className="font-mono-numbers font-semibold text-white">
                  {standing.quotaComparison.totalCandidates} Candidates
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Category Median</span>
                <span className="font-mono-numbers font-semibold text-white">
                  {standing.quotaComparison.medianScore} Marks
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Highest In Category</span>
                <span className="font-mono-numbers font-semibold text-emerald-400">
                  {standing.quotaComparison.highestScore} Marks
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Candidates Scored Below You</span>
                <span className="font-mono-numbers font-semibold text-sky-400">
                  {standing.quotaComparison.scoresBelow} Candidates
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benchmark Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Overall Pool Analyzed</span>
            <span className="font-mono-numbers font-semibold text-slate-200">
              {standing.totalScoresCount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Overall Median Score</span>
            <span className="font-mono-numbers font-semibold text-slate-200">
              {standing.medianScore}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Overall Average Score</span>
            <span className="font-mono-numbers font-semibold text-slate-200">
              {standing.averageScore}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Overall Highest</span>
            <span className="font-mono-numbers font-semibold text-emerald-400">
              {standing.highestScore} / {exam.totalMarks}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: CANDIDATE SUBMISSIONS IN THIS QUOTA CATEGORY (COMPARISON TABLE) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Candidate Comparison in {selectedProvince === 'All' ? 'All Pakistan' : selectedProvince} ·{' '}
                {selectedQuota === 'All' ? 'All Quotas' : selectedQuota}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison of submissions from other candidates in this category. Roll numbers are masked for privacy.
            </p>
          </div>

          <span className="text-xs font-mono-numbers text-slate-400 self-start sm:self-auto">
            {categorySubmissions.length} submissions in this bracket
          </span>
        </div>

        {categorySubmissions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No candidates have submitted under {selectedProvince} · {selectedQuota} yet.
            {userSubmission ? ' You are the first contributor!' : ' Submit your score to be the first!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Candidate / Roll</th>
                  <th className="py-2 px-3">Province</th>
                  <th className="py-2 px-3">Quota</th>
                  <th className="py-2 px-3 text-right">Marks</th>
                  <th className="py-2 px-3 text-right">Percentage</th>
                  <th className="py-2 px-3 text-right">Evidence Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                {categorySubmissions.map((sub, index) => {
                  const isUser = currentUser && sub.userId === currentUser.id;
                  const rankNumber = index + 1;

                  return (
                    <tr
                      key={sub.id}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-emerald-950/40 text-emerald-200 font-bold border-l-4 border-l-emerald-500'
                          : 'text-slate-300 hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                            rankNumber === 1
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : rankNumber === 2
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                              : rankNumber === 3
                              ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                              : 'text-slate-400'
                          }`}
                        >
                          #{rankNumber}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span>{sub.rollNumberMasked || 'Roll # Masked'}</span>
                          {isUser && (
                            <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/20 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-sans text-slate-400">{sub.province}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">{sub.quota}</td>

                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {sub.marksObtained}
                        <span className="text-[10px] text-slate-500 font-normal">
                          /{exam.totalMarks}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-emerald-400">
                        {sub.percentage}%
                      </td>

                      <td className="py-2.5 px-3 text-right font-sans">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                            sub.evidenceStatus === 'Verified'
                              ? 'text-emerald-400'
                              : sub.evidenceStatus === 'Evidence Submitted'
                              ? 'text-sky-400'
                              : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {sub.evidenceStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPECTED CUTOFF & SEAT ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Expected Cutoff Analysis */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Shortlist Forecast
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Expected Competitive Cutoff
              </h3>
            </div>
            <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              COMMUNITY ESTIMATE
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Based on {exam.totalVacancies} vacancies and an estimated {exam.shortlistRatio || '1:5'} interview
            ratio, our engine projects the competitive score threshold required for an interview call.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                Estimated Cutoff
              </span>
              {standing.estimatedCutoffMin ? (
                <div className="text-2xl font-bold font-mono-numbers text-emerald-400">
                  {standing.estimatedCutoffMin}–{standing.estimatedCutoffMax}
                </div>
              ) : (
                <span className="text-xs text-slate-500">More scores needed</span>
              )}
              <span className="text-[10px] text-slate-400 block mt-1">
                Community estimate — not official
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                Official Cutoff
              </span>
              <div className="text-2xl font-bold font-mono-numbers text-sky-400">
                {exam.officialCutoff !== null && exam.officialCutoff !== undefined
                  ? `${exam.officialCutoff} Marks`
                  : 'Awaiting Official'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                {exam.officialCutoff ? 'Announced by Commission' : 'Pending official gazette'}
              </span>
            </div>
          </div>

          {/* Historical comparison accuracy preview */}
          {exam.historicalRecords && exam.historicalRecords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200 block mb-2">
                Historical Accuracy (Past 5 Tests)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                      <th className="py-1">Year</th>
                      <th className="py-1 text-right">Est. Cutoff</th>
                      <th className="py-1 text-right">Actual Cutoff</th>
                      <th className="py-1 text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                    {exam.historicalRecords.map((rec) => (
                      <tr key={rec.year} className="text-slate-300">
                        <td className="py-1.5 font-sans font-medium">{rec.year}</td>
                        <td className="py-1.5 text-right text-emerald-400">{rec.estimatedCutoff}</td>
                        <td className="py-1.5 text-right text-sky-400 font-bold">{rec.actualCutoff}</td>
                        <td className="py-1.5 text-right text-slate-400">{rec.accuracy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Seat & Quota Allocation Matrix */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Provincial Quota Breakdown
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Official Seats Distribution
              </h3>
            </div>
            <span className="text-[9px] uppercase font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              OFFICIAL
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Pakistan civil service and recruitment quota allocation specified in the official advertisement:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono-numbers">
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Open Merit</span>
              <span className="text-base font-bold text-slate-200">{exam.quotaAllocation.openMerit} Seats</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Punjab Quota</span>
              <span className="text-base font-bold text-slate-200">{exam.quotaAllocation.punjab} Seats</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Sindh Urban</span>
              <span className="text-base font-bold text-slate-200">{exam.quotaAllocation.sindhUrban} Seats</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Sindh Rural</span>
              <span className="text-base font-bold text-slate-200">{exam.quotaAllocation.sindhRural} Seats</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">KPK Quota</span>
              <span className="text-base font-bold text-slate-200">{exam.quotaAllocation.kpk} Seats</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Balochistan</span>
              <span className="text-base font-bold text-slate-200">{exam.quotaAllocation.balochistan} Seats</span>
            </div>
          </div>

          {/* User's Domicile Relative Position */}
          {userSubmission && standing.quotaEstimatedPosition && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-semibold">{standing.quotaEstimatedPosition}</p>
                <p className="text-[11px] text-emerald-400/90 mt-0.5">
                  Calculated against {standing.quotaSubmissionsCount} submissions from {selectedProvince} · {selectedQuota} candidates.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: SCORE DISTRIBUTION GRAPH */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Score Distribution & Bell Curve</h3>
            <p className="text-xs text-slate-400">
              Distribution for {selectedProvince === 'All' ? 'All Pakistan' : selectedProvince} ·{' '}
              {selectedQuota === 'All' ? 'All Quotas' : selectedQuota} ({categorySubmissions.length} candidates).
            </p>
          </div>
        </div>

        <ScoreDistributionChart standing={standing} totalMarks={exam.totalMarks} />
      </div>

      {/* SECTION: OFFICIAL UPDATES & COMMUNITY DISCUSSION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Official Updates Timeline */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <h3 className="text-base font-bold text-white">Official Notices & Documents</h3>
            </div>
            <span className="text-[9px] uppercase font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              OFFICIAL
            </span>
          </div>

          {officialUpdates.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No official documents released yet.
            </p>
          ) : (
            <div className="space-y-3">
              {officialUpdates.map((upd) => (
                <div
                  key={upd.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{upd.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono-numbers">{upd.date}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{upd.description}</p>
                  {upd.officialUrl && (
                    <a
                      href={upd.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium pt-1"
                    >
                      <span>View Official Gazette / Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Community Discussion */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Candidate Discussion</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono-numbers">
              {comments.length} posts
            </span>
          </div>

          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Ask about cutoff trends or share paper insights..."
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
            </input>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Comments list */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No discussions yet. Be the first to share your thoughts.
              </p>
            ) : (
              comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{cmt.userName}</span>
                      {cmt.userProvince && (
                        <span className="text-[10px] text-slate-500">({cmt.userProvince})</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono-numbers">
                      {cmt.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{cmt.text}</p>
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={() => handleLikeComment(cmt)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span className="font-mono-numbers">{cmt.likes}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
