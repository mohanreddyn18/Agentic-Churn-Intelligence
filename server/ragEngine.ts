import type {
  KnowledgeDocument,
  RAGEvaluationQueryResult,
  RAGEvaluationReport,
  RAGSearchResult,
  RetrievedEvidenceChunk,
} from '../src/types';

export const INITIAL_KNOWLEDGE_BASE: KnowledgeDocument[] = [
  {
    source_id: 'POL-RET-001',
    title: 'Month-to-Month Annual Migration Incentive',
    category: 'Contract Upgrade',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 20,
    updated_at: '2026-10-12',
    text: 'Month-to-month customers with churn probability above 50% are eligible for a 20% recurring rate reduction for 12 months when migrating to an annual one-year commitment, plus full waiver of migration setup fees. Accounts moving to a two-year commitment qualify for a 25% price-lock guarantee and priority service routing.',
  },
  {
    source_id: 'POL-RET-002',
    title: 'Escalated Support SLA Recovery Protocol',
    category: 'Support Recovery',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 15,
    updated_at: '2026-10-20',
    text: 'Customers experiencing 4 or more support calls within 90 days must be assigned a dedicated Tier-3 Technical Account Specialist within 24 hours, receive a root-cause remediation audit, and be granted 6 months of complimentary Dedicated Tech Support ($15/month value) plus a one-time 15% goodwill service credit on their next invoice.',
  },
  {
    source_id: 'POL-RET-003',
    title: 'Early-Tenure 90-Day Concierge Onboarding Rescue',
    category: 'Onboarding & Adoption',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 10,
    updated_at: '2026-10-08',
    text: 'Accounts with tenure of 6 months or less showing low product usage scores below 50 or early support friction qualify for the 90-Day Concierge Rescue Program: two live 1-on-1 architecture optimization sessions, complimentary technical configuration review, and a 30-day satisfaction guarantee credit equal to 10% of monthly charges.',
  },
  {
    source_id: 'POL-RET-004',
    title: 'High-Value Fiber & Bandwidth Performance Remediation',
    category: 'Technical Remediation',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 15,
    updated_at: '2026-10-18',
    text: 'Fiber optic subscribers paying $85 or more per month without bundled tech support exhibit elevated churn due to latency or hardware configuration gaps. Retention agents are authorized to dispatch a complimentary line diagnostic and hardware refresh along with 90 days of complimentary Proactive Network Monitoring and Tech Support.',
  },
  {
    source_id: 'POL-RET-005',
    title: 'Electronic Check to Auto-Pay Billing Friction Credit',
    category: 'Billing & Payments',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 10,
    updated_at: '2026-09-29',
    text: 'Customers paying via electronic check or mailed check experience 2.1x higher involuntary and billing-friction churn. Retention specialists may offer an immediate $10 per month Auto-Pay loyalty rebate for 6 billing cycles ($60 total value) when the customer enrolls in automatic credit card or bank transfer billing.',
  },
  {
    source_id: 'POL-RET-006',
    title: 'Enterprise Executive Sponsor & Quarterly Business Review',
    category: 'Executive Retention',
    approval_tier: 'Manager Sign-Off (Tier 2)',
    max_discount_pct: 20,
    updated_at: '2026-10-25',
    text: 'Enterprise and high-spend accounts exceeding $100 per month in recurring revenue with churn risk above 65% require an Executive Sponsor outreach within 48 hours, a customized ROI & Value Realization Review, and a tailored 12-month price-lock cap protecting against annual rate adjustments.',
  },
  {
    source_id: 'POL-RET-007',
    title: 'Low-Usage Silent Drift Re-Activation Playbook',
    category: 'Usage & Engagement',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 12,
    updated_at: '2026-10-03',
    text: 'For accounts with product usage scores below 55 and NPS below 6, price discounts alone fail to address underlying value gaps. Deploy a personalized workflow enablement sprint, unlock premium analytics add-ons free for 90 days, and schedule a 30-day usage health check-in with Customer Success.',
  },
  {
    source_id: 'POL-RET-008',
    title: 'Temporary Plan Right-Sizing & Pause Protection',
    category: 'Budget Flexibility',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 25,
    updated_at: '2026-10-14',
    text: 'When price sensitivity is the primary churn driver and the customer cannot commit to a 12-month term, offer a 3-month Right-Sized Flex Plan reducing monthly charges by up to 25% without losing account history or configuration, or a 60-day Account Hibernation option at $9/month to prevent permanent cancellation.',
  },
  {
    source_id: 'POL-RET-009',
    title: 'Mid-Term Renewal Lock-In for One-Year Subscribers',
    category: 'Proactive Renewal',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 15,
    updated_at: '2026-10-01',
    text: 'One-year contract customers with moderate churn probability between 35% and 65% qualify for an Early Loyalty Renewal offer: extending to a two-year agreement unlocks a 15% recurring loyalty discount, complimentary Dedicated Tech Support upgrade, and priority queue routing.',
  },
  {
    source_id: 'POL-RET-010',
    title: 'Detractor NPS Closed-Loop Recovery & Service Credit',
    category: 'Voice of Customer',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 15,
    updated_at: '2026-10-22',
    text: 'Any account recording an NPS score of 5 or below triggers a mandatory closed-loop empathy call from a Senior Retention Specialist within 24 hours, accompanied by a written remediation action plan and an authorized one-time 15% invoice credit upon confirmation that open issues are resolved.',
  },
  {
    source_id: 'POL-RET-011',
    title: 'Loyal Advocate Expansion & Appreciation Program',
    category: 'Advocacy & Loyalty',
    approval_tier: 'Auto-Approved (Tier 1)',
    max_discount_pct: 10,
    updated_at: '2026-09-25',
    text: 'Low-risk loyal customers with tenure over 24 months and NPS of 8 or higher should not receive reactive rescue discounts. Instead, enroll them in the Loyalty Appreciation Tier featuring complimentary speed or feature boosts, annual anniversary credits up to 5%, and early access to beta capabilities.',
  },
  {
    source_id: 'POL-RET-012',
    title: 'Retention Discount Governance & Margin Guardrails',
    category: 'Compliance & Finance',
    approval_tier: 'Finance Policy',
    max_discount_pct: 25,
    updated_at: '2026-10-27',
    text: 'Under Retention Governance Policy POL-RET-012, no automated or agentic recommendation may exceed a 25% recurring discount or grant free service exceeding 60 days without VP Finance sign-off. Every retention offer must maintain a positive 12-month projected net ROI and cite exact verbatim policy clauses.',
  },
];

