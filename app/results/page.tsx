'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadEvaluation, saveEvaluation } from '@/lib/persistence';
import { DealEvaluation, ScoringCategory, Recommendation } from '@/lib/types';
import { runHardScreen } from '@/lib/hardScreen';
import { calculateCategoryScores, calculateDerivedScores } from '@/lib/scoring';
import { detectRedFlags } from '@/lib/redFlags';
import { getRecommendation } from '@/lib/recommendation';
import { generateMemo } from '@/lib/memoGenerator';

const CATEGORIES: ScoringCategory[] = [
  'market_attractiveness','founder_team','product_differentiation',
  'traction_validation','business_model_economics','financing_syndicate_quality',
  'deal_terms_entry_price','risk_execution_complexity','follow_on_potential_venture_fit',
];

const REC_COLORS: Record<Recommendation, string> = {
  invest_high_priority: 'bg-green-100 text-green-800 border-green-300',
  invest: 'bg-green-50 text-green-700 border-green-200',
  invest_small: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  watch: 'bg-orange-50 text-orange-700 border-orange-200',
  pass: 'bg-red-50 text-red-700 border-red-200',
};

const SEV = ['','text-gray-500','text-yellow-600','text-orange-600','text-red-600 font-bold'];

function ResultsInner() {
  const params = useSearchParams();
  const id = params.get('id');
  const [ev, setEv] = useState<DealEvaluation | null>(null);
  const [scores, setScores] = useState<Record<ScoringCategory, number>>({} as Record<ScoringCategory, number>);
  const [scored, setScored] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loaded = loadEvaluation(id);
    if (!loaded) return;
    setEv(loaded);
    const init = {} as Record<ScoringCategory, number>;
    for (const cat of CATEGORIES) {
      const ex = loaded.category_scores.find(s => s.category === cat);
      init[cat] = ex?.raw_score ?? 3;
    }
    setScores(init);
    setScored(loaded.category_scores.length > 0);
  }, [id]);

  if (!ev) return <div className="p-8 text-gray-500">Loading...</div>;

  const runScoring = () => {
    const hardScreen = runHardScreen(ev.analyst_reviewed);
    const redFlags = detectRedFlags(ev.analyst_reviewed);
    const inputs = Object.fromEntries(
      CATEGORIES.map(cat => [cat, { raw_score: scores[cat], notes: '' }])
    ) as Record<ScoringCategory, { raw_score: number; notes: string }>;
    const categoryScores = calculateCategoryScores(inputs, ev.stage);
    const derived = calculateDerivedScores(categoryScores);
    const { recommendation } = getRecommendation(derived, redFlags);
    const updated: DealEvaluation = {
      ...ev, hard_screen: hardScreen, red_flags: redFlags,
      category_scores: categoryScores, derived_scores: derived,
      recommendation, updated_at: new Date().toISOString(),
    };
    updated.memo = generateMemo(updated);
    saveEvaluation(updated);
    setEv(updated);
    setScored(true);
  };

  const get = (field: string) => {
    const f = (ev.analyst_reviewed as Record<string, { value: unknown } | undefined>)[field];
    return String(f?.value ?? '—');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ev.company_name}</h1>
            <p className="text-gray-500 text-sm">{ev.stage} · {ev.source} · {get('hq_location')} · {get('sector')}</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline text-sm">← Home</Link>
        </div>

        {ev.hard_screen && (
          <div className={`border rounded-lg p-4 ${ev.hard_screen.status === 'pass' ? 'bg-green-50 border-green-200' : ev.hard_screen.status === 'fail' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="font-semibold text-sm mb-1">Hard Screen: {ev.hard_screen.status.toUpperCase()}</div>
            {ev.hard_screen.reasons.map((r, i) => <div key={i} className="text-sm text-gray-700">{r}</div>)}
          </div>
        )}

        {ev.recommendation && (
          <div className={`border-2 rounded-lg p-5 ${REC_COLORS[ev.recommendation]}`}>
            <div className="text-xl font-bold mb-1">{ev.recommendation.replace(/_/g, ' ').toUpperCase()}</div>
            {ev.derived_scores && (
              <div className="text-sm mt-1 space-x-4">
                <span>Total: <strong>{ev.derived_scores.total_score}</strong></span>
                <span>Upside: <strong>{ev.derived_scores.upside_score}</strong></span>
                <span>Proof: <strong>{ev.derived_scores.proof_score}</strong></span>
                <span>Risk: <strong>{ev.derived_scores.risk_score}</strong></span>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Category Scores (1–5)</h2>
          <div className="space-y-3">
            {CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center gap-4">
                <div className="w-60 text-sm text-gray-700 capitalize">{cat.replace(/_/g, ' ')}</div>
                <input type="range" min={1} max={5} step={1} value={scores[cat] ?? 3}
                  onChange={e => setScores(s => ({ ...s, [cat]: Number(e.target.value) }))} className="flex-1" />
                <div className="w-6 text-center font-semibold text-gray-800">{scores[cat] ?? 3}</div>
                {ev.category_scores.find(s => s.category === cat) && (
                  <div className="text-xs text-gray-400 w-20 text-right">
                    weighted: {ev.category_scores.find(s => s.category === cat)?.weighted_score.toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={runScoring} className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">
            {scored ? 'Recalculate' : 'Run Scoring'}
          </button>
        </div>

        {ev.red_flags.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Red Flags</h2>
            <div className="space-y-3">
              {ev.red_flags.map((f, i) => (
                <div key={i} className="border border-gray-100 rounded p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium capitalize text-sm">{f.category.replace(/_/g, ' ')}</span>
                    <span className={`text-sm ${SEV[f.severity]}`}>Severity {f.severity}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{f.triggered_by}</div>
                  <div className="text-xs text-gray-500">{f.questions.map((q, j) => <div key={j}>• {q}</div>)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ev.memo && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Investment Memo</h2>
            <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Overview</div><p className="text-sm text-gray-700">{ev.memo.company_overview}</p></div>
            <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Round</div><p className="text-sm text-gray-700">{ev.memo.stage_and_round}</p></div>
            <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Reasoning</div><p className="text-sm text-gray-700">{ev.memo.recommendation_reasoning}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-2">Strengths</div>{ev.memo.top_strengths.map((s, i) => <div key={i} className="text-sm text-gray-700 mb-1">✓ {s}</div>)}</div>
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-2">Concerns</div>{ev.memo.top_concerns.map((s, i) => <div key={i} className="text-sm text-gray-700 mb-1">⚠ {s}</div>)}</div>
            </div>
            {ev.memo.founder_questions.length > 0 && (
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-2">Founder Questions</div>{ev.memo.founder_questions.map((s, i) => <div key={i} className="text-sm text-gray-700 mb-1">? {s}</div>)}</div>
            )}
            <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Follow-on View</div><p className="text-sm text-gray-700">{ev.memo.follow_on_view}</p></div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className='p-8 text-gray-500'>Loading...</div>}>
      <ResultsInner />
    </Suspense>
  );
}
