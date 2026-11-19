import type {
  ConfusionMatrix,
  CustomerInput,
  EnrichedCustomer,
  EnsembleWeights,
  FeatureContribution,
  ModelBreakdown,
  ModelEvaluationReport,
  RiskLevel,
  RocPoint,
  SingleModelMetrics,
} from '../types';
import { generateCalibrationDataset, type LabeledTrainingRecord } from './dataset';

const FEATURE_META = [
  { key: 'tenure', label: 'Tenure (Months)' },
  { key: 'monthly_charges', label: 'Monthly Charges ($)' },
  { key: 'contract_code', label: 'Contract Term' },
  { key: 'support_calls', label: 'Support Escalations' },
  { key: 'echeck_flag', label: 'Electronic Check Billing' },
  { key: 'fiber_flag', label: 'Fiber Service Tier' },
  { key: 'tech_support_flag', label: 'Dedicated Tech Support' },
  { key: 'usage_score', label: 'Product Usage Score' },
  { key: 'nps_score', label: 'Customer NPS Rating' },
] as const;

type FeatureVector = number[];

function sigmoid(z: number): number {
  const clamped = Math.max(-25, Math.min(25, z));
  return 1 / (1 + Math.exp(-clamped));
}

function clampProb(p: number): number {
  return Math.max(0.01, Math.min(0.99, p));
}

export function classifyRisk(prob: number): RiskLevel {
  if (prob >= 0.65) return 'High';
  if (prob >= 0.35) return 'Medium';
  return 'Low';
}

function encodeContract(contract?: string): number {
  const normalized = String(contract || 'Month-to-month').toLowerCase();
  if (normalized.includes('two') || normalized.includes('2')) return 2;
  if (normalized.includes('one') || normalized.includes('1') || normalized.includes('annual')) return 1;
  return 0;
}

function encodeCustomerToRawFeatures(c: CustomerInput): FeatureVector {
  const tenure = Math.max(0, Number(c.tenure ?? 12));
  const monthly_charges = Math.max(0, Number(c.monthly_charges ?? 70));
  const contract_code = encodeContract(c.contract);
  const support_calls = Math.max(0, Number(c.support_calls ?? 1));
  const echeck_flag = String(c.payment_method || '').toLowerCase().includes('electronic') ? 1 : 0;
  const fiber_flag = String(c.internet_service || 'Fiber optic').toLowerCase().includes('fiber') ? 1 : 0;
  const tech_support_flag = String(c.tech_support || (contract_code >= 1 ? 'Yes' : 'No'))
    .toLowerCase()
    .startsWith('y')
    ? 1
    : 0;
  const usage_score =
    c.usage_score !== undefined && !Number.isNaN(Number(c.usage_score))
      ? Number(c.usage_score)
      : Math.max(20, Math.min(95, Math.round(68 - support_calls * 6 + contract_code * 10)));
  const nps_score =
    c.nps_score !== undefined && !Number.isNaN(Number(c.nps_score))
      ? Number(c.nps_score)
      : Math.max(1, Math.min(10, Math.round(7 - support_calls * 0.7 + contract_code * 0.9)));

  return [
    tenure,
    monthly_charges,
    contract_code,
    support_calls,
    echeck_flag,
    fiber_flag,
    tech_support_flag,
    usage_score,
    nps_score,
  ];
}

function recordToVector(r: LabeledTrainingRecord): FeatureVector {
  return [
    r.tenure,
    r.monthly_charges,
    r.contract_code,
    r.support_calls,
    r.echeck_flag,
    r.fiber_flag,
    r.tech_support_flag,
    r.usage_score,
    r.nps_score,
  ];
}

class LogisticRegressionModel {
  weights: number[] = [];
  bias = 0;
  means: number[] = [];
  stds: number[] = [];

