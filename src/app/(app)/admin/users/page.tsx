import type { Metadata } from "next";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { listAccounts } from "@/server/data/users";
import { AccountActions, NewDentistButton } from "./account-dialogs";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const actor = await requireAdmin();
  const accounts = await listAccounts(actor);

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Each dentist signs in with their own account and only sees their own patients."
        actions={<NewDentistButton />}
      />
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead className="hidden lg:table-cell">PRC license</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={a.name} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-heading">{a.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden capitalize md:table-cell">{a.role}</TableCell>
                <TableCell className="tabular hidden lg:table-cell">{a.prcLicense ?? "—"}</TableCell>
                <TableCell className="tabular hidden sm:table-cell">{formatDate(a.createdAt)}</TableCell>
                <TableCell>
                  {a.banned ? (
                    <Badge className="bg-destructive-soft text-destructive">Disabled</Badge>
                  ) : (
                    <Badge className="bg-success-soft text-success">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {a.id !== actor.id && <AccountActions id={a.id} name={a.name} disabled={a.banned} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
