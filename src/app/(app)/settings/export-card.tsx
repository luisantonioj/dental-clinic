import { Download } from "lucide-react";
import { SectionCard } from "@/components/app/section-card";
import { Button } from "@/components/ui/button";

export function ExportCard({ month }: { month: string }) {
  return (
    <SectionCard
      title="Export your data"
      description="CSV files you can open in Excel or Google Sheets. Keep them somewhere safe: they contain patient health information."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a href="/api/export/patients">
            <Download aria-hidden="true" /> All patients
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/export/earnings?month=${month}`}>
            <Download aria-hidden="true" /> This month&apos;s earnings
          </a>
        </Button>
      </div>
    </SectionCard>
  );
}
