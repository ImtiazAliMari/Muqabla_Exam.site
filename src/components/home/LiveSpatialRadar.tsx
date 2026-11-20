import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  ChevronDown,
  Layers,
  Flame,
  Target,
  Award,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { ExamFolder, ScoreSubmission, CurrentUser, CompetitiveStanding } from '../../types';
import { calculateCompetitiveStanding } from '../../services/statsEngine';

export interface LiveSpatialRadarProps {
  allExams: ExamFolder[];
  allSubmissions: ScoreSubmission[];
  userSubmissions: ScoreSubmission[];
  currentUser: CurrentUser | null;
  onSelectExam: (examId: string) => void;
  onOpenSubmitScore?: (examId?: string) => void;
  className?: string;
}

interface ExamStandingRecord {
  exam: ExamFolder;
  submission: ScoreSubmission;
  standing: CompetitiveStanding;
  isReal: boolean;
  chanceScore: number;
  safeMargin: number | null;
  isBestChance?: boolean;
}

export const LiveSpatialRadar: React.FC<LiveSpatialRadarProps> = ({
  allExams,
  allSubmissions,
  userSubmissions,
  currentUser,
  onSelectExam,
  onOpenSubmitScore,
  className = '',
}) => {
  // Compute standings strictly from user's real submissions
  const examRecords: ExamStandingRecord[] = useMemo(() => {
    if (!userSubmissions || userSubmissions.length === 0) {
      return [];
    }

    const realRecords: ExamStandingRecord[] = [];

    for (const sub of userSubmissions) {
      const exam = allExams.find((e) => e.id === sub.examId);
      if (!exam) continue;

      const examSubs = allSubmissions.filter((s) => s.examId === exam.id);
      const standing = calculateCompetitiveStanding(
        sub.marksObtained,
        exam,
        examSubs,
        sub.province,
        sub.quota
      );

      let confWeight = 20;
      if (standing.callingConfidence === 'Very High') confWeight = 100;
      else if (standing.callingConfidence === 'High') confWeight = 80;
      else if (standing.callingConfidence === 'Moderate') confWeight = 60;
      else if (standing.callingConfidence === 'Low') confWeight = 40;

      const effPercentile = standing.quotaPercentile ?? standing.percentile;
      const safeMargin = standing.estimatedCutoffMin
        ? Number((sub.marksObtained - standing.estimatedCutoffMin).toFixed(1))
        : null;

      const marginBonus = safeMargin !== null ? Math.max(0, safeMargin * 3) : 0;
      const chanceScore = confWeight * 0.45 + effPercentile * 0.4 + marginBonus * 0.15;

      realRecords.push({
        exam,
        submission: sub,
        standing,
        isReal: true,
        chanceScore,
        safeMargin,
      });
    }

    if (realRecords.length > 0) {
      realRecords.sort((a, b) => b.chanceScore - a.chanceScore);
      realRecords[0].isBestChance = true;
    }
    return realRecords;
  }, [allExams, allSubmissions, userSubmissions]);

  // Selected exam for the radar view (defaults to the exam with HIGHEST CHANCES)
  const bestChanceRecord = examRecords[0] || null;
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [previewExamId, setPreviewExamId] = useState<string>('');

  // Auto-select the best chance exam whenever records change or on initial load
  useEffect(() => {
    if (bestChanceRecord) {
      setSelectedExamId(bestChanceRecord.exam.id);
    }
  }, [bestChanceRecord?.exam.id]);

  useEffect(() => {
    if (!previewExamId && allExams.length > 0) {
      setPreviewExamId(allExams[0].id);
    }
  }, [allExams, previewExamId]);

  // Currently active record to display
  const activeRecord = useMemo(() => {
    if (!examRecords || examRecords.length === 0) return null;
    return examRecords.find((r) => r.exam.id === selectedExamId) || examRecords[0];
  }, [examRecords, selectedExamId]);

  if (!activeRecord) {
    const previewExam = allExams.find((e) => e.id === previewExamId) || allExams[0];
    if (!previewExam) return null;

    const realExamSubs = allSubmissions.filter(
      (s) => s.examId === previewExam.id && s.evidenceStatus !== 'Rejected'
    );
    const highestRealScore =
      realExamSubs.length > 0 ? Math.max(...realExamSubs.map((s) => s.marksObtained)) : null;

    return (
      <div className={`relative group perspective-[1000px] ${className}`}>
        <div
          aria-hidden="true"
          className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent blur-xl opacity-80 group-hover:opacity-100 transition-opacity"
        />

        <div className="relative rounded-3xl border border-white/15 bg-slate-900/60 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Spatial Radar
            </span>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-300 text-[10px] font-semibold">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>Real Candidate Data</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="radar-preview-select" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>Select Test to Check Live Merit Pool:</span>
            </label>
            <div className="relative">
              <select
                id="radar-preview-select"
                value={previewExam.id}
                onChange={(e) => setPreviewExamId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/15 bg-slate-950/90 pl-3.5 pr-9 py-2.5 text-xs font-semibold text-white focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer shadow-inner"
              >
                {allExams.map((ex) => {
                  const cnt = allSubmissions.filter((s) => s.examId === ex.id).length;
                  return (
                    <option key={ex.id} value={ex.id} className="bg-slate-900 text-white py-1">
                      {ex.name} ({cnt} {cnt === 1 ? 'submission' : 'submissions'})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white line-clamp-1">{previewExam.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 shrink-0 ml-2">
                {previewExam.testingAgency}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
                <span className="text-[10px] text-slate-400 block">Real Submissions</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  {realExamSubs.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
                <span className="text-[10px] text-slate-400 block">Official Seats</span>
                <span className="font-mono font-bold text-teal-300 text-sm mt-0.5 block">
                  {previewExam.totalVacancies || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
                <span className="text-[10px] text-slate-400 block">Highest Marks</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                  {highestRealScore !== null ? `${highestRealScore}/${previewExam.totalMarks}` : 'Awaiting'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {realExamSubs.length === 0
                ? 'No candidate scores submitted for this test yet. Enter your obtained marks to start building the real merit pool.'
                : `Submit your actual marks to calculate your real percentile and category rank among ${realExamSubs.length} contributing ${realExamSubs.length === 1 ? 'candidate' : 'candidates'}.`}
            </p>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onSelectExam(previewExam.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-950/40"
            >
              <span>Inspect Merit & Cutoffs</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            {onOpenSubmitScore && (
              <button
                type="button"
                onClick={() => onOpenSubmitScore(previewExam.id)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Enter My Marks</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { exam, submission, standing, isReal, safeMargin } = activeRecord;
  const isViewingBestChance = bestChanceRecord && activeRecord.exam.id === bestChanceRecord.exam.id;
  const effPercentile = standing.quotaPercentile ?? standing.percentile;
  const percentileDec = Math.min(0.999, Math.max(0.01, effPercentile / 100));

  return (
    <div className={`relative group perspective-[1000px] ${className}`}>
      {/* Outer Spatial Glow Halo */}
      <div
        aria-hidden="true"
        className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent blur-xl opacity-80 group-hover:opacity-100 transition-opacity"
      />

      {/* Floating Spatial Glass Plane */}
      <div className="relative rounded-3xl border border-white/15 bg-slate-900/60 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/10 space-y-5 transition-transform duration-500">
        {/* Top Header: Badge & Status */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Spatial Radar
            </span>
            {isViewingBestChance ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold shadow-sm">
                <Flame className="h-3 w-3 text-amber-400" />
                <span>Highest Chances</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => bestChanceRecord && setSelectedExamId(bestChanceRecord.exam.id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-[10px] font-medium transition-colors cursor-pointer"
                title="Switch back to your highest-chance exam"
              >
                <Target className="h-3 w-3 text-emerald-400" />
                <span>Switch to Best Chance</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isReal ? (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                <span>Your Real Score</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-semibold">
                <Sparkles className="h-3 w-3" />
                <span>Preview Benchmark</span>
              </div>
            )}
          </div>
        </div>

        {/* Exam Choice Selector / Switcher */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="radar-exam-select" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>Choose Exam to Inspect Marks:</span>
            </label>
            {examRecords.length > 1 && (
              <span className="text-[10px] text-slate-500 font-mono-numbers">
                {examRecords.length} tests tracked in parallel
              </span>
            )}
          </div>

          <div className="relative">
            <select
              id="radar-exam-select"
              value={activeRecord.exam.id}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/15 bg-slate-950/90 pl-3.5 pr-9 py-2.5 text-xs font-semibold text-white focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer shadow-inner"
            >
              {examRecords.map((rec) => {
                const recPercentile = rec.standing.quotaPercentile ?? rec.standing.percentile;
                const prefix = rec.isBestChance ? '🔥 [BEST CHANCE] ' : '';
                return (
                  <option key={rec.exam.id} value={rec.exam.id} className="bg-slate-900 text-white py-1">
                    {prefix}
                    {rec.exam.name} — {rec.submission.marksObtained}/{rec.exam.totalMarks} marks ({recPercentile}th %ile)
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>

          {/* Quick Tabs when 2-3 exams available for fast 1-tap switching */}
          {examRecords.length > 1 && (
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {examRecords.map((rec) => {
                const isSelected = rec.exam.id === activeRecord.exam.id;
                return (
                  <button
                    key={rec.exam.id}
                    type="button"
                    onClick={() => setSelectedExamId(rec.exam.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/25 border border-emerald-500/60 text-emerald-200 shadow-sm'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rec.isBestChance && <Flame className="h-2.5 w-2.5 text-amber-400" />}
                    <span className="truncate max-w-[120px]">{rec.exam.testingAgency}: {rec.submission.marksObtained}m</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Spatial Percentile Radial Meter & Benchmark Readings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
          {/* Radial SVG Gauge Card */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            {/* Dedicated SVG Circle Container with larger circumference and spacious interior */}
            <div className="relative flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-white/10"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className={`${
                    isViewingBestChance
                      ? 'stroke-emerald-400'
                      : effPercentile >= 80
                      ? 'stroke-teal-400'
                      : effPercentile >= 60
                      ? 'stroke-sky-400'
                      : 'stroke-amber-400'
                  } transition-all duration-700 ease-out`}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - percentileDec)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Centered text overlay with generous padding and space from circle stroke */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none">
                  {effPercentile}th
                </span>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-emerald-300 font-bold mt-1.5">
                  Percentile
                </span>
              </div>
            </div>

            {/* Calling Chance Badge: Single unbroken pill with whitespace-nowrap */}
            <div className="mt-3 flex justify-center w-full px-1">
              <span
                className={`inline-flex items-center justify-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border whitespace-nowrap shadow-sm ${
                  standing.callingConfidence === 'Very High' || standing.callingConfidence === 'High'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : standing.callingConfidence === 'Moderate'
                    ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                <span>Calling Chance: {standing.callingConfidence}</span>
              </span>
            </div>
          </div>

          {/* Benchmark Readings */}
          <div className="space-y-2 text-xs">
            {/* Candidate Score */}
            <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
              <span className="text-[10px] text-slate-400 block font-medium">Candidate Marks Obtained</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="font-mono font-extrabold text-white text-base">
                  {submission.marksObtained}.0 <span className="text-xs text-slate-500">/ {exam.totalMarks}</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {submission.percentage}% ({standing.competitiveLevel.split(' ')[0]})
                </span>
              </div>
            </div>

            {/* Estimated Open Cutoff */}
            <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
              <span className="text-[10px] text-slate-400 block font-medium">Estimated Shortlist Cutoff</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="font-mono font-bold text-teal-300 text-sm">
                  {standing.estimatedCutoffMin !== null
                    ? `${standing.estimatedCutoffMin}–${standing.estimatedCutoffMax} Marks`
                    : `${exam.passingMarks} Marks (Passing)`}
                </span>
                <span className="text-[10px] text-teal-400 font-semibold">
                  {standing.confidence} Conf.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Standing Bar & Safe Margin */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-medium text-slate-400">
              {submission.province || 'General'} · {submission.quota || 'Open'} Standing:
            </span>
            <span className="text-white font-mono font-bold">
              {standing.quotaComparison ? (
                <>Rank #{standing.quotaComparison.rank} of {standing.quotaComparison.totalCandidates}</>
              ) : (
                <>Projected #{standing.estimatedPositionMin}–{standing.estimatedPositionMax}</>
              )}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isViewingBestChance
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                  : 'bg-gradient-to-r from-teal-400 to-sky-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(8, effPercentile))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Interview Call Margin:</span>
            {safeMargin !== null && safeMargin > 0 ? (
              <span className="text-emerald-400 font-mono font-bold">
                +{safeMargin} marks above cutoff
              </span>
            ) : safeMargin !== null && safeMargin === 0 ? (
              <span className="text-amber-400 font-mono font-bold">
                At estimated cutoff margin
              </span>
            ) : safeMargin !== null ? (
              <span className="text-rose-400 font-mono font-bold">
                {safeMargin} marks below cutoff
              </span>
            ) : (
              <span className="text-slate-400 font-mono">
                Cutoff calibrating
              </span>
            )}
          </div>
        </div>

        {/* Bottom Actions: Inspect Exam Details or Add Another Score */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => onSelectExam(exam.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-950/40"
          >
            <span>Inspect Full Standings & Cutoffs</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          {onOpenSubmitScore && (
            <button
              type="button"
              onClick={() => onOpenSubmitScore(exam.id)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              title="Add marks for another exam"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Add Marks</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
