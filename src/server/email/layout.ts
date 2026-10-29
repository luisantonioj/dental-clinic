const escapeMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => escapeMap[c]);
}

/** Wraps email body HTML in a simple, client-safe layout (inline styles only). */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0d9488">DentalKeep</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
</table></td></tr></table></body></html>`;
}