// Domain semantic concepts for dense vector projection (deterministic semantic embeddings)
const SEMANTIC_CONCEPTS: Array<{ name: string; terms: string[] }> = [
  { name: 'contract_upgrade', terms: ['month', 'annual', 'year', 'contract', 'migration', 'commitment', 'term', 'renewal', 'lock'] },
  { name: 'support_recovery', terms: ['support', 'calls', 'tickets', 'sla', 'escalation', 'specialist', 'remediation', 'resolved', 'tier'] },
  { name: 'onboarding', terms: ['early', 'tenure', 'new', 'onboarding', 'concierge', '90-day', 'sessions', 'configuration', 'rescue'] },
  { name: 'fiber_technical', terms: ['fiber', 'optic', 'bandwidth', 'latency', 'hardware', 'network', 'diagnostic', 'tech', 'monitoring'] },
  { name: 'billing_autopay', terms: ['electronic', 'check', 'billing', 'payment', 'auto-pay', 'autopay', 'invoice', 'rebate', 'credit', 'bank'] },
  { name: 'executive_enterprise', terms: ['enterprise', 'executive', 'sponsor', 'high-value', 'spend', '100', 'qbr', 'value', 'price-lock'] },
  { name: 'usage_engagement', terms: ['usage', 'engagement', 'drift', 'adoption', 'enablement', 'workflow', 'analytics', 'inactive', 'low'] },
  { name: 'price_flexibility', terms: ['price', 'charges', 'budget', 'right-size', 'flex', 'pause', 'hibernation', 'discount', 'sensitive'] },
  { name: 'nps_detractor', terms: ['nps', 'detractor', 'empathy', 'feedback', 'satisfaction', 'goodwill', 'voice', 'unhappy'] },
  { name: 'loyalty_advocate', terms: ['loyal', 'advocate', 'low-risk', 'long', 'appreciation', 'anniversary', 'expansion', 'beta'] },
  { name: 'governance_roi', terms: ['governance', 'guardrail', 'margin', 'roi', 'finance', 'cap', 'policy', 'verbatim', 'compliance'] },
  { name: 'high_risk_urgent', terms: ['high', 'critical', 'urgent', 'churn', 'risk', 'probability', 'immediate', '24', '48'] },
];

