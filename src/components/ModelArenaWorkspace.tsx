import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Sliders, RotateCcw } from 'lucide-react';
import type {
  EnrichedCustomer,
  EnsembleWeights,
  ModelEvaluationReport,
  SingleModelMetrics,
} from '../types';
import { AnimatedNumber } from './AnimatedNumber';
import { updateEnsembleWeights } from '../services/api';

interface ModelArenaWorkspaceProps {
  evaluation: ModelEvaluationReport | null;
  onWeightsUpdated: (evaluation: ModelEvaluationReport, customers: EnrichedCustomer[]) => void;
}

const MODEL_COLORS: Record<SingleModelMetrics['id'], string> = {
  ensemble: '#3B82F6',
  gradient_boosting: '#10B981',
  random_forest: '#06B6D4',
  logistic_regression: '#F59E0B',
};

export function ModelArenaWorkspace({
  evaluation,
  onWeightsUpdated,
}: ModelArenaWorkspaceProps) {
  const [selectedModelId, setSelectedModelId] =
    useState<SingleModelMetrics['id']>('ensemble');
  const [weights, setWeights] = useState<EnsembleWeights>(
    evaluation?.weights ?? {
      logistic_regression: 0.25,
      random_forest: 0.35,
      gradient_boosting: 0.4,
    }
  );
  const [isUpdating, setIsUpdating] = useState(false);

  if (!evaluation) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0E1525] p-12 text-center text-sm text-slate-400">
        Loading holdout model evaluation metrics...
      </div>
    );
  }

  const activeModel =
    evaluation.models.find((m) => m.id === selectedModelId) || evaluation.models[0];

  // Combine ROC curve points across all 4 models into a clean unified grid of 21 FPR ticks
  const rocChartData = Array.from({ length: 21 }, (_, idx) => {
    const fprTick = Number((idx * 0.05).toFixed(2));
    const sampleTpr = (curve: Array<{ fpr: number; tpr: number }>) => {
      let best = 0;
      for (const pt of curve) {
        if (pt.fpr <= fprTick + 0.03) best = Math.max(best, pt.tpr);
      }
      return Number((best * 100).toFixed(1));
    };

    const ens = evaluation.models.find((m) => m.id === 'ensemble')!;
    const gb = evaluation.models.find((m) => m.id === 'gradient_boosting')!;
    const rf = evaluation.models.find((m) => m.id === 'random_forest')!;
    const lr = evaluation.models.find((m) => m.id === 'logistic_regression')!;

    return {
      fpr: Math.round(fprTick * 100),
      baseline: Math.round(fprTick * 100),
      ensemble: sampleTpr(ens.roc_curve),
      gradient_boosting: sampleTpr(gb.roc_curve),
      random_forest: sampleTpr(rf.roc_curve),
      logistic_regression: sampleTpr(lr.roc_curve),
    };
  });

  const applyWeights = async (nextWeights: EnsembleWeights) => {
    setWeights(nextWeights);
    setIsUpdating(true);
    try {
      const data = await updateEnsembleWeights(nextWeights);
      setWeights(data.evaluation.weights);
      onWeightsUpdated(data.evaluation, data.customers);
    } finally {
      setIsUpdating(false);
    }
  };

  const cm = activeModel.confusion_matrix;
  const cmTotal = Math.max(1, cm.tp + cm.fp + cm.tn + cm.fn);

  return (
    <div className="space-y-6">
      {/* Model Selector & Benchmark Leaderboard */}
      <section className="rounded-xl border border-slate-800 bg-[#0E1525] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Multi-Model Holdout Validation Arena
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Trained on {evaluation.train_samples} stratified accounts · Evaluated on{' '}
              {evaluation.test_samples} unseen holdout records (churn prevalence{' '}
              {(evaluation.positive_rate * 100).toFixed(1)}%)
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Click any model row to inspect its confusion matrix
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B111E] text-slate-400">
                <th className="px-6 py-3 font-medium">Model Architecture</th>
                <th className="px-4 py-3 font-medium text-right">ROC-AUC</th>
                <th className="px-4 py-3 font-medium text-right">F1 Score</th>
                <th className="px-4 py-3 font-medium text-right">Accuracy</th>
                <th className="px-4 py-3 font-medium text-right">Precision</th>
                <th className="px-6 py-3 font-medium text-right">Recall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {evaluation.models.map((m) => {
                const isSelected = m.id === selectedModelId;
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedModelId(m.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-500/12' : 'hover:bg-slate-800/35'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: MODEL_COLORS[m.id] }}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="font-semibold text-slate-100">{m.name}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">{m.family}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono-num text-sm font-semibold text-blue-400">
                      <AnimatedNumber value={m.roc_auc * 100} decimals={1} suffix="%" />
                    </td>
                    <td className="px-4 py-4 text-right font-mono-num text-slate-100">
                      <AnimatedNumber value={m.f1 * 100} decimals={1} suffix="%" />
                    </td>
                    <td className="px-4 py-4 text-right font-mono-num text-slate-200">
                      {(m.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 text-right font-mono-num text-slate-300">
                      {(m.precision * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-right font-mono-num text-slate-300">
                      {(m.recall * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ROC Curves + Confusion Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Multi-Model ROC Curve */}
        <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Receiver Operating Characteristic (ROC Curves)
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                True Positive Rate vs. False Positive Rate across probability decision thresholds
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="text-blue-400">Ensemble</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">GBDT</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-400">Random Forest</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">Logistic Reg.</span>
            </div>
          </div>

          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocChartData} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="fpr"
                  unit="%"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B111E',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(v: number, name: string) => [`${v}% TPR`, name.replace('_', ' ')]}
                  labelFormatter={(l) => `False Positive Rate: ${l}%`}
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: 100, y: 100 },
                  ]}
                  stroke="#334155"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="ensemble"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                  name="Ensemble"
                />
                <Line
                  type="monotone"
                  dataKey="gradient_boosting"
                  stroke="#10B981"
                  strokeWidth={1.8}
                  dot={false}
                  name="GBDT"
                />
                <Line
                  type="monotone"
                  dataKey="random_forest"
                  stroke="#06B6D4"
                  strokeWidth={1.8}
                  dot={false}
                  name="Random Forest"
                />
                <Line
                  type="monotone"
                  dataKey="logistic_regression"
                  stroke="#F59E0B"
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                  dot={false}
                  name="Logistic Reg."
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Selected Model Confusion Matrix */}
        <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-5">
          <div>
            <p className="text-xs font-medium text-blue-400">Holdout Confusion Matrix</p>
            <h3 className="mt-1 text-base font-semibold text-slate-100">{activeModel.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {activeModel.description}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              {
                label: 'True Positives (Caught Churn)',
                val: cm.tp,
                tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
              },
              {
                label: 'False Positives (False Alarm)',
                val: cm.fp,
                tone: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
              },
              {
                label: 'False Negatives (Missed Churn)',
                val: cm.fn,
                tone: 'border-red-500/40 bg-red-500/10 text-red-300',
              },
              {
                label: 'True Negatives (Retained)',
                val: cm.tn,
                tone: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
              },
            ].map((cell) => (
              <motion.div
                key={cell.label}
                layout
                className={`rounded-lg border p-4 ${cell.tone}`}
              >
                <p className="text-[11px] opacity-85">{cell.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono-num text-2xl font-semibold">{cell.val}</span>
                  <span className="font-mono-num text-xs opacity-75">
                    {((cell.val / cmTotal) * 100).toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Global Feature Importance + Interactive Ensemble Weight Tuner */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-7">
          <h3 className="text-base font-semibold text-slate-100">
            Global Feature Importance Ranking
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Normalized split gain and standardized log-odds magnitude blended across all 3 models
          </p>

          <div className="mt-5 space-y-3">
            {evaluation.feature_importance.map((f, i) => (
              <div key={f.feature} className="grid grid-cols-12 items-center gap-3 text-xs">
                <div className="col-span-4 truncate text-slate-300">
                  <span className="mr-2 font-mono-num text-slate-500">0{i + 1}</span>
                  {f.label}
                </div>
                <div className="col-span-6">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <motion.div
                      className="h-full rounded-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, f.importance * 3.8)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                    />
                  </div>
                </div>
                <div className="col-span-2 text-right font-mono-num font-medium text-slate-200">
                  {f.importance.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Ensemble Meta-Blender Weight Tuner */}
        <section className="rounded-xl border border-slate-800 bg-[#0E1525] p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              <h3 className="text-base font-semibold text-slate-100">
                Live Ensemble Weight Tuner
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                applyWeights({
                  logistic_regression: 0.25,
                  random_forest: 0.35,
                  gradient_boosting: 0.4,
                })
              }
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Re-weight the probability meta-blender on the server and inspect real-time holdout ROC-AUC and portfolio score shifts.
          </p>

          <div className="mt-5 space-y-4">
            {[
              { key: 'gradient_boosting' as const, label: 'Gradient Boosted Trees (GBDT)' },
              { key: 'random_forest' as const, label: 'Random Forest (15 Trees)' },
              { key: 'logistic_regression' as const, label: 'L2 Logistic Regression' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-mono-num font-semibold text-blue-400">
                    {(weights[item.key] * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={weights[item.key]}
                  onChange={(e) => {
                    const next = { ...weights, [item.key]: Number(e.target.value) };
                    applyWeights(next);
                  }}
                  className="mt-1.5 w-full accent-blue-500 cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-400 flex items-center justify-between">
            <span>Weights auto-normalize to 100%</span>
            {isUpdating && <span className="text-blue-400">Re-scoring portfolio...</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
