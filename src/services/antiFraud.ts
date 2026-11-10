import { ScoreSubmission, ExamFolder } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isSuspicious: boolean;
  suspicionReason?: string;
  evidenceStatus: ScoreSubmission['evidenceStatus'];
}

/**
 * Validates a proposed score submission against integrity rules and statistical anomaly bounds.
 */
export function validateScoreSubmission(
  marksObtained: number,
  exam: ExamFolder,
  existingSubmissions: ScoreSubmission[],
  userId: string,
  hasEvidence: boolean,
  isUpdate: boolean = false
): ValidationResult {
  // 1. Fundamental boundary checks
  if (isNaN(marksObtained)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid numeric score.',
      isSuspicious: false,
      evidenceStatus: 'Rejected',
    };
  }

  if (marksObtained > exam.totalMarks) {
    return {
      isValid: false,
      errorMessage: `Score (${marksObtained}) cannot exceed total marks (${exam.totalMarks}).`,
      isSuspicious: true,
      suspicionReason: 'Score exceeds maximum allowed marks.',
      evidenceStatus: 'Rejected',
    };
  }

  if (marksObtained < 0 && !exam.negativeMarking) {
    return {
      isValid: false,
      errorMessage: 'Negative marks are not permitted for this test.',
      isSuspicious: false,
      evidenceStatus: 'Rejected',
    };
  }

  // 2. Duplicate submission prevention (skipped during score updates)
  if (!isUpdate) {
    const existingForUser = existingSubmissions.find(
      (s) => s.examId === exam.id && s.userId === userId
    );
    if (existingForUser) {
      return {
        isValid: false,
        errorMessage: 'You have already submitted a score for this exam. You can edit your existing score instead.',
        isSuspicious: false,
        evidenceStatus: existingForUser.evidenceStatus,
      };
    }
  }

  // 3. Statistical Anomaly & Outlier heuristic
  const examScores = existingSubmissions
    .filter((s) => s.examId === exam.id && s.evidenceStatus !== 'Rejected')
    .map((s) => s.marksObtained);

  let isSuspicious = false;
  let suspicionReason: string | undefined;

  if (examScores.length >= 20) {
    const mean = examScores.reduce((a, b) => a + b, 0) / examScores.length;
    const variance =
      examScores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      examScores.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0) {
      const zScore = Math.abs((marksObtained - mean) / stdDev);
      if (zScore > 3.6 && !hasEvidence) {
        isSuspicious = true;
        suspicionReason = `Statistical anomaly detected (Z-score: ${zScore.toFixed(1)}). Score deviates dramatically from average without verified scorecard proof.`;
      }
    }
  }

  // 4. Perfect 100% score without verification in high difficulty tests
  if (marksObtained === exam.totalMarks && !hasEvidence && exam.totalMarks >= 100) {
    isSuspicious = true;
    suspicionReason = 'Maximum possible score (100%) submitted without verifiable scorecard evidence.';
  }

  // Determine initial status
  let evidenceStatus: ScoreSubmission['evidenceStatus'] = 'Reported';
  if (isSuspicious) {
    evidenceStatus = 'Suspicious';
  } else if (hasEvidence) {
    evidenceStatus = 'Evidence Submitted';
  }

  return {
    isValid: true,
    isSuspicious,
    suspicionReason,
    evidenceStatus,
  };
}
