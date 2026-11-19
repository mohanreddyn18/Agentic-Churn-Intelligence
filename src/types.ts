export type RiskLevel = 'High' | 'Medium' | 'Low';

export type ContractType = 'Month-to-month' | 'One year' | 'Two year';

export interface CustomerInput {
  customer_id: string;
  name?: string;
  segment?: string;
  tenure: number;
  monthly_charges: number;
  total_charges?: number;
  contract: ContractType | string;
  support_calls: number;
  payment_method?: string;
  internet_service?: string;
  tech_support?: string;
  usage_score?: number;
  nps_score?: number;
  uploaded_churn_probability?: number;
}

export interface FeatureContribution {
  feature: string;
  label: string;
  value: string;
  impact: number; // positive increases churn risk, negative decreases risk
}

export interface ModelBreakdown {
  logistic_regression: number;
  random_forest: number;
  gradient_boosting: number;
  ensemble_probability: number;
  agreement_score: number;
  confidence_low: number;
  confidence_high: number;
  risk_level: RiskLevel;
  feature_contributions: FeatureContribution[];
}

export interface EnrichedCustomer extends CustomerInput {
  name: string;
  segment: string;
  total_charges: number;
  payment_method: string;
  internet_service: string;
  tech_support: string;
  usage_score: number;
  nps_score: number;
  churn_probability: number;
  risk_level: RiskLevel;
  annual_revenue_at_risk: number;
  prediction: ModelBreakdown;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface SingleModelMetrics {
  id: 'logistic_regression' | 'random_forest' | 'gradient_boosting' | 'ensemble';
  name: string;
  family: string;
  description: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion_matrix: ConfusionMatrix;
  roc_curve: RocPoint[];
}

export interface EnsembleWeights {
  logistic_regression: number;
  random_forest: number;
  gradient_boosting: number;
}

export interface ModelEvaluationReport {
  train_samples: number;
  test_samples: number;
  positive_rate: number;
  weights: EnsembleWeights;
  models: SingleModelMetrics[];
  feature_importance: Array<{
    feature: string;
    label: string;
    importance: number;
  }>;
}

export interface KnowledgeDocument {
  source_id: string;
  title: string;
  category: string;
  approval_tier: string;
  max_discount_pct: number;
  updated_at: string;
  text: string;
}

export interface RetrievedEvidenceChunk {
  id: string;
  source_id: string;
  title: string;
  category: string;
  text: string;
  bm25_score: number;
  bm25_rank: number | null;
  semantic_score: number;
  semantic_rank: number | null;
  rrf_score: number;
  metadata: {
    approval_tier: string;
    max_discount_pct: number;
    category: string;
    chunk_index: number;
  };
}

export interface RAGSearchResult {
  query: string;
  params: {
    top_k: number;
    semantic_weight: number;
    keyword_weight: number;
    rrf_k: number;
  };
  results: RetrievedEvidenceChunk[];
  total_chunks_indexed: number;
  latency_ms: number;
}

export interface RAGEvaluationQueryResult {
  query: string;
  expected_sources: string[];
  retrieved_sources: string[];
  precision_at_k: number;
  recall_at_k: number;
  reciprocal_rank: number;
}

export interface RAGEvaluationReport {
  k: number;
  precision_at_k: number;
  recall_at_k: number;
  mrr: number;
  query_count: number;
  per_query: RAGEvaluationQueryResult[];
}

export interface EvidenceQuote {
  source_id: string;
  quote: string;
}

export interface RetentionRecommendation {
  id: string;
  title: string;
  priority: 'Primary' | 'Secondary' | 'Fallback';
  channel: string;
  timing: string;
  recommendation: string;
  offer_details: string;
  outreach_script: string;
  estimated_churn_reduction_pct: number;
  estimated_offer_cost: number;
  expected_retained_revenue: number;
  net_roi_pct: number;
  source_ids: string[];
  evidence_quotes: EvidenceQuote[];
  status?: 'references_and_quotes_validated' | 'rejected';
}

export interface RejectedRecommendation {
  title: string;
  recommendation: string;
  source_ids: string[];
  evidence_quotes?: EvidenceQuote[];
  reason: string;
}

export interface AgentStageTrace {
  stage: 'retrieval' | 'analysis' | 'strategy' | 'verification';
  label: string;
  status: 'completed' | 'warning' | 'blocked';
  duration_ms: number;
  summary: string;
}

export interface AgentWorkflowResult {
  workflow_status: 'completed' | 'needs_review' | 'blocked_insufficient_evidence';
  engine_used: 'gemini' | 'policy_engine';
  model_name: string;
  customer: EnrichedCustomer;
  retrieval_query: string;
  retrieved_evidence: RetrievedEvidenceChunk[];
  analysis: {
    analysis_status: 'evidence_available' | 'insufficient_evidence';
    churn_archetype: string;
    urgency_window: string;
    annual_revenue_at_risk: number;
    executive_summary: string;
    top_risk_drivers: FeatureContribution[];
    protective_factors: FeatureContribution[];
  };
  recommendations: RetentionRecommendation[];
  verification: {
    verification_status: 'references_validated' | 'needs_review' | 'no_recommendations';
    verified_count: number;
    rejected_count: number;
    quote_match_rate: number;
    verified_recommendations: RetentionRecommendation[];
    rejected_recommendations: RejectedRecommendation[];
    audit_note: string;
  };
  projected_impact: {
    current_churn_probability: number;
    post_intervention_probability: number;
    total_offer_cost: number;
    expected_revenue_saved: number;
    portfolio_net_roi_pct: number;
  };
  trace: AgentStageTrace[];
}
