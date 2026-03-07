import { Recommendation, DerivedScores, RedFlag } from './types';
import rules from '../config/recommendation_rules.json';

export interface RecommendationResult {
  recommendation: Recommendation;
  reasoning: string[];
  overrides_applied: string[];
}

export function getRecommendation(
  derived: DerivedScores,
  redFlags: RedFlag[]
): RecommendationResult {
  const reasoning: string[] = [];
  const overrides_applied: string[] = [];

  // Base recommendation from total score
  let recommendation: Recommendation = 'pass';
  const score = derived.total_score;

  for (const [rec, range] of Object.entries(rules.thresholds)) {
    if (score >= range.min && score <= range.max) {
      recommendation = rec as Recommendation;
      break;
    }
  }
  reasoning.push(`Base score ${score} maps to: ${recommendation}`);

  // Override: severity 4 red flag
  const severity4 = redFlags.filter(f => f.severity === 4);
  if (severity4.length > 0) {
    recommendation = 'pass';
    overrides_applied.push('Severity 4 red flag forces Pass');
    reasoning.push(`Override: ${severity4[0].triggered_by}`);
  }

  // Override: 2+ severity 3 red flags
  const severity3 = redFlags.filter(f => f.severity === 3);
  if (severity3.length >= 2 && recommendation !== 'pass') {
    const order: Recommendation[] = ['invest_high_priority', 'invest', 'invest_small', 'watch', 'pass'];
    const idx = order.indexOf(recommendation);
    if (idx < order.indexOf('watch')) {
      recommendation = 'watch';
      overrides_applied.push('Two severity 3 red flags cap at Watch');
      reasoning.push('Override: Multiple serious red flags limit recommendation to Watch');
    }
  }

  // Override: high upside + weak proof = cap at invest_small
  if (derived.upside_score >= 80 && derived.proof_score < 40) {
    const order: Recommendation[] = ['invest_high_priority', 'invest', 'invest_small', 'watch', 'pass'];
    const idx = order.indexOf(recommendation);
    if (idx < order.indexOf('invest_small')) {
      recommendation = 'invest_small';
      overrides_applied.push('High upside + weak proof caps at Invest Small');
      reasoning.push('Override: Strong potential but insufficient proof limits to Invest Small');
    }
  }

  // Override: high execution risk - downgrade one level
  if (derived.risk_score < 30) {
    const order: Recommendation[] = ['invest_high_priority', 'invest', 'invest_small', 'watch', 'pass'];
    const idx = order.indexOf(recommendation);
    if (idx < order.length - 1) {
      recommendation = order[idx + 1];
      overrides_applied.push('High execution risk downgrades one level');
      reasoning.push('Override: High execution risk reduces recommendation by one level');
    }
  }

  return { recommendation, reasoning, overrides_applied };
}
