"use client";

import { Command } from "cmdk";
import { Search, TriangleAlert, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type QuickSearchResult, quickSearchAction } from "@/app/(app)/actions";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-hover aria-selected:bg-hover";

/** Ctrl+K patient search: live results as you type; Enter opens the highlighted patient. */
export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("__new");
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    const id = ++latest.current;
    const timer = setTimeout(
      async () => {
        if (!term) {
          setResults([]);
          setSelected("__new");
          setLoading(false);
          return;
        }
        setLoading(true);
        const rows = await quickSearchAction(term);
        // Ignore answers to older keystrokes.
        if (id === latest.current) {
          setResults(rows);
          // Highlight the best match so Enter opens it.
          setSelected(rows[0]?.id ?? "__all");
          setLoading(false);
        }
      },
      term ? 150 : 0,
    );
    return () => clearTimeout(timer);
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  const term = query.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search patients</DialogTitle>
        <Command shouldFilter={false} loop value={selected} onValueChange={setSelected} className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b px-4">
            <Search className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search by name, phone or patient code"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>
          </div>
          <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
            {term && !loading && results.length === 0 && (
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No patients match “{term}”.
              </Command.Empty>
            )}
            {results.length > 0 && (
              <Command.Group heading="Patients" className="text-xs [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-muted-foreground">
                {results.map((p) => (
                  <Command.Item key={p.id} value={p.id} onSelect={() => go(`/patients/${p.id}`)} className={itemClass}>
                    <InitialsAvatar name={p.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium text-heading">
                        <span className="truncate">{p.name}</span>
                        {p.hasAllergies && (
                          <TriangleAlert className="size-3.5 flex-none text-destructive" aria-label="Has allergies" />
                        )}
                      </span>
                      <span className="tabular block truncate text-xs text-muted-foreground">
                        {p.code}
                        {p.phone && ` · ${p.phone}`}
                      </span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group className="mt-1">
              {term && (
                <Command.Item
                  value="__all"
                  onSelect={() => go(`/patients?q=${encodeURIComponent(term)}`)}
                  className={itemClass}
                >
                  <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                  See all results for “{term}”
                </Command.Item>
              )}
              <Command.Item value="__new" onSelect={() => go("/patients/new")} className={itemClass}>
                <UserPlus className="size-4 text-muted-foreground" aria-hidden="true" />
                New patient
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="hidden gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground sm:flex">
            <span>
              <kbd className="rounded border px-1">↑</kbd> <kbd className="rounded border px-1">↓</kbd> to move
            </span>
            <span>
              <kbd className="rounded border px-1">Enter</kbd> to open
            </span>
            <span>
              <kbd className="rounded border px-1">Esc</kbd> to close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
