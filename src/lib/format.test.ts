import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOn,
  formatDate,
  formatPeso,
  formatTime,
  manilaDateKey,
  manilaTimeKey,
  manilaToUtc,
  monthRange,
  startOfWeek,
} from "./format";
import { pesoAmount } from "./validation/common";

describe("format", () => {
  it("formats pesos from centavos", () => {
    expect(formatPeso(150050)).toBe("₱1,500.50");
    expect(formatPeso(0)).toBe("₱0.00");
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatDate("2026-10-29")).toBe("29 Oct 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("converts between Manila wall time and UTC", () => {
    const utc = manilaToUtc("2026-10-29", "08:30");
    expect(utc.toISOString()).toBe("2026-10-29T00:30:00.000Z");
    expect(manilaDateKey(utc)).toBe("2026-10-29");
    expect(manilaTimeKey(utc)).toBe("08:30");
    expect(formatTime(utc)).toBe("8:30 AM");
    // 11 PM UTC is already the next day in Manila
    expect(manilaDateKey(new Date("2026-10-29T23:00:00Z"))).toBe("2026-10-30");
  });

  it("does date arithmetic", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(startOfWeek("2026-10-29")).toBe("2026-10-26"); // Thursday → Monday
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // Sunday → previous Monday
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(ageOn("1990-10-30", "2026-10-29")).toBe(35);
    expect(ageOn("1990-10-29", "2026-10-29")).toBe(36);
  });

  it("parses typed peso amounts into centavos", () => {
    expect(pesoAmount().parse("1,500.50")).toBe(150050);
    expect(pesoAmount().parse("₱ 800")).toBe(80000);
    expect(pesoAmount().safeParse("0").success).toBe(false);
    expect(pesoAmount().safeParse("abc").success).toBe(false);
  });
});
