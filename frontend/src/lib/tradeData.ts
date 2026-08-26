// Sample trade data and processing utilities

export interface TradeRecord {
  Country: string;
  Product: string;
  Export_Value: number;
  Buyer_Count: number;
}

export interface AggregatedCountry {
  country: string;
  exportValue: number;
  buyerCount: number;
  normalizedValue: number;
  rank: number;
}

export const SAMPLE_DATA: TradeRecord[] = [
  { Country: "China", Product: "Electronics", Export_Value: 892000, Buyer_Count: 145 },
  { Country: "China", Product: "Textiles", Export_Value: 456000, Buyer_Count: 98 },
  { Country: "China", Product: "Machinery", Export_Value: 678000, Buyer_Count: 112 },
  { Country: "United States", Product: "Electronics", Export_Value: 543000, Buyer_Count: 87 },
  { Country: "United States", Product: "Agriculture", Export_Value: 321000, Buyer_Count: 65 },
  { Country: "United States", Product: "Machinery", Export_Value: 489000, Buyer_Count: 78 },
  { Country: "Germany", Product: "Machinery", Export_Value: 723000, Buyer_Count: 134 },
  { Country: "Germany", Product: "Electronics", Export_Value: 412000, Buyer_Count: 76 },
  { Country: "Germany", Product: "Chemicals", Export_Value: 367000, Buyer_Count: 89 },
  { Country: "Japan", Product: "Electronics", Export_Value: 634000, Buyer_Count: 102 },
  { Country: "Japan", Product: "Machinery", Export_Value: 512000, Buyer_Count: 88 },
  { Country: "Japan", Product: "Automobiles", Export_Value: 789000, Buyer_Count: 156 },
  { Country: "South Korea", Product: "Electronics", Export_Value: 578000, Buyer_Count: 94 },
  { Country: "South Korea", Product: "Automobiles", Export_Value: 423000, Buyer_Count: 67 },
  { Country: "India", Product: "Textiles", Export_Value: 345000, Buyer_Count: 78 },
  { Country: "India", Product: "Chemicals", Export_Value: 267000, Buyer_Count: 56 },
  { Country: "India", Product: "Agriculture", Export_Value: 198000, Buyer_Count: 43 },
  { Country: "Brazil", Product: "Agriculture", Export_Value: 567000, Buyer_Count: 89 },
  { Country: "Brazil", Product: "Mining", Export_Value: 432000, Buyer_Count: 34 },
  { Country: "Vietnam", Product: "Textiles", Export_Value: 389000, Buyer_Count: 72 },
  { Country: "Vietnam", Product: "Electronics", Export_Value: 234000, Buyer_Count: 45 },
  { Country: "Mexico", Product: "Automobiles", Export_Value: 456000, Buyer_Count: 67 },
  { Country: "Mexico", Product: "Electronics", Export_Value: 312000, Buyer_Count: 54 },
  { Country: "Italy", Product: "Machinery", Export_Value: 378000, Buyer_Count: 65 },
  { Country: "Italy", Product: "Textiles", Export_Value: 289000, Buyer_Count: 48 },
  { Country: "France", Product: "Agriculture", Export_Value: 345000, Buyer_Count: 56 },
  { Country: "France", Product: "Chemicals", Export_Value: 267000, Buyer_Count: 43 },
  { Country: "United Kingdom", Product: "Chemicals", Export_Value: 298000, Buyer_Count: 52 },
  { Country: "United Kingdom", Product: "Machinery", Export_Value: 234000, Buyer_Count: 41 },
  { Country: "Canada", Product: "Mining", Export_Value: 412000, Buyer_Count: 38 },
  { Country: "Canada", Product: "Agriculture", Export_Value: 356000, Buyer_Count: 62 },
  { Country: "Australia", Product: "Mining", Export_Value: 534000, Buyer_Count: 45 },
  { Country: "Australia", Product: "Agriculture", Export_Value: 234000, Buyer_Count: 38 },
  { Country: "Thailand", Product: "Electronics", Export_Value: 278000, Buyer_Count: 52 },
  { Country: "Thailand", Product: "Agriculture", Export_Value: 198000, Buyer_Count: 34 },
  { Country: "Indonesia", Product: "Mining", Export_Value: 312000, Buyer_Count: 28 },
  { Country: "Indonesia", Product: "Textiles", Export_Value: 198000, Buyer_Count: 42 },
  { Country: "Turkey", Product: "Textiles", Export_Value: 267000, Buyer_Count: 54 },
  { Country: "Turkey", Product: "Automobiles", Export_Value: 189000, Buyer_Count: 32 },
  { Country: "Netherlands", Product: "Chemicals", Export_Value: 345000, Buyer_Count: 67 },
  { Country: "Netherlands", Product: "Electronics", Export_Value: 289000, Buyer_Count: 45 },
  { Country: "Saudi Arabia", Product: "Mining", Export_Value: 678000, Buyer_Count: 78 },
  { Country: "Russia", Product: "Mining", Export_Value: 567000, Buyer_Count: 56 },
  { Country: "Russia", Product: "Chemicals", Export_Value: 234000, Buyer_Count: 34 },
  { Country: "Taiwan", Product: "Electronics", Export_Value: 689000, Buyer_Count: 112 },
  { Country: "Malaysia", Product: "Electronics", Export_Value: 345000, Buyer_Count: 56 },
  { Country: "Singapore", Product: "Electronics", Export_Value: 423000, Buyer_Count: 67 },
  { Country: "Switzerland", Product: "Chemicals", Export_Value: 456000, Buyer_Count: 78 },
  { Country: "Switzerland", Product: "Machinery", Export_Value: 345000, Buyer_Count: 56 },
  { Country: "Poland", Product: "Automobiles", Export_Value: 234000, Buyer_Count: 43 },
  { Country: "Poland", Product: "Machinery", Export_Value: 189000, Buyer_Count: 34 },
  { Country: "Spain", Product: "Agriculture", Export_Value: 267000, Buyer_Count: 45 },
  { Country: "Spain", Product: "Automobiles", Export_Value: 198000, Buyer_Count: 32 },
];

