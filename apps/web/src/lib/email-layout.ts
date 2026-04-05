export type EmailLocale = 'hu' | 'en' | 'de';

export function normalizeEmailLocale(
  locale?: string | null,
  fallback: EmailLocale = 'hu'
): EmailLocale {
  if (!locale) return fallback;
  const normalized = String(locale).toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('de')) return 'de';
  return 'hu';
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToEmailHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export function renderMinimalEmailLayout(params: {
  locale?: string | null;
  title: string;
  heading?: string;
  bodyHtml: string;
  preheader?: string;
}) {
  const locale = normalizeEmailLocale(params.locale);
  const footer =
    locale === 'hu'
      ? `Ezt az üzenetet a tDarts rendszer küldte automatikusan.`
      : `This message was sent automatically by the tDarts platform.`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader || params.title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f4f4f5;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#991b1b;padding:20px 24px;color:#ffffff;font-weight:700;font-size:18px;letter-spacing:.04em;">
              tDarts
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${params.heading ? `<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;color:#111827;">${escapeHtml(params.heading)}</h1>` : ''}
              <div style="font-size:15px;line-height:1.6;color:#374151;">${params.bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:14px 24px;font-size:12px;line-height:1.4;color:#6b7280;">
              ${footer}<br />© ${new Date().getFullYear()} tDarts
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