  fit(X: FeatureVector[], y: number[], epochs = 450, lr = 0.18, l2 = 0.015): void {
    const n = X.length;
    const d = X[0].length;
    this.means = Array(d).fill(0);
    this.stds = Array(d).fill(1);

    for (let j = 0; j < d; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += X[i][j];
      const mean = sum / n;
      this.means[j] = mean;
      let variance = 0;
      for (let i = 0; i < n; i++) variance += (X[i][j] - mean) ** 2;
      this.stds[j] = Math.sqrt(variance / n) || 1;
    }

    const Xs = X.map((row) => this.standardize(row));
    this.weights = Array(d).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = Array(d).fill(0);
      let gradB = 0;
      for (let i = 0; i < n; i++) {
        let z = this.bias;
        for (let j = 0; j < d; j++) z += this.weights[j] * Xs[i][j];
        const pred = sigmoid(z);
        const err = pred - y[i];
        gradB += err;
        for (let j = 0; j < d; j++) gradW[j] += err * Xs[i][j];
      }
      this.bias -= (lr * gradB) / n;
      for (let j = 0; j < d; j++) {
        this.weights[j] -= lr * (gradW[j] / n + l2 * this.weights[j]);
      }
    }
  }

  standardize(x: FeatureVector): FeatureVector {
    return x.map((v, j) => (v - this.means[j]) / this.stds[j]);
  }

  predictProba(x: FeatureVector): number {
    const xs = this.standardize(x);
    let z = this.bias;
    for (let j = 0; j < xs.length; j++) z += this.weights[j] * xs[j];
    return clampProb(sigmoid(z));
  }

  getFeatureAttributions(x: FeatureVector): number[] {
    const xs = this.standardize(x);
    const p = this.predictProba(x);
    const slope = p * (1 - p);
    return xs.map((val, j) => this.weights[j] * val * Math.max(0.12, slope));
  }
}

interface TreeNode {
  isLeaf: boolean;
  prob?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

function giniImpurity(labels: number[]): number {
  if (labels.length === 0) return 0;
  let ones = 0;
  for (const v of labels) ones += v;
  const p = ones / labels.length;
  return 1 - p * p - (1 - p) * (1 - p);
}

class DecisionTreeClassifier {
  root: TreeNode | null = null;
  featureImportances: number[] = [];

  fit(
    X: FeatureVector[],
    y: number[],
    maxDepth: number,
    minSamplesSplit: number,
    featureSubsampleSize: number,
    rng: () => number
  ): void {
    const d = X[0].length;
    this.featureImportances = Array(d).fill(0);
    const indices = X.map((_, idx) => idx);
    this.root = this.buildNode(X, y, indices, 0, maxDepth, minSamplesSplit, featureSubsampleSize, rng);
  }

  private buildNode(
    X: FeatureVector[],
    y: number[],
    indices: number[],
    depth: number,
    maxDepth: number,
    minSamplesSplit: number,
    featureSubsampleSize: number,
    rng: () => number
  ): TreeNode {
    const labels = indices.map((i) => y[i]);
    const positiveRate = labels.reduce((a, b) => a + b, 0) / Math.max(1, labels.length);

    if (
      depth >= maxDepth ||
      indices.length < minSamplesSplit ||
      positiveRate === 0 ||
      positiveRate === 1
    ) {
      return { isLeaf: true, prob: positiveRate };
    }

    const d = X[0].length;
    const allFeatures = Array.from({ length: d }, (_, i) => i);
    for (let i = allFeatures.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allFeatures[i], allFeatures[j]] = [allFeatures[j], allFeatures[i]];
    }
    const candidateFeatures = allFeatures.slice(0, featureSubsampleSize);

    const parentGini = giniImpurity(labels);
    let bestGain = 0.001;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeft: number[] = [];
    let bestRight: number[] = [];

    for (const f of candidateFeatures) {
      const vals = Array.from(new Set(indices.map((i) => X[i][f]))).sort((a, b) => a - b);
      if (vals.length < 2) continue;
      const step = Math.max(1, Math.floor(vals.length / 8));
      for (let tIdx = 0; tIdx < vals.length - 1; tIdx += step) {
        const threshold = (vals[tIdx] + vals[tIdx + 1]) / 2;
        const left: number[] = [];
        const right: number[] = [];
        for (const i of indices) {
          if (X[i][f] <= threshold) left.push(i);
          else right.push(i);
        }
        if (left.length < 2 || right.length < 2) continue;

        const leftGini = giniImpurity(left.map((i) => y[i]));
        const rightGini = giniImpurity(right.map((i) => y[i]));
        const weightedGini = (left.length * leftGini + right.length * rightGini) / indices.length;
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestFeature === -1) {
      return { isLeaf: true, prob: positiveRate };
    }

    this.featureImportances[bestFeature] += bestGain * indices.length;

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: this.buildNode(X, y, bestLeft, depth + 1, maxDepth, minSamplesSplit, featureSubsampleSize, rng),
      right: this.buildNode(X, y, bestRight, depth + 1, maxDepth, minSamplesSplit, featureSubsampleSize, rng),
    };
  }

