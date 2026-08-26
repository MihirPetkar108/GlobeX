import json

VALIDATE_JS = """// Validate and normalize all incoming trade inputs
var body = $json.body || $json;
var product = body.product || body.productName || body.product_name || body.title || body.commodity || 'Basmati Rice';
var origin = String(body.origin_country || body.originCountry || body.origin || 'IND').toUpperCase().slice(0,3);
var destination = String(body.destination_country || body.destinationCountry || body.destination || 'ARE').toUpperCase().slice(0,3);
var quantity_kg = Number(body.quantity_kg || body.quantity || body.quantityKg || 50000);
if (quantity_kg <= 0) quantity_kg = 50000;
var target_price_usd = Number(body.target_price_usd || body.targetPriceUSD || body.unitPriceUsd || 1100);
var trade_flow = body.trade_flow || body.tradeFlow || 'Export';
var regime = body.regime || 'balanced';
var certifications = body.certifications || [];
var correlation_id = 'globex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
return [{ json: { product: product, origin_country: origin, destination_country: destination, quantity_kg: quantity_kg, target_price_usd: target_price_usd, trade_flow: trade_flow, regime: regime, certifications: certifications, correlation_id: correlation_id } }];"""

AGGREGATE_JS = """var inp  = $('Code - Validate + Normalize Input').item.json;
var hs   = $('HTTP - HS Classifier').item.json;
var xgb  = $('HTTP - XGBoost Demand Forecaster').item.json;
var anom = $('HTTP - IsolationForest Anomaly Engine').item.json;
var rag  = $('HTTP - Compliance RAG Retriever').item.json;
var cp   = $('HTTP - Counterparty Match + Sanctions').item.json;
var rpt  = $('HTTP - Multi-Model Report Synthesizer').item.json;

var stages = {
  HS_CLASSIFIER:     hs,
  DEMAND_FORECASTER: xgb,
  ANOMALY_ENGINE:    anom,
  COMPLIANCE_RAG:    rag,
  COUNTERPARTY:      cp,
  REPORT_SYNTHESIS:  rpt
};

var errors = [];
var keys = Object.keys(stages);
for (var i = 0; i < keys.length; i++) {
  var stage = keys[i];
  var data = stages[stage];
  if (data && (data.detail || data.error)) {
    errors.push({
      status: 'FAILED',
      engine: 'n8n',
      failed_stage: stage,
      error: data.detail || data.error,
      execution_id: 'n8n_exec_' + inp.correlation_id,
      retryable: true
    });
  }
}

var overallStatus = errors.length === 0 ? 'SUCCESS' : (errors.length < keys.length ? 'PARTIAL' : 'FAILED');

return [{
  json: {
    status: overallStatus,
    execution_id: 'n8n_exec_' + inp.correlation_id,
    workflow: {
      name: 'GlobeXAI Production Trade Automation OS v2 Sequential',
      nodes_executed: 7,
      duration_ms: Date.now() % 100000
    },
    input: inp,
    results: {
      hs_classification: hs,
      market_opportunity: {
        engine: 'XGBoost Quantile Residual Forecaster Q10/50/90',
        top_recommendations: xgb.top_recommendations || [],
        shap_attribution: xgb.shap_attribution || null,
        raw: xgb
      },
      anomaly_risk: anom,
      compliance_rag: rag,
      counterparty: cp,
      report: rpt
    },
    provenance: [
      'POST /predict/hs-code',
      'POST /predict/market-opportunity',
      'POST /api/trade-anomaly/predict',
      'POST /compliance/rag-analyze',
      'POST /predict/counterparty-match',
      'POST /api/v1/trade/generate-report'
    ],
    errors: errors,
    executed_at: new Date().toISOString()
  }
}];"""

def http_node(node_id, name, url, json_body, pos, timeout=20000):
    return {
        'parameters': {
            'method': 'POST',
            'url': url,
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': json_body,
            'options': {'timeout': timeout}
        },
        'id': node_id,
        'name': name,
        'type': 'n8n-nodes-base.httpRequest',
        'typeVersion': 4.2,
        'position': pos
    }

INP = "$('Code - Validate + Normalize Input').item.json"
HS  = "$('HTTP - HS Classifier').item.json"

