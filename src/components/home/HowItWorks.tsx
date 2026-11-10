import React from 'react';
import { Search, PenLine, LineChart, Target, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Find Exam Folder',
      description:
        'Search for your test by recruitment agency or post (e.g. NTS WAPDA, FPSC Customs, PPSC, SPSC).',
      icon: Search,
    },
    {
      step: '02',
      title: 'Submit Your Marks',
      description:
        'Enter your marks obtained and total marks. Optionally attach score slip evidence for verified status.',
      icon: PenLine,
    },
    {
      step: '03',
      title: 'Statistical Engine',
      description:
        'The platform normalizes candidate submissions, detects statistical anomalies, and calculates distribution bell curves.',
      icon: LineChart,
    },
    {
      step: '04',
      title: 'Inspect Percentiles',
      description:
        'Review your estimated percentile, provincial quota standing, and expected cutoff margins.',
      icon: Target,
    },
    {
      step: '05',
      title: 'Track Official Shortlist',
      description:
        'Follow the test folder. When the official gazette is released, cross-reference prediction accuracy.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="py-20 border-b border-white/10 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Collective Intelligence Workflow
          </span>
          <h3 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            How Candidates Fill the Information Gap
          </h3>
          <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
            A transparent five-step feedback loop: candidates share verified data, the engine benchmarks it,
            and everyone understands their true standing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 relative">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-white/10 bg-slate-900/35 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-slate-900/60 hover:shadow-[0_15px_35px_-10px_rgba(16,185,129,0.2)] ring-1 ring-white/5"
              >
                {/* Top Specular Rim */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-emerald-400/30 transition-colors"
                />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-emerald-400 transition-colors">
                    {item.step}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
