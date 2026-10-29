type Cell = string | number | null | undefined;

function escape(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  let s = String(cell);
  // Stop spreadsheet apps from treating text as a formula.
  if (/^[=+\-@\t\r]/.test(s) && typeof cell === "string") s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV document (with a BOM so Excel opens UTF-8 names and ₱ correctly). */
export function toCsv(header: string[], rows: Cell[][]): string {
  return `﻿${[header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n")}\r\n`;
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Centavos → "1500.50" for spreadsheets. */
export const pesos = (centavos: number) => (centavos / 100).toFixed(2);
