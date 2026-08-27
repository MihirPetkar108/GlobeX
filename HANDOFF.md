# GlobeX Handoff — Express+n8n hardening & ML/DL UI surfacing

Status: plan approved, implementation starting. This doc captures everything discovered so a fresh session can pick up mid-work.

## Goal (user's words)

GlobeX is the new UI/backend shell. It should keep its existing colors/palette/layout. The backend twist: primary server should be **Express + n8n**, still using the existing Python ML/DL models (don't rewrite them). The UI currently doesn't visibly surface ML/DL — user wants the existing ML components moved out of the admin-only console onto the main user-facing pages, with real (non-stub) data and better visual polish.

## Key discovery: most of this already exists, it's just unfinished/inconsistent

- `GlobeX/backend/src/app.js` — Express app is already the gateway (port 5002 via `PORT` env, default in frontend is `5002`).
- `GlobeX/backend/src/services/mlProxy.js` — proxies to Python FastAPI ML service at `PY_ML_SERVICE_URL` (default `http://127.0.0.1:8000`), passthrough of `{detail}` error shape.
- `GlobeX/backend/src/routes/intelligenceRoutes.js` — declares the proxied ML routes (see full list in that file). **Contains a dead route**: `/predict/market-opportunity/synthesize-pros-cons` is proxied but **no matching FastAPI route exists** anywhere in `GlobeX/backend/brain` (confirmed by grep). Frontend already has a graceful fallback for this in `aiService.ts:624-631` (`synthesizeCountryProsCons` catches the failure and returns a local synthesis from `insight_data.pros/cons`), so nothing is currently broken user-visibly — but the dead proxy route should either be implemented server-side in Express or documented as intentionally client-side-only.
- `GlobeX/backend/brain/main.py` (FastAPI) — the untouched ML/DL engine. Full route inventory captured in the plan file (see below). Never call this directly from the frontend — always go through Express.
- `GlobeX/backend/brain/n8n/` — many workflow JSON variants. README says the blessed ones are `globex_everything_real.workflow.json` and `globex_docker_master_workflow.json` (both target Express at `host.docker.internal:5002`). `globex_production_master_workflow.json` incorrectly targets Python directly on port 8000 — user confirmed Express (5002) is the canonical target, so this one and other stale variants (`*.parallel_broken.json`, `*.backup.json`, `globex_manual_test_workflow.json`, `globex_standalone_test_workflow.json`) should be archived, not left ambiguous.
- Frontend already has ML-facing components — `MLModelConsole.tsx` (full endpoint tester, admin-only, lists all 15 models with paths — good reference for what "done" looks like), `TradeRiskCompositeCard`, `MatchExplanation`, `AIMatchResultsPanel`, `CountryOpportunityCard`, `TopBuyersRankedList`, `ComplianceChecklistWidget`, `DocumentVerificationStudio`. These are mostly hidden in `AdminSystemPage` or use hardcoded stub defaults — user wants them promoted to Dashboard / TradeAnalysisPage / MarketIntelligencePage / MarketplacePage with live data.
- `TradeAnalysisPage.tsx` (~line 1020-1050) already has a full self-documenting endpoint reference table (paths + descriptions) — useful as the authoritative endpoint list when wiring new UI.
- No `recharts`-based time-series chart currently exists for forecast/anomaly data despite `recharts` being a dependency — this is a real gap to fill (Part 2, item 3 in plan).
- Stray Python files sit inside the **JS** frontend folder `GlobeX/frontend/src/services/` (`chain_client.py`, `rag_retriever.py`, `report_synthesizer.py`, `__init__.py`) — leftover misplaced backend code, needs cleanup (move to `GlobeX/backend/brain/` or delete if dead).

## Full plan

Saved at `C:\Users\Aryan\.claude\plans\stateless-sleeping-cerf.md` (already approved by user). Two parts:

**Part 1 — Backend hardening (Express+n8n, Python untouched):**
1. Audit/fix `intelligenceRoutes.js` dead route (`synthesize-pros-cons`).
2. Confirm `mlProxy.js` timeout/error passthrough is adequate.
3. Confirm all other Express routers (`tradeRoutes.js`, `blockchainRoutes.js`, `expenseRoutes.js`, `organizationRoutes.js`) cover every `/api/v1/*` path the frontend calls, matching what used to live directly in FastAPI's `trades_controller.py`/`escrow_controller.py`.
4. Standardize `.env`/`.env.example` (`PY_ML_SERVICE_URL`, `CHAIN_ADAPTER_URL`, `SUPABASE_*`, `PORT=5002`).
5. n8n: make `globex_docker_master_workflow.json` (or `globex_everything_real.workflow.json`) the one canonical workflow targeting Express (5002). Archive the rest into `brain/n8n/archive/`.
6. Clean up stray `.py` files in `GlobeX/frontend/src/services/`.

**Part 2 — Frontend: surface ML/DL, same palette:**
1. Dashboard: add compact `TradeRiskCompositeCard` + market-opportunity summary tile, real data not mocks.
2. `TradeAnalysisPage`: wire real `TradeRiskCompositeCard` subscores, `/api/trade-anomaly/predict`, `MatchExplanation`.
3. `MarketIntelligencePage`: wire `/predict/market-opportunity`, add a new recharts forecast chart (demand + 80% prediction band from `forecast_demand_kg_lower_80/upper_80`) styled with existing `--brand-teal`/`--brand-cyan` tokens.
4. `MarketplacePage`: promote `AIMatchResultsPanel`, `CountryOpportunityCard`, `TopBuyersRankedList` to the main buyer-matching flow.
5. Compliance/document flows: surface `ComplianceChecklistWidget`, `DocumentVerificationStudio` with real OCR/doc-verdict calls (replace `MLModelConsole` stub values).
6. Keep `MLModelConsole` in `AdminSystemPage` for ops/debugging — not removed, just no longer the only place ML is visible.
7. Visual polish pass (loading/skeleton/error states using existing `--status-*` tokens) on everything promoted.

## Verification plan
- `cd GlobeX/backend && npm run start` + separately `uvicorn brain.main:app --port 8000` (from `GlobeX/backend`) — hit Express `/health`, confirm `python_ml`/`chain_adapter` subsystems report correctly; call each proxied ML route through port 5002.
- Import canonical n8n workflow, trigger webhook, confirm nodes resolve against 5002 and output matches direct-FastAPI baseline.
- `cd GlobeX/frontend && npm run dev`, walk Dashboard → TradeAnalysis → MarketIntelligence → Marketplace, confirm real data, unchanged visual language, graceful degraded state if Python service is down.
- Run test suites: `npm run test` (frontend Vitest), `pytest` (`GlobeX/backend` Python service).

## Design constraints (do not violate)
- Palette is 100% CSS-variable driven from `GlobeX/frontend/src/index.css` — light theme only, teal/slate brand (`--brand-teal:#0F766E`, `--brand-cyan:#0284C7`), status colors (`--emerald`, `--amber`, `--red`), 4-level surface hierarchy (`--surface-0..3`). Do not introduce new colors — reuse these tokens.
- Frontend dev server: port 3000. Backend Express: port 5002. n8n webhooks: port 5678. Python FastAPI (internal only): port 8000.
- Never call Python FastAPI (port 8000) directly from the frontend or from n8n — always through Express (5002).

## Progress at handoff time (Part 1 done, Part 2 not started)

Part 1 complete:
1. `intelligenceRoutes.js` — removed the dead proxy for `/predict/market-opportunity/synthesize-pros-cons` (no matching FastAPI route existed) and replaced it with a real Express-side handler backed by new `GlobeX/backend/src/services/prosConsSynthesizer.js` — deterministic synthesis from the `insight_data.pros/cons/scores/risk/forecast` fields `generate_country_insights()` already returns, matching the response shape `aiService.ts:624-631`'s old fallback used.
2. `mlProxy.js` — reviewed, timeout (120s) and `{detail}` error passthrough are already adequate. No change needed.
3. `tradeRoutes.js`/`blockchainRoutes.js` — reviewed, cover listings/trades/escrow/blockchain. `/api/v1/trades/:id/documents`, `/documents/:id/verify`, `/exporters/:id/reputation` (present in old FastAPI `trades_controller.py`) have no Express equivalent and are NOT called anywhere in the frontend (grepped) — left out of scope, not needed.
4. `.env.example` — already correct/complete (`PORT`, `SUPABASE_*`, `CHAIN_ADAPTER_URL`, `PY_ML_SERVICE_URL`). No change needed.
5. n8n — archived 5 stale/broken workflow variants into `GlobeX/backend/brain/n8n/archive/` (`globex_production_master_workflow.json` which hit Python port 8000 directly, `*.backup.json`, `*.parallel_broken.json`, `globex_manual_test_workflow.json`, `globex_standalone_test_workflow.json`). README already correctly named the canonical set (`globex_everything_real.workflow.json`, `globex_docker_master_workflow.json`, `globex_express_webhooks.json`) — added an `archive/` section to the README explaining what's there and why.
6. Deleted the 4 stray Python files from `GlobeX/frontend/src/services/` (`chain_client.py`, `report_synthesizer.py` were byte-identical dupes of `GlobeX/backend/brain/services/*`; `rag_retriever.py` was a **stale/outdated** dupe — the `brain/services/` copy has newer refactors, e.g. `_brain_path()` helper and updated `_PRODUCT_DOCUMENTS` direction-keyed structure — confirmed via diff before deleting; `__init__.py` was empty).

Part 2 complete. **Scope-drift found during implementation**: most of the plan's assumed gaps turned out to already be fixed/real elsewhere in the tree (`TradeRiskCompositeCard` is genuinely wired on `ListingDetailPage`/`ProductDetailPage`/`CounterpartyDetailPage`, `ComplianceChecklistWidget` is already used on `ListingDetailPage`/`ProductDetailPage`, `DocumentVerificationStudio` is already used on `DocumentVerificationPage`/`TradeWorkspacePage` doing SHA-256 hash verification — not OCR/doc-verdict, so no stub to replace there). The implementer verified each claim before touching anything and only edited genuine gaps:

1. `GlobeX/frontend/src/pages/DashboardPage.tsx` — was 100% mock data, zero ML calls. Added an "AI Market Signal" tile calling `aiService.discoverMarketOpportunities()`, showing the top-ranked destination corridor + risk badge, linking to `/market-intelligence`.
2. `GlobeX/frontend/src/pages/MarketIntelligencePage.tsx` — was already wired to `/predict/market-opportunity` with real loading/error states, just missing a chart. Added a recharts `ComposedChart` plotting each corridor's XGBoost 80% prediction band + point forecast, styled to match this page's pre-existing dark AI-console palette (not `index.css` light tokens — this page already diverges intentionally, confirmed before matching it rather than fighting it).
3. `GlobeX/frontend/src/pages/MarketplacePage.tsx` — found `BuyerMatchingForm`/`BuyerMatchingResults` fully built and real (calls `aiService.matchBuyers()`) but never rendered anywhere — orphaned. Wired into a new "Institutional Buyer Matching" section with loading/error/retry states and a buyer-inspect panel that hands off to `/trade-analysis`.
4. `TradeAnalysisPage.tsx`, compliance/document flows — verified already correct, not touched.
5. `AdminSystemPage.tsx`/`MLModelConsole.tsx` — untouched, kept as debug console.

**Left out of scope (follow-up candidate)**: `components/marketplace/AIMatchResultsPanel.tsx` is also orphaned (not rendered anywhere) and still has hardcoded `breakdownFactors` + a fake `setTimeout` — real `BuyerMatchingForm`/`Results` were wired instead since they were already correct; this panel would need a rewrite, not just wiring, if it's meant to replace/complement the buyer-matching flow now live.

**Verification**: `npm run build` in `GlobeX/frontend` succeeds, no TypeScript errors.

**Note**: `git status` shows other pre-existing uncommitted changes in the tree (`AppNav.tsx`, `WorkspaceContext.tsx`, some backend Python files) not created by this work — nothing here has been committed, no commit was requested.

---

## Round 2 (new task): n8n hardening, real Assess Trade data, Discover Opportunity redesign, real TF-IDF+valuation company matching

Plan file (overwritten for this round, same path): `C:\Users\Aryan\.claude\plans\stateless-sleeping-cerf.md`.

### What prompted this round
User asked for: a working n8n workflow ("make sure everything is working"), a real (non-fake) Assess Trade section, a redesigned Discover page (text-box search with top-3 live suggestions instead of a dropdown, renamed to "Discover Opportunity", top 6 of 20 countries shown with a "Load More" button, and clicking a country returning top 10 companies ranked by a formula), and a real TF-IDF/cosine-similarity company matcher blended with valuation (user recalled this being built before — it wasn't; verified).

### Key discoveries during exploration (all confirmed by reading code, not assumed)
- **n8n**: `globex_everything_real.workflow.json` is the only workflow file whose webhook paths actually match what the frontend (`services/n8n/workflowService.ts`) calls. The other "master" file, `globex_docker_master_workflow.json`, has orphaned `-v2`-suffixed webhook paths, a hardcoded fallback period `"202608"`, a fake `duration_ms` (`Date.now() % 100000`), and a hardcoded `nodes_executed: 7`. Neither file has error resilience — one failing HTTP node kills the whole webhook chain (no `continueOnFail`).
- **Assess Trade** (`GlobeX/frontend/src/pages/AssessPage.tsx`): the page's real API calls are mostly fine, but 3 UI sections ignore their own real data or never call anything: the Sanctions tab renders a hardcoded `CLEARED`/95-99-score array instead of the real `sanctionsResult` it already fetches; a "Transaction Gate: PASS" banner + fake audit hash never calls `/compliance/transaction-gate` at all; the dossier status grid shows static labels instead of branching on `dossierData.sections.*.available` (contrast with `TradeAnalysisPage.tsx:416-475`, which already does this correctly).
- **Discover Opportunity**: the app has TWO discovery-like pages. `/discover` (`DiscoverPage.tsx`) is an unrelated marketplace-listing browser with a plain `<select>` fed by local listing titles — not the target. `/export-discover` (`ExportDiscoverPage.tsx`) is the real country-opportunity ranking flow (already calls `/predict/market-opportunity`, already has a `CommoditySearchDropdown` component as UI prior art, already has an inert "Discover More" button) — **this is the confirmed target**, user explicitly confirmed this mapping. A real, unused-by-the-frontend backend endpoint already exists for live product-search typeahead: `GET /predict/hs-code/search` (`src/api/hs_classifier.py:179-230` at repo root) — returns top-8 prefix/substring matches, not yet wired into `aiService.ts`.
- **Company similarity matching**: `/predict/counterparty-match` (`GlobeX/backend/brain/controllers/counterparty_controller.py`) is confirmed to be an MD5-hash-seeded mock — no text similarity math, no company summary field, its own docstring admits "seed-data stubs." BUT a real, already-working endpoint sits on real data: `GET /api/v1/companies/top-by-country` (`GlobeX/backend/brain/controllers/company_directory_controller.py`) serves a real Yahoo-Finance-sourced dataset (`company_valuation_data.csv`) with genuine `LongBusinessSummary`, `Sector`, `Industry`, `MarketCap` columns — currently ranks by market cap only. This is the correct foundation; the fake counterparty-match endpoint is left alone (other flows may depend on its shape).

### User's explicit decisions (from AskUserQuestion, binding)
- Target page for the redesign is confirmed `ExportDiscoverPage.tsx` / `/export-discover`. "Top 10 countries" on a country click is confirmed to mean top 10 **companies**.
- Country list: fetch/render **20** countries total (not unlimited), show 6 by default, reveal more via a **"Load More"** button (not a binary show-all toggle).
- New company-ranking formula must blend **both** TF-IDF/cosine text-similarity **and** valuation (market cap) — not similarity alone. Implementation approach: `combined_score = 0.6*similarity_score + 0.4*valuation_score`, with `valuation_score` from min-max-normalized `log(MarketCap)` within the filtered (country + sector) candidate pool.
- n8n: consolidate to the single working workflow (`globex_everything_real.workflow.json`), archive the mismatched/redundant files.

### In-flight work (3 parallel background agents launched, none reported back yet)
1. **n8n hardening** — add `continueOnFail`/error resilience to every httpRequest node in `globex_everything_real.workflow.json`, update the 5 Aggregate Code nodes to report real per-step OK/FAILED status, archive `globex_docker_master_workflow.json` + `globex_express_webhooks.json` into `brain/n8n/archive/`, update README.
2. **Assess Trade fixes** — fix the Sanctions tab, transaction-gate banner, dossier status grid, and a few fabricated numeric fallbacks in the anomaly sandbox tab, all in `AssessPage.tsx`; also trim the sanctions-screen request payload to match the backend's actual accepted schema.
3. **Real TF-IDF+valuation company ranking** — add an optional `query` param to `GET /api/v1/companies/top-by-country` (`company_directory_controller.py`) that switches to the blended `combined_score` ranking described above, fully backward-compatible when `query` is omitted; add a matching `aiService.ts` client method; confirm Express's `proxyGet` passes the new query param through with no code change needed (or fix it if not).

### Not yet started
**Part 3 — the actual `ExportDiscoverPage.tsx` frontend redesign** (rename to "Discover Opportunity" everywhere user-visible, real text-box search wired to `/predict/hs-code/search` showing exactly 3 live suggestions, 20-country fetch with 6-shown + Load More, on-click fetch of top-10 companies via the new Part-4 endpoint instead of the old eager `/predict/counterparty-match` prefetch). This is queued to start **after** the Part 4 agent (company ranking endpoint) reports back, since the frontend wiring needs its exact response shape/field names. Do not start this independently without checking Part 4's actual implementation first — the plan describes the intent but the exact param names should come from what was actually built.

### Progress note
Nothing has been committed. Once all 4 parts are done, run the full verification section in the plan file before considering this round complete.

### Status update

Part 1 (n8n) done. Part 2 (Assess Trade) done, build-verified. Part 4 (TF-IDF+valuation ranking) is code-complete and correctly implemented (`company_directory_controller.py` — new `query` param, `_rank_by_similarity_and_valuation()` helper, `SIMILARITY_WEIGHT=0.6`/`VALUATION_WEIGHT=0.4` module constants, `combined_score` sort, backward-compatible when `query` omitted, Express passthrough confirmed needing no change, `aiService.ts` client method `getCompaniesBySimilarity()` added) — **but blocked on missing data**:

**`company_valuation_data.csv` does not exist anywhere on disk in this repo.** Confirmed by exhaustive `find` across the whole `BhugolX` tree — zero matches. Root cause: `GlobeX/.gitignore:19` excludes `/backend/brain/datasets/` from git entirely, and that directory doesn't exist on disk at all in this environment (`GlobeX/backend/brain/datasets/` — not found). So `_load_companies()` in `company_directory_controller.py` has always silently fallen back to an empty DataFrame — `GET /api/v1/companies/top-by-country` has been returning zero companies since before this session started, for both the old market-cap ranking AND the new similarity ranking. This is a pre-existing gap, not something introduced this session. `CountryCompaniesPage.tsx` (which already calls this endpoint) has presumably always shown empty results too.

This blocks Part 3's "click a country → top 10 companies" requirement from being demonstrably functional end-to-end, even though the code implementing it is correct. Asked the user how to proceed (provide the real file / generate one / proceed anyway) before starting Part 3's frontend wiring.

### Blocker resolved — dataset found, plus a real bug it exposed

User clarified the file exists under a different name: **`yahoo_finance_cleaned.csv` at the repo root** (`C:\Users\Aryan\Downloads\BhugolX\yahoo_finance_cleaned.csv`, 50,202 rows, columns `Ticker,CompanyName,DisplayName,Country,Website,Industry,Sector,BusinessSummary,FullTimeEmployees,MarketCap,TotalRevenue,Currency,ExchangeName`). Copied it to where `_load_companies()` expects it: `GlobeX/backend/brain/datasets/final/processed/company_valuation_data.csv` (that directory didn't exist, created it; original left in place at repo root, nothing else referenced it).

This surfaced a real bug the Part 4 agent introduced in good faith but got backwards: it found `_row_to_summary()` reading a `BusinessSummary` column that (at the time, with no data file present to check against) it assumed was wrong and "fixed" to `LongBusinessSummary` — but the real file's actual column is `BusinessSummary`. Reverted all 4 occurrences (`company_directory_controller.py` lines ~105, 163, 198, 317) back to `BusinessSummary`. Verified end-to-end by calling `top_companies_by_country(country='USA', query='basmati rice', limit=5)` directly in Python — real companies now rank with genuine non-null `similarity_score`/`valuation_score`/`combined_score` (e.g. Bunge Global SA, a real Farm Products company, ranks near PepsiCo/Microsoft on the blended score for a rice query — sector-relevant hits are surfacing, not garbage).

**Also user-directed, separate from the dataset fix**: use the repo's real transport/tariff data (`brain/datasets/final/reference_data/freight_rate_by_country_2021.csv` plus the sourced cost model in `GlobeX/backend/brain/services/profit_calculator.py`) to show the exporter's estimated profit on a deal, in the frontend. Discovered this is **already fully built and real** — `GET /api/v1/logistics/profit-estimate` is genuine and well-sourced (every constant cited in `docs/DATA_METHODOLOGY.md#4-export-profit-calculator`), already wired via `aiService.getProfitEstimate()` and a ready component `GlobeX/frontend/src/components/marketplace/LogisticsProfitWidget.tsx` — just not yet used on the Discover Opportunity page. Folded into Part 3's "click a country" scope: add `LogisticsProfitWidget` to `ExportDiscoverPage.tsx`'s country-click flow alongside the (now-working) company similarity list.

Part 3 frontend agent was already dispatched with the original instructions (company list + rename + search + load-more) — since the dataset fix and profit-widget addition are both additive to what it was told to build (call the same endpoint, which now returns real data instead of empty; add one more existing component), no need to re-brief it; will verify its output covers the profit widget once it reports back, and add it separately if not.

### Round 2 — all 4 parts complete

Part 3 finished and reported back before it could know about the dataset fix (forks snapshot context at launch, not live) — it correctly built the honest "no matching companies yet" empty state for `getCompaniesBySimilarity()` since that's all it could observe at the time, and DID build the `LogisticsProfitWidget` wiring (real, unaffected by the dataset issue). Since the dataset fix is purely additive to the same endpoint/response shape the frontend already calls, no rework needed — the empty state will now simply not trigger once real companies come back, confirmed independently via direct Python call (`top_companies_by_country(country='USA', query='basmati rice', limit=5)` → real ranked companies with non-null scores).

**Final state of all 4 parts:**
1. **n8n** — `globex_everything_real.workflow.json` is the sole canonical workflow, all 15 HTTP nodes resilient (`continueOnFail`), all 4 Aggregate nodes report real per-step status, redundant/broken files archived, README updated.
2. **Assess Trade** — Sanctions tab, Transaction Gate banner, dossier status grid, and sandbox fallbacks all render real backend data now, no hardcoded "CLEARED"/"PASS"/fabricated numbers left.
3. **Discover Opportunity** (`ExportDiscoverPage.tsx`, renamed from "Discover") — live top-3 text search (`LiveProductSearch.tsx` → `/predict/hs-code/search`), 20 countries fetched/6 shown/working Load More, and on country click: real profit estimate (`LogisticsProfitWidget`) + real TF-IDF+valuation company ranking (`CountryDetailDrawer.tsx`), both fetched lazily per click instead of eagerly prefetched for all countries.
4. **Company similarity+valuation ranking** — `GET /api/v1/companies/top-by-country?query=...` now blends TF-IDF cosine similarity with log-scaled valuation (`combined_score = 0.6*similarity + 0.4*valuation`), backed by the real 50k-row Yahoo Finance dataset (found at repo root as `yahoo_finance_cleaned.csv`, copied into `GlobeX/backend/brain/datasets/final/processed/company_valuation_data.csv`), fully backward-compatible when `query` is omitted.

**Not yet done**: full manual walkthrough per the plan's Verification section (running n8n locally, clicking through the actual UI in a browser) — everything above is verified via `npm run build` (frontend) and direct Python calls (backend), not an end-to-end browser session. Nothing committed.

---

## Round 3: exporter nav gap — "Partner Discovery" missing from sidebar

User: "as an exporter i should see the partner discovery section where the entire country matching and trade risk etc, add that option in sidebar. all the ML options that are buried or not shown on the website should be brought to surface."

### Investigation
Found the app has THREE sidebar components: `LifecycleRail.tsx` (5 steps: Dashboard, Discover Markets→`/discover`, Assess Trade→`/assess`, Counterparties→`/counterparties`, Trade Requests, Settle), `ExportSidebar.tsx` (3 steps: Export Trades, Create Listing, Discover Opportunity→`/export-discover`), `ImportSidebar.tsx`. Confirmed by grep across the whole frontend: **`ExportSidebar` and `ImportSidebar` are imported in `AppNav.tsx` but never actually rendered anywhere as JSX** — dead code. `AppShell.tsx` (the real layout every route uses) always renders `LifecycleRail` regardless of Export/Import direction. So exporters have never had a working link to `/export-discover` (the real ML country-matching/profit engine, renamed to "Discover Opportunity" in Round 2) — `LifecycleRail`'s "Discover Markets" item pointed at `/discover` (the unrelated marketplace-listing browser) for everyone, in both directions.

### Fix applied (direct edit, `LifecycleRail.tsx`)
Made the "discover" step direction-aware using `useWorkspace().activeDirection` (already available, already used elsewhere in the codebase the same way): when `activeDirection === "Export"`, the nav item now reads **"Partner Discovery"** and links to `/export-discover` (real country matching + trade risk + profit estimate); Import direction is unchanged (`"Discover Markets"` → `/discover`).

### Other buried-ML audit
Checked `shipping-eta` (`GET /api/v1/logistics/shipping-eta`) — initially looked unused (only referenced in `aiService.ts`), but it's actually already surfaced: `LogisticsProfitWidget.tsx` calls both `getShippingETA()` and `getProfitEstimate()` together and is now used on `ListingDetailPage`, `ProductDetailPage`, AND (as of Round 2 Part 3) the Discover Opportunity country-click drawer — no separate fix needed. Everything else ML-facing that was genuinely buried was already surfaced across Round 1 (Dashboard/Marketplace/MarketIntelligence) and Round 2 (Assess Trade real tabs, Discover Opportunity redesign).

**Verified**: `npm run build` succeeds, no TypeScript errors. Not yet clicked through in an actual browser session. `ExportSidebar.tsx`/`ImportSidebar.tsx` remain as dead/unused code — flagging but not deleting, out of scope unless asked.