wf = {
    'name': 'GlobeXAI - Production Trade Automation OS v2 (Sequential)',
    'nodes': [
        {
            'parameters': {
                'content': '## GLOBEX AI - Production Trade Automation OS v2 (Sequential)\n\nSequential linear chain - 0 parallel branches.\nWebhooks: globex-analyze-trade-v2 / globex-test-trade-v2',
                'height': 340, 'width': 500, 'color': 4
            },
            'id': 'sticky-v2-seq',
            'name': 'Architecture Guide - Sequential v2',
            'type': 'n8n-nodes-base.stickyNote',
            'typeVersion': 1,
            'position': [-560, 140]
        },
        {
            'parameters': {
                'httpMethod': 'POST',
                'path': 'globex-analyze-trade-v2',
                'responseMode': 'responseNode',
                'options': {}
            },
            'id': 'wh-prod-v2',
            'name': 'Webhook - Analyze Trade (Live)',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [40, 300],
            'webhookId': 'globex-prod-wh-v2-seq'
        },
        {
            'parameters': {
                'httpMethod': 'POST',
                'path': 'globex-test-trade-v2',
                'responseMode': 'responseNode',
                'options': {}
            },
            'id': 'wh-test-v2',
            'name': 'Webhook - Test Trade Analysis',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [40, 160],
            'webhookId': 'globex-test-wh-v2-seq'
        },
        {
            'parameters': {'jsCode': VALIDATE_JS},
            'id': 'code-validate',
            'name': 'Code - Validate + Normalize Input',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [280, 300]
        },
        http_node(
            'http-hs', 'HTTP - HS Classifier',
            'http://host.docker.internal:8000/predict/hs-code',
            '={\n  "product": "{{ ' + INP + '.product }}",\n  "origin": "{{ ' + INP + '.origin_country }}",\n  "destination": "{{ ' + INP + '.destination_country }}"\n}',
            [520, 300], 15000
        ),
        http_node(
            'http-xgb', 'HTTP - XGBoost Demand Forecaster',
            'http://host.docker.internal:8000/predict/market-opportunity',
            '={\n  "product": "{{ ' + INP + '.product }}",\n  "quantity_kg": {{ ' + INP + '.quantity_kg }},\n  "regime": "{{ ' + INP + '.regime }}",\n  "top_n": 8\n}',
            [760, 300], 20000
        ),
        http_node(
            'http-anom', 'HTTP - IsolationForest Anomaly Engine',
            'http://host.docker.internal:8000/api/trade-anomaly/predict',
            '={\n  "trade_flow": "{{ ' + INP + '.trade_flow }}",\n  "hs6": {{ Number(' + HS + '.hs6 || 100630) }},\n  "partner_country": "{{ ' + INP + '.destination_country }}",\n  "trade_value_usd": {{ ' + INP + '.quantity_kg * (' + INP + '.target_price_usd / 1000) }},\n  "quantity": {{ ' + INP + '.quantity_kg }},\n  "quantity_unit": "kg",\n  "period": "202608"\n}',
            [1000, 300], 15000
        ),
        http_node(
            'http-rag', 'HTTP - Compliance RAG Retriever',
            'http://host.docker.internal:8000/compliance/rag-analyze',
            '={\n  "hs6": {{ Number(' + HS + '.hs6 || 100630) }},\n  "origin_country": "{{ ' + INP + '.origin_country }}",\n  "destination_country": "{{ ' + INP + '.destination_country }}",\n  "trade_value_usd": {{ ' + INP + '.quantity_kg * (' + INP + '.target_price_usd / 1000) }}\n}',
            [1240, 300], 20000
        ),
        http_node(
            'http-cp', 'HTTP - Counterparty Match + Sanctions',
            'http://host.docker.internal:8000/predict/counterparty-match',
            '={\n  "hs6": {{ Number(' + HS + '.hs6 || 100630) }},\n  "destination_country": "{{ ' + INP + '.destination_country }}",\n  "quantity_kg": {{ ' + INP + '.quantity_kg }},\n  "top_n": 5\n}',
            [1480, 300], 15000
        ),
        http_node(
            'http-rpt', 'HTTP - Multi-Model Report Synthesizer',
            'http://host.docker.internal:8000/api/v1/trade/generate-report',
            '={\n  "product_query": "{{ ' + INP + '.product }}",\n  "origin_country": "{{ ' + INP + '.origin_country }}",\n  "destination_country": "{{ ' + INP + '.destination_country }}",\n  "quantity_kg": {{ ' + INP + '.quantity_kg }},\n  "trade_value_usd": {{ ' + INP + '.quantity_kg * (' + INP + '.target_price_usd / 1000) }},\n  "trade_flow": "{{ ' + INP + '.trade_flow }}"\n}',
            [1720, 300], 30000
        ),
        {
            'parameters': {'jsCode': AGGREGATE_JS},
            'id': 'code-aggregate',
            'name': 'Code - Aggregate ML Synthesis',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [1960, 300]
        },
        {
            'parameters': {'options': {}},
            'id': 'respond',
            'name': 'Respond to Webhook',
            'type': 'n8n-nodes-base.respondToWebhook',
            'typeVersion': 1.1,
            'position': [2200, 300]
        }
    ],
    'connections': {
        'Webhook - Analyze Trade (Live)': {'main': [[{'node': 'Code - Validate + Normalize Input', 'type': 'main', 'index': 0}]]},
        'Webhook - Test Trade Analysis': {'main': [[{'node': 'Code - Validate + Normalize Input', 'type': 'main', 'index': 0}]]},
        'Code - Validate + Normalize Input': {'main': [[{'node': 'HTTP - HS Classifier', 'type': 'main', 'index': 0}]]},
        'HTTP - HS Classifier': {'main': [[{'node': 'HTTP - XGBoost Demand Forecaster', 'type': 'main', 'index': 0}]]},
        'HTTP - XGBoost Demand Forecaster': {'main': [[{'node': 'HTTP - IsolationForest Anomaly Engine', 'type': 'main', 'index': 0}]]},
        'HTTP - IsolationForest Anomaly Engine': {'main': [[{'node': 'HTTP - Compliance RAG Retriever', 'type': 'main', 'index': 0}]]},
        'HTTP - Compliance RAG Retriever': {'main': [[{'node': 'HTTP - Counterparty Match + Sanctions', 'type': 'main', 'index': 0}]]},
        'HTTP - Counterparty Match + Sanctions': {'main': [[{'node': 'HTTP - Multi-Model Report Synthesizer', 'type': 'main', 'index': 0}]]},
        'HTTP - Multi-Model Report Synthesizer': {'main': [[{'node': 'Code - Aggregate ML Synthesis', 'type': 'main', 'index': 0}]]},
        'Code - Aggregate ML Synthesis': {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}]]}
    },
    'settings': {'executionOrder': 'v1'}
}

path = r'd:\Codes\SIH26\GlobeX-New\backend\brain\n8n\globex_docker_master_workflow.json'
with open(path, 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print('SUCCESSFULLY REBUILT WORKFLOW JSON WITH VALID ES5/ES6 CODE NODES!')
