'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createNewEvaluation, saveEvaluation } from '@/lib/persistence';
import { ExtractedField, ExtractedDeal } from '@/lib/types';

function makeField(value: string, confidence = 0.7, page: number | null = null, source_text: string | null = null): ExtractedField {
  return { value, confidence, page, source_text, status: confidence >= 0.8 ? 'extracted' : 'needs_review' };
}

function extractText(text: string, pattern: RegExp): { value: string; page: number | null; source: string | null } {
  const match = text.match(pattern);
  if (!match) return { value: '', page: null, source: null };
  return { value: match[1]?.trim() ?? '', page: null, source: match[0] };
}

function parseExtractedText(fullText: string): Partial<ExtractedDeal> {
  const t = fullText.toLowerCase();
  const result: Partial<ExtractedDeal> = {};

  // Company name - look for common patterns
  const nameMatch = fullText.match(/^([A-Z][a-zA-Z0-9\s]{2,40}?)(?:\n|:|\s{2,})/m);
  if (nameMatch) result.company_name = makeField(nameMatch[1].trim(), 0.6, 1, nameMatch[0]);

  // Stage
  if (t.includes('pre-seed') || t.includes('pre seed') || t.includes('preseed')) {
    result.stage = makeField('pre_seed', 0.9, null, 'pre-seed mentioned');
  } else if (t.includes('series a') || t.includes('series-a')) {
    result.stage = makeField('series_a', 0.9, null, 'Series A mentioned');
  } else if (t.includes('seed')) {
    result.stage = makeField('seed', 0.8, null, 'seed mentioned');
  }

  // Revenue/ARR
  const arrMatch = fullText.match(/(?:ARR|annual recurring revenue)[:\s]*\$?([\d,.]+)\s*([MKB]?)/i);
  if (arrMatch) result.arr_usd = makeField(arrMatch[1], 0.85, null, arrMatch[0]);

  // Growth rate
  const growthMatch = fullText.match(/(?:growing|growth)[^.]*?([\d.]+)\s*%/i);
  if (growthMatch) result.growth_rate_percent = makeField(growthMatch[1], 0.75, null, growthMatch[0]);

  // Customers
  const custMatch = fullText.match(/(\d+)\s*(?:customers?|clients?|accounts?)/i);
  if (custMatch) result.customer_count = makeField(custMatch[1], 0.8, null, custMatch[0]);

  // Raise amount
  const raiseMatch = fullText.match(/raising\s*\$?([\d,.]+)\s*([MKB]?)/i);
  if (raiseMatch) result.round_size_usd = makeField(raiseMatch[1], 0.8, null, raiseMatch[0]);

  // Valuation
  const valMatch = fullText.match(/(?:pre-money|valuation)[:\s]*\$?([\d,.]+)\s*([MKB]?)/i);
  if (valMatch) result.pre_money_valuation_usd = makeField(valMatch[1], 0.75, null, valMatch[0]);

  // Gross margin
  const gmMatch = fullText.match(/(?:gross margin)[:\s]*([\d.]+)\s*%/i);
  if (gmMatch) result.gross_margin_percent = makeField(gmMatch[1], 0.85, null, gmMatch[0]);

  // Runway
  const runwayMatch = fullText.match(/(\d+)\s*months?\s*(?:of\s*)?runway/i);
  if (runwayMatch) result.runway_months = makeField(runwayMatch[1], 0.85, null, runwayMatch[0]);

  // China exposure
  if (t.includes('china') || t.includes('chinese')) {
    result.china_exposure = makeField('possible - review required', 0.6, null, 'China mentioned in document');
  } else {
    result.china_exposure = makeField('none detected', 0.5, null, null);
  }

  // TAM
  const tamMatch = fullText.match(/(?:TAM|total addressable market)[:\s]*\$?([\d,.]+)\s*([BMT]?)/i);
  if (tamMatch) result.tam_usd = makeField(tamMatch[1], 0.75, null, tamMatch[0]);

  // Location
  const locMatch = fullText.match(/(?:headquartered|based|located)\s+(?:in\s+)?([A-Z][a-zA-Z\s,]+(?:Texas|California|New York|Florida|Washington|Massachusetts)[a-zA-Z\s,]*)/);
  if (locMatch) result.hq_location = makeField(locMatch[1].trim(), 0.7, null, locMatch[0]);

  return result;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setError('');
    } else {
      setError('Please upload a PDF file.');
    }
  };

  const process = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: unknown) => (item as { str?: string }).str ?? '').join(' ');
        fullText += `\n--- Page ${i} ---\n${pageText}`;
      }

      const extracted = parseExtractedText(fullText);
      const companyName = (extracted.company_name?.value as string) || file.name.replace('.pdf', '');
      const ev = createNewEvaluation(companyName, 'pdf');
      ev.raw_extracted = extracted;
      ev.analyst_reviewed = { ...extracted };
      ev.pdf_filename = file.name;
      saveEvaluation(ev);
      router.push(`/results?id=${ev.id}`);
    } catch (err) {
      setError('Failed to parse PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">PDF Upload</h1>
          <a href="/" className="text-blue-600 hover:underline text-sm">← Home</a>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <p className="text-gray-500 text-sm mb-6">
            Upload a pitch deck, information memo, investor update, or similar PDF.
            The system will extract fields and let you review them before scoring.
          </p>

          <div className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}>
            <input type="file" accept=".pdf" onChange={handleFile} className="hidden" id="pdf-input" />
            <label htmlFor="pdf-input" className="cursor-pointer">
              {file ? (
                <div>
                  <div className="text-blue-600 font-medium">{file.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <div>
                  <div className="text-gray-400 text-4xl mb-2">📄</div>
                  <div className="text-gray-600 font-medium">Click to select PDF</div>
                  <div className="text-sm text-gray-400 mt-1">Pitch decks, memos, investor updates</div>
                </div>
              )}
            </label>
          </div>

          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-5 text-sm text-yellow-700">
            <strong>Note:</strong> Extraction uses pattern matching. You will review and correct all fields before scoring.
          </div>

          <button onClick={process} disabled={!file || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg">
            {loading ? 'Extracting...' : 'Extract & Review'}
          </button>
        </div>
      </div>
    </main>
  );
}
