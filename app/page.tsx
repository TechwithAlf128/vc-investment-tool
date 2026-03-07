'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadAllEvaluations } from '@/lib/persistence';
import { DealEvaluation } from '@/lib/types';

export default function Home() {
  const [evaluations, setEvaluations] = useState<DealEvaluation[]>([]);

  useEffect(() => {
    setEvaluations(loadAllEvaluations());
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VC Investment Decision Tool</h1>
          <p className="text-gray-500 mt-1">U.S. technology investments — pre-seed, seed, and Series A</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <Link href="/intake" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 block">
            <div className="text-lg font-semibold mb-1">Manual Intake</div>
            <div className="text-blue-100 text-sm">Enter company information by hand</div>
          </Link>
          <Link href="/upload" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-6 block">
            <div className="text-lg font-semibold mb-1">PDF Upload</div>
            <div className="text-indigo-100 text-sm">Upload a pitch deck or investor memo</div>
          </Link>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Evaluations</h2>
            <Link href="/saved" className="text-blue-600 hover:underline text-sm">View all</Link>
          </div>

          {evaluations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
              No evaluations yet. Start with a manual intake or PDF upload.
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.slice(-5).reverse().map(ev => (
                <Link key={ev.id} href={`/results?id=${ev.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:border-blue-400 transition block">
                  <div>
                    <div className="font-medium text-gray-900">{ev.company_name}</div>
                    <div className="text-sm text-gray-400">{ev.stage} · {ev.source} · {new Date(ev.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    ev.recommendation === 'invest_high_priority' ? 'bg-green-100 text-green-700' :
                    ev.recommendation === 'invest' ? 'bg-green-50 text-green-600' :
                    ev.recommendation === 'invest_small' ? 'bg-yellow-50 text-yellow-700' :
                    ev.recommendation === 'watch' ? 'bg-orange-50 text-orange-600' :
                    ev.recommendation ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ev.recommendation ? ev.recommendation.replace(/_/g, ' ').toUpperCase() : 'IN PROGRESS'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
