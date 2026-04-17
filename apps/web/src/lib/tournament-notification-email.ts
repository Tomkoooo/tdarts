import { renderMinimalEmailLayout, textToEmailHtml } from "@/lib/email-layout";

type NotificationEmailLanguage = "hu" | "en";

interface BuildTournamentNotificationEmailHtmlInput {
  subject: string;
  message: string;
  tournamentName?: string;
  language: NotificationEmailLanguage;
}

export function buildTournamentNotificationEmailHtml({
  subject,
  message,
  tournamentName,
  language,
}: BuildTournamentNotificationEmailHtmlInput): string {
  const tournamentLabel =
    language === "hu" ? "Torna" : "Tournament";
  const tournamentLine = tournamentName
    ? `<p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;">${tournamentLabel}: ${textToEmailHtml(tournamentName)}</p>`
    : "";

  return renderMinimalEmailLayout({
    locale: language,
    title: subject,
    heading: subject,
    bodyHtml: `<p style="margin:0;white-space:normal;">${textToEmailHtml(message)}</p>${tournamentLine}`,
    preheader: subject,
  });
}
