// Deterministic country pros/cons synthesis. Built from the fields
// src/partner_discovery/explainability.py::generate_country_insights() already
// returns (pros, cons, scores, risk, forecast, destination) — no LLM call, so
// this never fails or times out, unlike the optional local-Ollama path it
// used to reach for on the Python side.

function synthesizeCountryProsCons(insightData) {
  const data = insightData || {};
  const pros = Array.isArray(data.pros) ? data.pros : [];
  const cons = Array.isArray(data.cons) ? data.cons : [];
  const destination = data.destination || {};
  const forecast = data.forecast || {};
  const risk = data.risk || {};
  const scores = data.scores || {};

  const countryName = destination.country_name || 'this destination';
  const finalScore = Number(scores.final_score ?? 0);
  const riskLevel = risk.risk_level || 'LOW';
  const demandKg = forecast.annual_market_demand_kg;

  const summaryParts = [
    `${countryName} scores ${finalScore.toFixed(1)} overall with a ${String(riskLevel).toLowerCase()} risk profile.`,
  ];
  if (demandKg) {
    summaryParts.push(`Forecast annual demand is ${Number(demandKg).toLocaleString()} kg.`);
  }
  if (pros.length) summaryParts.push(pros[0]);
  if (cons.length) summaryParts.push(cons[0]);

  return {
    executive_summary: summaryParts.join(' '),
    structured_pros: pros.map((text) => ({ text })),
    structured_cons: cons.map((text) => ({ text })),
    negotiation_leverage: pros.length && cons.length
      ? `Lead with ${pros[0].toLowerCase()}; be prepared to address ${cons[0].toLowerCase()}`
      : null,
    synthesized_by_llm: false,
    model_used: null,
  };
}

module.exports = { synthesizeCountryProsCons };
