import { DealEvaluation } from './types';

const STORAGE_KEY = 'vc_evaluations';

export function saveEvaluation(evaluation: DealEvaluation): void {
  const all = loadAllEvaluations();
  const idx = all.findIndex(e => e.id === evaluation.id);
  if (idx >= 0) {
    all[idx] = { ...evaluation, updated_at: new Date().toISOString() };
  } else {
    all.push(evaluation);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadAllEvaluations(): DealEvaluation[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DealEvaluation[];
  } catch {
    return [];
  }
}

export function loadEvaluation(id: string): DealEvaluation | null {
  return loadAllEvaluations().find(e => e.id === id) ?? null;
}

export function deleteEvaluation(id: string): void {
  const all = loadAllEvaluations().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function createNewEvaluation(
  company_name: string,
  source: 'manual' | 'pdf'
): DealEvaluation {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    company_name,
    stage: 'seed',
    raw_extracted: {},
    analyst_reviewed: {},
    hard_screen: null,
    category_scores: [],
    derived_scores: null,
    recommendation: null,
    red_flags: [],
    memo: null,
    review_complete: false,
    source,
  };
}
