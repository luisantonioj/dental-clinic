import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pesoInWords } from "@/lib/amount-words";
import { formatDate, formatPeso } from "@/lib/format";
import { METHOD_LABELS } from "@/lib/validation/billing";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { getReceipt } from "@/server/data/billing";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  const { id } = await params;
  const actor = await requireUser();
  const receipt = await getReceipt(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { payment: p, workplace } = receipt;

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href={`/patients/${p.patientId}/billing`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-heading"
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Billing
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[560px] rounded-xl border bg-white p-8 text-slate-900 shadow-card print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-4 text-center">
          <h1 className="text-lg font-bold text-slate-900">{workplace.name}</h1>
          {workplace.address && <p className="text-sm text-slate-600">{workplace.address}</p>}
          {workplace.phone && <p className="text-sm text-slate-600">{workplace.phone}</p>}
          <p className="mt-2 text-sm text-slate-700">
            {receipt.dentistName}
            {receipt.dentistPrc && ` · PRC Lic. No. ${receipt.dentistPrc}`}
          </p>
        </header>
        <div className="flex items-baseline justify-between py-4">
          <h2 className="text-sm font-bold tracking-wider text-slate-900 uppercase">Acknowledgment receipt</h2>
          <span className="tabular text-sm font-semibold">{receipt.receiptNo}</span>
        </div>
        {p.voidedAt && (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-700 uppercase">
            Void · {p.voidReason}
          </p>
        )}
        <dl className="grid grid-cols-[130px_1fr] gap-y-2.5 text-sm">
          <dt className="text-slate-500">Date</dt>
          <dd className="tabular">{formatDate(p.date)}</dd>
          <dt className="text-slate-500">Received from</dt>
          <dd className="font-semibold">
            {receipt.patientName} <span className="tabular font-normal text-slate-500">({receipt.patientCode})</span>
          </dd>
          <dt className="text-slate-500">Amount</dt>
          <dd className="tabular text-lg font-bold">{formatPeso(p.amount)}</dd>
          <dt className="text-slate-500">In words</dt>
          <dd>{pesoInWords(p.amount)}</dd>
          <dt className="text-slate-500">Payment method</dt>
          <dd>
            {METHOD_LABELS[p.method]}
            {p.reference && ` · Ref ${p.reference}`}
          </dd>
          {p.notes && (
            <>
              <dt className="text-slate-500">Notes</dt>
              <dd>{p.notes}</dd>
            </>
          )}
        </dl>
        <footer className="mt-12 flex items-end justify-between gap-6 text-sm">
          <p className="max-w-[220px] text-xs text-slate-500">This acknowledgment receipt is not an official receipt.</p>
          <div className="w-48 text-center">
            <div className="border-t border-slate-400 pt-1 text-slate-700">{receipt.dentistName}</div>
          </div>
        </footer>
      </article>
    </>
  );
}
