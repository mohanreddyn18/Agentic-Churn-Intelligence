import type {
  AgentWorkflowResult,
  CustomerInput,
  EnrichedCustomer,
  EnsembleWeights,
  KnowledgeDocument,
  ModelBreakdown,
  ModelEvaluationReport,
  RAGEvaluationReport,
  RAGSearchResult,
} from '../types';
import { DEMO_CUSTOMERS } from '../engines/dataset';
import { mlEngine } from '../engines/mlEngine';
import { ragEngine } from '../engines/ragEngine';
import { executeLocalPolicyWorkflow } from '../engines/policyOrchestrator';

let backendAvailable: boolean | null = null;

async function tryFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  if (backendAvailable === false) return null;
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Static hosts (e.g. Vercel static deploy without serverless API) return index.html or 404 text
      if (url === '/api/health') backendAvailable = false;
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Request failed with status ${res.status}`);
    }
    backendAvailable = true;
    return data as T;
  } catch (err) {
    // Re-throw explicit API errors returned by a live backend (e.g. Gemini API key / quota errors)
    if (backendAvailable === true && err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    if (url === '/api/health') backendAvailable = false;
    return null;
  }
}

export interface InitialAppData {
  geminiConfigured: boolean;
  customers: EnrichedCustomer[];
  evaluation: ModelEvaluationReport;
  documents: KnowledgeDocument[];
  ragEval: RAGEvaluationReport;
}

export async function loadPlatformBootstrap(): Promise<InitialAppData> {
  const health = await tryFetchJson<{ gemini_configured?: boolean }>('/api/health');

  if (health) {
    const [custData, evalData, docsData, ragEvalData] = await Promise.all([
      tryFetchJson<{ customers: EnrichedCustomer[] }>('/api/customers'),
      tryFetchJson<ModelEvaluationReport>('/api/ml/evaluation'),
      tryFetchJson<{ documents: KnowledgeDocument[] }>('/api/rag/documents'),
      tryFetchJson<RAGEvaluationReport>('/api/rag/evaluate?k=3'),
    ]);

    if (custData && evalData && docsData && ragEvalData) {
      return {
        geminiConfigured: Boolean(health.gemini_configured),
        customers: custData.customers,
        evaluation: evalData,
        documents: docsData.documents,
        ragEval: ragEvalData,
      };
    }
  }

  // Seamless in-browser execution of the exact same TypeScript ML & Hybrid RAG engines for static hosting
  return {
    geminiConfigured: false,
    customers: DEMO_CUSTOMERS.map((c, idx) => mlEngine.enrichCustomer(c, idx)),
    evaluation: mlEngine.getEvaluationReport(),
    documents: ragEngine.getDocuments(),
    ragEval: ragEngine.evaluateBenchmark(3, 1.0, 1.0),
  };
}

export async function scoreCustomerBatch(rows: CustomerInput[]): Promise<EnrichedCustomer[]> {
  const remote = await tryFetchJson<{ customers: EnrichedCustomer[] }>('/api/customers/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers: rows }),
  });
  if (remote) return remote.customers;
  return rows.map((row, idx) => mlEngine.enrichCustomer(row, idx));
}

export async function predictSingleCustomer(
  customer: CustomerInput
): Promise<{ customer: EnrichedCustomer; prediction: ModelBreakdown }> {
  const remote = await tryFetchJson<{ customer: EnrichedCustomer; prediction: ModelBreakdown }>(
    '/api/ml/predict',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer }),
    }
  );
  if (remote) return remote;
  const enriched = mlEngine.enrichCustomer(customer);
  return { customer: enriched, prediction: enriched.prediction };
}

export async function updateEnsembleWeights(
  weights: EnsembleWeights
): Promise<{ evaluation: ModelEvaluationReport; customers: EnrichedCustomer[] }> {
  const remote = await tryFetchJson<{
    evaluation: ModelEvaluationReport;
    customers: EnrichedCustomer[];
  }>('/api/ml/weights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weights }),
  });
  if (remote) return remote;
  mlEngine.setWeights(weights);
  return {
    evaluation: mlEngine.getEvaluationReport(),
    customers: DEMO_CUSTOMERS.map((c, idx) => mlEngine.enrichCustomer(c, idx)),
  };
}

export async function searchHybridRag(params: {
  query: string;
  top_k: number;
  semantic_weight: number;
  keyword_weight: number;
  rrf_k: number;
}): Promise<RAGSearchResult> {
  const remote = await tryFetchJson<RAGSearchResult>('/api/rag/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (remote) return remote;
  return ragEngine.search(params.query, {
    top_k: params.top_k,
    semantic_weight: params.semantic_weight,
    keyword_weight: params.keyword_weight,
    rrf_k: params.rrf_k,
  });
}

export async function evaluateHybridRag(
  k: number,
  semanticWeight: number,
  keywordWeight: number
): Promise<RAGEvaluationReport> {
  const remote = await tryFetchJson<RAGEvaluationReport>(
    `/api/rag/evaluate?k=${k}&semantic_weight=${semanticWeight}&keyword_weight=${keywordWeight}`
  );
  if (remote) return remote;
  return ragEngine.evaluateBenchmark(k, semanticWeight, keywordWeight);
}

export async function ingestRagDocument(
  doc: Omit<KnowledgeDocument, 'updated_at'>
): Promise<{ document: KnowledgeDocument; documents: KnowledgeDocument[]; evalReport: RAGEvaluationReport }> {
  const remote = await tryFetchJson<{ document: KnowledgeDocument; documents: KnowledgeDocument[] }>(
    '/api/rag/documents',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    }
  );
  if (remote) {
    const evalReport = await evaluateHybridRag(3, 1.0, 1.0);
    return { document: remote.document, documents: remote.documents, evalReport };
  }
  const added = ragEngine.addDocument(doc);
  return {
    document: added,
    documents: ragEngine.getDocuments(),
    evalReport: ragEngine.evaluateBenchmark(3, 1.0, 1.0),
  };
}

export async function runAgentWorkflowApi(params: {
  customer: EnrichedCustomer;
  engine: 'gemini' | 'policy_engine';
  top_k: number;
  inject_hallucination_test: boolean;
}): Promise<AgentWorkflowResult> {
  const remote = await tryFetchJson<AgentWorkflowResult>('/api/agents/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (remote) return remote;

  if (params.engine === 'gemini') {
    throw new Error(
      'Server-side Gemini API endpoint (/api/agents/workflow) is unavailable on this static host or GEMINI_API_KEY is not configured. Switch to Policy Engine for instant evidence-verified strategies, or deploy with GEMINI_API_KEY configured on the server.'
    );
  }

  const enriched = mlEngine.enrichCustomer(params.customer);
  return executeLocalPolicyWorkflow(enriched, {
    top_k: params.top_k,
    inject_hallucination_test: params.inject_hallucination_test,
  });
}
