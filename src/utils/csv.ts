import type { CustomerInput, EnrichedCustomer } from '../types';

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCustomerCsv(csvText: string): CustomerInput[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one customer record.');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const findIdx = (...names: string[]) => headers.findIndex((h) => names.includes(h));

  const idIdx = findIdx('customer_id', 'customerid', 'id', 'account_id');
  const nameIdx = findIdx('name', 'customer_name', 'account_name');
  const segIdx = findIdx('segment', 'tier', 'plan');
  const tenureIdx = findIdx('tenure', 'tenure_months', 'months');
  const chargesIdx = findIdx('monthly_charges', 'monthlycharges', 'mrr', 'monthly_bill', 'charges');
  const contractIdx = findIdx('contract', 'contract_type', 'term');
  const callsIdx = findIdx('support_calls', 'supportcalls', 'tickets', 'support_tickets');
  const payIdx = findIdx('payment_method', 'paymentmethod', 'payment');
  const netIdx = findIdx('internet_service', 'internetservice', 'service');
  const techIdx = findIdx('tech_support', 'techsupport');
  const usageIdx = findIdx('usage_score', 'usagescore', 'usage');
  const npsIdx = findIdx('nps_score', 'nps');
  const probIdx = findIdx('churn_probability', 'churn_score', 'probability');

  const customers: CustomerInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx] : undefined);
    const num = (idx: number, fallback: number) => {
      const v = Number(get(idx));
      return Number.isFinite(v) ? v : fallback;
    };

    const rawProb = get(probIdx);
    let uploadedProb: number | undefined;
    if (rawProb !== undefined && rawProb !== '') {
      const parsed = Number(rawProb);
      if (Number.isFinite(parsed)) {
        uploadedProb = parsed > 1 ? parsed / 100 : parsed;
      }
    }

    customers.push({
      customer_id: get(idIdx) || `CUST-${String(i).padStart(4, '0')}`,
      name: get(nameIdx) || undefined,
      segment: get(segIdx) || undefined,
      tenure: Math.max(0, num(tenureIdx, 12)),
      monthly_charges: Math.max(10, num(chargesIdx, 75)),
      contract: get(contractIdx) || 'Month-to-month',
      support_calls: Math.max(0, num(callsIdx, 2)),
      payment_method: get(payIdx) || undefined,
      internet_service: get(netIdx) || undefined,
      tech_support: get(techIdx) || undefined,
      usage_score: usageIdx >= 0 ? num(usageIdx, 60) : undefined,
      nps_score: npsIdx >= 0 ? num(npsIdx, 6) : undefined,
      uploaded_churn_probability: uploadedProb,
    });
  }

  if (customers.length === 0) {
    throw new Error('No valid customer rows found in the uploaded CSV.');
  }

  return customers;
}

export function exportCustomersToCsv(customers: EnrichedCustomer[]): string {
  const header = [
    'customer_id',
    'name',
    'segment',
    'tenure',
    'monthly_charges',
    'contract',
    'support_calls',
    'payment_method',
    'usage_score',
    'nps_score',
    'ensemble_churn_probability',
    'logistic_regression_prob',
    'random_forest_prob',
    'gradient_boosting_prob',
    'risk_level',
    'annual_revenue_at_risk',
  ];

  const escape = (val: unknown) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = customers.map((c) =>
    [
      c.customer_id,
      c.name,
      c.segment,
      c.tenure,
      c.monthly_charges,
      c.contract,
      c.support_calls,
      c.payment_method,
      c.usage_score,
      c.nps_score,
      c.churn_probability.toFixed(4),
      c.prediction.logistic_regression.toFixed(4),
      c.prediction.random_forest.toFixed(4),
      c.prediction.gradient_boosting.toFixed(4),
      c.risk_level,
      c.annual_revenue_at_risk.toFixed(2),
    ]
      .map(escape)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}
