import { ExtractedDeal } from './types';
import extractionRules from '../config/extraction_rules.json';

export interface ValidationResult {
  valid: boolean;
  missing_required: string[];
  low_confidence: string[];
  needs_review: string[];
}

export function validateReviewComplete(
  reviewed: Partial<ExtractedDeal>
): ValidationResult {
  const required = extractionRules.required_review_fields;
  const missing_required: string[] = [];
  const low_confidence: string[] = [];
  const needs_review: string[] = [];

  for (const field of required) {
    const f = reviewed[field as keyof ExtractedDeal] as
      | { value: unknown; confidence: number; status: string }
      | undefined;

    if (!f || f.status === 'not_found') {
      missing_required.push(field);
    } else if (f.status === 'needs_review') {
      needs_review.push(field);
    } else if (f.confidence < extractionRules.confidence_thresholds.medium) {
      low_confidence.push(field);
    }
  }

  return {
    valid: missing_required.length === 0 && needs_review.length === 0,
    missing_required,
    low_confidence,
    needs_review,
  };
}

export function getFieldStatus(
  field: { value: unknown; confidence: number; status: string } | undefined
): 'confirmed' | 'low_confidence' | 'missing' | 'needs_review' | 'unknown' {
  if (!field) return 'missing';
  if (field.status === 'analyst_confirmed' || field.status === 'analyst_corrected') return 'confirmed';
  if (field.status === 'analyst_unknown') return 'unknown';
  if (field.status === 'not_found') return 'missing';
  if (field.status === 'needs_review') return 'needs_review';
  if (field.confidence < 0.5) return 'low_confidence';
  return 'confirmed';
}