  predictProba(x: FeatureVector): number {
    let node = this.root;
    while (node && !node.isLeaf) {
      if (x[node.featureIndex!] <= node.threshold!) node = node.left!;
      else node = node.right!;
    }
    return node?.prob ?? 0.5;
  }
}

class RandomForestModel {
  trees: DecisionTreeClassifier[] = [];
  featureImportances: number[] = [];

  fit(X: FeatureVector[], y: number[], numTrees = 15): void {
    const n = X.length;
    const d = X[0].length;
    this.trees = [];
    const totalImp = Array(d).fill(0);

    let seed = 42077;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let t = 0; t < numTrees; t++) {
      const bootX: FeatureVector[] = [];
      const bootY: number[] = [];
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(rng() * n);
        bootX.push(X[idx]);
        bootY.push(y[idx]);
      }
      const tree = new DecisionTreeClassifier();
      tree.fit(bootX, bootY, 4, 6, 4, rng);
      this.trees.push(tree);
      for (let j = 0; j < d; j++) totalImp[j] += tree.featureImportances[j];
    }

    const impSum = totalImp.reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = totalImp.map((v) => v / impSum);
  }

  predictProba(x: FeatureVector): number {
    const sum = this.trees.reduce((acc, tree) => acc + tree.predictProba(x), 0);
    return clampProb(sum / Math.max(1, this.trees.length));
  }
}

interface BoostedStump {
  featureIndex: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
}

class GradientBoostingModel {
  baseLogOdds = 0;
  learningRate = 0.14;
  stumps: BoostedStump[] = [];
  featureImportances: number[] = [];

  fit(X: FeatureVector[], y: number[], nEstimators = 40, learningRate = 0.14): void {
    const n = X.length;
    const d = X[0].length;
    this.learningRate = learningRate;
    this.stumps = [];
    const gains = Array(d).fill(0);

    const posRate = Math.max(0.05, Math.min(0.95, y.reduce((a, b) => a + b, 0) / n));
    this.baseLogOdds = Math.log(posRate / (1 - posRate));
    const F = Array(n).fill(this.baseLogOdds);

    const candidateThresholds: number[][] = Array.from({ length: d }, (_, f) => {
      const uniq = Array.from(new Set(X.map((r) => r[f]))).sort((a, b) => a - b);
      const out: number[] = [];
      const step = Math.max(1, Math.floor(uniq.length / 10));
      for (let i = 0; i < uniq.length - 1; i += step) {
        out.push((uniq[i] + uniq[i + 1]) / 2);
      }
      return out;
    });

    for (let m = 0; m < nEstimators; m++) {
      const probs = F.map((fVal) => sigmoid(fVal));
      const residuals = y.map((yi, i) => yi - probs[i]);
      const hessians = probs.map((p) => Math.max(0.05, p * (1 - p)));

      let bestLossReduction = -Infinity;
      let bestStump: BoostedStump | null = null;

      const totalGrad = residuals.reduce((a, b) => a + b, 0);
      const totalHess = hessians.reduce((a, b) => a + b, 0);
      const lambdaReg = 1.5;
      const parentScore = (totalGrad * totalGrad) / (totalHess + lambdaReg);

      for (let f = 0; f < d; f++) {
        for (const threshold of candidateThresholds[f]) {
          let gL = 0,
            hL = 0,
            cL = 0;
          let gR = 0,
            hR = 0,
            cR = 0;
          for (let i = 0; i < n; i++) {
            if (X[i][f] <= threshold) {
              gL += residuals[i];
              hL += hessians[i];
              cL++;
            } else {
              gR += residuals[i];
              hR += hessians[i];
              cR++;
            }
          }
          if (cL < 4 || cR < 4) continue;
          const score =
            (gL * gL) / (hL + lambdaReg) + (gR * gR) / (hR + lambdaReg) - parentScore;
          if (score > bestLossReduction) {
            bestLossReduction = score;
            bestStump = {
              featureIndex: f,
              threshold,
              leftValue: gL / (hL + lambdaReg),
              rightValue: gR / (hR + lambdaReg),
            };
          }
        }
      }

      if (!bestStump || bestLossReduction <= 0) break;
      this.stumps.push(bestStump);
      gains[bestStump.featureIndex] += bestLossReduction;

      for (let i = 0; i < n; i++) {
        const delta =
          X[i][bestStump.featureIndex] <= bestStump.threshold
            ? bestStump.leftValue
            : bestStump.rightValue;
        F[i] += this.learningRate * delta;
      }
    }

    const sumG = gains.reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = gains.map((g) => g / sumG);
  }

