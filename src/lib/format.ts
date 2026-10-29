// Display helpers for the Philippines: ₱ amounts and Asia/Manila dates.
// Money is stored as integer centavos; timestamps are stored in UTC.

export const TIME_ZONE = "Asia/Manila";
/** Manila is UTC+8 all year (no daylight saving). */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** 150050 → "₱1,500.50" */
export function formatPeso(centavos: number): string {
  return pesoFormatter.format(centavos / 100);
}

/** 150050 → "1500.50" (for form inputs and CSV). */
export function centavosToInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});
const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: TIME_ZONE });

/** Parses "yyyy-mm-dd" as a calendar date (noon UTC, so it never shifts a day). */
function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Date or "yyyy-mm-dd" → "29 Oct 2026" */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(typeof value === "string" ? fromIsoDate(value) : value);
}

/** → "1:40 PM" (Manila time) */
export function formatTime(value: Date): string {
  return timeFormatter.format(value);
}

/** → "29 Oct 2026, 1:40 PM" */
export function formatDateTime(value: Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** → "Thu" */
export function formatWeekday(value: Date | string): string {
  return weekdayFormatter.format(typeof value === "string" ? fromIsoDate(value) : value);
}

/** The Manila calendar date of an instant, as "yyyy-mm-dd". */
export function manilaDateKey(value: Date): string {
  return new Date(value.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The Manila wall-clock time of an instant, as "HH:mm". */
export function manilaTimeKey(value: Date): string {
  return new Date(value.getTime() + MANILA_OFFSET_MS).toISOString().slice(11, 16);
}

/** Today's date in Manila, "yyyy-mm-dd". */
export function todayManila(now: Date = new Date()): string {
  return manilaDateKey(now);
}

/** Manila date + "HH:mm" → the UTC instant. */
export function manilaToUtc(isoDate: string, time = "00:00"): Date {
  return new Date(new Date(`${isoDate}T${time}:00Z`).getTime() - MANILA_OFFSET_MS);
}

/** Adds days to a "yyyy-mm-dd" date. */
export function addDays(isoDate: string, days: number): string {
  const d = fromIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing the date, "yyyy-mm-dd". */
export function startOfWeek(isoDate: string): string {
  const day = fromIsoDate(isoDate).getUTCDay(); // 0 = Sunday
  return addDays(isoDate, day === 0 ? -6 : 1 - day);
}

/** First and last day of a month ("yyyy-mm") as "yyyy-mm-dd". */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

/** "2026-10" → "October 2026" */
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    fromIsoDate(`${month}-01`),
  );
}

/** Whole years between a birthdate and today (both "yyyy-mm-dd"). */
export function ageOn(birthdate: string, today: string): number {
  const [by, bm, bd] = birthdate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}
