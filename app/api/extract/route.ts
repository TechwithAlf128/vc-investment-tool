import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, filename } = await req.json();
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 500 });

    const prompt = `You are a venture capital analyst extracting structured data from a pitch deck or investment memo.

Extract the following fields from the document text below. For each field, provide:
- value: the extracted value (string, number, or null if not found)
- confidence: 0.0-1.0 (1.0 = explicitly stated, 0.7 = clearly implied, 0.4 = inferred, 0.0 = not found)
- source_text: the exact quote from the document that supports this value (or null)

Fields to extract:
- company_name: Name of the company
- stage: One of: pre_seed, seed, series_a
- arr_usd: Annual Recurring Revenue in USD (number only, e.g. 1200000 for $1.2M)
- growth_rate_percent: Revenue/ARR growth rate as a percentage number
- customer_count: Number of customers/clients
- round_size_usd: Amount being raised in this round in USD
- pre_money_valuation_usd: Pre-money valuation in USD
- gross_margin_percent: Gross margin as a percentage number
- runway_months: Months of runway remaining
- china_exposure: Description of any China-related exposure or "none detected"
- tam_usd: Total Addressable Market in USD
- hq_location: City and state/country of headquarters
- sector: Primary business sector/industry
- founders: Names and backgrounds of founders (string description)
- product_description: What the product/service does (1-2 sentences)
- revenue_model: How the company makes money
- key_metrics: Any other notable KPIs or metrics mentioned

Return ONLY valid JSON in this exact format:
{
  "company_name": {"value": "...", "confidence": 0.9, "source_text": "..."},
  "stage": {"value": "seed", "confidence": 0.8, "source_text": "..."},
  ...
}

Document text:
${text.slice(0, 12000)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const extracted = JSON.parse(data.choices[0].message.content);

    // Normalize into ExtractedField format
    const normalized: Record<string, { value: unknown; confidence: number; page: null; source_text: string | null; status: string }> = {};
    for (const [key, val] of Object.entries(extracted)) {
      const v = val as { value: unknown; confidence: number; source_text: string | null };
      normalized[key] = {
        value: v.value,
        confidence: v.confidence ?? 0.5,
        page: null,
        source_text: v.source_text ?? null,
        status: (v.confidence ?? 0.5) >= 0.8 ? 'extracted' : 'needs_review',
      };
    }

    return NextResponse.json({ extracted: normalized });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