// Country name to ISO A3 mapping for GeoJSON matching
export const COUNTRY_TO_ISO: Record<string, string> = {
  "China": "CHN", "United States": "USA", "Germany": "DEU", "Japan": "JPN",
  "South Korea": "KOR", "India": "IND", "Brazil": "BRA", "Vietnam": "VNM",
  "Mexico": "MEX", "Italy": "ITA", "France": "FRA", "United Kingdom": "GBR",
  "Canada": "CAN", "Australia": "AUS", "Thailand": "THA", "Indonesia": "IDN",
  "Turkey": "TUR", "Netherlands": "NLD", "Saudi Arabia": "SAU", "Russia": "RUS",
  "Taiwan": "TWN", "Malaysia": "MYS", "Singapore": "SGP", "Switzerland": "CHE",
  "Poland": "POL", "Spain": "ESP",
};

export function getProducts(data: TradeRecord[]): string[] {
  return [...new Set(data.map(r => r.Product))].sort();
}

export function aggregateByCountry(
  data: TradeRecord[],
  product: string | null
): AggregatedCountry[] {
  const filtered = product ? data.filter(r => r.Product === product) : data;

  const countryMap = new Map<string, { exportValue: number; buyerCount: number }>();

  for (const record of filtered) {
    const existing = countryMap.get(record.Country);
    if (existing) {
      existing.exportValue += record.Export_Value;
      existing.buyerCount += record.Buyer_Count;
    } else {
      countryMap.set(record.Country, {
        exportValue: record.Export_Value,
        buyerCount: record.Buyer_Count,
      });
    }
  }

  const entries = Array.from(countryMap.entries()).map(([country, vals]) => ({
    country,
    exportValue: vals.exportValue,
    buyerCount: vals.buyerCount,
    normalizedValue: 0,
    rank: 0,
  }));

  // Sort by export value descending
  entries.sort((a, b) => b.exportValue - a.exportValue);

  // Assign ranks
  entries.forEach((e, i) => (e.rank = i + 1));

  // Min-max normalization
  const values = entries.map(e => e.exportValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  entries.forEach(e => {
    e.normalizedValue = (e.exportValue - min) / range;
  });

  return entries;
}

export function formatValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function getTotalExportValue(aggregated: AggregatedCountry[]): number {
  return aggregated.reduce((sum, c) => sum + c.exportValue, 0);
}
