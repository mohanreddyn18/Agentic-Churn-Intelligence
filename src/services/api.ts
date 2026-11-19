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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const preview = (await res.text()).slice(0, 160).trim();
    throw new Error(
      `API endpoint ${url} returned HTTP ${res.status} (${contentType || 'non-JSON response'})${preview ? `: ${preview}` : ''}`
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request to ${url} failed with HTTP ${res.status}.`);
  }

  return data as T;
}

export interface InitialAppData {
  geminiConfigured: boolean;
  customers: EnrichedCustomer[];
  evaluation: ModelEvaluationReport;
  documents: KnowledgeDocument[];
  ragEval: RAGEvaluationReport;
}

export async function loadPlatformBootstrap(): Promise<InitialAppData> {
  const [health, custData, evalData, docsData, ragEvalData] = await Promise.all([
    requestJson<{ status: string; gemini_configured?: boolean }>('/api/health'),
    requestJson<{ customers: EnrichedCustomer[] }>('/api/customers'),
    requestJson<ModelEvaluationReport>('/api/ml/evaluation'),
    requestJson<{ documents: KnowledgeDocument[] }>('/api/rag/documents'),
    requestJson<RAGEvaluationReport>('/api/rag/evaluate?k=3'),
  ]);

  return {
    geminiConfigured: Boolean(health.gemini_configured),
    customers: custData.customers,
    evaluation: evalData,
    documents: docsData.documents,
    ragEval: ragEvalData,
  };
}

export async function scoreCustomerBatch(rows: CustomerInput[]): Promise<EnrichedCustomer[]> {
  const data = await requestJson<{ customers: EnrichedCustomer[] }>('/api/customers/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers: rows }),
  });
  return data.customers;
}

export async function predictSingleCustomer(
  customer: CustomerInput
): Promise<{ customer: EnrichedCustomer; prediction: ModelBreakdown }> {
  return requestJson<{ customer: EnrichedCustomer; prediction: ModelBreakdown }>('/api/ml/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer }),
  });
}

export async function updateEnsembleWeights(
  weights: EnsembleWeights
): Promise<{ evaluation: ModelEvaluationReport; customers: EnrichedCustomer[] }> {
  return requestJson<{ evaluation: ModelEvaluationReport; customers: EnrichedCustomer[] }>(
    '/api/ml/weights',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights }),
    }
  );
}

export async function searchHybridRag(params: {
  query: string;
  top_k: number;
  semantic_weight: number;
  keyword_weight: number;
  rrf_k: number;
}): Promise<RAGSearchResult> {
  return requestJson<RAGSearchResult>('/api/rag/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function evaluateHybridRag(
  k: number,
  semanticWeight: number,
  keywordWeight: number
): Promise<RAGEvaluationReport> {
  return requestJson<RAGEvaluationReport>(
    `/api/rag/evaluate?k=${k}&semantic_weight=${semanticWeight}&keyword_weight=${keywordWeight}`
  );
}

export async function ingestRagDocument(
  doc: Omit<KnowledgeDocument, 'updated_at'>
): Promise<{ document: KnowledgeDocument; documents: KnowledgeDocument[]; evalReport: RAGEvaluationReport }> {
  const data = await requestJson<{ document: KnowledgeDocument; documents: KnowledgeDocument[] }>(
    '/api/rag/documents',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    }
  );
  const evalReport = await evaluateHybridRag(3, 1.0, 1.0);
  return { document: data.document, documents: data.documents, evalReport };
}

export async function runAgentWorkflowApi(params: {
  customer: EnrichedCustomer;
  engine: 'gemini' | 'policy_engine';
  top_k: number;
  inject_hallucination_test: boolean;
}): Promise<AgentWorkflowResult> {
  return requestJson<AgentWorkflowResult>('/api/agents/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}
