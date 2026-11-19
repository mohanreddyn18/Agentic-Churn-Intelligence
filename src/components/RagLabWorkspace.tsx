import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Play, BookOpen, CheckCircle2 } from 'lucide-react';
import type {
  KnowledgeDocument,
  RAGEvaluationReport,
  RAGSearchResult,
} from '../types';
import { AnimatedNumber } from './AnimatedNumber';
import { evaluateHybridRag, ingestRagDocument, searchHybridRag } from '../services/api';

interface RagLabWorkspaceProps {
  documents: KnowledgeDocument[];
  ragEval: RAGEvaluationReport | null;
  onDocumentsUpdated: (docs: KnowledgeDocument[], evalReport: RAGEvaluationReport) => void;
}

const SAMPLE_QUERIES = [
  'month-to-month customer high churn annual migration discount',
  'frequent support calls tier-3 specialist technical recovery',
  'electronic check billing friction auto-pay rebate',
  'fiber optic high charges without tech support diagnostic',
];

export function RagLabWorkspace({
  documents,
  ragEval,
  onDocumentsUpdated,
}: RagLabWorkspaceProps) {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0]);
  const [semanticWeight, setSemanticWeight] = useState(1.0);
  const [keywordWeight, setKeywordWeight] = useState(1.0);
  const [rrfK, setRrfK] = useState(60);
  const [topK, setTopK] = useState(5);
  const [searchResult, setSearchResult] = useState<RAGSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [evalReport, setEvalReport] = useState<RAGEvaluationReport | null>(ragEval);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Add Custom Policy Document Form
  const [showIngestForm, setShowIngestForm] = useState(false);
  const [newId, setNewId] = useState('POL-RET-013');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Custom Retention');
  const [newMaxDiscount, setNewMaxDiscount] = useState(15);
  const [newText, setNewText] = useState('');
  const [ingestFeedback, setIngestFeedback] = useState<string | null>(null);

  const runSearch = async (
    q = query,
    sw = semanticWeight,
    kw = keywordWeight,
    rk = rrfK,
    tk = topK
  ) => {
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchHybridRag({
        query: q,
        semantic_weight: sw,
        keyword_weight: kw,
        rrf_k: rk,
        top_k: tk,
      });
      setSearchResult(res);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runEvaluation = async (sw = semanticWeight, kw = keywordWeight) => {
    setIsEvaluating(true);
    try {
      const report = await evaluateHybridRag(3, sw, kw);
      setEvalReport(report);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newTitle.trim() || !newText.trim()) return;
    setIngestFeedback(null);

    const data = await ingestRagDocument({
      source_id: newId,
      title: newTitle,
      category: newCategory,
      approval_tier: 'Auto-Approved (Tier 1)',
      max_discount_pct: newMaxDiscount,
      text: newText,
    });

    setEvalReport(data.evalReport);
    onDocumentsUpdated(data.documents, data.evalReport);
    setIngestFeedback(`Indexed ${data.document.source_id} into BM25 & Semantic Vector Store.`);
    setNewId(`POL-RET-0${data.documents.length + 1}`);
    setNewTitle('');
    setNewText('');
    setShowIngestForm(false);
    runSearch();
  };

  return (
    <div className="space-y-6">
      {/* Live Hybrid Retrieval Playground */}
      <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Hybrid RAG Retrieval Playground (Okapi BM25 + Dense Semantic + RRF)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Adjust lexical vs. semantic fusion weights and Reciprocal Rank Fusion parameter k in real time
            </p>
          </div>
          {searchResult && (
            <span className="font-mono-num text-xs text-slate-400">
              {searchResult.total_chunks_indexed} chunks indexed · {searchResult.latency_ms}ms
            </span>
          )}
        </div>

        {/* Search Input + Quick Queries */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query retention policies, SLA recovery rules, discount caps..."
              className="w-full rounded-lg border border-slate-700 bg-[#090D16] py-2.5 pr-4 pl-10 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isSearching ? 'Retrieving...' : 'Run Hybrid Search'}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          <span>Quick prompts:</span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(sq);
                runSearch(sq);
              }}
              className="text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-blue-400 transition-colors text-left"
            >
              {sq.slice(0, 38)}...
            </button>
          ))}
        </div>

        {/* Fusion Tuning Sliders */}
        <div className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-800/80 bg-[#090D16] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Semantic Vector Weight</span>
              <span className="font-mono-num text-blue-400">{semanticWeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={semanticWeight}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSemanticWeight(v);
                runSearch(query, v, keywordWeight, rrfK, topK);
              }}
              className="mt-1.5 w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">BM25 Keyword Weight</span>
              <span className="font-mono-num text-emerald-400">{keywordWeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={keywordWeight}
              onChange={(e) => {
                const v = Number(e.target.value);
                setKeywordWeight(v);
                runSearch(query, semanticWeight, v, rrfK, topK);
              }}
              className="mt-1.5 w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">RRF Constant (k)</span>
              <span className="font-mono-num text-slate-200">{rrfK}</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={rrfK}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRrfK(v);
                runSearch(query, semanticWeight, keywordWeight, v, topK);
              }}
              className="mt-1.5 w-full accent-slate-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Top-K Results</span>
              <span className="font-mono-num text-slate-200">{topK}</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={topK}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTopK(v);
                runSearch(query, semanticWeight, keywordWeight, rrfK, v);
              }}
              className="mt-1.5 w-full accent-slate-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Ranked Retrieval Output */}
        {searchResult && (
          <div className="mt-5 space-y-3">
            {searchResult.results.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="rounded-lg border border-slate-800 bg-[#0B111E] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-mono-num font-semibold text-slate-500">#{idx + 1}</span>
                    <span className="font-mono-num font-semibold text-blue-400">
                      {item.source_id}
                    </span>
                    <span className="font-semibold text-slate-100">{item.title}</span>
                    <span className="text-slate-500">· {item.category}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 font-mono-num text-[11px]">
                    <span className="text-emerald-400">
                      BM25: {item.bm25_score.toFixed(2)} (rank {item.bm25_rank ?? '—'})
                    </span>
                    <span className="text-cyan-400">
                      Semantic: {(item.semantic_score * 100).toFixed(1)}% (rank{' '}
                      {item.semantic_rank ?? '—'})
                    </span>
                    <span className="font-semibold text-blue-300">
                      RRF: {item.rrf_score.toFixed(5)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* RAG Evaluation Benchmark + Policy Corpus Manager */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Evaluation Benchmark */}
        <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Retrieval Evaluation Benchmark (k=3)
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Precision@3, Recall@3, and Mean Reciprocal Rank over labeled retention queries
              </p>
            </div>
            <button
              type="button"
              onClick={() => runEvaluation()}
              disabled={isEvaluating}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              {isEvaluating ? 'Running...' : 'Re-Run with Active Weights'}
            </button>
          </div>

          {evalReport && (
            <>
              <div className="mt-5 grid grid-cols-3 gap-4 border-y border-slate-800 py-4">
                <div>
                  <p className="text-xs text-slate-400">Mean Reciprocal Rank</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-400">
                    <AnimatedNumber value={evalReport.mrr * 100} decimals={1} suffix="%" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Recall@{evalReport.k}</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-400">
                    <AnimatedNumber value={evalReport.recall_at_k * 100} decimals={1} suffix="%" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Precision@{evalReport.k}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">
                    <AnimatedNumber
                      value={evalReport.precision_at_k * 100}
                      decimals={1}
                      suffix="%"
                    />
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {evalReport.per_query.map((row, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-800/80 bg-[#090D16] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-200">{row.query}</span>
                      <span className="shrink-0 font-mono-num text-emerald-400">
                        MRR {row.reciprocal_rank.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500 font-mono-num">
                      <span>Expected: {row.expected_sources.join(', ')}</span>
                      <span>Retrieved: {row.retrieved_sources.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Governed Policy Corpus + Live Ingestion */}
        <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <h3 className="text-base font-semibold text-slate-100">
                Governed Policy Corpus ({documents.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowIngestForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Ingest Policy
            </button>
          </div>

          {ingestFeedback && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{ingestFeedback}</span>
            </div>
          )}

          {showIngestForm && (
            <form
              onSubmit={handleIngest}
              className="mt-4 space-y-3 rounded-lg border border-slate-700 bg-[#090D16] p-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400">Policy Source ID</label>
                  <input
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-[#0E1525] px-2.5 py-1.5 font-mono-num text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Category</label>
                  <input
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-[#0E1525] px-2.5 py-1.5 text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400">Policy Title</label>
                  <input
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Competitor Switch-Back Price Match"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-[#0E1525] px-2.5 py-1.5 text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Max Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-[#0E1525] px-2.5 py-1.5 font-mono-num text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400">Policy Clause Text (Indexed Verbatim)</label>
                <textarea
                  required
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter exact retention eligibility rules, credits, or SLA recovery guarantees..."
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0E1525] p-2.5 text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIngestForm(false)}
                  className="rounded-md px-3 py-1.5 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 font-medium text-white hover:bg-blue-500"
                >
                  Chunk & Index Live
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 max-h-96 divide-y divide-slate-800/70 overflow-y-auto pr-1">
            {documents.map((doc) => (
              <div key={doc.source_id} className="py-3 first:pt-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-mono-num font-semibold text-blue-400">
                      {doc.source_id}
                    </span>
                    <span className="ml-2 font-medium text-slate-100">{doc.title}</span>
                  </div>
                  <span className="shrink-0 font-mono-num text-[11px] text-slate-500">
                    Cap {doc.max_discount_pct}%
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{doc.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