  predictProba(x: FeatureVector): number {
    let fVal = this.baseLogOdds;
    for (const s of this.stumps) {
      fVal += this.learningRate * (x[s.featureIndex] <= s.threshold ? s.leftValue : s.rightValue);
    }
    return clampProb(sigmoid(fVal));
  }
}

function computeMetrics(
  yTrue: number[],
  probs: number[],
  threshold = 0.5
): {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion_matrix: ConfusionMatrix;
  roc_curve: RocPoint[];
} {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const pred = probs[i] >= threshold ? 1 : 0;
    if (pred === 1 && yTrue[i] === 1) tp++;
    else if (pred === 1 && yTrue[i] === 0) fp++;
    else if (pred === 0 && yTrue[i] === 0) tn++;
    else fn++;
  }

  const accuracy = (tp + tn) / Math.max(1, yTrue.length);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const f1 = (2 * precision * recall) / Math.max(1e-9, precision + recall);

  const totalPos = Math.max(1, yTrue.filter((v) => v === 1).length);
  const totalNeg = Math.max(1, yTrue.filter((v) => v === 0).length);

  const thresholds = Array.from({ length: 21 }, (_, idx) => 1 - idx * 0.05);
  const roc_curve: RocPoint[] = thresholds.map((th) => {
    let cTp = 0,
      cFp = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (probs[i] >= th) {
        if (yTrue[i] === 1) cTp++;
        else cFp++;
      }
    }
    return {
      fpr: Number((cFp / totalNeg).toFixed(3)),
      tpr: Number((cTp / totalPos).toFixed(3)),
    };
  });

  const sortedRoc = [...roc_curve].sort((a, b) => (a.fpr === b.fpr ? a.tpr - b.tpr : a.fpr - b.fpr));
  let auc = 0;
  for (let i = 1; i < sortedRoc.length; i++) {
    const dx = sortedRoc[i].fpr - sortedRoc[i - 1].fpr;
    const avgY = (sortedRoc[i].tpr + sortedRoc[i - 1].tpr) / 2;
    auc += dx * avgY;
  }

  return {
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    roc_auc: Number(Math.max(0.5, Math.min(0.995, auc)).toFixed(4)),
    confusion_matrix: { tp, fp, tn, fn },
    roc_curve: sortedRoc,
  };
}

export class ChurnMLEngine {
  private lr = new LogisticRegressionModel();
  private rf = new RandomForestModel();
  private gb = new GradientBoostingModel();

  private trainX: FeatureVector[] = [];
  private trainY: number[] = [];
  private testX: FeatureVector[] = [];
  private testY: number[] = [];
  private baselineVector: FeatureVector = [];

  private weights: EnsembleWeights = {
    logistic_regression: 0.25,
    random_forest: 0.35,
    gradient_boosting: 0.4,
  };

  constructor() {
    this.trainAllModels();
  }

  private trainAllModels(): void {
    const dataset = generateCalibrationDataset(300);
    const splitIdx = Math.floor(dataset.length * 0.8);
    const trainRecords = dataset.slice(0, splitIdx);
    const testRecords = dataset.slice(splitIdx);

    this.trainX = trainRecords.map(recordToVector);
    this.trainY = trainRecords.map((r) => r.churned);
    this.testX = testRecords.map(recordToVector);
    this.testY = testRecords.map((r) => r.churned);

    this.lr.fit(this.trainX, this.trainY);
    this.rf.fit(this.trainX, this.trainY, 15);
    this.gb.fit(this.trainX, this.trainY, 40, 0.14);

    const d = this.trainX[0].length;
    this.baselineVector = Array.from({ length: d }, (_, j) => {
      return this.trainX.reduce((s, r) => s + r[j], 0) / this.trainX.length;
    });
  }

