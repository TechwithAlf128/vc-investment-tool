import { ScoringCategory, CategoryScore, DerivedScores, Stage } from './types';
import stageWeights from '../config/stage_weights.json';

type StageWeights = Record<ScoringCategory, number>;

export function calculateCategoryScores(
  inputs: Record<ScoringCategory, { raw_score: number; notes: string }>,
  stage: Stage
): CategoryScore[] {
  const weights = stageWeights[stage] as StageWeights;
  return Object.entries(inputs).map(([category, { raw_score, notes }]) => {
    const weight = weights[category as ScoringCategory] ?? 1;
    const weighted_score = parseFloat(((raw_score / 5) * weight).toFixed(3));
    return { category: category as ScoringCategory, raw_score, weight, weighted_score, notes };
  });
}

export function calculateDerivedScores(categoryScores: CategoryScore[]): DerivedScores {
  const get = (cat: string) => categoryScores.find(s => s.category === cat)?.weighted_score ?? 0;
  const total = categoryScores.reduce((sum, s) => sum + s.weighted_score, 0);
  const maxTotal = categoryScores.reduce((sum, s) => sum + s.weight, 0);
  return {
    total_score: parseFloat((maxTotal > 0 ? (total / maxTotal) * 5 : 0).toFixed(2)),
    upside_score: parseFloat(((get('market_attractiveness') + get('product_differentiation') + get('follow_on_potential_venture_fit')) / 3 * 5).toFixed(2)),
    proof_score: parseFloat(((get('traction_validation') + get('founder_team') + get('business_model_economics')) / 3 * 5).toFixed(2)),
    risk_score: parseFloat(((get('risk_execution_complexity') + get('deal_terms_entry_price')) / 2 * 5).toFixed(2)),
    follow_on_score: parseFloat((get('follow_on_potential_venture_fit') * 5).toFixed(2)),
  };
}
