import { describe, it, expect } from "vitest";
import { TOP_BUYERS_DATA } from "@/data/mockTradeData";

describe("GLOBEX Iteration 4 - Information Architecture & Marketplace Demand Layer", () => {

  it("should expose Top 10 Verified Buyers data with authentic ranking signals", () => {
    expect(TOP_BUYERS_DATA).toHaveLength(10);
    expect(TOP_BUYERS_DATA[0].name).toBe("Example Global Trading Ltd.");
    expect(TOP_BUYERS_DATA[0].activeRFQs).toBe(18);
    expect(TOP_BUYERS_DATA[0].demandValueUSD).toBeGreaterThan(0);
    expect(TOP_BUYERS_DATA[0].rank).toBe("01");
  });

  it("should process user requirement query and return ML candidate count and ranked recommendations", async () => {
    const { aiService } = await import("@/services/api/aiService");
    const result = await aiService.matchBuyers({
      commodity: "1121 Steam Basmati Rice",
      quantity: 1000,
      unit: "MT",
      destinationCountry: "UAE",
    });

    // candidateCount must always be real, never the old fabricated 7420 —
    // but its exact value legitimately depends on whether a live backend
    // answered (real pool) or the frontend fell back to its local demo pool
    // (TOP_BUYERS_DATA, 10 entries). Assert honesty, not a specific number.
    if (result.data_source === "fallback_demo_pool") {
      expect(result.candidateCount).toBe(TOP_BUYERS_DATA.length);
    } else {
      expect(result.candidateCount).toBe(result.recommendations.length);
    }
    expect(result.candidateCount).not.toBe(7420);
    expect(result.strongMatchCount).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(5);
    expect(result.recommendations[0].matchScore).toBeGreaterThanOrEqual(90);
    expect(result.recommendations[0].matchSignals?.length).toBeGreaterThan(0);
  });
});
