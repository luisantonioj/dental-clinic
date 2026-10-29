import type { ChartCondition, ChartStatus, Surface } from "@/db/schema";
import { WHOLE_TOOTH } from "./teeth";

export type ChartEntryLite = {
  id: string;
  tooth: number;
  surfaces: Surface[];
  condition: ChartCondition;
  status: ChartStatus;
  date: string;
  notes: string | null;
};

export type Mark = { condition: ChartCondition; status: ChartStatus };
export type ToothState = { whole?: Mark; surfaces: Partial<Record<Surface, Mark>> };

/**
 * What to draw for each tooth. Entries are applied in date order, so a later
 * finding on the same surface (e.g. a filling over caries) replaces the earlier one.
 */
export function chartState(entries: ChartEntryLite[]): Map<number, ToothState> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<number, ToothState>();
  for (const e of sorted) {
    const state = map.get(e.tooth) ?? { surfaces: {} };
    const mark = { condition: e.condition, status: e.status };
    if (WHOLE_TOOTH.has(e.condition)) {
      state.whole = mark;
    } else if (e.surfaces.length === 0) {
      // A surface condition without surfaces marks the whole crown face.
      state.surfaces.O = mark;
    } else {
      for (const s of e.surfaces) state.surfaces[s] = mark;
    }
    map.set(e.tooth, state);
  }
  return map;
}
