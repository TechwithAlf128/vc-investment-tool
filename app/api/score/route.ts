import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { extracted, text } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 500 });

    // Build a summary of extracted fields
    const fields = Object.entries(extracted || {})
      .map(([k, v]: [string, unknown]) => {
        const val = (v as { value: unknown }).value;
        return val ? `${k}: ${val}` : null;
      })
      .filter(Boolean)
      .join('\n');

    const prompt = `You are a senior venture capital analyst scoring an early-stage investment opportunity.

Based on the extracted deal data and document text below, score each category from 1-5 and provide brief reasoning.

Scoring guide:
1 = Very poor / major red flag
2 = Below average / significant concerns  
3 = Average / neutral
4 = Strong / above average
5 = Exceptional / top decile

Categories to score:
1. market_attractiveness: TAM size, market timing, sector tailwinds
2. founder_team: Experience, domain expertise, execution ability, team completeness
3. product_differentiation: Unique value prop, defensibility, IP/moat
4. traction_validation: Revenue, growth rate, customers, product-market fit signals
5. business_model_economics: Unit economics, gross margins, scalability, path to profitability
6. financing_syndicate_quality: Lead investor quality, co-investors, valuation discipline
7. deal_terms_entry_price: Valuation vs traction, round size appropriateness
8. risk_execution_complexity: Key risks, regulatory, technical, market risks
9. follow_on_potential_venture_fit: Potential for follow-on rounds, exit opportunities, fund fit

Extracted data:
${fields}

Document excerpt:
${(text || '').slice(0, 6000)}

Return ONLY valid JSON:
{
  "scores": {
    "market_attractiveness": {"score": 4, "reasoning": "..."},
    "founder_team": {"score": 3, "reasoning": "..."},
    "product_differentiation": {"score": 4, "reasoning": "..."},
    "traction_validation": {"score": 3, "reasoning": "..."},
    "business_model_economics": {"score": 3, "reasoning": "..."},
    "financing_syndicate_quality": {"score": 3, "reasoning": "..."},
    "deal_terms_entry_price": {"score": 3, "reasoning": "..."},
    "risk_execution_complexity": {"score": 3, "reasoning": "..."},
    "follow_on_potential_venture_fit": {"score": 3, "reasoning": "..."}
  },
  "summary": "2-3 sentence overall assessment",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_concerns": ["concern 1", "concern 2", "concern 3"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
