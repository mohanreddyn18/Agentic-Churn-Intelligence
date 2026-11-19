# RetainIQ — Agentic RAG Customer Churn Intelligence & Retention Platform

## Overview
RetainIQ is a full-stack TypeScript web platform combining real multi-model machine learning churn prediction, hybrid Okapi BM25 + Dense Semantic Reciprocal Rank Fusion (RRF) knowledge retrieval, and a verified 4-stage multi-agent retention strategy orchestrator.

## Core Capabilities
1. **3-Model Machine Learning Ensemble (`server/mlEngine.ts`)**:
   - L2-Regularized Logistic Regression (gradient descent)
   - 15-Tree CART Random Forest Classifier (Gini impurity splitting + bootstrap bagging)
   - 40-Stage Gradient Boosted Decision Stumps (second-order log-loss optimization)
   - Weighted Meta-Ensemble with real holdout evaluation (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix, ROC Curves), SHAP-style per-customer feature attributions, live What-If simulator, and live CSV batch scoring.
2. **Advanced Hybrid RAG Engine (`server/ragEngine.ts`)**:
   - 12 governed corporate retention playbooks (`POL-RET-001` through `POL-RET-012`) plus live custom policy ingestion.
   - Okapi BM25 keyword retrieval + dense semantic cosine retrieval fused via tunable Reciprocal Rank Fusion (RRF).
   - Built-in retrieval evaluation suite computing Precision@K, Recall@K, and Mean Reciprocal Rank (MRR).
3. **4-Stage Multi-Agent Retention Orchestrator (`server/agentOrchestrator.ts`)**:
   - Hybrid Retrieval Agent → Customer Analysis Agent → Retention Strategy Agent (`gemini-4-hydrogen` via `@google/genai` or deterministic Grounded Policy Engine) → Verification & Guardrail Agent.
   - Verifies every cited `source_id` exists in retrieved evidence and every supporting quotation matches verbatim, with an interactive guardrail rejection test mode.

## Running Locally
- `npm install`
- `npm run dev` (starts Express + Vite on port `3000`)
- `npm run build` / `npm start` for production
