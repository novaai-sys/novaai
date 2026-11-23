import "server-only";

/**
 * Sends one email with Resend (https://resend.com), POST /emails.
 * RESEND_API_KEY is the secret key; NOTIFY_EMAIL_FROM the sender, e.g.
 * "NovaAI <calls@getnovaai.app>" on a domain verified in Resend.
 */

export class EmailError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
  get retryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export const emailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_FROM);

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!key || !from) throw new EmailError("RESEND_API_KEY or NOTIFY_EMAIL_FROM is not set", 400);
  const base = (process.env.RESEND_API_BASE_URL || "https://api.resend.com").replace(/\/$/, "");

  let res: Response;
  try {
    res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    throw new EmailError(`Resend unreachable: ${(e as Error).message}`, 0);
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok) throw new EmailError(json.message || json.name || `HTTP ${res.status}`, res.status);
  return json.id ?? "";
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The owner's notification email: plain layout that reads well in any client. */
export function ownerEmail(d: {
  business: string;
  headline: string;
  rows: [string, string][];
  summary: string;
  url: string;
}) {
  const rows = d.rows.filter(([, v]) => v);
  const text = [
    d.headline,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(d.summary ? ["", "Summary:", d.summary] : []),
    "",
    `Listen to the call and read the transcript: ${d.url}`,
    "",
    `NovaAI answered this call for ${d.business}.`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14161a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:20px;font-weight:600;line-height:1.3;padding-bottom:16px">${esc(d.headline)}</td></tr>
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.45"><span style="color:#6b7280">${esc(k)}</span><br>${esc(v)}</td></tr>`).join("\n")}
${d.summary ? `<tr><td style="padding:16px 0 0;font-size:15px;line-height:1.55"><span style="color:#6b7280">Summary</span><br>${esc(d.summary)}</td></tr>` : ""}
<tr><td style="padding-top:24px"><a href="${esc(d.url)}" style="display:inline-block;background:#14161a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px">Listen to the call</a></td></tr>
<tr><td style="padding-top:24px;font-size:13px;color:#6b7280">NovaAI answered this call for ${esc(d.business)}. Change these emails in Call settings.</td></tr>
</table></td></tr></table></body></html>`;

  return { text, html };
}
