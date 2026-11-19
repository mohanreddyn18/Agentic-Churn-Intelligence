import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Database, Cpu, Search, Bot, ShieldCheck } from 'lucide-react';

export type WorkspaceTab = 'overview' | 'customers' | 'studio' | 'models' | 'rag';

interface ArchitectureTopologyProps {
  customerCount: number;
  ensembleAuc: number;
  docCount: number;
  ragMrr: number;
  onNavigate: (tab: WorkspaceTab) => void;
}

interface PipelineNode {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  metric: string;
  description: string;
  targetTab: WorkspaceTab;
  ctaLabel: string;
  icon: typeof Database;
}

export function ArchitectureTopology({
  customerCount,
  ensembleAuc,
  docCount,
  ragMrr,
  onNavigate,
}: ArchitectureTopologyProps) {
  const [activeId, setActiveId] = useState<string>('ml');

  const nodes: PipelineNode[] = [
    {
      id: 'data',
      step: '01',
      title: 'Customer Ingestion',
      subtitle: 'Schema & Feature Vectorizer',
      metric: `${customerCount} Accounts`,
      description:
        'Normalizes uploaded CSV portfolios or live CRM profiles across 9 behavioral, billing, contract, and support escalation signals.',
      targetTab: 'customers',
      ctaLabel: 'Open Customer Explorer',
      icon: Database,
    },
    {
      id: 'ml',
      step: '02',
      title: '3-Model ML Ensemble',
      subtitle: 'LR + Random Forest + GBDT',
      metric: `${(ensembleAuc * 100).toFixed(1)}% ROC-AUC`,
      description:
        'Trains and blends L2 Logistic Regression, a 15-tree CART Random Forest, and 40-stage Gradient Boosted Trees with marginal SHAP feature attributions.',
      targetTab: 'models',
      ctaLabel: 'Inspect Model Arena',
      icon: Cpu,
    },
    {
      id: 'rag',
      step: '03',
      title: 'Hybrid RAG Engine',
      subtitle: 'Okapi BM25 + Dense RRF',
      metric: `${docCount} Policies · ${(ragMrr * 100).toFixed(0)}% MRR`,
      description:
        'Synthesizes a customer-specific query from ML risk drivers and fuses lexical BM25 scores with dense semantic cosine similarity via Reciprocal Rank Fusion.',
      targetTab: 'rag',
      ctaLabel: 'Explore Hybrid RAG Lab',
      icon: Search,
    },
    {
      id: 'agents',
      step: '04',
      title: 'Retention Strategist',
      subtitle: 'Gemini 4 Hydrogen & Policy AI',
      metric: '3 Ranked Playbooks',
      description:
        'Coordinates root-cause diagnosis and personalized retention strategy synthesis with multi-channel outreach scripts, offer mechanics, and 12-month ROI modeling.',
      targetTab: 'studio',
      ctaLabel: 'Launch Retention Studio',
      icon: Bot,
    },
    {
      id: 'verify',
      step: '05',
      title: 'Verification Guardrail',
      subtitle: 'Exact Quote & Cap Audit',
      metric: '100% Verbatim Match',
      description:
        'Blocks ungrounded hallucinations by verifying every cited policy ID exists in retrieved evidence and every supporting quote appears verbatim in source clauses.',
      targetTab: 'studio',
      ctaLabel: 'Test Guardrail Verification',
      icon: ShieldCheck,
    },
  ];

  const activeNode = nodes.find((n) => n.id === activeId) || nodes[1];

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <p className="text-xs font-medium text-blue-400">End-to-End Architecture</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-50">
            Interactive Agentic RAG Intelligence Pipeline
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Select any stage to inspect live engine telemetry and navigate directly
        </p>
      </div>

      {/* Interactive Animated Flow Rail */}
      <div className="relative mt-6">
        {/* Animated SVG Data Flow Track (Desktop) */}
        <div className="pointer-events-none absolute top-10 left-8 right-8 hidden lg:block" aria-hidden="true">
          <svg className="h-6 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 24">
            <line
              x1="0"
              y1="12"
              x2="1000"
              y2="12"
              stroke="#1E293B"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <motion.line
              x1="0"
              y1="12"
              x2="1000"
              y2="12"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="90 910"
              initial={{ strokeDashoffset: 1000 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.circle
              cy="12"
              r="3.5"
              fill="#60A5FA"
              initial={{ cx: 0, opacity: 0 }}
              animate={{ cx: [0, 1000], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.circle
              cy="12"
              r="3.5"
              fill="#10B981"
              initial={{ cx: 0, opacity: 0 }}
              animate={{ cx: [0, 1000], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3.4, delay: 1.7, repeat: Infinity, ease: 'linear' }}
            />
          </svg>
        </div>

        {/* 5 Interactive Pipeline Nodes */}
        <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isActive = node.id === activeId;
            return (
              <motion.button
                key={node.id}
                type="button"
                onClick={() => setActiveId(node.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -3 }}
                className={`group relative flex flex-col items-start rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'border-blue-500/70 bg-[#131F38]'
                    : 'border-slate-800 bg-[#0B111E] hover:border-slate-700 hover:bg-[#101829]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                      isActive
                        ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                        : 'border-slate-800 bg-slate-900 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono-num text-xs text-slate-500">{node.step}</span>
                </div>

                <h3 className="mt-3.5 text-sm font-semibold text-slate-100">{node.title}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{node.subtitle}</p>

                <div className="mt-4 w-full border-t border-slate-800/80 pt-2.5">
                  <span className="font-mono-num text-xs font-medium text-emerald-400">
                    {node.metric}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Expandable Stage Inspection Bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNode.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-800/80 pt-5 md:flex-row md:items-center"
        >
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono-num text-blue-400">Stage {activeNode.step}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200 font-medium">{activeNode.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-emerald-400">{activeNode.metric}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{activeNode.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(activeNode.targetTab)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {activeNode.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
