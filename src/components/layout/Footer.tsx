import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  onExploreExams?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onExploreExams }) => {
  return (
    <footer className="w-full border-t border-white/10 bg-[#050811] text-slate-400 py-12 relative z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Core Value & Transparency Disclaimer */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 sm:p-6 mb-10 ring-1 ring-white/5">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Platform Intelligence & Statistical Transparency Disclaimer
              </h4>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Competitive position, percentile calculations, cutoff simulations, and standing estimates are derived strictly from available
                community-submitted data and empirical distribution models. They represent statistical benchmarks and{' '}
                <strong className="text-slate-200">do not constitute official rankings or shortlisting guarantees</strong>. Official
                merit shortlisting decisions are exclusively conducted by the respective recruiting bodies
                (FPSC, PPSC, SPSC, KPPSC, BPSC, NTS, STS, HEC).
              </p>
            </div>
          </div>
        </div>

        {/* 3-column Navigation & Organizations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                M
              </div>
              <span className="text-base font-bold text-white tracking-tight">Muqabla</span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Pakistan&apos;s community-driven competitive recruitment & test intelligence platform.
              Democratizing score benchmarks between marks announcement and the official merit gazette.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <span>Islamabad</span>
              <span aria-hidden="true">·</span>
              <span>Lahore</span>
              <span aria-hidden="true">·</span>
              <span>Karachi</span>
              <span aria-hidden="true">·</span>
              <span>Peshawar</span>
              <span aria-hidden="true">·</span>
              <span>Quetta</span>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Official Testing Portals
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://fpsc.gov.pk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors"
                >
                  FPSC (Federal Public Service Commission)
                </a>
              </li>
              <li>
                <a
                  href="https://ppsc.gop.pk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors"
                >
                  PPSC (Punjab Public Service Commission)
                </a>
              </li>
              <li>
                <a
                  href="https://spsc.gos.pk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors"
                >
                  SPSC (Sindh Public Service Commission)
                </a>
              </li>
              <li>
                <a
                  href="https://nts.org.pk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors"
                >
                  NTS (National Testing Service)
                </a>
              </li>
              <li>
                <a
                  href="https://iba-suk.edu.pk/sts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors"
                >
                  STS (Sukkur IBA Testing Services)
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Candidate Navigation
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onExploreExams}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Explore Active Test Folders
                </button>
              </li>
              <li>
                <span className="text-slate-500">Benchmark Calculations</span>
              </li>
              <li>
                <span className="text-slate-500">Provincial Quota Models</span>
              </li>
              <li>
                <span className="text-slate-500">Evidence Verification</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Muqabla Platform. Built for Pakistani candidates and job seekers.</p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400/90 font-medium">Community Verified Intelligence</span>
            <span>·</span>
            <span>Zero False Precision</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
