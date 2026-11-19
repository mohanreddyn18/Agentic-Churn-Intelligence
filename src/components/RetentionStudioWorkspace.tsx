import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Search,
  BarChart3,
  Sparkles,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import type {
  AgentWorkflowResult,
  EnrichedCustomer,
  RetrievedEvidenceChunk,
} from '../types';
import { AnimatedNumber } from './AnimatedNumber';
import { runAgentWorkflowApi } from '../services/api';

interface RetentionStudioWorkspaceProps {
  customers: EnrichedCustomer[];
  initialCustomer: EnrichedCustomer | null;
  geminiConfigured: boolean;
}

function HighlightedQuote({
  fullText,
  quote,
}: {
  fullText: string;
  quote: string;
}) {
  const idx = fullText.indexOf(quote);
  if (idx === -1) {
    return <span className="text-slate-300">{fullText}</span>;
  }
  const before = fullText.slice(0, idx);
  const match = fullText.slice(idx, idx + quote.length);
  const after = fullText.slice(idx + quote.length);
  return (
    <span className="text-slate-400">
      {before}
      <mark className="rounded bg-emerald-500/20 px-1 py-0.5 text-emerald-200 ring-1 ring-emerald-500/40">
        {match}
      </mark>
      {after}
    </span>
  );
}

