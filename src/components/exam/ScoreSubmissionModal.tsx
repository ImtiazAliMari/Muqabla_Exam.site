import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, FileText, Info, Loader2 } from 'lucide-react';
import { ExamFolder, ScoreSubmission, CurrentUser } from '../../types';
import { validateScoreSubmission } from '../../services/antiFraud';
import { scoreService } from '../../services/supabaseService';

interface ScoreSubmissionModalProps {
  exam: ExamFolder;
  currentUser: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const ScoreSubmissionModal: React.FC<ScoreSubmissionModalProps> = ({
  exam,
  currentUser,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [existingSubId, setExistingSubId] = useState<string | null>(null);
  const [marks, setMarks] = useState<string>('');
  const [province, setProvince] = useState<string>(currentUser.province || 'Punjab');
  const [quota, setQuota] = useState<string>('Open Merit');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [hasEvidence, setHasEvidence] = useState<boolean>(false);
  const [evidenceUrl, setEvidenceUrl] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(false);
  const [existingExamSubs, setExistingExamSubs] = useState<ScoreSubmission[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Initialize form by querying Supabase PostgreSQL
  useEffect(() => {
    if (isOpen) {
      setIsLoadingExisting(true);
      Promise.all([
        scoreService.getUserSubmissionForExam(exam.id, currentUser.id),
        scoreService.getScoresByExam(exam.id),
      ]).then(([userSub, examSubsRes]) => {
        setIsLoadingExisting(false);
        setExistingExamSubs(examSubsRes.data || []);

        if (userSub) {
          setExistingSubId(userSub.id);
          setMarks(String(userSub.marksObtained));
          setProvince(userSub.province || currentUser.province || 'Punjab');
          setQuota(userSub.quota || 'Open Merit');
          setRollNumber(userSub.rollNumberMasked || '');
          setComments(userSub.userComments || '');
          setHasEvidence(Boolean(userSub.evidenceProvided));
          setEvidenceUrl(userSub.evidenceUrl);
          setFileName(userSub.evidenceProvided ? 'Uploaded Evidence Document' : '');
        } else {
          setExistingSubId(null);
          setMarks('');
          setProvince(currentUser.province || 'Punjab');
          setQuota('Open Merit');
          setRollNumber('');
          setComments('');
          setHasEvidence(false);
          setEvidenceUrl(undefined);
          setFileName('');
        }
      }).catch(() => {
        setIsLoadingExisting(false);
      });

      setError(null);
      setSuccessInfo(null);
    }
  }, [isOpen, exam.id, currentUser.id, currentUser.province]);

  if (!isOpen) return null;

  const numericMarks = parseFloat(marks);
  const calculatedPercentage =
    !isNaN(numericMarks) && exam.totalMarks > 0
      ? ((numericMarks / exam.totalMarks) * 100).toFixed(1)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    const parsedScore = parseFloat(marks);

    // Validate using anti-fraud heuristic against existing Supabase submissions
    const otherSubmissions = existingExamSubs.filter(
      (s) => !(s.examId === exam.id && s.userId === currentUser.id)
    );

    const isUpdate = Boolean(existingSubId);
    const validation = validateScoreSubmission(
      parsedScore,
      exam,
      otherSubmissions,
      currentUser.id,
      hasEvidence,
      isUpdate
    );

    if (!validation.isValid) {
      setError(validation.errorMessage || 'Invalid score submission.');
      return;
    }

    setIsSubmitting(true);

    const res = await scoreService.submitScore({
      examId: exam.id,
      candidateId: currentUser.id,
      candidateName: currentUser.name,
      candidateEmail: currentUser.email,
      obtainedMarks: parsedScore,
      totalMarks: exam.totalMarks,
      province,
      quotaCategory: quota,
      rollNumber: rollNumber.trim() || undefined,
      evidenceUrl: evidenceUrl || undefined,
      evidenceName: fileName || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      if (res.error?.includes('public.scores') || res.error?.includes('schema cache')) {
        setError(
          'Database setup required: Table "scores" has not yet been initialized in your Supabase project (jucuderwsunqktiwpfyj). Please run the SQL setup script in your Supabase SQL Editor.'
        );
      } else {
        setError(res.error || 'Failed to record score in database.');
      }
      return;
    }

    setSuccessInfo(
      res.warning
        ? res.warning
        : hasEvidence
        ? 'Score & verification document saved. Verification status: Pending moderator audit.'
        : 'Score recorded in central candidate pool.'
    );

    setTimeout(() => {
      onSubmitted();
      onClose();
    }, 1200);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const uploadRes = await scoreService.uploadEvidence(file, currentUser.id, exam.id);
    setIsUploading(false);

    if (uploadRes.error) {
      setError(`Upload error: ${uploadRes.error}`);
      return;
    }

    setFileName(file.name);
    setHasEvidence(true);
    setEvidenceUrl(uploadRes.url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {existingSubId ? 'Edit Your Marks' : 'Submit Exam Score'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{exam.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successInfo}</span>
          </div>
        )}

        {isLoadingExisting ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <span>Retrieving your examination record...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Marks Obtained <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder={`0 - ${exam.totalMarks}`}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Total Exam Marks
                </label>
                <input
                  type="text"
                  disabled
                  value={`${exam.totalMarks} Marks`}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            {calculatedPercentage && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs flex items-center justify-between">
                <span className="text-slate-400">Calculated Percentage:</span>
                <span className="font-bold text-emerald-400 font-mono">{calculatedPercentage}%</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Domicile / Province
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh (Rural)">Sindh (Rural)</option>
                  <option value="Sindh (Urban)">Sindh (Urban)</option>
                  <option value="KPK">KPK</option>
                  <option value="Balochistan">Balochistan</option>
                  <option value="Islamabad">Islamabad (ICT)</option>
                  <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                  <option value="AJK">AJK</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Applied Quota Category
                </label>
                <select
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Open Merit">Open Merit</option>
                  <option value="Provincial Quota">Provincial Quota</option>
                  <option value="Women Quota">Women Quota</option>
                  <option value="Minority Quota">Minority Quota</option>
                  <option value="Disabled Quota">Disabled Persons Quota</option>
                </select>
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Scorecard / Result Slip Verification (Optional)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Upload your official NTS, FPSC, or Commission result slip (PDF or Image) to receive the Verified Score badge.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="h-4 w-4 text-emerald-400" />
                  )}
                  <span>{fileName ? 'Replace Document' : 'Upload Result Slip'}</span>
                </button>

                {fileName && (
                  <span className="text-xs text-emerald-400 truncate max-w-[200px]">
                    ✓ {fileName}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md shadow-emerald-950"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <span>{existingSubId ? 'Update My Score' : 'Submit & Benchmark My Score'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
