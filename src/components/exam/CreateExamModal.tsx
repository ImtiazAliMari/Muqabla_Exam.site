import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, Building2, Loader2 } from 'lucide-react';
import { ExamFolder, CurrentUser, QuotaAllocation } from '../../types';
import { examService } from '../../services/supabaseService';

interface CreateExamModalProps {
  currentUser: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newExamId: string) => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [testingAgency, setTestingAgency] = useState('NTS');
  const [jobPost, setJobPost] = useState('');
  const [department, setDepartment] = useState('');
  const [bpsScale, setBpsScale] = useState('BPS-17');
  const [testDate, setTestDate] = useState('2026-10-20');
  const [totalMarks, setTotalMarks] = useState('100');
  const [passingMarks, setPassingMarks] = useState('50');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativePenalty, setNegativePenalty] = useState('0.25');
  const [testType, setTestType] = useState('MCQs Screening Test');
  const [totalVacancies, setTotalVacancies] = useState('25');
  const [shortlistRatio, setShortlistRatio] = useState('1:5 (5 candidates per vacancy for interview)');
  const [province, setProvince] = useState('All Pakistan / Federal');
  const [officialAdLink, setOfficialAdLink] = useState('');
  const [officialResultLink, setOfficialResultLink] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quotas state
  const [openMerit, setOpenMerit] = useState('5');
  const [punjab, setPunjab] = useState('10');
  const [sindhUrban, setSindhUrban] = useState('2');
  const [sindhRural, setSindhRural] = useState('3');
  const [kpk, setKpk] = useState('3');
  const [balochistan, setBalochistan] = useState('2');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !organization.trim() || !jobPost.trim()) {
      setError('Please provide the exam name, organization, and job post.');
      return;
    }

    const tMarks = parseInt(totalMarks, 10);
    const pMarks = parseInt(passingMarks, 10);
    const vacancies = parseInt(totalVacancies, 10);

    if (isNaN(tMarks) || tMarks <= 0) {
      setError('Total marks must be a positive number.');
      return;
    }

    const examId = `${testingAgency.toLowerCase()}-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30)}-${Date.now().toString().slice(-4)}`;

    const quotaAllocation: QuotaAllocation = {
      openMerit: parseInt(openMerit, 10) || 0,
      punjab: parseInt(punjab, 10) || 0,
      sindhUrban: parseInt(sindhUrban, 10) || 0,
      sindhRural: parseInt(sindhRural, 10) || 0,
      kpk: parseInt(kpk, 10) || 0,
      balochistan: parseInt(balochistan, 10) || 0,
    };

    const newExam: ExamFolder = {
      id: examId,
      name: name.trim(),
      organization: organization.trim(),
      testingAgency,
      jobPost: jobPost.trim(),
      department: department.trim() || organization.trim(),
      bpsScale,
      testDate,
      totalMarks: tMarks,
      passingMarks: pMarks,
      negativeMarking,
      negativeMarkingValue: negativeMarking ? parseFloat(negativePenalty) : undefined,
      testType,
      totalVacancies: vacancies,
      quotaAllocation,
      shortlistRatio,
      province,
      status: 'Verified',
      officialAdvertisementUrl: officialAdLink.trim() || undefined,
      officialResultUrl: officialResultLink.trim() || undefined,
      managerId: currentUser.id,
      managerName: currentUser.name || 'Platform Administrator',
      managerEmail: currentUser.email || undefined,
      isVerified: true,
      verificationRequested: false,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
      followersCount: 1,
      additionalNotes: additionalNotes.trim() || undefined,
      historicalRecords: [],
    };

    setIsSubmitting(true);
    examService.createExam(newExam).then((res) => {
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || 'Failed to create exam folder. Please verify administrator permissions.');
        return;
      }
      onCreated(examId);
      onClose();
    }).catch((err) => {
      setIsSubmitting(false);
      setError(err?.message || 'Error publishing exam folder.');
    });
  };

  const agencyList = [
    'NTS',
    'FPSC',
    'PPSC',
    'SPSC',
    'STS',
    'KPPSC',
    'BPSC',
    'HEC',
    'ETEA',
    'PTS',
    'OTS',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl my-8">
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Platform Administrator
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              + Create Official Exam Folder
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Publish a verified recruitment or admission test folder for candidate score benchmarking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/20 p-3 flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Primary details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Exam / Test Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NTS Assistant Engineer — WAPDA 2026"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Organization / Ministry *
              </label>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. WAPDA / Federal Board of Revenue"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Testing Agency *
              </label>
              <select
                value={testingAgency}
                onChange={(e) => setTestingAgency(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {agencyList.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Job Post / Designation *
              </label>
              <input
                type="text"
                required
                value={jobPost}
                onChange={(e) => setJobPost(e.target.value)}
                placeholder="e.g. Assistant Director, Inspector, Lecturer"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Department / Wing
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Power Generation, Higher Education"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Test parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">BPS Scale</label>
              <input
                type="text"
                value={bpsScale}
                onChange={(e) => setBpsScale(e.target.value)}
                placeholder="BPS-17"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Test Date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total Marks *</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-numbers text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Passing Marks</label>
              <input
                type="number"
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-numbers text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Negative marking & Seats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total Vacancies / Seats</label>
              <input
                type="number"
                value={totalVacancies}
                onChange={(e) => setTotalVacancies(e.target.value)}
                placeholder="50"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-numbers text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Shortlist Ratio</label>
              <input
                type="text"
                value={shortlistRatio}
                onChange={(e) => setShortlistRatio(e.target.value)}
                placeholder="1:5"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Negative Marking</label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Enforced (0.25)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Seat Quotas breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Official Provincial Quota Breakdown
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Open Merit</span>
                <input
                  type="number"
                  value={openMerit}
                  onChange={(e) => setOpenMerit(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono-numbers text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Punjab</span>
                <input
                  type="number"
                  value={punjab}
                  onChange={(e) => setPunjab(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono-numbers text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Sindh Urban</span>
                <input
                  type="number"
                  value={sindhUrban}
                  onChange={(e) => setSindhUrban(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono-numbers text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Sindh Rural</span>
                <input
                  type="number"
                  value={sindhRural}
                  onChange={(e) => setSindhRural(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono-numbers text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">KPK</span>
                <input
                  type="number"
                  value={kpk}
                  onChange={(e) => setKpk(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono-numbers text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Balochistan</span>
                <input
                  type="number"
                  value={balochistan}
                  onChange={(e) => setBalochistan(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono-numbers text-white"
                />
              </div>
            </div>
          </div>

          {/* Official URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Advertisement URL (Optional)
              </label>
              <input
                type="url"
                value={officialAdLink}
                onChange={(e) => setOfficialAdLink(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Result Portal URL (Optional)
              </label>
              <input
                type="url"
                value={officialResultLink}
                onChange={(e) => setOfficialResultLink(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Instructions & Test Syllabus Notes
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Test comprised 100 MCQs (70% domain specific, 30% GK/English)..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
            >
              Create Exam Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
