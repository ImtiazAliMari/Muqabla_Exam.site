import React from 'react';
import { Search, ArrowRight, ShieldCheck, Users, BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { ExamFolder, ScoreSubmission, CurrentUser } from '../../types';
import { LiveSpatialRadar } from './LiveSpatialRadar';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedAgency: string;
  setSelectedAgency: (agency: string) => void;
  onScrollToExams: () => void;
  totalExamsCount: number;
  totalSubmissionsCount: number;
  allExams: ExamFolder[];
  allSubmissions: ScoreSubmission[];
  userSubmissions: ScoreSubmission[];
  currentUser: CurrentUser | null;
  onSelectExam: (examId: string) => void;
  onOpenSubmitScore?: (examId?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedAgency,
  setSelectedAgency,
  onScrollToExams,
  totalExamsCount,
  totalSubmissionsCount,
  allExams,
  allSubmissions,
  userSubmissions,
  currentUser,
  onSelectExam,
  onOpenSubmitScore,
}) => {
  const testingAgencies = [
    'All Agencies',
    'NTS',
    'FPSC',
    'PPSC',
    'SPSC',
    'STS IBA',
    'KPPSC',
    'BPSC',
    'HEC',
  ];

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Spatial Ambient Radial Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 right-[-10%] h-[400px] w-[500px] rounded-full bg-cyan-500/10 blur-[130px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Spatial Narrative & Search */}
          <div className="lg:col-span-7 space-y-6">
            {/* Spatial Live Tag */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Real-Time Competitive Exam Intelligence</span>
            </div>

            {/* Spatial Hero Headline */}
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              Don&apos;t just know your marks.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                Know where you stand.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal">
              Official testing agencies announce candidate marks without publishing merit positions.
              Join thousands of Pakistani candidates creating transparent exam intelligence,
              estimating percentiles, and gauging recruitment cutoffs together.
            </p>

            {/* Spatial Glass Search Console */}
            <div className="mt-4 max-w-2xl space-y-3">
              <div className="relative flex items-center rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all focus-within:border-emerald-400/60 focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white/[0.06]">
                <Search className="absolute left-4.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search test: 'NTS Assistant Engineer', 'FPSC Customs', 'PPSC Tehsildar'..."
                  className="w-full bg-transparent pl-12 pr-28 py-4 text-sm text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={onScrollToExams}
                  className="absolute right-2.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  Find Exam
                </button>
              </div>

              {/* Spatial Filter Capsules */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar">
                {testingAgencies.map((agency) => {
                  const isActive =
                    (agency === 'All Agencies' && selectedAgency === 'All') ||
                    selectedAgency === agency.replace(' IBA', '');
                  return (
                    <button
                      key={agency}
                      onClick={() =>
                        setSelectedAgency(agency === 'All Agencies' ? 'All' : agency.replace(' IBA', ''))
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200 border border-white/5'
                      }`}
                    >
                      {agency}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spatial Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onScrollToExams}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 cursor-pointer border border-emerald-400/30"
              >
                <span>Browse Active Folders</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Unboxed Proof Metrics */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="font-mono font-semibold text-slate-200">
                  {totalSubmissionsCount.toLocaleString()}
                </span>
                <span>Marks Benchmarked</span>
              </div>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-400" />
                <span className="font-mono font-semibold text-slate-200">
                  {totalExamsCount}
                </span>
                <span>Intelligence Folders</span>
              </div>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero False Precision</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Live Spatial Radar Tile */}
          <div className="lg:col-span-5">
            <LiveSpatialRadar
              allExams={allExams}
              allSubmissions={allSubmissions}
              userSubmissions={userSubmissions}
              currentUser={currentUser}
              onSelectExam={onSelectExam}
              onOpenSubmitScore={onOpenSubmitScore}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
