import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Bot,
  Cpu,
  BookOpen,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react';
import type {
  EnrichedCustomer,
  KnowledgeDocument,
  ModelEvaluationReport,
  RAGEvaluationReport,
} from './types';
import { OverviewWorkspace } from './components/OverviewWorkspace';
import { CustomersWorkspace } from './components/CustomersWorkspace';
import { RetentionStudioWorkspace } from './components/RetentionStudioWorkspace';
import { ModelArenaWorkspace } from './components/ModelArenaWorkspace';
import { RagLabWorkspace } from './components/RagLabWorkspace';
import type { WorkspaceTab } from './components/ArchitectureTopology';
import { loadPlatformBootstrap } from './services/api';

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  breadcrumb: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Command Overview', breadcrumb: 'RetainIQ / Command Overview', icon: LayoutDashboard },
  { id: 'customers', label: 'Customer Intelligence', breadcrumb: 'RetainIQ / Customer Intelligence & What-If', icon: Users },
  { id: 'studio', label: 'Retention Studio', breadcrumb: 'RetainIQ / Multi-Agent Retention Studio', icon: Bot },
  { id: 'models', label: 'ML Model Arena', breadcrumb: 'RetainIQ / 3-Model ML Evaluation Arena', icon: Cpu },
  { id: 'rag', label: 'Hybrid RAG Lab', breadcrumb: 'RetainIQ / Hybrid RAG & Knowledge Base', icon: BookOpen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [evaluation, setEvaluation] = useState<ModelEvaluationReport | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [ragEval, setRagEval] = useState<RAGEvaluationReport | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [dataSourceLabel, setDataSourceLabel] = useState('Enterprise Portfolio (24 Accounts)');
  const [studioCustomer, setStudioCustomer] = useState<EnrichedCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await loadPlatformBootstrap();
      setGeminiConfigured(data.geminiConfigured);
      setCustomers(data.customers);
      setEvaluation(data.evaluation);
      setDocuments(data.documents);
      setRagEval(data.ragEval);
      setDataSourceLabel(`Enterprise Portfolio (${data.customers.length} Accounts)`);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to initialize intelligence engine.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectForStudio = (customer: EnrichedCustomer) => {
    setStudioCustomer(customer);
    setActiveTab('studio');
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];
  const highestRiskCustomer =
    [...customers].sort((a, b) => b.annual_revenue_at_risk - a.annual_revenue_at_risk)[0] || null;

  return (
    <div className="flex min-h-screen bg-[#090D16] text-slate-100">
      {/* Desktop Command Sidebar (256px) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/90 bg-[#0B111E] lg:flex">
        <div className="flex h-16 items-center border-b border-slate-800/90 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap"
          >
            RetainIQ
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary workspaces">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive ? 'text-slate-50' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-slate-800/80 border border-slate-700/70"
                  />
                )}
                <Icon className={`relative z-10 h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quiet Sidebar Summary */}
        <div className="border-t border-slate-800/90 px-6 py-4 text-xs text-slate-500 space-y-1.5">
          <div className="flex justify-between">
            <span>ML Models</span>
            <span className="font-mono-num text-slate-300">3 + Ensemble</span>
          </div>
          <div className="flex justify-between">
            <span>RAG Policies</span>
            <span className="font-mono-num text-slate-300">{documents.length} Indexed</span>
          </div>
          <div className="flex justify-between">
            <span>Agent Pipeline</span>
            <span className="font-mono-num text-slate-300">4 Verified Stages</span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-64 flex-col border-r border-slate-800 bg-[#0B111E]"
            >
              <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
                <span className="font-display text-lg font-bold text-slate-50">RetainIQ</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-100"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1 p-3">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                        isActive
                          ? 'bg-slate-800 text-slate-50'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean Contextual Top Bar Contract */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-6 border-b border-slate-800/90 bg-[#090D16]/95 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-sm font-medium text-slate-300">
              {currentNav.breadcrumb}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              if (highestRiskCustomer) {
                handleSelectForStudio(highestRiskCustomer);
              } else {
                setActiveTab('studio');
              }
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Run Top-Risk Rescue
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* Main Scroll Viewport */}
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-6">
          {loadError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
              <p className="font-semibold">Failed to initialize RetainIQ Intelligence Platform</p>
              <p className="mt-1 text-xs">{loadError}</p>
              <button
                type="button"
                onClick={loadInitialData}
                className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-medium text-red-100 hover:bg-red-500/30"
              >
                Retry Connection
              </button>
            </div>
          ) : isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl border border-slate-800 bg-[#0E1525]" />
                ))}
              </div>
              <div className="h-64 rounded-xl border border-slate-800 bg-[#0E1525]" />
              <div className="h-80 rounded-xl border border-slate-800 bg-[#0E1525]" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'overview' && (
                  <OverviewWorkspace
                    customers={customers}
                    evaluation={evaluation}
                    ragEval={ragEval}
                    docCount={documents.length}
                    onNavigate={setActiveTab}
                    onSelectForStudio={handleSelectForStudio}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomersWorkspace
                    customers={customers}
                    onCustomersUpdated={(next, label) => {
                      setCustomers(next);
                      setDataSourceLabel(label);
                    }}
                    onResetDemo={loadInitialData}
                    dataSourceLabel={dataSourceLabel}
                    onLaunchStudio={handleSelectForStudio}
                  />
                )}

                {activeTab === 'studio' && (
                  <RetentionStudioWorkspace
                    customers={customers}
                    initialCustomer={studioCustomer}
                    geminiConfigured={geminiConfigured}
                  />
                )}

                {activeTab === 'models' && (
                  <ModelArenaWorkspace
                    evaluation={evaluation}
                    onWeightsUpdated={(nextEval, nextCustomers) => {
                      setEvaluation(nextEval);
                      if (!dataSourceLabel.startsWith('Uploaded')) {
                        setCustomers(nextCustomers);
                      }
                    }}
                  />
                )}

                {activeTab === 'rag' && (
                  <RagLabWorkspace
                    documents={documents}
                    ragEval={ragEval}
                    onDocumentsUpdated={(docs, evalRep) => {
                      setDocuments(docs);
                      setRagEval(evalRep);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
