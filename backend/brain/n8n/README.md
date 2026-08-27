# GlobeX n8n webhooks

Import this workflow into n8n — it is the **sole canonical workflow**:

- `globex_everything_real.workflow.json` — complete live/test trade analysis, document, marketplace, sanctions/RAG, trade/escrow, and blockchain-anchor webhooks. Every HTTP Request node calls Express on `host.docker.internal:5002`; Express forwards ML requests to `backend/brain`. Every HTTP Request node has `continueOnFail`/`onError: continueRegularOutput` set, and every Aggregate Code node reports a per-step `step_status: { key: "OK"|"FAILED" }` plus an overall `status: "SUCCESS"|"PARTIAL"|"FAILED"` — one model call failing (timeout, 5xx, etc.) no longer aborts the whole webhook response.

Webhook URLs after import:

- `POST /webhook/globex-analyze-trade` — full trade analysis (HS classification → market opportunity → anomaly → compliance RAG → counterparty match → executive dossier)
- `POST /webhook/globex-test-trade` — same pipeline, alternate entry webhook for testing
- `POST /webhook/document-uploaded` — OCR → compliance RAG → document verdict
- `POST /webhook/marketplace-match` — institutional buyer matching
- `POST /webhook/sanctions-and-rag` — sanctions screen + trade RAG query
- `POST /webhook/create-trade` — create trade record → create escrow
- `POST /webhook/anchor-document` — blockchain document anchor

No node generates model scores, transaction hashes, vault addresses, or verification claims. Those values must come from Express, `backend/brain`, or the chain adapter. Keep the workflow active only after configuring the real services.

## archive/

Superseded or broken variants, kept for reference only — do not import:

- `globex_docker_master_workflow.json` — its webhook paths (`globex-analyze-trade-v2`, `globex-test-trade-v2`) don't match what the frontend (`services/n8n/workflowService.ts`) actually calls (no `-v2` suffix), and it lacked error resilience (one failed node aborted the whole chain), a hardcoded fallback period (`"202608"`), a fabricated `duration_ms`, and a hardcoded `nodes_executed: 7`. Fully superseded by `globex_everything_real.workflow.json`.
- `globex_express_webhooks.json` — its three webhooks (`document-uploaded`, `marketplace-match`, `create-trade`) are a strict subset of what `globex_everything_real.workflow.json` already covers, with no unique node or capability. Redundant.
- `globex_production_master_workflow.json` — calls Python FastAPI on port 8000 directly, bypassing Express entirely.
- `globex_docker_master_workflow.backup.json`, `globex_docker_master_workflow.parallel_broken.json` — earlier broken/backup snapshots of the now-archived docker workflow.
- `globex_manual_test_workflow.json`, `globex_standalone_test_workflow.json` — ad hoc test workflows, superseded by the `globex-test-trade` webhook in the canonical workflow.
