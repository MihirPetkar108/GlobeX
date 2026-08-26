import { scaleLinear } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";

// Color scale: light blue → yellow → bright red
const colorInterpolator = interpolateRgb("#4fc3f7", "#ef4444");

export function getHeatColor(normalizedValue: number): string {
  return colorInterpolator(normalizedValue);
}

export function getPolygonAltitude(normalizedValue: number): number {
  // Map 0-1 to 0.01-0.15
  return 0.01 + normalizedValue * 0.14;
}

export function getGlowOpacity(rank: number): number {
  if (rank <= 3) return 0.8;
  return 0.4;
}

// Create a d3 scale for side effects color coding
export const valueColorScale = scaleLinear<string>()
  .domain([0, 0.5, 1])
  .range(["#4fc3f7", "#fbbf24", "#ef4444"]);
