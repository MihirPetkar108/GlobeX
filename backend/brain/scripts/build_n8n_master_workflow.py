import json

with open('06_globex_master_trade_os.workflow.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for node in data.get('nodes', []):
    if node.get('name') == 'Blockchain Anchor HTTP':
        node['parameters']['url'] = "={{ .GLOBEX_BLOCKCHAIN_ANCHOR_URL || ((.GLOBEX_EXPRESS_BASE_URL || 'http://localhost:5002') + '/api/v1/trades/' + (.trade_id || .tradeId || 'trd-1') + '/anchor') }}"
    elif node.get('name') == 'Shipment Update HTTP':
        node['parameters']['url'] = "={{ .GLOBEX_SHIPMENT_EVENT_URL || ((.GLOBEX_EXPRESS_BASE_URL || 'http://localhost:5002') + '/api/v1/trades') }}"

target_path = 'backend/brain/n8n/globex_master_trade_os.workflow.json'
with open(target_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

with open('06_globex_master_trade_os.workflow.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print('Successfully written workflow to', target_path)
