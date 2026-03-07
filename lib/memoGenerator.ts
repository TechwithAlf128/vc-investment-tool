import { DealEvaluation, InvestmentMemo, Recommendation } from './types';

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  invest_high_priority: 'Invest — High Priority',
  invest: 'Invest',
  invest_small: 'Invest Small',
  watch: 'Watch / Monitor',
  pass: 'Pass',
};

export function generateMemo(ev: DealEvaluation): InvestmentMemo {
  const { category_scores, derived_scores, recommendation, red_flags, hard_screen, analyst_reviewed } = ev;

  const get = (field: string): string => {
    const f = (analyst_reviewed as Record<string, { value: unknown } | undefined>)[field];
    return String(f?.value ?? 'Unknown');
  };

  const sorted = [...category_scores].sort((a, b) => b.weighted_score - a.weighted_score);
  const topStrengths = sorted.slice(0, 3).map(s =>
    `${s.category.replace(/_/g, ' ')} (score: ${s.raw_score}/5)`
  );
  const topConcerns = sorted.slice(-3).reverse().map(s =>
    `${s.category.replace(/_/g, ' ')} (score: ${s.raw_score}/5)`
  );

  const missingFields = Object.entries(analyst_reviewed)
    .filter(([, v]) => !v || v.value === '' || v.value === null)
    .map(([k]) => k.replace(/_/g, ' '));

  const rec = recommendation ?? 'pass';

  return {
    company_overview: `${get('company_name')} is a ${get('stage').replace('_', '-')} stage company in ${get('hq_location')}, operating in ${get('sector')}. ${get('business_description')}`,
    stage_and_round: `Stage: ${get('stage').toUpperCase().replace('_', ' ')} | Round: ${get('round_type')} | Size: $${get('round_size_usd')} | Pre-money: $${get('pre_money_valuation_usd')}`,
    recommendation_label: RECOMMENDATION_LABELS[rec],
    recommendation_reasoning: `Based on a total score of ${derived_scores?.total_score ?? 'N/A'} (upside: ${derived_scores?.upside_score ?? 'N/A'}, proof: ${derived_scores?.proof_score ?? 'N/A'}, risk: ${derived_scores?.risk_score ?? 'N/A'}), the recommendation is ${RECOMMENDATION_LABELS[rec]}.${hard_screen ? ` Hard screen: ${hard_screen.status.toUpperCase()}.` : ''}`,
    top_strengths: topStrengths.length > 0 ? topStrengths : ['Insufficient data'],
    top_concerns: topConcerns.length > 0 ? topConcerns : ['No major concerns identified'],
    missing_diligence: missingFields.slice(0, 8),
    founder_questions: red_flags.flatMap(f => f.questions).slice(0, 5),
    follow_on_view: `Follow-on score: ${derived_scores?.follow_on_score ?? 'N/A'}. Pro-rata: ${get('pro_rata_available') !== 'Unknown' ? get('pro_rata_available') : 'unknown'}.`,
    generated_at: new Date().toISOString(),
  };
}
