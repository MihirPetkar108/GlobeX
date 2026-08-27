import pytest
from fastapi.testclient import TestClient
from brain.main import app

client = TestClient(app)

def test_health():
    res = client.get('/health')
    assert res.status_code == 200
    data = res.json()
    assert data['service'] == 'globex-trade-os'

def test_hs_code():
    res = client.post('/predict/hs-code', json={'product': 'Basmati Rice', 'origin': 'IND', 'destination': 'ARE'})
    assert res.status_code == 200
    data = res.json()
    assert data['hs6'] == 100630

def test_market_opportunity():
    res = client.post('/predict/market-opportunity', json={'product': 'Basmati Rice', 'quantity_kg': 1000, 'regime': 'balanced', 'top_n': 6})
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert len(data.get('top_recommendations', [])) > 0

def test_trade_anomaly():
    res = client.post('/api/trade-anomaly/predict', json={
        'trade_flow': 'Export',
        'hs6': 100630,
        'partner_country': 'ARE',
        'trade_value_usd': 120000,
        'quantity': 50000,
        'quantity_unit': 'kg',
        'period': '2025-12'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'risk' in data
    assert 'anomaly_score' in data['risk']

def test_counterparty_match():
    res = client.post('/predict/counterparty-match', json={
        'hs6': 100630,
        'destination_country': 'ARE',
        'quantity_kg': 50000,
        'top_n': 5
    })
    assert res.status_code == 200
    data = res.json()
    assert 'counterparties' in data

def test_counterparty_risk():
    res = client.post('/predict/counterparty-risk', json={
        'organization_id': 'org-test-123',
        'hs6': 100630
    })
    assert res.status_code == 200
    data = res.json()
    assert 'risk' in data

def test_compliance_rag():
    res = client.post('/compliance/rag-analyze', json={
        'hs6': 100630,
        'origin_country': 'IND',
        'destination_country': 'ARE',
        'trade_value_usd': 120000
    })
    assert res.status_code == 200
    data = res.json()
    assert data['status'] in ['OK', 'COMPLIANT']
    assert 'tariff' in data

def test_sanctions_screen():
    res = client.post('/compliance/sanctions-screen', json={
        'exporter_name': 'Arvind Global Agro Exports Ltd',
        'importer_name': 'Emirates Grain & Foodstuff Trading LLC'
    })
    assert res.status_code == 200
    data = res.json()
    assert data['overall_decision'] in ['NO_MATCH', 'POTENTIAL_MATCH', 'MATCH_REQUIRES_RESTRICTION', 'CLEARED_AFTER_REVIEW', 'UNSUPPORTED']

def test_rag_query():
    res = client.post('/api/v1/rag/query', json={
        'query': 'What is the tariff on Basmati rice export from India to UAE?',
        'origin_country': 'IND',
        'destination_country': 'ARE',
        'hs6': 100630
    })
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'OK'
    assert 'passages' in data

def test_ocr_extract():
    res = client.post('/documents/ocr-extract', json={
        'document_url': 'https://storage.globex.ai/docs/inv-101.pdf',
        'document_type': 'COMMERCIAL_INVOICE'
    })
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'STUB'

def test_marketplace_match_buyers():
    res = client.post('/api/v1/marketplace/match-buyers', json={
        'commodity': 'Basmati Rice',
        'quantity': 500.0,
        'unit': 'MT',
        'destinationCountry': 'ARE'
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data['recommendations']) > 0

def test_generate_report():
    res = client.post('/api/v1/trade/generate-report', json={
        'product_query': 'Basmati Rice',
        'origin_country': 'IND',
        'destination_country': 'ARE',
        'quantity_kg': 1000.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data['status'] in ['OK', 'PARTIAL']
    assert 'sections' in data

def test_companies_top_by_country():
    res = client.get('/api/v1/companies/top-by-country?country=ARE&limit=5')
    assert res.status_code == 200
    data = res.json()
    assert 'companies' in data

def test_logistics_shipping_eta():
    res = client.get('/api/v1/logistics/shipping-eta?dest_lat=25.2048&dest_lng=55.2708&dest_country_iso3=ARE')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'OK'
    assert 'estimated_total_days' in data

def test_logistics_profit_estimate():
    res = client.get('/api/v1/logistics/profit-estimate?fob_unit_price_usd=1.15&quantity_kg=50000&destination_country_iso3=ARE')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'OK'
    assert 'net_profit_usd' in data
