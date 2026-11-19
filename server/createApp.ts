import express from 'express';
import cors from 'cors';
import type { CustomerInput, EnsembleWeights } from '../src/types.js';
import { DEMO_CUSTOMERS } from '../src/engines/dataset.js';
import { mlEngine } from '../src/engines/mlEngine.js';
import { ragEngine } from '../src/engines/ragEngine.js';
import { executeAgentWorkflow } from './agentOrchestrator.js';

export function createApiApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      gemini_configured: Boolean(process.env.GEMINI_API_KEY),
      models_loaded: ['logistic_regression', 'random_forest', 'gradient_boosting', 'ensemble'],
      knowledge_documents: ragEngine.getDocuments().length,
    });
  });

  app.get('/api/customers', (_req, res) => {
    const enriched = DEMO_CUSTOMERS.map((c, idx) => mlEngine.enrichCustomer(c, idx));
    res.json({ customers: enriched });
  });

  app.post('/api/customers/score', (req, res) => {
    try {
      const rows = req.body?.customers;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Provide a non-empty customers array.' });
      }
      const enriched = rows.map((row: CustomerInput, idx: number) => mlEngine.enrichCustomer(row, idx));
      return res.json({ customers: enriched });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to score customers.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/ml/predict', (req, res) => {
    try {
      const customer = req.body?.customer as CustomerInput | undefined;
      if (!customer) {
        return res.status(400).json({ error: 'Customer object is required.' });
      }
      const enriched = mlEngine.enrichCustomer(customer);
      return res.json({ customer: enriched, prediction: enriched.prediction });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Prediction failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/ml/evaluation', (_req, res) => {
    res.json(mlEngine.getEvaluationReport());
  });

  app.post('/api/ml/weights', (req, res) => {
    try {
      const weights = req.body?.weights as EnsembleWeights | undefined;
      if (!weights) {
        return res.status(400).json({ error: 'Weights object is required.' });
      }
      mlEngine.setWeights(weights);
      const evaluation = mlEngine.getEvaluationReport();
      const customers = DEMO_CUSTOMERS.map((c, idx) => mlEngine.enrichCustomer(c, idx));
      return res.json({ evaluation, customers });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update weights.';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/rag/documents', (_req, res) => {
    res.json({ documents: ragEngine.getDocuments() });
  });

  app.post('/api/rag/documents', (req, res) => {
    try {
      const { source_id, title, category, approval_tier, max_discount_pct, text } = req.body || {};
      if (!source_id || !title || !text) {
        return res.status(400).json({ error: 'source_id, title, and text are required.' });
      }
      const added = ragEngine.addDocument({
        source_id: String(source_id),
        title: String(title),
        category: String(category || 'Custom Policy'),
        approval_tier: String(approval_tier || 'Auto-Approved (Tier 1)'),
        max_discount_pct: Number(max_discount_pct ?? 15),
        text: String(text),
      });
      return res.status(201).json({ document: added, documents: ragEngine.getDocuments() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to ingest document.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/rag/search', (req, res) => {
    try {
      const { query, top_k, semantic_weight, keyword_weight, rrf_k } = req.body || {};
      if (typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'A non-empty search query is required.' });
      }
      const result = ragEngine.search(query, {
        top_k: Number(top_k ?? 5),
        semantic_weight: Number(semantic_weight ?? 1.0),
        keyword_weight: Number(keyword_weight ?? 1.0),
        rrf_k: Number(rrf_k ?? 60),
      });
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'RAG search failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/rag/evaluate', (req, res) => {
    const k = Math.max(1, Math.min(8, Number(req.query.k ?? 3)));
    const sw = Math.max(0, Number(req.query.semantic_weight ?? 1.0));
    const kw = Math.max(0, Number(req.query.keyword_weight ?? 1.0));
    res.json(ragEngine.evaluateBenchmark(k, sw, kw));
  });

  app.post('/api/agents/workflow', async (req, res) => {
    try {
      const { customer, engine = 'policy_engine', top_k = 5, inject_hallucination_test = false } = req.body || {};
      if (!customer) {
        return res.status(400).json({ error: 'Customer record is required.' });
      }
      const enriched = mlEngine.enrichCustomer(customer);
      const result = await executeAgentWorkflow(enriched, {
        engine: engine === 'gemini' ? 'gemini' : 'policy_engine',
        top_k: Number(top_k),
        inject_hallucination_test: Boolean(inject_hallucination_test),
      });
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent workflow execution failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  return app;
}
