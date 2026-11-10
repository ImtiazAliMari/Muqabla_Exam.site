export type UserRole = 'candidate' | 'manager' | 'admin';

export type ExamStatus =
  | 'Community Created'
  | 'Under Review'
  | 'Verified'
  | 'Result Released'
  | 'Score Collection'
  | 'Analysis Available'
  | 'Shortlist Announced'
  | 'Completed'
  | 'Archived';

export type InformationSource = 'OFFICIAL' | 'COMMUNITY' | 'PLATFORM_ESTIMATE';

export type EvidenceStatus =
  | 'Reported'
  | 'Evidence Submitted'
  | 'Verified'
  | 'Suspicious'
  | 'Rejected';

export type ConfidenceLevel = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export interface QuotaAllocation {
  openMerit: number;
  punjab: number;
  sindhUrban: number;
  sindhRural: number;
  kpk: number;
  balochistan: number;
  exFata?: number;
  ajkGb?: number;
  womenQuota?: number;
  minorityQuota?: number;
  disabledQuota?: number;
}

export interface OfficialUpdate {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'advertisement' | 'answer_key' | 'result' | 'shortlist' | 'interview' | 'corrigendum';
  officialUrl?: string;
  source: 'OFFICIAL';
  verifiedByAdmin: boolean;
}

export interface ExamComment {
  id: string;
  examId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userProvince?: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface HistoricalComparison {
  year: number;
  estimatedCutoff: string;
  actualCutoff: string;
  totalCandidates: number;
  accuracy: string;
  notes?: string;
}

export interface ExamFolder {
  id: string;
  name: string;
  organization: string;
  testingAgency: string;
  jobPost: string;
  department: string;
  bpsScale?: string;
  testDate: string;
  resultDate?: string;
  totalMarks: number;
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarkingValue?: number;
  testType: string;
  
  // Seats and Shortlisting
  totalVacancies: number;
  quotaAllocation: QuotaAllocation;
  shortlistRatio?: string;
  interviewRatio?: string;
  
  province: string;
  status: ExamStatus;
  
  // Official Links & Documents
  officialAdvertisementUrl?: string;
  officialAnswerKeyUrl?: string;
  officialResultUrl?: string;
  officialShortlistUrl?: string;
  
  // Cutoff
  officialCutoff?: number | null;
  officialShortlistDate?: string;
  
  // Management
  managerId: string;
  managerName: string;
  managerEmail?: string;
  isVerified: boolean;
  verificationRequested: boolean;
  createdAt: string;
  lastUpdated: string;
  
  // Community engagement
  followersCount: number;
  additionalNotes?: string;
  
  // Historical data
  historicalRecords: HistoricalComparison[];
}

export interface ScoreSubmission {
  id: string;
  examId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  province: string;
  quota: string;
  rollNumberMasked?: string;
  evidenceProvided: boolean;
  evidenceUrl?: string;
  evidenceStatus: EvidenceStatus;
  userComments?: string;
  submittedAt: string;
  isFlagged: boolean;
  flagReason?: string;
}

export interface ExamReport {
  id: string;
  examId: string;
  examName: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reason: 'incorrect_info' | 'fraudulent_scores' | 'duplicate_exam' | 'spam' | 'other';
  details: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  examId: string;
  examName: string;
  type: 'result_announced' | 'new_scores' | 'analysis_updated' | 'shortlist_released' | 'verified';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface QuotaComparisonStats {
  categoryName: string;
  province: string;
  quota: string;
  totalCandidates: number;
  rank: number;
  percentile: number;
  positionDescription: string;
  medianScore: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  scoresAbove: number;
  scoresBelow: number;
  scoresTied: number;
  allocatedSeats?: number;
  isLikelyShortlisted?: boolean;
  shortlistRankCutoff?: number;
}

export type CallingConfidence = 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';

export interface CompetitiveStanding {
  userScore: number;
  totalMarks: number;
  percentage: number;
  percentile: number;
  estimatedPositionMin: number;
  estimatedPositionMax: number;
  totalScoresCount: number;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  callingConfidence: CallingConfidence;
  callingConfidenceReason: string;
  competitiveLevel: 'Outstanding (Top 1%)' | 'Very Strong (Top 5%)' | 'Strong (Top 10%)' | 'Competitive (Top 25%)' | 'Above Average' | 'Average' | 'Below Average';
  medianScore: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
  
  estimatedCutoffMin: number | null;
  estimatedCutoffMax: number | null;
  cutoffConfidence: ConfidenceLevel;
  
  distribution: {
    rangeLabel: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }[];
  
  quotaSubmissionsCount: number;
  quotaPercentile?: number;
  quotaEstimatedPosition?: string;
  quotaComparison?: QuotaComparisonStats;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  province?: string;
  domicile?: string;
  education?: string;
  degree?: string;
  targetAgencies?: string[];
  isVerified?: boolean;
  trustScore?: number;
  createdAt?: string;
}
