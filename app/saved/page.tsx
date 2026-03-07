'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadAllEvaluations, deleteEvaluation } from '@/lib/persistence';
import { DealEvaluation } from '@/lib/types';

export default function SavedPage() {
  const [evaluations, setEvaluations] = useState<DealEvaluation[]>([]);

  useEffect(() => { setEvaluations(loadAllEvaluations()); }, []);

  const remove = (id: string) => {
    deleteEvaluation(id);
    setEvaluations(loadAllEvaluations());
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Saved Evaluations</h1>
          <Link href="/" className="text-blue-600 hover:underline text-sm">← Home</Link>
        </div>

        {evaluations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
            No saved evaluations.
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.reverse().map(ev => (
              <div key={ev.id} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{ev.company_name}</div>
                  <div className="text-sm text-gray-400">
                    {ev.stage} · {ev.source} · {new Date(ev.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    ev.recommendation === 'invest_high_priority' ? 'bg-green-100 text-green-700' :
                    ev.recommendation === 'invest' ? 'bg-green-50 text-green-600' :
                    ev.recommendation === 'invest_small' ? 'bg-yellow-50 text-yellow-700' :
                    ev.recommendation === 'watch' ? 'bg-orange-50 text-orange-600' :
                    ev.recommendation ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ev.recommendation ? ev.recommendation.replace(/_/g, ' ').toUpperCase() : 'IN PROGRESS'}
                  </span>
                  <Link href={`/results?id=${ev.id}`} className="text-blue-600 hover:underline text-sm">Open</Link>
                  <button onClick={() => remove(ev.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
