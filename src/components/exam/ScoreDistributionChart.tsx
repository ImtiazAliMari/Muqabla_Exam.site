import React, { useState } from 'react';
import { CompetitiveStanding } from '../../types';

interface ScoreDistributionChartProps {
  standing: CompetitiveStanding;
  totalMarks: number;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  standing,
  totalMarks,
}) => {
  const [hoveredBinIndex, setHoveredBinIndex] = useState<number | null>(null);

  const {
    distribution,
    userScore,
    averageScore,
    medianScore,
    estimatedCutoffMin,
    estimatedCutoffMax,
    totalScoresCount,
  } = standing;

  if (distribution.length === 0 || totalScoresCount === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
        Score distribution will appear here once candidates start contributing marks.
      </div>
    );
  }

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  const chartHeight = 180;
  const chartWidth = 600;

  // Percentage position of user score on chart (0 to 100%)
  const userScorePct = Math.min(100, Math.max(0, (userScore / totalMarks) * 100));
  const avgScorePct = Math.min(100, Math.max(0, (averageScore / totalMarks) * 100));
  const cutoffMinPct = estimatedCutoffMin
    ? Math.min(100, Math.max(0, (estimatedCutoffMin / totalMarks) * 100))
    : null;
  const cutoffMaxPct = estimatedCutoffMax
    ? Math.min(100, Math.max(0, (estimatedCutoffMax / totalMarks) * 100))
    : null;

  return (
    <div className="space-y-4">
      {/* Chart Canvas Area */}
      <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-5 pt-7">
        {/* Legends at top */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-200">Your Score: <strong className="font-mono-numbers">{userScore}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 bg-amber-400" />
              <span>Average: <strong className="font-mono-numbers text-slate-300">{averageScore}</strong></span>
            </div>
            {estimatedCutoffMin !== null && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-sm bg-emerald-900/60 border border-emerald-500/40" />
                <span>Est. Cutoff Range: <strong className="font-mono-numbers text-emerald-400">{estimatedCutoffMin}–{estimatedCutoffMax}</strong></span>
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono-numbers">
            Sample: {totalScoresCount.toLocaleString()} candidates
          </div>
        </div>

        {/* SVG Histogram & Curve */}
        <div className="relative w-full h-[190px]">
          {/* Background grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-slate-600 w-full" />
            <div className="border-b border-slate-600 w-full" />
            <div className="border-b border-slate-600 w-full" />
            <div className="border-b border-slate-600 w-full" />
          </div>

          {/* Cutoff Range Shading */}
          {cutoffMinPct !== null && cutoffMaxPct !== null && (
            <div
              className="absolute top-0 bottom-6 bg-emerald-500/10 border-x border-emerald-500/30 pointer-events-none"
              style={{
                left: `${cutoffMinPct}%`,
                width: `${Math.max(2, cutoffMaxPct - cutoffMinPct)}%`,
              }}
              title="Estimated Competitive Shortlist Zone"
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-emerald-400 whitespace-nowrap bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Shortlist Zone
              </span>
            </div>
          )}

          {/* Average Marker Line */}
          <div
            className="absolute top-0 bottom-6 w-0.5 border-l-2 border-dashed border-amber-400/80 pointer-events-none z-10"
            style={{ left: `${avgScorePct}%` }}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-[10px] font-mono-numbers text-amber-400 whitespace-nowrap bg-slate-900 px-1 py-0.5 rounded">
              Avg {averageScore}
            </span>
          </div>

          {/* User Score Pin Line */}
          <div
            className="absolute top-0 bottom-6 w-0.5 bg-emerald-400 shadow-md shadow-emerald-500/50 pointer-events-none z-20"
            style={{ left: `${userScorePct}%` }}
          >
            <div className="absolute -top-6 -translate-x-1/2 flex flex-col items-center">
              <span className="text-[10px] font-bold font-mono-numbers text-white bg-emerald-600 px-2 py-0.5 rounded shadow">
                You: {userScore}
              </span>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-emerald-600" />
            </div>
          </div>

          {/* Histogram Bars */}
          <div className="absolute inset-x-0 bottom-6 top-4 flex items-end justify-between gap-1.5">
            {distribution.map((bin, idx) => {
              const heightPct = (bin.count / maxCount) * 100;
              const isUserInBin = userScore >= bin.min && (idx === distribution.length - 1 ? userScore <= bin.max : userScore < bin.max);
              const isHovered = hoveredBinIndex === idx;

              return (
                <div
                  key={bin.rangeLabel}
                  className="relative flex-1 h-full flex items-end group cursor-pointer"
                  onMouseEnter={() => setHoveredBinIndex(idx)}
                  onMouseLeave={() => setHoveredBinIndex(null)}
                >
                  <div
                    className={`w-full rounded-t-sm transition-all duration-200 ${
                      isUserInBin
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : isHovered
                        ? 'bg-slate-400'
                        : 'bg-slate-700/60 group-hover:bg-slate-600'
                    }`}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  />

                  {/* Bin Hover Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-32 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl text-center pointer-events-none">
                      <p className="text-[11px] font-semibold text-slate-200">
                        Score {bin.rangeLabel}
                      </p>
                      <p className="text-xs font-mono-numbers text-emerald-400">
                        {bin.count} candidates
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono-numbers">
                        {bin.percentage}% of test pool
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="absolute bottom-0 inset-x-0 flex justify-between text-[11px] text-slate-400 font-mono-numbers pt-1 border-t border-slate-800">
            {distribution.map((bin) => (
              <span key={bin.rangeLabel} className="text-center w-full truncate">
                {bin.min}
              </span>
            ))}
            <span>{totalMarks}</span>
          </div>
        </div>
      </div>

      {/* Percentile Brackets Strip */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
          Performance Benchmark Tiers
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
          {[
            { label: 'Top 1%', tier: 'Outstanding (Top 1%)', desc: 'Percentile ≥ 99' },
            { label: 'Top 5%', tier: 'Very Strong (Top 5%)', desc: 'Percentile ≥ 95' },
            { label: 'Top 10%', tier: 'Strong (Top 10%)', desc: 'Percentile ≥ 90' },
            { label: 'Top 25%', tier: 'Competitive (Top 25%)', desc: 'Percentile ≥ 75' },
            { label: 'Above Avg', tier: 'Above Average', desc: 'Percentile ≥ 55' },
            { label: 'Average', tier: 'Average', desc: 'Percentile ≥ 40' },
            { label: 'Below Avg', tier: 'Below Average', desc: 'Percentile < 40' },
          ].map((bracket) => {
            const isUserBracket = standing.competitiveLevel === bracket.tier;
            return (
              <div
                key={bracket.label}
                className={`p-2 rounded-lg border transition-all ${
                  isUserBracket
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-semibold shadow-sm'
                    : 'border-slate-800/80 bg-slate-900/30 text-slate-400'
                }`}
              >
                <div className="text-xs font-medium">{bracket.label}</div>
                <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                  {bracket.desc}
                </div>
                {isUserBracket && (
                  <span className="inline-block mt-1 text-[9px] uppercase font-bold text-emerald-400">
                    Your Tier
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
