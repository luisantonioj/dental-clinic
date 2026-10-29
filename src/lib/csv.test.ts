import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("escapes quotes, commas, newlines and formula-like text", () => {
    const csv = toCsv(["Name", "Note"], [["Dela Cruz, Juan", 'said "hi"\nbye'], ["=SUM(A1)", 5]]);
    expect(csv).toBe('﻿Name,Note\r\n"Dela Cruz, Juan","said ""hi""\nbye"\r\n\'=SUM(A1),5\r\n');
  });
});
