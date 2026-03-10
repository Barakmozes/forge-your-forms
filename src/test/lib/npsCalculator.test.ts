import { describe, it, expect } from "vitest";
import { calculateSentiment, calculateNPS, getNPSBreakdown } from "@/lib/npsCalculator";

describe("calculateSentiment", () => {
  it("returns promoter for scores 9 and 10", () => {
    expect(calculateSentiment(9)).toBe("promoter");
    expect(calculateSentiment(10)).toBe("promoter");
  });

  it("returns passive for scores 7 and 8", () => {
    expect(calculateSentiment(7)).toBe("passive");
    expect(calculateSentiment(8)).toBe("passive");
  });

  it("returns detractor for scores 0 through 6", () => {
    for (let i = 0; i <= 6; i++) {
      expect(calculateSentiment(i)).toBe("detractor");
    }
  });
});

describe("calculateNPS", () => {
  it("returns 0 for empty array", () => {
    expect(calculateNPS([])).toBe(0);
  });

  it("returns 0 when all scores are null", () => {
    expect(calculateNPS([
      { nps_score: null, sentiment: null },
      { nps_score: null, sentiment: null },
    ])).toBe(0);
  });

  it("returns 100 when all are promoters", () => {
    const responses = [
      { nps_score: 10, sentiment: "promoter" as const },
      { nps_score: 9, sentiment: "promoter" as const },
    ];
    expect(calculateNPS(responses)).toBe(100);
  });

  it("returns -100 when all are detractors", () => {
    const responses = [
      { nps_score: 3, sentiment: "detractor" as const },
      { nps_score: 1, sentiment: "detractor" as const },
    ];
    expect(calculateNPS(responses)).toBe(-100);
  });

  it("returns 0 when promoters equal detractors", () => {
    const responses = [
      { nps_score: 10, sentiment: "promoter" as const },
      { nps_score: 2, sentiment: "detractor" as const },
    ];
    expect(calculateNPS(responses)).toBe(0);
  });

  it("calculates correctly with mixed sentiments", () => {
    // 2 promoters, 1 passive, 1 detractor = (2-1)/4 * 100 = 25
    const responses = [
      { nps_score: 10, sentiment: "promoter" as const },
      { nps_score: 9, sentiment: "promoter" as const },
      { nps_score: 7, sentiment: "passive" as const },
      { nps_score: 3, sentiment: "detractor" as const },
    ];
    expect(calculateNPS(responses)).toBe(25);
  });

  it("ignores entries with null scores", () => {
    const responses = [
      { nps_score: 10, sentiment: "promoter" as const },
      { nps_score: null, sentiment: null },
    ];
    expect(calculateNPS(responses)).toBe(100);
  });
});

describe("getNPSBreakdown", () => {
  it("returns zeroes for empty array", () => {
    expect(getNPSBreakdown([])).toEqual({
      promoters: 0,
      passives: 0,
      detractors: 0,
      total: 0,
    });
  });

  it("counts each sentiment correctly", () => {
    const responses = [
      { nps_score: 10, sentiment: "promoter" as const },
      { nps_score: 9, sentiment: "promoter" as const },
      { nps_score: 8, sentiment: "passive" as const },
      { nps_score: 3, sentiment: "detractor" as const },
    ];
    expect(getNPSBreakdown(responses)).toEqual({
      promoters: 2,
      passives: 1,
      detractors: 1,
      total: 4,
    });
  });

  it("handles single response", () => {
    const responses = [{ nps_score: 5, sentiment: "detractor" as const }];
    expect(getNPSBreakdown(responses)).toEqual({
      promoters: 0,
      passives: 0,
      detractors: 1,
      total: 1,
    });
  });
});
