'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createNewEvaluation, saveEvaluation } from '@/lib/persistence';
import { Stage, ExtractedField } from '@/lib/types';

function makeField(value: string): ExtractedField {
  return { value, confidence: 1.0, page: null, source_text: null, status: 'analyst_confirmed' };
}

export default function IntakePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: '', stage: 'seed' as Stage, hq_location: '', sector: '',
    business_description: '', round_type: '', round_size_usd: '',
    pre_money_valuation_usd: '', founder_names: '', tam_usd: '',
    arr_usd: '', growth_rate_percent: '', customer_count: '',
    gross_margin_percent: '', runway_months: '', lead_investor: '',
    china_exposure: 'none', use_of_proceeds: '',
  });

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const submit = () => {
    const ev = createNewEvaluation(form.company_name || 'Unnamed Company', 'manual');
    const reviewed: Record<string, ExtractedField> = {};
    for (const [k, v] of Object.entries(form)) {
      reviewed[k] = makeField(String(v));
    }
    ev.analyst_reviewed = reviewed;
    ev.review_complete = true;
    saveEvaluation(ev);
    router.push(`/results?id=${ev.id}`);
  };

  const field = (label: string, name: string, type = 'text', hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input name={name} type={type} value={(form as Record<string,string>)[name]} onChange={handle}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Manual Deal Intake</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">

          <h2 className="font-semibold text-gray-700 border-b pb-2">Company Basics</h2>
          {field('Company Name *', 'company_name')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
            <select name="stage" value={form.stage} onChange={handle}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="pre_seed">Pre-Seed</option>
              <option value="seed">Seed</option>
              <option value="series_a">Series A</option>
            </select>
          </div>
          {field('HQ Location *', 'hq_location', 'text', 'City, State, USA')}
          {field('Sector *', 'sector', 'text', 'e.g. B2B SaaS, Fintech, HealthTech')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
            <textarea name="business_description" value={form.business_description} onChange={handle} rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>

          <h2 className="font-semibold text-gray-700 border-b pb-2 pt-2">Round Details</h2>
          {field('Round Type', 'round_type', 'text', 'e.g. Seed, Series A')}
          {field('Round Size (USD)', 'round_size_usd', 'text', 'e.g. 4000000')}
          {field('Pre-Money Valuation (USD)', 'pre_money_valuation_usd', 'text')}
          {field('Use of Proceeds', 'use_of_proceeds')}

          <h2 className="font-semibold text-gray-700 border-b pb-2 pt-2">Team & Market</h2>
          {field('Founder Names', 'founder_names')}
          {field('TAM (USD)', 'tam_usd', 'text', 'Total addressable market in USD')}
          {field('Lead Investor', 'lead_investor')}

          <h2 className="font-semibold text-gray-700 border-b pb-2 pt-2">Traction</h2>
          {field('ARR (USD)', 'arr_usd')}
          {field('Growth Rate (%)', 'growth_rate_percent')}
          {field('Customer Count', 'customer_count')}
          {field('Gross Margin (%)', 'gross_margin_percent')}
          {field('Runway (months)', 'runway_months')}

          <h2 className="font-semibold text-gray-700 border-b pb-2 pt-2">Risk</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">China Exposure</label>
            <select name="china_exposure" value={form.china_exposure} onChange={handle}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="none">None</option>
              <option value="minor">Minor / Indirect</option>
              <option value="material">Material</option>
              <option value="primary">Primary operations</option>
            </select>
          </div>

          <button onClick={submit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mt-4">
            Run Evaluation
          </button>
        </div>
      </div>
    </main>
  );
}
