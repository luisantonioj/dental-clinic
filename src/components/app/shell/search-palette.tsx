"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Ctrl+K patient search. Enter opens the patient list filtered by the query. */
export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    onOpenChange(false);
    router.push(q ? `/patients?q=${encodeURIComponent(q)}` : "/patients");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search patients</DialogTitle>
        <form onSubmit={submit} className="flex items-center gap-2.5 px-4">
          <Search className="size-[18px] text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or patient code"
            aria-label="Search by name, phone or patient code"
            autoComplete="off"
            spellCheck={false}
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>
        </form>
      </DialogContent>
    </Dialog>
  );
}
