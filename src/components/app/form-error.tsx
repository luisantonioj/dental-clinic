import { CircleAlert } from "lucide-react";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      {message}
    </p>
  );
}
