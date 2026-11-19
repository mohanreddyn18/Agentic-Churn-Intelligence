import { GoogleGenAI, Type } from '@google/genai';
import type {
  AgentWorkflowResult,
  EnrichedCustomer,
  RetentionRecommendation,
  RetrievedEvidenceChunk,
} from '../src/types.js';
import { ragEngine } from '../src/engines/ragEngine.js';
import {
  assembleWorkflowResult,
  buildCustomerQuery,
  buildHallucinationTestCandidate,
  buildPolicyGroundedStrategies,
  classifyChurnArchetype,
} from '../src/engines/policyOrchestrator.js';

async function generateWithGemini(
  customer: EnrichedCustomer,
  evidence: RetrievedEvidenceChunk[]
): Promise<RetentionRecommendation[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment. Add a Gemini API key in Settings > Secrets (or Vercel Environment Variables) or use the Grounded Policy Engine.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const evidenceContext = evidence
    .map((e) => `[SOURCE_ID: ${e.source_id}] (${e.title} | ${e.metadata.approval_tier})\n${e.text}`)
    .join('\n\n');

  const topDrivers = customer.prediction.feature_contributions
    .slice(0, 5)
    .map((c) => `${c.label}: ${c.value} (${c.impact >= 0 ? '+' : ''}${(c.impact * 100).toFixed(1)}% impact)`)
    .join('; ');

  const prompt = `You are a Principal Customer Retention Strategist in an evidence-verified Agentic RAG platform.

CUSTOMER PROFILE:
- ID: ${customer.customer_id}
- Name: ${customer.name}
- Segment: ${customer.segment}
- Tenure: ${customer.tenure} months
- Monthly Charges: $${customer.monthly_charges}/mo (Annualized: $${(customer.monthly_charges * 12).toFixed(0)}/yr)
- Contract: ${customer.contract}
- Support Calls (90d): ${customer.support_calls}
- Payment Method: ${customer.payment_method}
- Internet Service: ${customer.internet_service} | Dedicated Tech Support: ${customer.tech_support}
- Usage Score: ${customer.usage_score}/100 | NPS Score: ${customer.nps_score}/10
- Ensemble Churn Probability: ${(customer.churn_probability * 100).toFixed(1)}% (${customer.risk_level} Risk)
- ML Top Drivers: ${topDrivers}

RETRIEVED POLICY EVIDENCE (YOU MUST ONLY USE THESE POLICIES AND QUOTE THEM VERBATIM):
${evidenceContext}

TASK:
Generate exactly 3 distinct, high-impact, hyper-personalized retention strategies (Primary, Secondary, Fallback) strictly grounded in the RETRIEVED POLICY EVIDENCE above.
CRITICAL VERIFICATION RULES:
1. Every recommendation MUST cite one or more valid source_ids from the evidence list above.
2. Every evidence_quotes item MUST contain an EXACT, CHARACTER-FOR-CHARACTER verbatim substring copied directly from the corresponding evidence text above (do not paraphrase or alter punctuation inside "quote").
3. Do NOT invent unauthorized discounts above policy caps.
4. Provide realistic offer cost, expected retained revenue (based on $${(customer.monthly_charges * 12).toFixed(0)} annualized value * churn risk reduction), net ROI %, and a ready-to-send personalized outreach script addressed to ${customer.name.split(' ')[0]}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You output strictly valid JSON matching the schema. Never invent policy IDs or alter verbatim quotations.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                priority: { type: Type.STRING },
                channel: { type: Type.STRING },
                timing: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                offer_details: { type: Type.STRING },
                outreach_script: { type: Type.STRING },
                estimated_churn_reduction_pct: { type: Type.NUMBER },
                estimated_offer_cost: { type: Type.NUMBER },
                expected_retained_revenue: { type: Type.NUMBER },
                net_roi_pct: { type: Type.NUMBER },
                source_ids: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                evidence_quotes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source_id: { type: Type.STRING },
                      quote: { type: Type.STRING },
                    },
                    required: ['source_id', 'quote'],
                  },
                },
              },
              required: [
                'title',
                'priority',
                'channel',
                'timing',
                'recommendation',
                'offer_details',
                'outreach_script',
                'estimated_churn_reduction_pct',
                'estimated_offer_cost',
                'expected_retained_revenue',
                'net_roi_pct',
                'source_ids',
                'evidence_quotes',
              ],
            },
          },
        },
        required: ['recommendations'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  const parsed = JSON.parse(rawText) as { recommendations: Array<Omit<RetentionRecommendation, 'id'>> };
  return (parsed.recommendations || []).map((rec, i) => ({
    ...rec,
    id: `GEM-${i + 1}`,
    priority:
      rec.priority === 'Primary' || rec.priority === 'Secondary' || rec.priority === 'Fallback'
        ? rec.priority
        : i === 0
          ? 'Primary'
          : i === 1
            ? 'Secondary'
            : 'Fallback',
  }));
}

export async function executeAgentWorkflow(
  customer: EnrichedCustomer,
  options: {
    engine: 'gemini' | 'policy_engine';
    top_k?: number;
    inject_hallucination_test?: boolean;
  }
): Promise<AgentWorkflowResult> {
  const t1 = performance.now();
  const retrievalQuery = buildCustomerQuery(customer);
  const ragResponse = ragEngine.search(retrievalQuery, {
    top_k: options.top_k ?? 5,
    semantic_weight: 1.0,
    keyword_weight: 1.0,
    rrf_k: 60,
  });
  const tRetrievalMs = Number(Math.max(1.2, performance.now() - t1).toFixed(1));

  const t2 = performance.now();
  classifyChurnArchetype(customer);
  const tAnalysisMs = Number(Math.max(0.8, performance.now() - t2).toFixed(1));

  const t3 = performance.now();
  let candidateRecs: RetentionRecommendation[] = [];
  let modelName = 'Grounded Policy Synthesizer v2';

  if (ragResponse.results.length > 0) {
    if (options.engine === 'gemini') {
      modelName = 'gemini-4-hydrogen';
      candidateRecs = await generateWithGemini(customer, ragResponse.results);
    } else {
      candidateRecs = buildPolicyGroundedStrategies(customer, ragResponse.results);
    }
  }

  if (options.inject_hallucination_test) {
    candidateRecs.push(buildHallucinationTestCandidate());
  }
  const tStrategyMs = Number(Math.max(1.5, performance.now() - t3).toFixed(1));

  return assembleWorkflowResult({
    customer,
    engine: options.engine,
    modelName,
    retrievalQuery,
    retrievedEvidence: ragResponse.results,
    candidateRecs,
    tRetrievalMs,
    tAnalysisMs,
    tStrategyMs,
  });
}
