const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES: [number, string][] = [
  [1_000_000_000, "Billion"],
  [1_000_000, "Million"],
  [1_000, "Thousand"],
];

function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

function wholeToWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  for (const [value, name] of SCALES) {
    if (n >= value) {
      parts.push(`${underThousand(Math.floor(n / value))} ${name}`);
      n %= value;
    }
  }
  if (n > 0) parts.push(underThousand(n));
  return parts.join(" ");
}

/** 150050 centavos → "One Thousand Five Hundred Pesos and 50/100" (as written on PH receipts). */
export function pesoInWords(centavos: number): string {
  const pesos = Math.floor(centavos / 100);
  const cents = centavos % 100;
  const words = `${wholeToWords(pesos)} Peso${pesos === 1 ? "" : "s"}`;
  return cents ? `${words} and ${String(cents).padStart(2, "0")}/100` : `${words} Only`;
}
