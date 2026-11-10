import {
  ScoreSubmission,
  ExamFolder,
  CompetitiveStanding,
  ConfidenceLevel,
  CallingConfidence,
  QuotaComparisonStats,
} from '../types';

/**
 * Normalizes province / domicile strings for reliable cross-matching
 */
export function normalizeProvince(prov?: string): string {
  if (!prov) return 'all';
  const p = prov.toLowerCase().replace(/[\(\)\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
  if (p === 'all' || p === 'all pakistan' || p.includes('all pakistan') || p === 'federal') {
    return 'all';
  }
  if (p.includes('punjab')) return 'punjab';
  if (p.includes('sindh') && p.includes('urban')) return 'sindh urban';
  if (p.includes('sindh') && p.includes('rural')) return 'sindh rural';
  if (p.includes('sindh')) return 'sindh';
  if (p.includes('kpk') || p.includes('khyber') || p.includes('pakhtunkhwa')) return 'kpk';
  if (p.includes('baloch') || p.includes('baluch')) return 'balochistan';
  if (p.includes('islamabad') || p.includes('ict')) return 'islamabad';
  if (p.includes('gilgit') || p.includes('baltistan') || p.includes('gb')) return 'gilgit-baltistan';
  if (p.includes('ajk') || p.includes('kashmir')) return 'ajk';
  return p;
}

/**
 * Normalizes quota category strings for reliable cross-matching
 */
export function normalizeQuota(quota?: string): string {
  if (!quota) return 'all';
  const q = quota.toLowerCase().replace(/[\(\)\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
  if (q === 'all' || q === 'all quotas' || q.includes('all quota')) {
    return 'all';
  }
  if (q.includes('women') || q.includes('female')) return 'women';
  if (q.includes('minority') || q.includes('non muslim')) return 'minority';
  if (q.includes('disable') || q.includes('special')) return 'disabled';
  if (q.includes('provincial')) return 'provincial';
  if (q.includes('open') || q.includes('merit')) return 'open merit';
  return q;
}

/**
 * Checks whether a candidate submission matches a target province
 */
export function matchesProvince(subProv: string, targetProv?: string): boolean {
  if (!targetProv || targetProv === 'All') return true;
  const normTarget = normalizeProvince(targetProv);
  if (normTarget === 'all') return true;
  const normSub = normalizeProvince(subProv);
  if (normSub === normTarget) return true;
  if (normTarget === 'sindh' && (normSub === 'sindh urban' || normSub === 'sindh rural')) return true;
  return false;
}

/**
 * Checks whether a candidate submission matches a target quota category
 */
export function matchesQuota(subQuota: string, targetQuota?: string): boolean {
  if (!targetQuota || targetQuota === 'All' || targetQuota === 'All Quotas') return true;
  const normTarget = normalizeQuota(targetQuota);
  if (normTarget === 'all') return true;
  const normSub = normalizeQuota(subQuota);
  if (normSub === normTarget) return true;
  return false;
}

/**
 * Retrieves official allocated seats for a given province and quota from exam data
 */
export function getAllocatedSeatsForCategory(
  exam: ExamFolder,
  province?: string,
  quota?: string
): number {
  if (!exam.quotaAllocation) return 0;
  const normProv = normalizeProvince(province);
  const normQ = normalizeQuota(quota);

  // If specific quota category is requested
  if (normQ === 'women' && exam.quotaAllocation.womenQuota) return exam.quotaAllocation.womenQuota;
  if (normQ === 'minority' && exam.quotaAllocation.minorityQuota) return exam.quotaAllocation.minorityQuota;
  if (normQ === 'disabled' && exam.quotaAllocation.disabledQuota) return exam.quotaAllocation.disabledQuota;
  if (normQ === 'open merit' && normProv === 'all') return exam.quotaAllocation.openMerit || 0;

  // By province
  if (normProv === 'punjab') return exam.quotaAllocation.punjab || 0;
  if (normProv === 'sindh urban') return exam.quotaAllocation.sindhUrban || 0;
  if (normProv === 'sindh rural') return exam.quotaAllocation.sindhRural || 0;
  if (normProv === 'kpk') return exam.quotaAllocation.kpk || 0;
  if (normProv === 'balochistan') return exam.quotaAllocation.balochistan || 0;
  if (normProv === 'ajk' || normProv === 'gilgit-baltistan') return exam.quotaAllocation.ajkGb || 0;

  if (normProv === 'all' && normQ === 'all') return exam.totalVacancies || 0;
  return exam.quotaAllocation.openMerit || 0;
}

/**
 * Calculates statistically grounded competitive standing, percentiles,
 * score distribution, and estimated cutoffs while avoiding false precision.
 * Accurately compares against other candidates in the selected Province & Quota Category.
 */
export function calculateCompetitiveStanding(
  userScore: number,
  exam: ExamFolder,
  allSubmissions: ScoreSubmission[],
  userProvince?: string,
  userQuota?: string
): CompetitiveStanding {
  // Only evaluate valid non-rejected submissions for this exam
  const validSubmissions = allSubmissions.filter(
    (s) => s.examId === exam.id && s.evidenceStatus !== 'Rejected'
  );

  const scores = validSubmissions.map((s) => s.marksObtained).sort((a, b) => a - b);
  const totalScoresCount = scores.length;
  const percentage = Number(((userScore / exam.totalMarks) * 100).toFixed(1));

  // If empty or user score not in list, fallback
  if (totalScoresCount === 0) {
    const isPassing = userScore >= exam.passingMarks;
    return {
      userScore,
      totalMarks: exam.totalMarks,
      percentage,
      percentile: 0,
      estimatedPositionMin: 0,
      estimatedPositionMax: 0,
      totalScoresCount: 0,
      confidence: 'Very Low',
      confidenceReason: 'No scores contributed yet for this test.',
      callingConfidence: isPassing ? (percentage >= 80 ? 'Very High' : percentage >= 70 ? 'High' : 'Moderate') : 'Very Low',
      callingConfidenceReason: isPassing
        ? `Score of ${userScore}/${exam.totalMarks} (${percentage}%) meets passing criteria. Awaiting candidate submissions to establish category rank.`
        : `Score is below passing threshold (${exam.passingMarks}).`,
      competitiveLevel: 'Average',
      medianScore: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      standardDeviation: 0,
      estimatedCutoffMin: null,
      estimatedCutoffMax: null,
      cutoffConfidence: 'Very Low',
      distribution: [],
      quotaSubmissionsCount: 0,
    };
  }

  // Basic stats
  const sum = scores.reduce((acc, val) => acc + val, 0);
  const averageScore = Number((sum / totalScoresCount).toFixed(1));

  // Median
  const mid = Math.floor(totalScoresCount / 2);
  const medianScore =
    totalScoresCount % 2 !== 0
      ? scores[mid]
      : Number(((scores[mid - 1] + scores[mid]) / 2).toFixed(1));

  const highestScore = scores[scores.length - 1];
  const lowestScore = scores[0];

  // Standard Deviation
  const variance =
    scores.reduce((acc, val) => acc + Math.pow(val - averageScore, 2), 0) /
    totalScoresCount;
  const standardDeviation = Number(Math.sqrt(variance).toFixed(1));

  // Percentile:
  const strictlyBelow = scores.filter((s) => s < userScore).length;
  const ties = scores.filter((s) => s === userScore).length;
  const rawPercentile = ((strictlyBelow + 0.5 * Math.max(1, ties)) / totalScoresCount) * 100;
  const percentile = Number(Math.min(99.9, Math.max(0.1, rawPercentile)).toFixed(1));

  // =========================================================================
  // CONFIDENCE LEVEL CALCULATION (HIGH-SCORE SENSITIVE ALGORITHM)
  // Dynamically weighs:
  // 1. Score Superiority vs Aggregate Mean & Z-score (prevents high-score penalties)
  // 2. Recency-weighted high-score momentum from latest submissions
  // 3. Baseline dataset entry volume (non-punitive foundation)
  // =========================================================================

  // 1. Metric: Distance above Aggregate Mean
  const meanDiff = userScore - averageScore;
  const zScore = standardDeviation > 0 ? meanDiff / standardDeviation : 0;

  let scoreSensitivityPoints = 0;
  if (userScore >= averageScore) {
    if (zScore >= 1.8 || percentage >= 85) {
      scoreSensitivityPoints = 45; // Exceptional high score above mean
    } else if (zScore >= 1.0 || percentage >= 75) {
      scoreSensitivityPoints = 38; // Solid high score above mean
    } else if (zScore >= 0.5 || percentage >= 65) {
      scoreSensitivityPoints = 28; // Clear above-average score
    } else {
      scoreSensitivityPoints = 20; // Moderate above-mean score
    }
  } else {
    if (zScore >= -0.5) {
      scoreSensitivityPoints = 14;
    } else if (zScore >= -1.2) {
      scoreSensitivityPoints = 8;
    } else {
      scoreSensitivityPoints = 4;
    }
  }

  // 2. Metric: Recency-Weighted High-Score Momentum
  // Sort submissions chronologically descending (newest first)
  const chronologicalSubs = [...validSubmissions].sort((a, b) => {
    const tA = new Date(a.submittedAt).getTime() || 0;
    const tB = new Date(b.submittedAt).getTime() || 0;
    return tB - tA;
  });

  const recentWindow = chronologicalSubs.slice(0, 10);
  let totalRecencyWeight = 0;
  let weightedRecencySum = 0;
  let recentHighScoresCount = 0;

  recentWindow.forEach((sub, idx) => {
    // Exponential recency weight (newer submissions have higher weight)
    const weight = Math.pow(0.92, idx);
    weightedRecencySum += sub.marksObtained * weight;
    totalRecencyWeight += weight;

    if (sub.marksObtained >= averageScore) {
      recentHighScoresCount++;
    }
  });

  const recentWeightedMean = totalRecencyWeight > 0 ? weightedRecencySum / totalRecencyWeight : averageScore;

  let recencyPoints = 0;
  if (userScore >= recentWeightedMean && userScore >= averageScore) {
    if (userScore >= recentWeightedMean + (standardDeviation * 0.5) || userScore >= exam.totalMarks * 0.85) {
      recencyPoints = 35; // Strongly leads recent high-score submissions
    } else {
      recencyPoints = 28; // Aligns with or exceeds recent high scores
    }
  } else if (userScore >= recentWeightedMean) {
    recencyPoints = 20;
  } else if (recentHighScoresCount > 0 && userScore >= averageScore) {
    recencyPoints = 18;
  } else if (userScore >= (recentWeightedMean * 0.85)) {
    recencyPoints = 12;
  } else {
    recencyPoints = 6;
  }

  // 3. Metric: Baseline Entry Volume (Non-punitive foundation)
  let volumePoints = 0;
  if (totalScoresCount >= 200) volumePoints = 20;
  else if (totalScoresCount >= 50) volumePoints = 17;
  else if (totalScoresCount >= 20) volumePoints = 14;
  else if (totalScoresCount >= 10) volumePoints = 11;
  else if (totalScoresCount >= 5) volumePoints = 8;
  else volumePoints = 5;

  // Composite Confidence Score (0 to 100)
  const compositeConfidenceScore = Math.min(100, scoreSensitivityPoints + recencyPoints + volumePoints);

  let confidence: ConfidenceLevel = 'Medium';
  let confidenceReason = '';

  if (compositeConfidenceScore >= 72) {
    confidence = 'Very High';
    if (userScore > averageScore) {
      const margin = (userScore - averageScore).toFixed(1);
      confidenceReason = `High-tier score (+${margin} pts above aggregate mean). Validated against recent submission trends.`;
    } else {
      confidenceReason = `Extensive verified dataset with established statistical significance.`;
    }
  } else if (compositeConfidenceScore >= 52) {
    confidence = 'High';
    if (userScore >= averageScore) {
      confidenceReason = `Solid score outperforming aggregate mean (${averageScore}). Backed by favorable recent submissions.`;
    } else {
      confidenceReason = `Consistent submission sample (${totalScoresCount} entries) establishing reliable benchmark.`;
    }
  } else if (compositeConfidenceScore >= 34) {
    confidence = 'Medium';
    confidenceReason = `Moderate confidence based on ${totalScoresCount} submissions and current aggregate mean (${averageScore}).`;
  } else if (compositeConfidenceScore >= 20) {
    confidence = 'Low';
    confidenceReason = `Score trailing aggregate mean (${averageScore}) within an early submission pool.`;
  } else {
    confidence = 'Very Low';
    confidenceReason = `Score significantly below aggregate mean (${averageScore}) in limited sample.`;
  }

  // Estimated Position in general pool
  const estimatedTotalTakers = Math.max(
    totalScoresCount,
    (exam.totalVacancies || 20) * 75
  );

  let estimatedPositionMin = 0;
  let estimatedPositionMax = 0;

  if (totalScoresCount >= 8) {
    const fractionAbove = Math.max(0.005, (100 - percentile) / 100);
    const centerRank = Math.round(fractionAbove * estimatedTotalTakers);

    let spreadFactor = 0.25;
    if (confidence === 'Low') spreadFactor = 0.35;
    if (confidence === 'Medium') spreadFactor = 0.18;
    if (confidence === 'High') spreadFactor = 0.10;
    if (confidence === 'Very High') spreadFactor = 0.05;

    estimatedPositionMin = Math.max(1, Math.round(centerRank * (1 - spreadFactor)));
    estimatedPositionMax = Math.max(
      estimatedPositionMin + 1,
      Math.round(centerRank * (1 + spreadFactor))
    );
  } else {
    // If < 8, provide direct ranking within current sample
    const directRank = scores.filter((s) => s > userScore).length + 1;
    estimatedPositionMin = directRank;
    estimatedPositionMax = directRank;
  }

  // Competitive Tier
  let competitiveLevel: CompetitiveStanding['competitiveLevel'] = 'Average';
  if (percentile >= 99) competitiveLevel = 'Outstanding (Top 1%)';
  else if (percentile >= 95) competitiveLevel = 'Very Strong (Top 5%)';
  else if (percentile >= 90) competitiveLevel = 'Strong (Top 10%)';
  else if (percentile >= 75) competitiveLevel = 'Competitive (Top 25%)';
  else if (percentile >= 55) competitiveLevel = 'Above Average';
  else if (percentile >= 40) competitiveLevel = 'Average';
  else competitiveLevel = 'Below Average';

  // Score Distribution Buckets (10 intervals across totalMarks)
  const binCount = 10;
  const binStep = exam.totalMarks / binCount;
  const distribution: CompetitiveStanding['distribution'] = [];

  for (let i = 0; i < binCount; i++) {
    const binMin = Math.round(i * binStep);
    const binMax = Math.round((i + 1) * binStep);
    const count = scores.filter((s) =>
      i === binCount - 1 ? s >= binMin && s <= binMax : s >= binMin && s < binMax
    ).length;
    const pct = totalScoresCount > 0 ? Number(((count / totalScoresCount) * 100).toFixed(1)) : 0;
    distribution.push({
      rangeLabel: `${binMin}–${binMax}`,
      min: binMin,
      max: binMax,
      count,
      percentage: pct,
    });
  }

  // Estimated Cutoff calculation based on seats & shortlisting ratio
  let estimatedCutoffMin: number | null = null;
  let estimatedCutoffMax: number | null = null;
  let cutoffConfidence: ConfidenceLevel = 'Very Low';

  if (totalScoresCount >= 8 && exam.totalVacancies > 0) {
    const seats = exam.totalVacancies;
    const interviewCount = seats * 5;
    const topFractionNeeded = Math.min(0.8, Math.max(0.01, interviewCount / estimatedTotalTakers));
    const targetPercentile = 100 - (topFractionNeeded * 100);

    const targetIndex = Math.min(
      scores.length - 1,
      Math.max(0, Math.floor((targetPercentile / 100) * scores.length))
    );
    const baseCutoffScore = scores[targetIndex];

    const margin = totalScoresCount < 50 ? 4 : totalScoresCount < 200 ? 3 : 2;
    estimatedCutoffMin = Math.max(exam.passingMarks, baseCutoffScore - margin);
    estimatedCutoffMax = Math.min(exam.totalMarks, baseCutoffScore + margin);
    cutoffConfidence = confidence;
  }

  // =========================================================================
  // PROVINCE & QUOTA CATEGORY COMPARATIVE CALCULATION
  // =========================================================================
  const hasTargetProv = Boolean(userProvince && userProvince !== 'All' && normalizeProvince(userProvince) !== 'all');
  const hasTargetQuota = Boolean(userQuota && userQuota !== 'All' && normalizeQuota(userQuota) !== 'all');

  let quotaSubmissionsCount = 0;
  let quotaPercentile: number | undefined;
  let quotaEstimatedPosition: string | undefined;
  let quotaComparison: QuotaComparisonStats | undefined;

  // Determine comparison pool of other candidates
  let categoryPool: ScoreSubmission[] = [];
  let categoryLabel = 'All Candidates (Open Merit)';

  if (hasTargetProv && hasTargetQuota) {
    // Both province and quota specified (e.g. Sindh Rural · Women Quota)
    categoryPool = validSubmissions.filter(
      (s) => matchesProvince(s.province, userProvince) && matchesQuota(s.quota, userQuota)
    );
    categoryLabel = `${userProvince} · ${userQuota}`;

    // If no submissions match both, fall back gracefully to matching province
    if (categoryPool.length === 0) {
      categoryPool = validSubmissions.filter((s) => matchesProvince(s.province, userProvince));
      categoryLabel = `${userProvince} Quota`;
    }
  } else if (hasTargetProv) {
    categoryPool = validSubmissions.filter((s) => matchesProvince(s.province, userProvince));
    categoryLabel = `${userProvince} Quota`;
  } else if (hasTargetQuota) {
    categoryPool = validSubmissions.filter((s) => matchesQuota(s.quota, userQuota));
    categoryLabel = `${userQuota} Category`;
  } else {
    // Default open comparison
    categoryPool = validSubmissions;
    categoryLabel = 'Open Merit / General Pool';
  }

  const categoryScores = categoryPool.map((s) => s.marksObtained).sort((a, b) => a - b);
  quotaSubmissionsCount = categoryScores.length;

  if (quotaSubmissionsCount > 0) {
    const scoresAbove = categoryScores.filter((s) => s > userScore).length;
    const scoresBelow = categoryScores.filter((s) => s < userScore).length;
    const scoresTied = categoryScores.filter((s) => s === userScore).length;

    // Rank 1-indexed (standard sports & academic ranking)
    const rank = scoresAbove + 1;

    // Category percentile
    const rawCategoryPercentile =
      ((scoresBelow + 0.5 * Math.max(1, scoresTied)) / quotaSubmissionsCount) * 100;
    quotaPercentile = Number(
      Math.min(99.9, Math.max(0.1, rawCategoryPercentile)).toFixed(1)
    );

    // Category median, average, highest, lowest
    const cMid = Math.floor(quotaSubmissionsCount / 2);
    const medianScoreCategory =
      quotaSubmissionsCount % 2 !== 0
        ? categoryScores[cMid]
        : Number(((categoryScores[cMid - 1] + categoryScores[cMid]) / 2).toFixed(1));

    const avgScoreCategory = Number(
      (categoryScores.reduce((a, b) => a + b, 0) / quotaSubmissionsCount).toFixed(1)
    );
    const highestScoreCategory = categoryScores[categoryScores.length - 1];
    const lowestScoreCategory = categoryScores[0];

    // Allocated seats for this province / quota category
    const allocatedSeats = getAllocatedSeatsForCategory(exam, userProvince, userQuota);
    const shortlistRankCutoff = allocatedSeats > 0 ? allocatedSeats * 5 : undefined;
    const isLikelyShortlisted = shortlistRankCutoff ? rank <= shortlistRankCutoff : rank <= 5;

    // Formulate clear, affirmative position description
    if (rank === 1) {
      quotaEstimatedPosition = `Rank #1 of ${quotaSubmissionsCount} candidates in ${categoryLabel}`;
    } else if (quotaPercentile >= 90) {
      quotaEstimatedPosition = `Rank #${rank} of ${quotaSubmissionsCount} in ${categoryLabel} (Top 10%)`;
    } else if (quotaPercentile >= 75) {
      quotaEstimatedPosition = `Rank #${rank} of ${quotaSubmissionsCount} in ${categoryLabel} (Top 25%)`;
    } else {
      quotaEstimatedPosition = `Rank #${rank} of ${quotaSubmissionsCount} candidates in ${categoryLabel}`;
    }

    quotaComparison = {
      categoryName: categoryLabel,
      province: userProvince || 'All',
      quota: userQuota || 'All',
      totalCandidates: quotaSubmissionsCount,
      rank,
      percentile: quotaPercentile,
      positionDescription: quotaEstimatedPosition,
      medianScore: medianScoreCategory,
      averageScore: avgScoreCategory,
      highestScore: highestScoreCategory,
      lowestScore: lowestScoreCategory,
      scoresAbove,
      scoresBelow,
      scoresTied,
      allocatedSeats,
      isLikelyShortlisted,
      shortlistRankCutoff,
    };
  }

  // =========================================================================
  // INTERVIEW CALLING / SHORTLIST CONFIDENCE LOGIC
  // Directly evaluates the candidate's marks, percentage, and quota standing
  // =========================================================================
  let callingConfidence: CallingConfidence = 'Moderate';
  let callingConfidenceReason = '';

  const passMark = exam.passingMarks || 40;
  const isPassing = userScore >= passMark;

  if (!isPassing) {
    callingConfidence = 'Very Low';
    callingConfidenceReason = `Score of ${userScore} is below the qualifying cutoff (${passMark} marks). Qualifying pass required for interview calling.`;
  } else if (quotaComparison) {
    const { rank, allocatedSeats, totalCandidates, percentile: catPercentile } = quotaComparison;

    if (allocatedSeats && allocatedSeats > 0) {
      // Pakistani commissions (FPSC, PPSC, SPSC, KPPSC) standard calling ratio is 1:5
      const interviewCallingQuota = allocatedSeats * 5;

      if (rank <= Math.max(1, Math.round(allocatedSeats * 1.5)) || rank === 1) {
        callingConfidence = 'Very High';
        callingConfidenceReason = `Rank #${rank} of ${totalCandidates} for ${allocatedSeats} seats (calling top ${interviewCallingQuota}). Prime interview shortlist bracket.`;
      } else if (rank <= interviewCallingQuota) {
        callingConfidence = 'High';
        callingConfidenceReason = `Rank #${rank} in ${quotaComparison.categoryName}. Inside official interview calling quota (${interviewCallingQuota} candidates).`;
      } else if (rank <= Math.round(interviewCallingQuota * 1.4)) {
        callingConfidence = 'Moderate';
        callingConfidenceReason = `Rank #${rank} of ${totalCandidates}. Borderline calling zone (${interviewCallingQuota} interview seats); subject to official verification.`;
      } else if (catPercentile >= 65 || percentage >= 70) {
        callingConfidence = 'Moderate';
        callingConfidenceReason = `Solid category score (${catPercentile}th percentile, ${percentage}%). High overall standing; category competition is close.`;
      } else if (catPercentile >= 35) {
        callingConfidence = 'Low';
        callingConfidenceReason = `Rank #${rank} of ${totalCandidates} (${catPercentile}th percentile). Trailing the interview call bracket.`;
      } else {
        callingConfidence = 'Very Low';
        callingConfidenceReason = `Lower percentile (${catPercentile}%) in ${quotaComparison.categoryName}. Low probability of interview selection.`;
      }
    } else {
      // When specific seat breakdown is not partitioned, calculate based on category percentile & mark %
      if (catPercentile >= 90 || percentage >= 80 || rank === 1) {
        callingConfidence = 'Very High';
        callingConfidenceReason = `Rank #${rank} of ${totalCandidates} (${catPercentile}th percentile, ${percentage}% marks). Outstanding shortlist prospects.`;
      } else if (catPercentile >= 75 || percentage >= 70 || rank <= 5) {
        callingConfidence = 'High';
        callingConfidenceReason = `Rank #${rank} (${catPercentile}th percentile, ${percentage}% marks). High probability of interview call.`;
      } else if (catPercentile >= 50 || percentage >= 55) {
        callingConfidence = 'Moderate';
        callingConfidenceReason = `Mid-tier competitive score (${catPercentile}th percentile). Calling depends on total vacancies.`;
      } else if (catPercentile >= 30) {
        callingConfidence = 'Low';
        callingConfidenceReason = `Score in ${catPercentile}th percentile. Trailing top contenders in this category.`;
      } else {
        callingConfidence = 'Very Low';
        callingConfidenceReason = `Lower merit tier (${catPercentile}th percentile). Low probability of interview selection.`;
      }
    }
  } else {
    // Open merit general pool fallback
    if (percentile >= 90 || percentage >= 80) {
      callingConfidence = 'Very High';
      callingConfidenceReason = `Top-tier candidate (${percentage}% score, ${percentile}th percentile). Exceptional interview shortlist prospects.`;
    } else if (percentile >= 75 || percentage >= 70) {
      callingConfidence = 'High';
      callingConfidenceReason = `Strong test performance (${percentile}th percentile, ${percentage}%). High calling probability.`;
    } else if (percentile >= 50 || percentage >= 55) {
      callingConfidence = 'Moderate';
      callingConfidenceReason = `Competitive mid-range (${percentile}th percentile). Calling will depend on overall applicant volume.`;
    } else if (percentile >= 30) {
      callingConfidence = 'Low';
      callingConfidenceReason = `Percentile ${percentile}%. Trailing current open merit benchmark.`;
    } else {
      callingConfidence = 'Very Low';
      callingConfidenceReason = `Percentile ${percentile}%. Low probability of reaching interview stage.`;
    }
  }

  return {
    userScore,
    totalMarks: exam.totalMarks,
    percentage,
    percentile,
    estimatedPositionMin,
    estimatedPositionMax,
    totalScoresCount,
    confidence,
    confidenceReason,
    callingConfidence,
    callingConfidenceReason,
    competitiveLevel,
    medianScore,
    averageScore,
    highestScore,
    lowestScore,
    standardDeviation,
    estimatedCutoffMin,
    estimatedCutoffMax,
    cutoffConfidence,
    distribution,
    quotaSubmissionsCount,
    quotaPercentile,
    quotaEstimatedPosition,
    quotaComparison,
  };
}
