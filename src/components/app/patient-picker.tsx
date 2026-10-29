"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type QuickSearchResult, quickSearchAction } from "@/app/(app)/actions";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { Input } from "@/components/ui/input";

export type PickedPatient = { id: string; name: string };

/** Search-as-you-type patient field. Submits the chosen id as `name`. */
export function PatientPicker({
  id,
  name,
  defaultValue,
  invalid,
}: {
  id: string;
  name: string;
  defaultValue?: PickedPatient | null;
  invalid?: boolean;
}) {
  const [picked, setPicked] = useState<PickedPatient | null>(defaultValue ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickSearchResult[]>([]);
  const [active, setActive] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    const n = ++latest.current;
    const t = setTimeout(async () => {
      const rows = term ? await quickSearchAction(term) : [];
      if (n === latest.current) {
        setResults(rows);
        setActive(0);
      }
    }, term ? 150 : 0);
    return () => clearTimeout(t);
  }, [query]);

  if (picked) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2 pointer-coarse:h-11 dark:bg-surface-2">
        <input type="hidden" name={name} value={picked.id} />
        <InitialsAvatar name={picked.name} className="size-6 text-[10px]" />
        <span className="flex-1 truncate text-sm font-medium text-heading">{picked.name}</span>
        <button
          type="button"
          onClick={() => setPicked(null)}
          aria-label="Change patient"
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-hover"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  function choose(r: QuickSearchResult) {
    setPicked({ id: r.id, name: r.name });
    setQuery("");
    setResults([]);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value="" />
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id={id}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active]);
          }
        }}
        placeholder="Search name, phone or P-code"
        autoComplete="off"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={`${id}-list`}
        aria-invalid={invalid || undefined}
        className="pl-9"
      />
      {results.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border bg-popover p-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${i === active ? "bg-hover" : ""}`}
              >
                <InitialsAvatar name={r.name} className="size-6 text-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-heading">{r.name}</span>
                  <span className="tabular block truncate text-xs text-muted-foreground">
                    {r.code}
                    {r.phone && ` · ${r.phone}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