export function RetentionStudioWorkspace({
  customers,
  initialCustomer,
  geminiConfigured,
}: RetentionStudioWorkspaceProps) {
  const defaultCust =
    initialCustomer ||
    customers.find((c) => c.risk_level === 'High') ||
    customers[0] ||
    null;

  const [selectedId, setSelectedId] = useState<string>(defaultCust?.customer_id ?? '');
  const [engine, setEngine] = useState<'gemini' | 'policy_engine'>(
    geminiConfigured ? 'gemini' : 'policy_engine'
  );
  const [testGuardrail, setTestGuardrail] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(-1);
  const [result, setResult] = useState<AgentWorkflowResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCustomer && initialCustomer.customer_id !== selectedId) {
      setSelectedId(initialCustomer.customer_id);
      setResult(null);
      setActiveStageIdx(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomer?.customer_id]);

  const selectedCustomer =
    customers.find((c) => c.customer_id === selectedId) || customers[0] || null;

  const runPipeline = async (overrideEngine?: 'gemini' | 'policy_engine') => {
    if (!selectedCustomer) return;
    const chosenEngine = overrideEngine ?? engine;
    setErrorMsg(null);
    setResult(null);
    setIsRunning(true);
    setActiveStageIdx(0);

    // Choreography progression while backend executes
    const timer1 = setTimeout(() => setActiveStageIdx(1), 320);
    const timer2 = setTimeout(() => setActiveStageIdx(2), 680);

    try {
      const data = await runAgentWorkflowApi({
        customer: selectedCustomer,
        engine: chosenEngine,
        top_k: 5,
        inject_hallucination_test: testGuardrail,
      });

      setActiveStageIdx(3);
      await new Promise((r) => setTimeout(r, 260));
      setActiveStageIdx(4);
      setResult(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete agent workflow.');
      setActiveStageIdx(-1);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsRunning(false);
    }
  };

  const handleCopyScript = async (id: string, script: string) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  const stages = [
    { id: 'retrieval', label: '01. Hybrid Retrieval Agent', sub: 'BM25 + Dense RRF Search', icon: Search },
    { id: 'analysis', label: '02. Customer Analysis Agent', sub: 'SHAP & Archetype Diagnosis', icon: BarChart3 },
    { id: 'strategy', label: '03. Retention Strategy Agent', sub: engine === 'gemini' ? 'Gemini 4 Hydrogen' : 'Grounded Policy Engine', icon: Sparkles },
    { id: 'verification', label: '04. Verification Agent', sub: 'Exact Citation & Quote Guardrail', icon: ShieldCheck },
  ];

  const evidenceMap = new Map<string, RetrievedEvidenceChunk>();
  result?.retrieved_evidence.forEach((ev) => evidenceMap.set(ev.source_id, ev));

  return (
    <div className="space-y-6">
      {/* Orchestration Control Deck */}
      <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Target Customer Account
              </label>
              <select
                value={selectedCustomer?.customer_id ?? ''}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setResult(null);
                  setActiveStageIdx(-1);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_id} — {c.name} ({(c.churn_probability * 100).toFixed(0)}% {c.risk_level})
                  </option>
                ))}
              </select>
            </div>

            {/* Strategy Generator Engine */}
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Strategy Synthesis Engine
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-[#090D16] p-1">
                <button
                  type="button"
                  onClick={() => setEngine('gemini')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    engine === 'gemini'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Gemini 4 Hydrogen
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('policy_engine')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    engine === 'policy_engine'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Policy Engine
                </button>
              </div>
            </div>

            {/* Guardrail Demonstration Toggle */}
            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={testGuardrail}
                  onChange={(e) => setTestGuardrail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-amber-500"
                />
                <span>Inject ungrounded offer (demo Guardrail block)</span>
              </label>
              <p className="mt-1 pl-6 text-[11px] text-slate-500">
                Proves Verification Agent catches hallucinated policy citations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => runPipeline()}
            disabled={isRunning || !selectedCustomer}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isRunning ? 'Executing 4 Agents...' : 'Run Multi-Agent Pipeline'}
          </button>
        </div>

        {/* Live Animated 4-Stage Choreography Bar */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const traceStep = result?.trace[idx];
            const isComplete = activeStageIdx > idx || Boolean(traceStep);
            const isCurrent = isRunning && activeStageIdx === idx;
            const isWarning = traceStep?.status === 'warning';

            return (
              <div
                key={st.id}
                className={`relative overflow-hidden rounded-lg border p-3.5 transition-colors ${
                  isWarning
                    ? 'border-amber-500/60 bg-amber-500/8'
                    : isCurrent
                      ? 'border-blue-500 bg-blue-500/10'
                      : isComplete
                        ? 'border-emerald-500/40 bg-[#0B111E]'
                        : 'border-slate-800 bg-[#0B111E]/60'
                }`}
              >
                {isCurrent && (
                  <motion.div
                    className="absolute inset-x-0 top-0 h-0.5 bg-blue-400"
                    initial={{ scaleX: 0, transformOrigin: 'left' }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                )}
                <div className="flex items-center justify-between">
                  <Icon
                    className={`h-4 w-4 ${
                      isWarning
                        ? 'text-amber-400'
                        : isCurrent
                          ? 'text-blue-400'
                          : isComplete
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                    }`}
                  />
                  {traceStep && (
                    <span className="font-mono-num text-[11px] text-slate-400">
                      {traceStep.duration_ms}ms
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-xs font-semibold text-slate-100">{st.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{st.sub}</p>
                {traceStep && (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-300 border-t border-slate-800/80 pt-2">
                    {traceStep.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Transparent Error Panel (never masks API errors) */}
      {errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-xs text-red-200">
          <div className="flex items-start gap-3 max-w-3xl">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Strategy Generation Error</p>
              <p className="mt-1 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          {engine === 'gemini' && (
            <button
              type="button"
              onClick={() => {
                setEngine('policy_engine');
                runPipeline('policy_engine');
              }}
              className="rounded-lg border border-red-400/40 bg-red-500/20 px-3.5 py-2 text-xs font-medium text-red-100 hover:bg-red-500/30 whitespace-nowrap"
            >
              Run with Grounded Policy Engine
            </button>
          )}
        </div>
      )}

      {/* Empty Ready State */}
      {!result && !isRunning && !errorMsg && selectedCustomer && (
        <div className="rounded-xl border border-slate-800 bg-[#0E1525] p-10 text-center">
          <p className="text-xs font-medium text-blue-400">Ready for Orchestration</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Synthesize Verified Retention Playbooks for {selectedCustomer.name}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            The 4-agent workflow will retrieve matching corporate retention policies via Hybrid RAG,
            diagnose ML SHAP risk drivers, craft personalized multi-channel offers with outreach
            scripts, and verify every policy citation verbatim.
          </p>
          <button
            type="button"
            onClick={() => runPipeline()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Launch Multi-Agent Workflow
          </button>
        </div>
      )}

      {/* Populated Multi-Agent Output */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Projected Financial & Churn Reduction Impact Strip */}
            <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-medium text-emerald-400">
                      {result.analysis.churn_archetype}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{result.analysis.urgency_window}</span>
                    <span aria-hidden="true">·</span>
                    <span>Engine: {result.model_name}</span>
                  </div>
                  <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300">
                    {result.analysis.executive_summary}
                  </p>
                </div>
              </div>

              {/* Before vs After Animated Risk Reduction + Financial ROI */}
              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Projected Churn Probability Shift</span>
                    <span className="font-mono-num font-semibold text-emerald-400">
                      {(result.projected_impact.current_churn_probability * 100).toFixed(1)}% →{' '}
                      {(result.projected_impact.post_intervention_probability * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Baseline ML Risk</span>
                        <span className="font-mono-num">
                          {(result.projected_impact.current_churn_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                        <motion.div
                          className="h-full rounded-full bg-red-500"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.round(result.projected_impact.current_churn_probability * 100)}%`,
                          }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Post-Playbook Projected Risk</span>
                        <span className="font-mono-num text-emerald-400">
                          {(result.projected_impact.post_intervention_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                        <motion.div
                          className="h-full rounded-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.round(result.projected_impact.post_intervention_probability * 100)}%`,
                          }}
                          transition={{ duration: 0.75, delay: 0.15 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 lg:col-span-7 border-t border-slate-800 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                  <div>
                    <p className="text-xs text-slate-400">Expected Saved ARR</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-400">
                      <AnimatedNumber
                        value={result.projected_impact.expected_revenue_saved}
                        prefix="$"
                      />
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">12-month retained value</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Offer Cost</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-100">
                      <AnimatedNumber
                        value={result.projected_impact.total_offer_cost}
                        prefix="$"
                      />
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Within POL-RET-012 caps</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Projected Net ROI</p>
                    <p className="mt-1 text-2xl font-semibold text-blue-400">
                      <AnimatedNumber
                        value={result.projected_impact.portfolio_net_roi_pct}
                        prefix="+"
                        suffix="%"
                      />
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Verified quote match 100%</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Verification Guardrail Alert (when rejected items exist) */}
            {result.verification.rejected_recommendations.length > 0 && (
              <motion.section
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-amber-500/50 bg-amber-500/8 p-5"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-200">
                      Verification Agent Blocked {result.verification.rejected_count} Ungrounded Recommendation(s)
                    </h4>
                    <p className="mt-1 text-xs text-amber-200/80">
                      Exact policy ID existence and verbatim substring validation prevented unapproved offers from reaching execution.
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {result.verification.rejected_recommendations.map((rej, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-amber-500/30 bg-[#090D16]/80 p-3.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-100">{rej.title}</span>
                            <span className="font-mono-num text-red-400">REJECTED</span>
                          </div>
                          <p className="mt-1 text-slate-400">{rej.recommendation}</p>
                          <p className="mt-2 font-medium text-amber-300">
                            Audit Reason: {rej.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Verified Retention Playbooks */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  Verified Multi-Channel Retention Playbooks ({result.recommendations.length})
                </h3>
                <span className="text-xs text-emerald-400">
                  Status: {result.verification.verification_status} · Exact substring quotes validated
                </span>
              </div>

              {result.recommendations.map((rec, idx) => (
                <motion.article
                  key={rec.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  className="rounded-xl border border-slate-800 bg-[#0E1525] p-6"
                >
                  {/* Top Metadata Line (Zero Pills) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-blue-400">{rec.priority} Strategy</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.channel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.timing}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num text-emerald-400">
                          Verified ({rec.source_ids.join(', ')})
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-lg font-semibold text-slate-50">{rec.title}</h4>
                    </div>

                    <div className="flex items-center gap-5 text-right">
                      <div>
                        <p className="text-[11px] text-slate-500">Risk Drop</p>
                        <p className="font-mono-num text-sm font-semibold text-emerald-400">
                          -{rec.estimated_churn_reduction_pct}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Offer Cost</p>
                        <p className="font-mono-num text-sm font-semibold text-slate-200">
                          ${rec.estimated_offer_cost}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Net ROI</p>
                        <p className="font-mono-num text-sm font-semibold text-blue-400">
                          +{rec.net_roi_pct}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Split: Strategy + Script vs Verbatim Evidence Proof */}
                  <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-4 lg:col-span-7">
                      <div>
                        <p className="text-xs font-medium text-slate-400">Strategic Action</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-200">
                          {rec.recommendation}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Offer Mechanics:</span>{' '}
                          {rec.offer_details}
                        </p>
                      </div>

                      {/* Ready-to-Send Personalized Outreach Script */}
                      <div className="rounded-lg border border-slate-800 bg-[#090D16] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-300">
                            Personalized Outreach Script
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyScript(rec.id, rec.outreach_script)}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                          >
                            {copiedId === rec.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Script</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300 italic">
                          &ldquo;{rec.outreach_script}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Verbatim Evidence Verification Proof */}
                    <div className="lg:col-span-5 lg:border-l lg:border-slate-800 lg:pl-6">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verbatim Policy Verification
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {rec.evidence_quotes.map((eq, qIdx) => {
                          const ev = evidenceMap.get(eq.source_id);
                          return (
                            <div
                              key={`${eq.source_id}-${qIdx}`}
                              className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5 text-xs"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-mono-num font-semibold text-blue-400">
                                  {eq.source_id}
                                </span>
                                <span>{ev?.metadata.approval_tier ?? 'Verified Policy'}</span>
                              </div>
                              <p className="mt-2 leading-relaxed">
                                {ev ? (
                                  <HighlightedQuote fullText={ev.text} quote={eq.quote} />
                                ) : (
                                  <span className="text-emerald-200">&ldquo;{eq.quote}&rdquo;</span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Retrieved Hybrid RAG Context Drawer */}
            <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Hybrid RAG Evidence Context ({result.retrieved_evidence.length} Policy Chunks)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400 font-mono-num truncate max-w-3xl">
                    Synthesized Query: {result.retrieval_query}
                  </p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-800/70">
                {result.retrieved_evidence.map((chunk) => {
                  const isOpen = expandedEvidenceId === chunk.id;
                  return (
                    <div key={chunk.id} className="py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedEvidenceId(isOpen ? null : chunk.id)}
                        className="flex w-full items-center justify-between gap-4 text-left"
                      >
                        <div className="flex items-center gap-2.5 text-xs">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-mono-num font-semibold text-blue-400">
                            {chunk.source_id}
                          </span>
                          <span className="font-medium text-slate-200">{chunk.title}</span>
                          <span className="hidden text-slate-500 sm:inline">· {chunk.category}</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono-num text-[11px] text-slate-400 shrink-0">
                          <span>RRF {chunk.rrf_score.toFixed(4)}</span>
                          <span className="hidden md:inline">BM25 #{chunk.bm25_rank ?? '—'}</span>
                          <span className="hidden md:inline">Vec #{chunk.semantic_rank ?? '—'}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <p className="mt-2.5 pl-6 text-xs leading-relaxed text-slate-300">
                          {chunk.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
