import { describe, expect, it } from "vitest";
import { chartState, type ChartEntryLite } from "./chart-state";

const entry = (e: Partial<ChartEntryLite>): ChartEntryLite => ({
  id: crypto.randomUUID(),
  tooth: 16,
  surfaces: [],
  condition: "caries",
  status: "existing",
  date: "2026-01-01",
  notes: null,
  ...e,
});

describe("chartState", () => {
  it("lets later findings replace earlier ones on the same surface", () => {
    const state = chartState([
      entry({ surfaces: ["O"], condition: "filling", date: "2026-03-01" }),
      entry({ surfaces: ["O", "M"], condition: "caries", date: "2026-01-01" }),
    ]);
    expect(state.get(16)?.surfaces).toEqual({
      O: { condition: "filling", status: "existing" },
      M: { condition: "caries", status: "existing" },
    });
  });

  it("tracks whole-tooth conditions separately", () => {
    const state = chartState([entry({ tooth: 36, condition: "rct" }), entry({ tooth: 36, condition: "crown", date: "2026-02-01" })]);
    expect(state.get(36)?.whole).toEqual({ condition: "crown", status: "existing" });
  });
});
