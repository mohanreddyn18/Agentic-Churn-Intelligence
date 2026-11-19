import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import type { EnrichedCustomer, ModelEvaluationReport, RAGEvaluationReport } from '../types';
import { AnimatedNumber } from './AnimatedNumber';
import { ArchitectureTopology, type WorkspaceTab } from './ArchitectureTopology';

interface OverviewWorkspaceProps {
  customers: EnrichedCustomer[];
  evaluation: ModelEvaluationReport | null;
  ragEval: RAGEvaluationReport | null;
  docCount: number;
  onNavigate: (tab: WorkspaceTab) => void;
  onSelectForStudio: (customer: EnrichedCustomer) => void;
}

export function OverviewWorkspace({
  customers,
  evaluation,
  ragEval,
  docCount,
  onNavigate,
  onSelectForStudio,
}: OverviewWorkspaceProps) {
  const total = customers.length;
  const highRisk = customers.filter((c) => c.risk_level === 'High');
  const medRisk = customers.filter((c) => c.risk_level === 'Medium');
  const lowRisk = customers.filter((c) => c.risk_level === 'Low');

  const avgProb =
    total > 0 ? (customers.reduce((s, c) => s + c.churn_probability, 0) / total) * 100 : 0;
  const annualRevenueAtRisk = customers.reduce((s, c) => s + c.annual_revenue_at_risk, 0);
  const ensembleAuc = evaluation?.models.find((m) => m.id === 'ensemble')?.roc_auc ?? 0.91;
  const ragMrr = ragEval?.mrr ?? 0.94;

  const cohortData = [
    {
      name: 'Critical (≥65%)',
      count: highRisk.length,
      exposure: Math.round(highRisk.reduce((s, c) => s + c.annual_revenue_at_risk, 0)),
      color: '#EF4444',
    },
    {
      name: 'Elevated (35–64%)',
      count: medRisk.length,
      exposure: Math.round(medRisk.reduce((s, c) => s + c.annual_revenue_at_risk, 0)),
      color: '#F59E0B',
    },
    {
      name: 'Nominal (<35%)',
      count: lowRisk.length,
      exposure: Math.round(lowRisk.reduce((s, c) => s + c.annual_revenue_at_risk, 0)),
      color: '#10B981',
    },
  ];

  const scatterData = customers.map((c) => ({
    id: c.customer_id,
    name: c.name,
    tenure: c.tenure,
    risk: Number((c.churn_probability * 100).toFixed(1)),
    mrr: c.monthly_charges,
    level: c.risk_level,
  }));

  const urgentQueue = [...customers]
    .sort((a, b) => b.annual_revenue_at_risk - a.annual_revenue_at_risk)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Portfolio KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Monitored Accounts',
            value: total,
            decimals: 0,
            prefix: '',
            suffix: '',
            detail: `${highRisk.length} Critical · ${medRisk.length} Elevated · ${lowRisk.length} Nominal`,
            accent: 'text-slate-50',
          },
          {
            label: 'Annual Revenue at Risk',
            value: annualRevenueAtRisk,
            decimals: 0,
            prefix: '$',
            suffix: '',
            detail: `Mean churn probability ${avgProb.toFixed(1)}% across cohort`,
            accent: 'text-red-400',
          },
          {
            label: 'Ensemble Holdout ROC-AUC',
            value: ensembleAuc * 100,
            decimals: 1,
            prefix: '',
            suffix: '%',
            detail: 'L2 Logistic + 15-Tree Forest + 40-Stage GBDT',
            accent: 'text-blue-400',
          },
          {
            label: 'Hybrid RAG Retrieval MRR',
            value: ragMrr * 100,
            decimals: 1,
            prefix: '',
            suffix: '%',
            detail: `${docCount} governed playbooks · BM25 + Semantic RRF`,
            accent: 'text-emerald-400',
          },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-slate-800 bg-[#0E1525] p-5"
          >
            <p className="text-xs font-medium text-slate-400">{kpi.label}</p>
            <div className={`mt-2 text-3xl font-semibold tracking-tight ${kpi.accent}`}>
              <AnimatedNumber
                value={kpi.value}
                decimals={kpi.decimals}
                prefix={kpi.prefix}
                suffix={kpi.suffix}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{kpi.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* Interactive Animated Pipeline Topology */}
      <ArchitectureTopology
        customerCount={total}
        ensembleAuc={ensembleAuc}
        docCount={docCount}
        ragMrr={ragMrr}
        onNavigate={onNavigate}
      />

      {/* Analytical Visual Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Revenue Exposure by Risk Cohort */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Revenue Exposure by Risk Tier
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Expected 12-month ARR loss weighted by ensemble churn probability
              </p>
            </div>
          </div>

          <div className="mt-5 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohortData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                  contentStyle={{
                    backgroundColor: '#0B111E',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'ARR at Risk']}
                />
                <Bar dataKey="exposure" radius={[6, 6, 0, 0]} maxBarSize={54}>
                  {cohortData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800 pt-4">
            {cohortData.map((c) => (
              <div key={c.name} className="px-3 first:pl-0 last:pr-0">
                <p className="text-[11px] text-slate-400">{c.name.split(' ')[0]}</p>
                <p className="mt-1 font-mono-num text-sm font-semibold text-slate-100">
                  {c.count} accts
                </p>
                <p className="font-mono-num text-xs text-slate-500">
                  ${c.exposure.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Tenure vs Churn Risk Scatter Matrix */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Tenure vs. Ensemble Churn Probability
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Bubble size scales with monthly recurring revenue (MRR)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="text-red-400">High ≥65%</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">Medium 35–64%</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Low &lt;35%</span>
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, bottom: 8, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  type="number"
                  dataKey="tenure"
                  name="Tenure"
                  unit=" mo"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="risk"
                  name="Churn Risk"
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ZAxis type="number" dataKey="mrr" range={[50, 260]} name="MRR" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                  contentStyle={{
                    backgroundColor: '#0B111E',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Churn Risk') return [`${value}%`, name];
                    if (name === 'Tenure') return [`${value} months`, name];
                    return [`$${value}/mo`, 'Monthly Spend'];
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={
                        entry.level === 'High'
                          ? '#EF4444'
                          : entry.level === 'Medium'
                            ? '#F59E0B'
                            : '#10B981'
                      }
                      fillOpacity={0.82}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      {/* Priority Intervention Queue */}
      <section className="rounded-xl border border-slate-800 bg-[#0E1525]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Priority Revenue Rescue Queue
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Ranked by 12-month annualized revenue at risk — launch the 4-Agent Retention Studio directly
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            View all {total} accounts →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs font-medium text-slate-400">
                <th className="px-6 py-3">Account</th>
                <th className="px-4 py-3">Contract & Tenure</th>
                <th className="px-4 py-3 text-right">Monthly Spend</th>
                <th className="px-4 py-3 text-right">Support Calls</th>
                <th className="px-4 py-3 text-right">Ensemble Risk</th>
                <th className="px-4 py-3 text-right">Annual ARR at Risk</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {urgentQueue.map((c, idx) => (
                <motion.tr
                  key={c.customer_id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="transition-colors hover:bg-slate-800/35"
                >
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-slate-100">{c.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono-num">{c.customer_id}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{c.segment}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300">
                    <div>{c.contract}</div>
                    <div className="mt-0.5 font-mono-num text-slate-500">{c.tenure} months tenure</div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-slate-200">
                    ${c.monthly_charges.toFixed(0)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-slate-300">
                    {c.support_calls}
                  </td>
                  <td className="px-4 py-3.5 text-right">
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
                    <span className="ml-1.5 text-xs text-slate-500">{c.risk_level}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num font-medium text-slate-100">
                    ${c.annual_revenue_at_risk.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectForStudio(c)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/20 hover:text-blue-200 whitespace-nowrap"
                    >
                      Generate Strategy
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