  setWeights(newWeights: EnsembleWeights): EnsembleWeights {
    const sum =
      Math.max(0, newWeights.logistic_regression) +
      Math.max(0, newWeights.random_forest) +
      Math.max(0, newWeights.gradient_boosting);
    if (sum <= 0) return this.weights;
    this.weights = {
      logistic_regression: Number((Math.max(0, newWeights.logistic_regression) / sum).toFixed(3)),
      random_forest: Number((Math.max(0, newWeights.random_forest) / sum).toFixed(3)),
      gradient_boosting: Number((Math.max(0, newWeights.gradient_boosting) / sum).toFixed(3)),
    };
    return this.weights;
  }

  getWeights(): EnsembleWeights {
    return { ...this.weights };
  }

  private blend(pLr: number, pRf: number, pGb: number): number {
    return clampProb(
      this.weights.logistic_regression * pLr +
        this.weights.random_forest * pRf +
        this.weights.gradient_boosting * pGb
    );
  }

  private formatFeatureDisplayValue(idx: number, raw: number): string {
    switch (idx) {
      case 0:
        return `${Math.round(raw)} mo`;
      case 1:
        return `$${raw.toFixed(0)}/mo`;
      case 2:
        return raw === 0 ? 'Month-to-month' : raw === 1 ? 'One year' : 'Two year';
      case 3:
        return `${Math.round(raw)} tickets`;
      case 4:
        return raw === 1 ? 'E-Check' : 'Auto-Pay';
      case 5:
        return raw === 1 ? 'Fiber Optic' : 'DSL';
      case 6:
        return raw === 1 ? 'Included' : 'None';
      case 7:
        return `${Math.round(raw)}/100`;
      case 8:
        return `${Math.round(raw)}/10`;
      default:
        return String(raw);
    }
  }

  predict(customer: CustomerInput): ModelBreakdown {
    const x = encodeCustomerToRawFeatures(customer);
    const pLr = this.lr.predictProba(x);
    const pRf = this.rf.predictProba(x);
    const pGb = this.gb.predictProba(x);
    const pEns = this.blend(pLr, pRf, pGb);

    const mean = (pLr + pRf + pGb) / 3;
    const std = Math.sqrt(((pLr - mean) ** 2 + (pRf - mean) ** 2 + (pGb - mean) ** 2) / 3);
    const agreement = Math.max(0.5, Math.min(0.99, 1 - std * 1.8));
    const margin = Math.max(0.03, std * 1.25);

    const lrAttr = this.lr.getFeatureAttributions(x);
    const contributions: FeatureContribution[] = FEATURE_META.map((meta, idx) => {
      const perturbed = [...x];
      perturbed[idx] = this.baselineVector[idx];
      const baseEns = this.blend(
        this.lr.predictProba(perturbed),
        this.rf.predictProba(perturbed),
        this.gb.predictProba(perturbed)
      );
      const marginalDelta = pEns - baseEns;
      const impact = Number((marginalDelta * 0.72 + lrAttr[idx] * 0.28).toFixed(4));
      return {
        feature: meta.key,
        label: meta.label,
        value: this.formatFeatureDisplayValue(idx, x[idx]),
        impact,
      };
    }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
      logistic_regression: Number(pLr.toFixed(4)),
      random_forest: Number(pRf.toFixed(4)),
      gradient_boosting: Number(pGb.toFixed(4)),
      ensemble_probability: Number(pEns.toFixed(4)),
      agreement_score: Number(agreement.toFixed(4)),
      confidence_low: Number(Math.max(0.01, pEns - margin).toFixed(4)),
      confidence_high: Number(Math.min(0.99, pEns + margin).toFixed(4)),
      risk_level: classifyRisk(pEns),
      feature_contributions: contributions,
    };
  }

