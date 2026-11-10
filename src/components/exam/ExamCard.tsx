import React from 'react';
import {
  CheckCircle2,
  Clock,
  Building,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { ExamFolder, ScoreSubmission } from '../../types';

interface ExamCardProps {
  exam: ExamFolder;
  submissionsCount: number;
  userSubmission?: ScoreSubmission;
  onSelect: () => void;
  onQuickSubmit?: () => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  submissionsCount,
  userSubmission,
  onSelect,
}) => {
  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/40 hover:bg-slate-900/60 hover:shadow-[0_20px_45px_-12px_rgba(16,185,129,0.22)] cursor-pointer ring-1 ring-white/5"
    >
      {/* Top Specular Rim Lighting Line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-emerald-400/40 transition-colors"
      />

      <div>
        {/* Top Unboxed Metadata Kicker */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-400 tracking-wide">{exam.testingAgency}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{exam.bpsScale || 'Recruitment'}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">{exam.province}</span>
          </div>

          {/* Clean Status Indicator */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {exam.isVerified ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400/90 font-medium">
                <Clock className="h-3.5 w-3.5" />
                {exam.status}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
          {exam.name}
        </h3>

        {/* Organization & Department */}
        <p className="mt-1.5 text-xs text-slate-300 flex items-center gap-1.5 line-clamp-1">
          <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>{exam.organization}</span>
        </p>

        {/* Key Test Statistics Spatial Row */}
        <div className="mt-5 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Seats</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
              {exam.totalVacancies > 0 ? exam.totalVacancies : 'Multiple'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Marks</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
              {exam.totalMarks}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Submitted</span>
            <span className="font-mono font-semibold text-emerald-400 mt-0.5 block">
              {submissionsCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Candidate Standing or Prompt */}
      <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
        {userSubmission ? (
          <div className="flex items-center gap-2 text-emerald-300">
            <Award className="h-4 w-4 text-emerald-400" />
            <span>
              Your Score: <strong className="font-mono text-white">{userSubmission.marksObtained}</strong>/{exam.totalMarks}
            </span>
          </div>
        ) : (
          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
            <span>Unsubmitted</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all">
          <span>Inspect Intelligence</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};
