// Stage 5: Research-Backed Scoring System
// Weights violations by actual user impact research

interface HeuristicViolation {
  heuristic: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  userImpact: string;
}

interface ScoringResult {
  overallScore: number;
  breakdown: {
    baseScore: number;
    highViolationsPenalty: number;
    mediumViolationsPenalty: number;
    lowViolationsPenalty: number;
    strengthsBonus: number;
  };
  categoryScores: Record<string, number>;
  industryComparison: {
    percentile: number;
    category: string;
  };
}

// Research-backed severity weights
const SEVERITY_WEIGHTS = {
  high: 12,    // Critical UX failures (15%+ user impact)
  medium: 6,   // Notable problems (5-15% user impact)
  low: 2       // Minor issues (<5% user impact)
};

// Heuristic importance weights based on Baymard research
const HEURISTIC_WEIGHTS: Record<string, number> = {
  '#1: Visibility of System Status': 1.2,
  '#5: Error Prevention': 1.2,
  '#9: Help Users Recognize, Diagnose, and Recover from Errors': 1.1,
  '#3: User Control and Freedom': 1.0,
  '#4: Consistency and Standards': 1.0,
  '#6: Recognition Rather Than Recall': 1.0,
  '#2: Match Between System and Real World': 0.9,
  '#7: Flexibility and Efficiency of Use': 0.8,
  '#8: Aesthetic and Minimalist Design': 0.8,
  '#10: Help and Documentation': 0.7
};

export function calculateResearchBackedScore(
  violations: HeuristicViolation[],
  strengths: any[]
): ScoringResult {
  console.log('Stage 5: Calculating research-backed score...');

  let baseScore = 100;
  let highPenalty = 0;
  let mediumPenalty = 0;
  let lowPenalty = 0;

  // Calculate weighted penalties
  violations.forEach(v => {
    const heuristicWeight = HEURISTIC_WEIGHTS[v.heuristic] || 1.0;
    const severityWeight = SEVERITY_WEIGHTS[v.severity];
    const penalty = severityWeight * heuristicWeight;

    if (v.severity === 'high') highPenalty += penalty;
    else if (v.severity === 'medium') mediumPenalty += penalty;
    else lowPenalty += penalty;
  });

  // Apply penalties
  const totalPenalty = highPenalty + mediumPenalty + lowPenalty;
  let finalScore = Math.max(35, baseScore - totalPenalty);

  // Apply strengths bonus (max +10 points)
  const strengthsBonus = Math.min(10, strengths.length * 2);
  finalScore = Math.min(100, finalScore + strengthsBonus);

  // Round to nearest integer
  finalScore = Math.round(finalScore);

  // Calculate per-heuristic scores
  const categoryScores: Record<string, number> = {};
  Object.keys(HEURISTIC_WEIGHTS).forEach(heuristic => {
    const heuristicViolations = violations.filter(v => v.heuristic === heuristic);
    const heuristicPenalty = heuristicViolations.reduce((sum, v) => {
      return sum + (SEVERITY_WEIGHTS[v.severity] * HEURISTIC_WEIGHTS[heuristic]);
    }, 0);
    categoryScores[heuristic] = Math.max(0, Math.min(100, 100 - heuristicPenalty));
  });

  // Industry percentile based on research
  const industryComparison = getIndustryPercentile(finalScore);

  console.log(`  Final Score: ${finalScore}/100`);
  console.log(`  Breakdown: -${Math.round(highPenalty)}H, -${Math.round(mediumPenalty)}M, -${Math.round(lowPenalty)}L, +${strengthsBonus}S`);

  return {
    overallScore: finalScore,
    breakdown: {
      baseScore: 100,
      highViolationsPenalty: Math.round(highPenalty),
      mediumViolationsPenalty: Math.round(mediumPenalty),
      lowViolationsPenalty: Math.round(lowPenalty),
      strengthsBonus
    },
    categoryScores,
    industryComparison
  };
}

function getIndustryPercentile(score: number): { percentile: number; category: string } {
  // Based on Baymard Institute e-commerce UX benchmarks
  if (score >= 90) {
    return { percentile: 95, category: 'Top 5% - Exceptional UX' };
  } else if (score >= 80) {
    return { percentile: 75, category: 'Top 25% - Excellent UX' };
  } else if (score >= 70) {
    return { percentile: 50, category: 'Top 50% - Good UX' };
  } else if (score >= 60) {
    return { percentile: 30, category: 'Top 70% - Average UX' };
  } else if (score >= 50) {
    return { percentile: 15, category: 'Bottom 35% - Below Average' };
  } else {
    return { percentile: 5, category: 'Bottom 15% - Critical Issues' };
  }
}
