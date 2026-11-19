import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Upload,
  Download,
  Sliders,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import type { EnrichedCustomer, ModelBreakdown, RiskLevel } from '../types';
import { parseCustomerCsv, exportCustomersToCsv } from '../utils/csv';
import { RadialRiskGauge } from './RadialRiskGauge';

interface CustomersWorkspaceProps {
  customers: EnrichedCustomer[];
  onCustomersUpdated: (newCustomers: EnrichedCustomer[], sourceLabel: string) => void;
  onResetDemo: () => void;
  dataSourceLabel: string;
  onLaunchStudio: (customer: EnrichedCustomer) => void;
}

export function CustomersWorkspace({
  customers,
  onCustomersUpdated,
  onResetDemo,
  dataSourceLabel,
  onLaunchStudio,
}: CustomersWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');
  const [selectedId, setSelectedId] = useState<string>(customers[0]?.customer_id ?? '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isScoringCsv, setIsScoringCsv] = useState(false);

  // What-If Simulator State
  const [simActive, setSimActive] = useState(false);
  const [simDiscountPct, setSimDiscountPct] = useState(0);
  const [simContract, setSimContract] = useState<string>('');
  const [simSupportCalls, setSimSupportCalls] = useState<number>(0);
  const [simAutoPay, setSimAutoPay] = useState<boolean>(false);
  const [simTechSupport, setSimTechSupport] = useState<boolean>(false);
  const [simPrediction, setSimPrediction] = useState<ModelBreakdown | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = customers.filter((c) => {
    const matchesRisk = riskFilter === 'All' || c.risk_level === riskFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.customer_id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.segment.toLowerCase().includes(q) ||
      c.contract.toLowerCase().includes(q);
    return matchesRisk && matchesSearch;
  });

  const selectedCustomer =
    customers.find((c) => c.customer_id === selectedId) || filtered[0] || customers[0] || null;

  const selectCustomer = (c: EnrichedCustomer) => {
    setSelectedId(c.customer_id);
    setSimActive(false);
    setSimPrediction(null);
    setSimDiscountPct(0);
    setSimContract(c.contract);
    setSimSupportCalls(c.support_calls);
    setSimAutoPay(!c.payment_method.toLowerCase().includes('check'));
    setSimTechSupport(c.tech_support.toLowerCase().startsWith('y'));
  };

  const runSimulation = async (
    base: EnrichedCustomer,
    overrides: {
      discountPct: number;
      contract: string;
      supportCalls: number;
      autoPay: boolean;
      techSupport: boolean;
    }
  ) => {
    setSimActive(true);
    setIsSimulating(true);
    try {
      const simulatedPayload = {
        ...base,
        monthly_charges: Number((base.monthly_charges * (1 - overrides.discountPct / 100)).toFixed(2)),
        contract: overrides.contract,
        support_calls: overrides.supportCalls,
        payment_method: overrides.autoPay ? 'Credit card (auto)' : base.payment_method,
        tech_support: overrides.techSupport ? 'Yes' : 'No',
        usage_score: overrides.techSupport ? Math.min(95, base.usage_score + 12) : base.usage_score,
      };
      const res = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: simulatedPayload }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimPrediction(data.prediction);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsScoringCsv(true);
    try {
      const text = await file.text();
      const parsed = parseCustomerCsv(text);
      const res = await fetch('/api/customers/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server scoring failed.');
      }
      onCustomersUpdated(data.customers, `Uploaded CSV: ${file.name}`);
      if (data.customers[0]) {
        selectCustomer(data.customers[0]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to parse CSV file.');
    } finally {
      setIsScoringCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const csv = exportCustomersToCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'retainiq_scored_customers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const activePred = simActive && simPrediction ? simPrediction : selectedCustomer?.prediction;

  return (
    <div className="space-y-5">
      {/* Toolbar: Search, Segmented Filter, CSV Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0E1525] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, account, segment..."
              className="w-64 rounded-lg border border-slate-700/80 bg-[#090D16] py-2 pr-3 pl-9 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Segmented Risk Filter Controls */}
          <div className="flex items-center gap-1 rounded-lg bg-[#090D16] p-1 border border-slate-800">
            {(['All', 'High', 'Medium', 'Low'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setRiskFilter(tier)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  riskFilter === tier
                    ? 'bg-slate-800 text-slate-50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier === 'All' ? `All (${customers.length})` : tier}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 hidden text-xs text-slate-500 xl:inline">{dataSourceLabel}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScoringCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {isScoringCsv ? 'Scoring CSV...' : 'Upload & Score CSV'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Export Scored CSV
          </button>
          {dataSourceLabel.startsWith('Uploaded') && (
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Split Workspace: Customer Data Table + Live Deep Inspector & What-If Lab */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: High-Density Customer Grid */}
        <div className="rounded-xl border border-slate-800 bg-[#0E1525] xl:col-span-7 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-100">Scored Customer Portfolio</h3>
            <span className="font-mono-num text-xs text-slate-500">
              Showing {filtered.length} of {customers.length}
            </span>
          </div>

          <div className="max-h-[680px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0B111E] border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Contract</th>
                  <th className="px-3 py-3 font-medium text-right">Tenure</th>
                  <th className="px-3 py-3 font-medium text-right">MRR</th>
                  <th className="px-3 py-3 font-medium text-right">Calls</th>
                  <th className="px-5 py-3 font-medium text-right">Ensemble Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No customers match the active search and risk filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const isSelected = selectedCustomer?.customer_id === c.customer_id;
                    return (
                      <tr
                        key={c.customer_id}
                        onClick={() => selectCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-500/12' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-100">{c.name}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            <span className="font-mono-num">{c.customer_id}</span>
                            <span className="mx-1" aria-hidden="true">·</span>
                            <span>{c.segment}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{c.contract}</td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-300">
                          {c.tenure}m
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-200">
                          ${c.monthly_charges}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-300">
                          {c.support_calls}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`font-mono-num font-semibold ${
                              c.risk_level === 'High'
                                ? 'text-red-400'
                                : c.risk_level === 'Medium'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {(c.churn_probability * 100).toFixed(1)}%
                          </span>
                          <span className="ml-1.5 text-[11px] text-slate-500">{c.risk_level}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Deep Profile, 3-Model Breakdown, SHAP Attributions & Live What-If Simulator */}
        <div className="xl:col-span-5">
          <AnimatePresence mode="wait">
            {selectedCustomer && activePred && (
              <motion.div
                key={selectedCustomer.customer_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 space-y-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono-num text-blue-400">
                        {selectedCustomer.customer_id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedCustomer.segment}</span>
                      <span aria-hidden="true">·</span>
                      <span>NPS {selectedCustomer.nps_score}/10</span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-50">
                      {selectedCustomer.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLaunchStudio(selectedCustomer)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
                  >
                    Run Retention Agents
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Gauge + 3-Model Breakdown */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 items-center">
                  <div className="flex flex-col items-center">
                    <RadialRiskGauge
                      probability={activePred.ensemble_probability}
                      riskLevel={activePred.risk_level}
                      confidenceLow={activePred.confidence_low}
                      confidenceHigh={activePred.confidence_high}
                      size={174}
                      label={simActive ? 'Simulated Risk' : 'Ensemble Risk'}
                    />
                    {simActive && (
                      <div className="mt-1 text-xs font-mono-num text-emerald-400">
                        Delta:{' '}
                        {(
                          (activePred.ensemble_probability - selectedCustomer.churn_probability) *
                          100
                        ).toFixed(1)}{' '}
                        pts
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-400">
                      Individual Model Predictions
                    </p>
                    {[
                      {
                        label: 'Gradient Boosting',
                        val: activePred.gradient_boosting,
                        bar: 'bg-blue-500',
                      },
                      {
                        label: 'Random Forest (15)',
                        val: activePred.random_forest,
                        bar: 'bg-cyan-400',
                      },
                      {
                        label: 'L2 Logistic Reg.',
                        val: activePred.logistic_regression,
                        bar: 'bg-indigo-400',
                      },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">{m.label}</span>
                          <span className="font-mono-num font-medium text-slate-100">
                            {(m.val * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className={`h-full rounded-full ${m.bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(m.val * 100)}%` }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-1 text-[11px] text-slate-500 flex justify-between">
                      <span>Model Agreement</span>
                      <span className="font-mono-num text-slate-300">
                        {(activePred.agreement_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* SHAP Feature Contribution Drivers */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Feature Impact Attribution (SHAP-Style)
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Red increases churn · Green protects
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {activePred.feature_contributions.slice(0, 5).map((fc) => {
                      const pctWidth = Math.min(100, Math.abs(fc.impact) * 260);
                      const isRisk = fc.impact > 0;
                      return (
                        <div key={fc.feature} className="grid grid-cols-12 items-center gap-2 text-xs">
                          <div className="col-span-5 truncate text-slate-300">
                            {fc.label}{' '}
                            <span className="text-slate-500 font-mono-num">({fc.value})</span>
                          </div>
                          <div className="col-span-5 flex items-center">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                              <motion.div
                                className={`h-full rounded-full ${isRisk ? 'bg-red-500/85' : 'bg-emerald-500/85'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(4, pctWidth)}%` }}
                                transition={{ duration: 0.4 }}
                              />
                            </div>
                          </div>
                          <div
                            className={`col-span-2 text-right font-mono-num text-[11px] font-medium ${
                              isRisk ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {isRisk ? '+' : ''}
                            {(fc.impact * 100).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Interactive What-If Retention Simulator */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Sliders className="h-3.5 w-3.5 text-blue-400" />
                      <span>Live What-If Intervention Simulator</span>
                    </div>
                    {simActive && (
                      <button
                        type="button"
                        onClick={() => selectCustomer(selectedCustomer)}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        Reset baseline
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Retention Rate Discount</span>
                        <span className="font-mono-num text-slate-200">
                          {simDiscountPct}% (${(selectedCustomer.monthly_charges * (1 - simDiscountPct / 100)).toFixed(0)}/mo)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={25}
                        step={5}
                        value={simDiscountPct}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setSimDiscountPct(next);
                          runSimulation(selectedCustomer, {
                            discountPct: next,
                            contract: simContract || selectedCustomer.contract,
                            supportCalls: simSupportCalls,
                            autoPay: simAutoPay,
                            techSupport: simTechSupport,
                          });
                        }}
                        className="mt-1 w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400">Target Contract</label>
                        <select
                          value={simContract || selectedCustomer.contract}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSimContract(next);
                            runSimulation(selectedCustomer, {
                              discountPct: simDiscountPct,
                              contract: next,
                              supportCalls: simSupportCalls,
                              autoPay: simAutoPay,
                              techSupport: simTechSupport,
                            });
                          }}
                          className="mt-1 w-full rounded-md border border-slate-700 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Month-to-month">Month-to-month</option>
                          <option value="One year">One year</option>
                          <option value="Two year">Two year</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400">
                          Post-SLA Support Calls ({simSupportCalls})
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(5, selectedCustomer.support_calls)}
                          step={1}
                          value={simSupportCalls}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setSimSupportCalls(next);
                            runSimulation(selectedCustomer, {
                              discountPct: simDiscountPct,
                              contract: simContract || selectedCustomer.contract,
                              supportCalls: next,
                              autoPay: simAutoPay,
                              techSupport: simTechSupport,
                            });
                          }}
                          className="mt-2.5 w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simAutoPay}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setSimAutoPay(next);
                            runSimulation(selectedCustomer, {
                              discountPct: simDiscountPct,
                              contract: simContract || selectedCustomer.contract,
                              supportCalls: simSupportCalls,
                              autoPay: next,
                              techSupport: simTechSupport,
                            });
                          }}
                          className="rounded border-slate-600 bg-slate-900 accent-blue-500"
                        />
                        <span>Enroll Auto-Pay</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simTechSupport}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setSimTechSupport(next);
                            runSimulation(selectedCustomer, {
                              discountPct: simDiscountPct,
                              contract: simContract || selectedCustomer.contract,
                              supportCalls: simSupportCalls,
                              autoPay: simAutoPay,
                              techSupport: next,
                            });
                          }}
                          className="rounded border-slate-600 bg-slate-900 accent-blue-500"
                        />
                        <span>Bundle Dedicated Tech Support</span>
                      </label>

                      {isSimulating && (
                        <span className="text-[11px] text-blue-400">Recalculating models...</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
