// FDI two-digit tooth numbering: first digit = quadrant, second = position from the midline.
// Quadrants 1–4 are permanent teeth (8 each), 5–8 are primary teeth (5 each).
import type { ChartCondition, Surface } from "@/db/schema";

const range = (q: number, n: number, reverse = false) => {
  const list = Array.from({ length: n }, (_, i) => q * 10 + i + 1);
  return reverse ? list.reverse() : list;
};

/** Rows as seen facing the patient: their right is on our left. */
export const ADULT_UPPER = [...range(1, 8, true), ...range(2, 8)];
export const ADULT_LOWER = [...range(4, 8, true), ...range(3, 8)];
export const CHILD_UPPER = [...range(5, 5, true), ...range(6, 5)];
export const CHILD_LOWER = [...range(8, 5, true), ...range(7, 5)];

export const ALL_TEETH = new Set([...ADULT_UPPER, ...ADULT_LOWER, ...CHILD_UPPER, ...CHILD_LOWER]);

export function isValidTooth(n: number): boolean {
  return ALL_TEETH.has(n);
}

export function quadrant(tooth: number): number {
  return Math.floor(tooth / 10);
}

export function isUpper(tooth: number): boolean {
  return [1, 2, 5, 6].includes(quadrant(tooth));
}

/** Teeth in quadrants 1, 4, 5, 8 are drawn on the left, so their mesial side faces right. */
export function mesialOnRight(tooth: number): boolean {
  return [1, 4, 5, 8].includes(quadrant(tooth));
}

const ADULT_NAMES = ["central incisor", "lateral incisor", "canine", "first premolar", "second premolar", "first molar", "second molar", "third molar"];
const CHILD_NAMES = ["central incisor", "lateral incisor", "canine", "first molar", "second molar"];
const SIDE = { 1: "upper right", 2: "upper left", 3: "lower left", 4: "lower right" } as const;

/** 16 → "Upper right first molar"; 55 → "Upper right second molar (primary)" */
export function toothName(tooth: number): string {
  const q = quadrant(tooth);
  const pos = tooth % 10;
  const primary = q >= 5;
  const side = SIDE[(primary ? q - 4 : q) as 1 | 2 | 3 | 4];
  const name = (primary ? CHILD_NAMES : ADULT_NAMES)[pos - 1];
  const label = `${side} ${name}${primary ? " (primary)" : ""}`;
  return label[0].toUpperCase() + label.slice(1);
}

/** "16, 26 11" → [16, 26, 11]; returns null if any number isn't a valid FDI tooth. */
export function parseTeeth(input: string): number[] | null {
  const parts = input.split(/[\s,;]+/).filter(Boolean);
  const teeth = parts.map(Number);
  if (teeth.some((t) => !Number.isInteger(t) || !isValidTooth(t))) return null;
  return [...new Set(teeth)];
}

export const SURFACE_LABELS: Record<Surface, string> = {
  M: "Mesial",
  D: "Distal",
  B: "Buccal / facial",
  L: "Lingual / palatal",
  O: "Occlusal / incisal",
};

export const CONDITION_LABELS: Record<ChartCondition, string> = {
  caries: "Caries",
  filling: "Filling",
  crown: "Crown",
  rct: "Root canal",
  missing: "Missing",
  extraction: "For extraction",
  implant: "Implant",
  bridge: "Bridge",
  sealant: "Sealant",
  other: "Other",
};

/** Conditions that apply to the whole tooth rather than to surfaces. */
export const WHOLE_TOOTH: ReadonlySet<ChartCondition> = new Set(["crown", "rct", "missing", "extraction", "implant", "bridge"]);

/** CSS colour token for each condition (see globals.css). */
export const CONDITION_COLORS: Record<ChartCondition, string> = {
  caries: "var(--tooth-caries)",
  filling: "var(--tooth-filling)",
  crown: "var(--tooth-crown)",
  rct: "var(--tooth-rct)",
  missing: "var(--muted-foreground)",
  extraction: "var(--tooth-caries)",
  implant: "var(--tooth-other)",
  bridge: "var(--tooth-crown)",
  sealant: "var(--tooth-other)",
  other: "var(--tooth-other)",
};

export const COMMON_PROCEDURES = [
  "Consultation",
  "Oral prophylaxis (cleaning)",
  "Deep scaling",
  "Composite filling",
  "Temporary filling",
  "Tooth extraction",
  "Odontectomy (surgical extraction)",
  "Root canal treatment",
  "Pulpotomy",
  "Crown",
  "Fixed bridge",
  "Complete denture",
  "Partial denture",
  "Denture repair",
  "Fluoride application",
  "Pit and fissure sealant",
  "Teeth whitening",
  "Orthodontic adjustment",
  "Periapical X-ray",
  "Panoramic X-ray",
];
