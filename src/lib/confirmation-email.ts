import { getSiteOrigin, safeNextPath } from "@/lib/site";

export type PurchaseConfirmation = {
  to: string;
  name: string | null;
  documentTitle: string;
  periodLabel: string;
  expiresAt: string | null;
  amountLabel: string | null;
  supportEmail: string | null;
  companyName: string;
  accessPath: string;
};

const SUBJECT = "Your Research Access is Confirmed";

export function assertConfirmationEmailConfigured() {
  if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM?.trim()) {
    throw new Error("Confirmation email is not configured. Set RESEND_API_KEY and RESEND_FROM.");
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function buildPurchaseConfirmation(input: PurchaseConfirmation) {
  const origin = getSiteOrigin();
  const next = safeNextPath(input.accessPath, "/papers");
  const accessUrl = `${origin}/login?next=${encodeURIComponent(next)}`;
  const greetingName = input.name?.trim() || "";
  const greeting = greetingName ? `Hello ${greetingName},` : "Hello,";
  const through = formatExpiry(input.expiresAt);
  const duration = through ? `${input.periodLabel}, through ${through}` : input.periodLabel;
  const support = input.supportEmail?.trim() || "";
  const company = input.companyName.trim() || "Dr. Prathiba Reddy";

  const lines = [
    greeting,
    "",
    "Your research access is confirmed.",
    "",
    `Account: ${input.to}`,
    `Document: ${input.documentTitle}`,
    `Duration: ${duration}`,
  ];
  if (input.amountLabel) lines.push(`Amount paid: ${input.amountLabel}`);
  lines.push(
    "",
    "A separate sign-in link is also on its way to this email.",
    "",
    "Access Your Research",
    accessUrl,
    "",
    support ? `Questions? Write to ${support}.` : "Questions? Contact the practice.",
    "",
    company,
  );
  const text = lines.join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#5c6758;font-size:14px;line-height:1.5;">${escapeHtml(label)}</td><td style="padding:8px 0 8px 16px;color:#1f2a1c;font-size:14px;line-height:1.5;">${escapeHtml(value)}</td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4efe4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf7ef;border:1px solid #ddd4c4;border-radius:16px;padding:32px;">
          <tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:#1f2a1c;">${escapeHtml(SUBJECT)}</td>
          </tr>
          <tr>
            <td style="padding-top:16px;font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#1f2a1c;">${escapeHtml(greeting)}</td>
          </tr>
          <tr>
            <td style="padding-top:8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#5c6758;">Your purchase is confirmed. This covers the document below and future research from the practice for your access period. A separate sign-in link is also on its way to this email.</td>
          </tr>
          <tr>
            <td style="padding-top:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
                ${row("Account", input.to)}
                ${row("Document", input.documentTitle)}
                ${row("Duration", duration)}
                ${input.amountLabel ? row("Amount paid", input.amountLabel) : ""}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;">
              <a href="${escapeHtml(accessUrl)}" style="display:inline-block;background:#3d6b3a;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px;">Access Your Research</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:16px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5c6758;">Or open this link:<br><a href="${escapeHtml(accessUrl)}" style="color:#3d6b3a;">${escapeHtml(accessUrl)}</a></td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#5c6758;">${
              support
                ? `Questions? Write to <a href="mailto:${escapeHtml(support)}" style="color:#3d6b3a;">${escapeHtml(support)}</a>.`
                : "Questions? Contact the practice."
            }</td>
          </tr>
          <tr>
            <td style="padding-top:20px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5c6758;">${escapeHtml(company)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: SUBJECT, html, text, replyTo: support || null };
}

export function formatCheckoutAmount(amountTotal: number | null, currency: string | null) {
  if (typeof amountTotal !== "number") return null;
  const code = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amountTotal / 100);
  } catch {
    return `${(amountTotal / 100).toFixed(0)} ${code}`;
  }
}

export async function sendPurchaseConfirmation(input: PurchaseConfirmation) {
  assertConfirmationEmailConfigured();
  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.RESEND_FROM!.trim();
  const message = buildPurchaseConfirmation(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo || undefined,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message && body.message.length < 180 && !body.message.includes("re_")) {
        detail = ` ${body.message}`;
      }
    } catch {
      detail = "";
    }
    throw new Error(`Confirmation email failed (${response.status}).${detail}`);
  }
}
