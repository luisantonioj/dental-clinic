import { describe, expect, it } from "vitest";
import { pesoInWords } from "./amount-words";

describe("pesoInWords", () => {
  it("writes amounts the way PH receipts do", () => {
    expect(pesoInWords(150050)).toBe("One Thousand Five Hundred Pesos and 50/100");
    expect(pesoInWords(100)).toBe("One Peso Only");
    expect(pesoInWords(1_234_567_00)).toBe("One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven Pesos Only");
    expect(pesoInWords(0)).toBe("Zero Pesos Only");
  });
});
