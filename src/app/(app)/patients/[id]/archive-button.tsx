"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setArchivedAction } from "../actions";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!archived && !window.confirm("Archive this patient? They'll be hidden from lists and search. Nothing is deleted.")) {
      return;
    }
    startTransition(async () => {
      const result = await setArchivedAction(id, !archived);
      if (result.ok) toast.success(archived ? "Patient restored." : "Patient archived.");
      else toast.error(result.error);
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} disabled={pending} className="text-muted-foreground">
      {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
      {archived ? "Restore patient" : "Archive patient"}
    </Button>
  );
}
