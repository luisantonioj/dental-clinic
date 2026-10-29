import { Lock } from "lucide-react";
import { Brand } from "@/components/app/logo";

const features = ["Instant search", "Dental chart", "X-rays", "Email reminders"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(120%_90%_at_0%_0%,#14b8a6_0%,#0f766e_45%,#134e4a_100%)] px-12 py-10 text-cyan-50 lg:flex">
        <Brand inverted />
        <div className="relative z-10">
          <h2 className="max-w-[460px] text-[34px] leading-tight font-semibold tracking-tight text-white">
            Every patient, every tooth, one search away.
          </h2>
          <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-cyan-50/80">
            Patient records, dental charts, X-rays, appointments and earnings for your practice, private to your
            account.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {features.map((f) => (
              <span key={f} className="rounded-full bg-white/12 px-3 py-1.5 text-[13px]">
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-[13px] text-cyan-50/75">
          <Lock className="size-4" aria-hidden="true" />
          Protected under the Data Privacy Act of 2012
        </div>
        <div className="pointer-events-none absolute -right-32 -bottom-32 size-[420px] rounded-full border-[60px] border-white/6" />
      </aside>
      <main className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-[380px]">
          <Brand className="mb-6 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
