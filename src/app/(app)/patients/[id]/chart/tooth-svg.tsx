import type { Surface } from "@/db/schema";
import type { Mark, ToothState } from "@/lib/chart-state";
import { CONDITION_COLORS, CONDITION_LABELS, isUpper, mesialOnRight } from "@/lib/teeth";
import { cn } from "@/lib/utils";

const S = 34; // tooth box size

/** Which surface each side of the box shows, as seen facing the patient. */
function sideSurfaces(tooth: number): { top: Surface; bottom: Surface; left: Surface; right: Surface } {
  const upper = isUpper(tooth);
  const mesialRight = mesialOnRight(tooth);
  return {
    top: upper ? "B" : "L",
    bottom: upper ? "L" : "B",
    left: mesialRight ? "D" : "M",
    right: mesialRight ? "M" : "D",
  };
}

function fillFor(mark: Mark | undefined): { fill: string; opacity?: number } {
  if (!mark) return { fill: "var(--card)" };
  return { fill: CONDITION_COLORS[mark.condition], opacity: mark.status === "planned" ? 0.45 : 1 };
}

export function describeTooth(tooth: number, state: ToothState | undefined): string {
  if (!state) return `Tooth ${tooth}, no findings`;
  const parts: string[] = [];
  if (state.whole) parts.push(CONDITION_LABELS[state.whole.condition]);
  for (const [surface, mark] of Object.entries(state.surfaces)) parts.push(`${CONDITION_LABELS[mark.condition]} ${surface}`);
  return `Tooth ${tooth}, ${parts.join(", ")}`;
}

export function ToothSvg({
  tooth,
  x,
  y,
  labelY,
  state,
  selected,
  onSelect,
}: {
  tooth: number;
  x: number;
  y: number;
  labelY: number;
  state: ToothState | undefined;
  selected: boolean;
  onSelect: (tooth: number) => void;
}) {
  const sides = sideSurfaces(tooth);
  const whole = state?.whole;
  const missing = whole?.condition === "missing" || whole?.condition === "extraction";
  const poly = (pts: [number, number][], surface: Surface) => {
    const { fill, opacity } = fillFor(state?.surfaces[surface]);
    return (
      <polygon
        points={pts.map(([a, b]) => `${x + a},${y + b}`).join(" ")}
        fill={whole?.condition === "missing" ? "var(--surface-2)" : fill}
        fillOpacity={opacity}
        stroke="var(--border-strong)"
        strokeWidth={1}
        strokeDasharray={whole?.condition === "missing" ? "3 2" : undefined}
      />
    );
  };
  const centre = fillFor(state?.surfaces.O);
  const wholeColor = whole ? CONDITION_COLORS[whole.condition] : undefined;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={describeTooth(tooth, state)}
      aria-pressed={selected}
      onClick={() => onSelect(tooth)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(tooth);
        }
      }}
      className={cn("group cursor-pointer outline-none")}
    >
      <rect
        x={x - 4}
        y={Math.min(y, labelY - 12) - 4}
        width={S + 8}
        height={S + 26}
        rx={7}
        className={cn(
          "fill-transparent stroke-transparent group-hover:fill-hover group-focus-visible:stroke-ring",
          selected && "fill-primary-soft stroke-primary group-hover:fill-primary-soft",
        )}
        strokeWidth={1.5}
      />
      {poly([[0, 0], [S, 0], [24, 10], [10, 10]], sides.top)}
      {poly([[S, 0], [S, S], [24, 24], [24, 10]], sides.right)}
      {poly([[S, S], [0, S], [10, 24], [24, 24]], sides.bottom)}
      {poly([[0, S], [0, 0], [10, 10], [10, 24]], sides.left)}
      <rect
        x={x + 10}
        y={y + 10}
        width={14}
        height={14}
        fill={whole?.condition === "missing" ? "var(--surface-2)" : centre.fill}
        fillOpacity={centre.opacity}
        stroke="var(--border-strong)"
        strokeWidth={1}
      />
      {whole && !missing && (
        <rect
          x={x}
          y={y}
          width={S}
          height={S}
          rx={2}
          fill="none"
          stroke={wholeColor}
          strokeWidth={3}
          strokeDasharray={whole.status === "planned" ? "4 3" : undefined}
        />
      )}
      {missing && (
        <path
          d={`M${x + 4} ${y + 4}L${x + S - 4} ${y + S - 4}M${x + S - 4} ${y + 4}L${x + 4} ${y + S - 4}`}
          fill="none"
          stroke={wholeColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeDasharray={whole?.status === "planned" ? "4 3" : undefined}
        />
      )}
      <text
        x={x + S / 2}
        y={labelY}
        textAnchor="middle"
        className={cn("tabular fill-muted-foreground text-[11px]", selected && "fill-primary font-bold")}
      >
        {tooth}
      </text>
    </g>
  );
}

export const TOOTH_BOX = S;
