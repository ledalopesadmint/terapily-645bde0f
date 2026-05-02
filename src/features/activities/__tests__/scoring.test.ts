/**
 * Unit tests for scoring engine (S3 §4).
 *
 * PHQ-9 and GAD-7 configs mirror production activity_catalog.config.
 */
import { describe, it, expect } from "vitest";
import { scoreActivity } from "@/lib/scoring/scoring.server";

const PHQ9_CONFIG = {
  scoring: {
    type: "sum" as const,
    questions: [
      { id: "q1", weight: 1 },
      { id: "q2", weight: 1 },
      { id: "q3", weight: 1 },
      { id: "q4", weight: 1 },
      { id: "q5", weight: 1 },
      { id: "q6", weight: 1 },
      { id: "q7", weight: 1 },
      { id: "q8", weight: 1 },
      { id: "q9", weight: 1 },
    ],
    max_per_item: 3,
  },
  severity_bands: [
    { min: 0, max: 4, label: "minimal" as const },
    { min: 5, max: 9, label: "mild" as const },
    { min: 10, max: 14, label: "moderate" as const },
    { min: 15, max: 19, label: "moderately_severe" as const },
    { min: 20, max: 27, label: "severe" as const },
  ],
};

const GAD7_CONFIG = {
  scoring: {
    type: "sum" as const,
    questions: [
      { id: "q1", weight: 1 },
      { id: "q2", weight: 1 },
      { id: "q3", weight: 1 },
      { id: "q4", weight: 1 },
      { id: "q5", weight: 1 },
      { id: "q6", weight: 1 },
      { id: "q7", weight: 1 },
    ],
    max_per_item: 3,
  },
  severity_bands: [
    { min: 0, max: 4, label: "minimal" as const },
    { min: 5, max: 9, label: "mild" as const },
    { min: 10, max: 14, label: "moderate" as const },
    { min: 15, max: 21, label: "severe" as const },
  ],
};

const PCL5_CONFIG = {
  scoring: {
    type: "sum" as const,
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: `q${i + 1}`,
      weight: 1,
    })),
    max_per_item: 4,
    clusters: {
      intrusion: ["q1", "q2", "q3", "q4", "q5"],
      avoidance: ["q6", "q7"],
      negative_cognition: ["q8", "q9", "q10", "q11", "q12", "q13", "q14"],
      hyperarousal: ["q15", "q16", "q17", "q18", "q19", "q20"],
    },
  },
  severity_bands: [
    { min: 0, max: 30, label: "minimal" as const },
    { min: 31, max: 32, label: "mild" as const },
    { min: 33, max: 80, label: "moderate" as const },
  ],
};

describe("scoreActivity — PHQ-9", () => {
  it("scores all zeros as minimal", () => {
    const responses: Record<string, number> = {};
    for (let i = 1; i <= 9; i++) responses[`q${i}`] = 0;
    const result = scoreActivity("quiz_scale", PHQ9_CONFIG, responses);
    expect(result.score).toBe(0);
    expect(result.severity).toBe("minimal");
  });

  it("scores all 3s as severe (27)", () => {
    const responses: Record<string, number> = {};
    for (let i = 1; i <= 9; i++) responses[`q${i}`] = 3;
    const result = scoreActivity("quiz_scale", PHQ9_CONFIG, responses);
    expect(result.score).toBe(27);
    expect(result.severity).toBe("severe");
  });

  it("scores 10 as moderate", () => {
    const responses = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 0, q7: 0, q8: 0, q9: 0 };
    const result = scoreActivity("quiz_scale", PHQ9_CONFIG, responses);
    expect(result.score).toBe(10);
    expect(result.severity).toBe("moderate");
  });

  it("returns not_applicable with >20% missing", () => {
    const responses = { q1: 1, q2: 1 }; // only 2/9
    const result = scoreActivity("quiz_scale", PHQ9_CONFIG, responses);
    expect(result.score).toBeNull();
    expect(result.severity).toBe("not_applicable");
  });

  it("scores with 1 missing item (>80% answered)", () => {
    const responses: Record<string, number> = {};
    for (let i = 1; i <= 8; i++) responses[`q${i}`] = 1; // 8/9 = 88%
    const result = scoreActivity("quiz_scale", PHQ9_CONFIG, responses);
    expect(result.score).toBe(8);
    expect(result.severity).toBe("mild");
  });
});

describe("scoreActivity — GAD-7", () => {
  it("scores all zeros as minimal", () => {
    const responses: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) responses[`q${i}`] = 0;
    const result = scoreActivity("quiz_scale", GAD7_CONFIG, responses);
    expect(result.score).toBe(0);
    expect(result.severity).toBe("minimal");
  });

  it("scores all 3s as severe (21)", () => {
    const responses: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) responses[`q${i}`] = 3;
    const result = scoreActivity("quiz_scale", GAD7_CONFIG, responses);
    expect(result.score).toBe(21);
    expect(result.severity).toBe("severe");
  });

  it("scores 7 as mild", () => {
    const responses = { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1 };
    const result = scoreActivity("quiz_scale", GAD7_CONFIG, responses);
    expect(result.score).toBe(7);
    expect(result.severity).toBe("mild");
  });
});

describe("scoreActivity — non quiz_scale", () => {
  it("returns not_applicable for guided_timer", () => {
    const result = scoreActivity("guided_timer", {}, {});
    expect(result.score).toBeNull();
    expect(result.severity).toBe("not_applicable");
  });

  it("returns not_applicable for structured_form", () => {
    const result = scoreActivity("structured_form", {}, {});
    expect(result.score).toBeNull();
    expect(result.severity).toBe("not_applicable");
  });
});

describe("scoreActivity — PCL-5 cluster scores", () => {
  it("computes total and cluster scores in metadata", () => {
    const responses: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) responses[`q${i}`] = 2;
    const result = scoreActivity("quiz_scale", PCL5_CONFIG, responses);
    expect(result.score).toBe(40);
    expect(result.severity).toBe("moderate");
    expect(result.metadata).toHaveProperty("clusters");
    const clusters = result.metadata.clusters as Record<string, number>;
    expect(clusters.intrusion).toBe(10); // 5 * 2
    expect(clusters.avoidance).toBe(4);  // 2 * 2
    expect(clusters.negative_cognition).toBe(14); // 7 * 2
    expect(clusters.hyperarousal).toBe(12); // 6 * 2
  });
});

describe("scoreActivity — mean scoring type", () => {
  const MEAN_CONFIG = {
    scoring: {
      type: "mean" as const,
      questions: [
        { id: "q1", weight: 1 },
        { id: "q2", weight: 1 },
        { id: "q3", weight: 1 },
        { id: "q4", weight: 1 },
      ],
      max_per_item: 4,
    },
    severity_bands: [
      { min: 0, max: 1.5, label: "minimal" as const },
      { min: 1.51, max: 3, label: "moderate" as const },
      { min: 3.01, max: 4, label: "severe" as const },
    ],
  };

  it("computes mean instead of sum", () => {
    const responses = { q1: 2, q2: 4, q3: 2, q4: 4 }; // sum=12, mean=3
    const result = scoreActivity("quiz_scale", MEAN_CONFIG, responses);
    expect(result.score).toBe(3);
    expect(result.severity).toBe("moderate");
  });

  it("handles fractional mean correctly", () => {
    const responses = { q1: 1, q2: 0, q3: 0, q4: 0 }; // sum=1, mean=0.25
    const result = scoreActivity("quiz_scale", MEAN_CONFIG, responses);
    expect(result.score).toBe(0.25);
    expect(result.severity).toBe("minimal");
  });
});
