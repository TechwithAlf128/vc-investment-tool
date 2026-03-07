export type Stage = 'pre_seed' | 'seed' | 'series_a';

export type ScoringCategory =
  | 'market_attractiveness'
  | 'founder_team'
  | 'product_differentiation'
  | 'traction_validation'
  | 'business_model_economics'
  | 'financing_syndicate_quality'
  | 'deal_terms_entry_price'
  | 'risk_execution_complexity'
  | 'follow_on_potential_venture_fit';

export type Recommendation =
  | 'invest_high_priority'
  | 'invest'
  | 'invest_small'
  | 'watch'
  | 'pass';

export interface ExtractedField {
  value: unknown;
  confidence: number;
  page: number | null;
  source_text: string | null;
  status: 'extracted' | 'needs_review' | 'analyst_confirmed' | 'analyst_overridden';
}

export type ExtractedDeal = Record<string, ExtractedField>;

export interface HardScreenResult {
  status: 'pass' | 'fail' | 'escalate';
  reasons: string[];
  flags: string[];
}

export interface CategoryScore {
  category: ScoringCategory;
  raw_score: number;
  weight: number;
  weighted_score: number;
  notes: string;
}

export interface DerivedScores {
  upside_score: number;
  proof_score: number;
  risk_score: number;
  total_score: number;
  follow_on_score: number;
}

export interface RedFlag {
  category: ScoringCategory;
  severity: 1 | 2 | 3 | 4;
  triggered_by: string;
  questions: string[];
}

export interface InvestmentMemo {
  company_overview: string;
  stage_and_round: string;
  recommendation_label: string;
  recommendation_reasoning: string;
  top_strengths: string[];
  top_concerns: string[];
  missing_diligence: string[];
  founder_questions: string[];
  follow_on_view: string;
  generated_at: string;
}

export interface DealEvaluation {
  id: string;
  company_name: string;
  stage: Stage;
  source: 'manual' | 'pdf';
  created_at: string;
  updated_at: string;
  pdf_filename?: string;
  raw_extracted: Partial<ExtractedDeal>;
  analyst_reviewed: Partial<ExtractedDeal>;
  review_complete: boolean;
  hard_screen: HardScreenResult | null;
  red_flags: RedFlag[];
  category_scores: CategoryScore[];
  derived_scores: DerivedScores | null;
  recommendation: Recommendation | null;
  memo: InvestmentMemo | null;
}