interface IndexedChunk {
  id: string;
  source_id: string;
  title: string;
  category: string;
  text: string;
  tokens: string[];
  denseVector: number[];
  metadata: {
    approval_tier: string;
    max_discount_pct: number;
    category: string;
    chunk_index: number;
  };
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 1);
}

function splitTextIntoChunks(text: string, chunkSize = 700, overlap = 120): string[] {
  const clean = text.trim();
  if (clean.length <= chunkSize) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + chunkSize);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class HybridRAGEngine {
  private documents: KnowledgeDocument[] = [];
  private chunks: IndexedChunk[] = [];
  private vocab: string[] = [];
  private idf: Map<string, number> = new Map();
  private avgDocLen = 1;

  constructor() {
    this.documents = [...INITIAL_KNOWLEDGE_BASE];
    this.rebuildIndex();
  }

  private computeDenseVector(tokens: string[], vocabIndex: Map<string, number>): number[] {
    // 1. Semantic concept embedding channels (12 dense concept dimensions, weighted strongly)
    const conceptVec = SEMANTIC_CONCEPTS.map((concept) => {
      let matches = 0;
      for (const tok of tokens) {
        for (const term of concept.terms) {
          if (tok === term || (term.length >= 4 && tok.startsWith(term.slice(0, 4)))) {
            matches += 1;
            break;
          }
        }
      }
      return Math.log1p(matches) * 2.2;
    });

    // 2. Character trigram / lexical hashed semantic projection (32 dimensions)
    const hashDims = 32;
    const hashVec = Array(hashDims).fill(0);
    for (const tok of tokens) {
      const idfWeight = this.idf.get(tok) ?? 1.2;
      let h = 2166136261;
      for (let i = 0; i < tok.length; i++) {
        h ^= tok.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const bucket = Math.abs(h) % hashDims;
      const sign = (h & 1) === 0 ? 1 : -1;
      hashVec[bucket] += sign * idfWeight;
    }

    // 3. Top vocabulary TF-IDF projection (capped to vocab size)
    const tf = new Map<string, number>();
    for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1);
    const tfidfVec = Array(Math.min(80, vocabIndex.size)).fill(0);
    for (const [tok, count] of tf.entries()) {
      const idx = vocabIndex.get(tok);
      if (idx !== undefined && idx < tfidfVec.length) {
        tfidfVec[idx] = (1 + Math.log(count)) * (this.idf.get(tok) ?? 1);
      }
    }

    const full = [...conceptVec, ...hashVec, ...tfidfVec];
    const norm = Math.sqrt(full.reduce((s, v) => s + v * v, 0)) || 1;
    return full.map((v) => v / norm);
  }

  private rebuildIndex(): void {
    const rawChunks: Array<{
      id: string;
      source_id: string;
      title: string;
      category: string;
      text: string;
      tokens: string[];
      metadata: IndexedChunk['metadata'];
    }> = [];

    for (const doc of this.documents) {
      const parts = splitTextIntoChunks(doc.text, 750, 120);
      parts.forEach((part, idx) => {
        const combinedText = `${doc.title}. ${doc.category}. ${part}`;
        rawChunks.push({
          id: `${doc.source_id}::chunk-${idx}`,
          source_id: doc.source_id,
          title: doc.title,
          category: doc.category,
          text: part,
          tokens: tokenize(combinedText),
          metadata: {
            approval_tier: doc.approval_tier,
            max_discount_pct: doc.max_discount_pct,
            category: doc.category,
            chunk_index: idx,
          },
        });
      });
    }

    // Compute corpus document frequencies & Okapi BM25 IDF
    const N = Math.max(1, rawChunks.length);
    const df = new Map<string, number>();
    let totalLen = 0;

    for (const c of rawChunks) {
      totalLen += c.tokens.length;
      const unique = new Set(c.tokens);
      for (const tok of unique) {
        df.set(tok, (df.get(tok) || 0) + 1);
      }
    }

    this.avgDocLen = totalLen / N;
    this.idf = new Map();
    const sortedVocab = Array.from(df.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tok]) => tok);
    this.vocab = sortedVocab;

    for (const [tok, freq] of df.entries()) {
      // Standard Okapi BM25 smoothed IDF
      const val = Math.log(1 + (N - freq + 0.5) / (freq + 0.5));
      this.idf.set(tok, val);
    }

    const vocabIndex = new Map<string, number>();
    this.vocab.forEach((tok, i) => vocabIndex.set(tok, i));

    this.chunks = rawChunks.map((c) => ({
      ...c,
      denseVector: this.computeDenseVector(c.tokens, vocabIndex),
    }));
  }

  getDocuments(): KnowledgeDocument[] {
    return [...this.documents];
  }

  addDocument(doc: Omit<KnowledgeDocument, 'updated_at'>): KnowledgeDocument {
    const newDoc: KnowledgeDocument = {
      ...doc,
      source_id: doc.source_id.trim().toUpperCase(),
      updated_at: new Date().toISOString().slice(0, 10),
    };
    const existingIdx = this.documents.findIndex((d) => d.source_id === newDoc.source_id);
    if (existingIdx >= 0) {
      this.documents[existingIdx] = newDoc;
    } else {
      this.documents.push(newDoc);
    }
    this.rebuildIndex();
    return newDoc;
  }

  private bm25Search(queryTokens: string[], topK: number): Array<{ chunk: IndexedChunk; score: number }> {
    const k1 = 1.5;
    const b = 0.75;
    const scored = this.chunks.map((chunk) => {
      const tf = new Map<string, number>();
      for (const t of chunk.tokens) tf.set(t, (tf.get(t) || 0) + 1);
      let score = 0;
      const dl = chunk.tokens.length;
      for (const qt of queryTokens) {
        const freq = tf.get(qt) || 0;
        if (freq === 0) continue;
        const idf = this.idf.get(qt) ?? 0.5;
        score += idf * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (dl / this.avgDocLen))));
      }
      return { chunk, score };
    });

    return scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private semanticSearch(queryTokens: string[], topK: number): Array<{ chunk: IndexedChunk; score: number }> {
    const vocabIndex = new Map<string, number>();
    this.vocab.forEach((tok, i) => vocabIndex.set(tok, i));
    const qVec = this.computeDenseVector(queryTokens, vocabIndex);

    return this.chunks
      .map((chunk) => ({
        chunk,
        score: Math.max(0, cosineSimilarity(qVec, chunk.denseVector)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  search(
    query: string,
    options?: {
      top_k?: number;
      semantic_weight?: number;
      keyword_weight?: number;
      rrf_k?: number;
    }
  ): RAGSearchResult {
    const start = performance.now();
    const top_k = Math.max(1, Math.min(10, options?.top_k ?? 5));
    const semantic_weight = Math.max(0, options?.semantic_weight ?? 1.0);
    const keyword_weight = Math.max(0, options?.keyword_weight ?? 1.0);
    const rrf_k = Math.max(1, options?.rrf_k ?? 60);

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return {
        query,
        params: { top_k, semantic_weight, keyword_weight, rrf_k },
        results: [],
        total_chunks_indexed: this.chunks.length,
        latency_ms: Number((performance.now() - start).toFixed(2)),
      };
    }

    const candidateDepth = Math.min(this.chunks.length, Math.max(top_k * 2, 8));
    const bm25Rows = this.bm25Search(queryTokens, candidateDepth);
    const semanticRows = this.semanticSearch(queryTokens, candidateDepth);

    const merged = new Map<string, RetrievedEvidenceChunk>();

    const ensureEntry = (chunk: IndexedChunk): RetrievedEvidenceChunk => {
      const existing = merged.get(chunk.id);
      if (existing) return existing;
      const entry: RetrievedEvidenceChunk = {
        id: chunk.id,
        source_id: chunk.source_id,
        title: chunk.title,
        category: chunk.category,
        text: chunk.text,
        bm25_score: 0,
        bm25_rank: null,
        semantic_score: 0,
        semantic_rank: null,
        rrf_score: 0,
        metadata: { ...chunk.metadata },
      };
      merged.set(chunk.id, entry);
      return entry;
    };

    semanticRows.forEach((row, idx) => {
      const rank = idx + 1;
      const entry = ensureEntry(row.chunk);
      entry.semantic_score = Number(row.score.toFixed(4));
      entry.semantic_rank = rank;
      entry.rrf_score += semantic_weight / (rrf_k + rank);
    });

    bm25Rows.forEach((row, idx) => {
      const rank = idx + 1;
      const entry = ensureEntry(row.chunk);
      entry.bm25_score = Number(row.score.toFixed(4));
      entry.bm25_rank = rank;
      entry.rrf_score += keyword_weight / (rrf_k + rank);
    });

    const results = Array.from(merged.values())
      .map((item) => ({ ...item, rrf_score: Number(item.rrf_score.toFixed(5)) }))
      .sort((a, b) => b.rrf_score - a.rrf_score)
      .slice(0, top_k);

    return {
      query,
      params: { top_k, semantic_weight, keyword_weight, rrf_k },
      results,
      total_chunks_indexed: this.chunks.length,
      latency_ms: Number(Math.max(0.4, performance.now() - start).toFixed(2)),
    };
  }

  evaluateBenchmark(k = 3, semanticWeight = 1.0, keywordWeight = 1.0): RAGEvaluationReport {
    const benchmarkQueries: Array<{ query: string; relevant: string[] }> = [
      {
        query: 'month-to-month customer high churn annual contract migration discount',
        relevant: ['POL-RET-001', 'POL-RET-008'],
      },
      {
        query: 'frequent support calls escalation tier 3 specialist technical recovery credit',
        relevant: ['POL-RET-002', 'POL-RET-010'],
      },
      {
        query: 'new customer short tenure low usage onboarding concierge rescue',
        relevant: ['POL-RET-003', 'POL-RET-007'],
      },
      {
        query: 'fiber optic high monthly charges no tech support latency diagnostic',
        relevant: ['POL-RET-004'],
      },
      {
        query: 'electronic check billing friction auto-pay rebate enrollment',
        relevant: ['POL-RET-005'],
      },
      {
        query: 'enterprise executive sponsor quarterly business review price lock over 100 spend',
        relevant: ['POL-RET-006'],
      },
      {
        query: 'one year contract moderate risk early renewal two year upgrade',
        relevant: ['POL-RET-009'],
      },
      {
        query: 'discount cap finance governance margin guardrail maximum percentage',
        relevant: ['POL-RET-012'],
      },
    ];

    const per_query: RAGEvaluationQueryResult[] = benchmarkQueries.map((item) => {
      const searchRes = this.search(item.query, {
        top_k: k,
        semantic_weight: semanticWeight,
        keyword_weight: keywordWeight,
      });
      const retrievedIds = searchRes.results.map((r) => r.source_id);
      const relSet = new Set(item.relevant);

      const hits = retrievedIds.filter((id) => relSet.has(id)).length;
      const precision = hits / k;
      const recall = hits / relSet.size;
      let rr = 0;
      for (let i = 0; i < retrievedIds.length; i++) {
        if (relSet.has(retrievedIds[i])) {
          rr = 1 / (i + 1);
          break;
        }
      }

      return {
        query: item.query,
        expected_sources: item.relevant,
        retrieved_sources: retrievedIds,
        precision_at_k: Number(precision.toFixed(4)),
        recall_at_k: Number(recall.toFixed(4)),
        reciprocal_rank: Number(rr.toFixed(4)),
      };
    });

    const n = per_query.length;
    return {
      k,
      precision_at_k: Number((per_query.reduce((s, r) => s + r.precision_at_k, 0) / n).toFixed(4)),
      recall_at_k: Number((per_query.reduce((s, r) => s + r.recall_at_k, 0) / n).toFixed(4)),
      mrr: Number((per_query.reduce((s, r) => s + r.reciprocal_rank, 0) / n).toFixed(4)),
      query_count: n,
      per_query,
    };
  }
}

export const ragEngine = new HybridRAGEngine();