  enrichCustomer(c: CustomerInput, index = 0): EnrichedCustomer {
    const prediction = this.predict(c);
    const tenure = Math.max(0, Number(c.tenure ?? 12));
    const monthly_charges = Math.max(0, Number(c.monthly_charges ?? 70));
    const contract = String(c.contract || 'Month-to-month');
    const support_calls = Math.max(0, Number(c.support_calls ?? 1));
    const contract_code = encodeContract(contract);
    const usage_score =
      c.usage_score !== undefined && !Number.isNaN(Number(c.usage_score))
        ? Number(c.usage_score)
        : Math.max(20, Math.min(95, Math.round(68 - support_calls * 6 + contract_code * 10)));
    const nps_score =
      c.nps_score !== undefined && !Number.isNaN(Number(c.nps_score))
        ? Number(c.nps_score)
        : Math.max(1, Math.min(10, Math.round(7 - support_calls * 0.7 + contract_code * 0.9)));

    return {
      customer_id: String(c.customer_id || `CUST-${String(index + 1).padStart(4, '0')}`),
      name: c.name || `Account ${c.customer_id || index + 1}`,
      segment: c.segment || (monthly_charges >= 100 ? 'Enterprise' : monthly_charges >= 70 ? 'Mid-Market' : 'SMB'),
      tenure,
      monthly_charges,
      total_charges: Number((c.total_charges ?? Math.max(1, tenure) * monthly_charges).toFixed(2)),
      contract,
      support_calls,
      payment_method: c.payment_method || (contract_code === 0 ? 'Electronic check' : 'Credit card (auto)'),
      internet_service: c.internet_service || (monthly_charges >= 70 ? 'Fiber optic' : 'DSL'),
      tech_support: c.tech_support || (contract_code >= 1 ? 'Yes' : 'No'),
      usage_score,
      nps_score,
      churn_probability: prediction.ensemble_probability,
      risk_level: prediction.risk_level,
      annual_revenue_at_risk: Number((monthly_charges * 12 * prediction.ensemble_probability).toFixed(2)),
      prediction,
    };
  }

  getEvaluationReport(): ModelEvaluationReport {
    const lrProbs = this.testX.map((x) => this.lr.predictProba(x));
    const rfProbs = this.testX.map((x) => this.rf.predictProba(x));
    const gbProbs = this.testX.map((x) => this.gb.predictProba(x));
    const ensProbs = this.testX.map((_, i) => this.blend(lrProbs[i], rfProbs[i], gbProbs[i]));

    const models: SingleModelMetrics[] = [
      {
        id: 'ensemble',
        name: 'Calibrated Meta-Ensemble',
        family: 'Weighted Probability Blend',
        description:
          'Combines L2 Logistic Regression, 15-Tree Random Forest, and 40-Stage Gradient Boosted Trees to minimize variance and capture nonlinear churn interactions.',
        ...computeMetrics(this.testY, ensProbs),
      },
      {
        id: 'gradient_boosting',
        name: 'Gradient Boosted Trees',
        family: 'Sequential Residual Boosting',
        description:
          '40 additive decision stumps optimizing binary log-loss with second-order Hessian leaf weighting and L2 shrinkage.',
        ...computeMetrics(this.testY, gbProbs),
      },
      {
        id: 'random_forest',
        name: 'Random Forest Classifier',
        family: 'Bagged CART Ensemble (15 Trees)',
        description:
          'Bootstrap-aggregated decision trees with random feature subsampling and Gini impurity split selection.',
        ...computeMetrics(this.testY, rfProbs),
      },
      {
        id: 'logistic_regression',
        name: 'L2 Logistic Regression',
        family: 'Regularized Linear Classifier',
        description:
          'Standardized gradient-descent linear classifier providing smooth calibrated log-odds and interpretable baseline risk.',
        ...computeMetrics(this.testY, lrProbs),
      },
    ];

    const lrAbsSum = this.lr.weights.reduce((s, w) => s + Math.abs(w), 0) || 1;
    const feature_importance = FEATURE_META.map((meta, idx) => {
      const lrNorm = Math.abs(this.lr.weights[idx]) / lrAbsSum;
      const rfNorm = this.rf.featureImportances[idx] ?? 0;
      const gbNorm = this.gb.featureImportances[idx] ?? 0;
      const combined =
        this.weights.logistic_regression * lrNorm +
        this.weights.random_forest * rfNorm +
        this.weights.gradient_boosting * gbNorm;
      return {
        feature: meta.key,
        label: meta.label,
        importance: Number((combined * 100).toFixed(1)),
      };
    }).sort((a, b) => b.importance - a.importance);

    return {
      train_samples: this.trainX.length,
      test_samples: this.testX.length,
      positive_rate: Number(
        (this.testY.reduce((a, b) => a + b, 0) / Math.max(1, this.testY.length)).toFixed(3)
      ),
      weights: this.getWeights(),
      models,
      feature_importance,
    };
  }
}

export const mlEngine = new ChurnMLEngine();
