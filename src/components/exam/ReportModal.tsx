import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { ExamFolder, CurrentUser, ExamReport } from '../../types';
import { reportService } from '../../services/supabaseService';

interface ReportModalProps {
  exam: ExamFolder;
  currentUser: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  exam,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [reason, setReason] = useState<ExamReport['reason']>('incorrect_info');
  const [details, setDetails] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await reportService.submitReport({
      examId: exam.id,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reason,
      details: details.trim(),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to submit report. Please try again.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Report Information</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Help maintain examination data integrity. Submit discrepancies regarding <span className="text-slate-200 font-semibold">{exam.name}</span>.
        </p>

        {isSuccess ? (
          <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Report Logged in Supabase</p>
            <p className="text-xs text-emerald-300">
              Our moderation team will review this notice. Thank you.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ExamReport['reason'])}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="incorrect_info">Incorrect vacancy, cutoff or test date</option>
                <option value="fraudulent_scores">Fraudulent / fake score submissions</option>
                <option value="duplicate_exam">Duplicate exam entry</option>
                <option value="spam">Spam or misleading information</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Explanation & Evidence Reference
              </label>
              <textarea
                required
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide specific details or links to official commission gazettes..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !details.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md shadow-amber-950"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <span>Submit to Moderation</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
