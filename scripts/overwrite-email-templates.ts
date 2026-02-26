import * as dotenv from 'dotenv';
import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel } from '@/database/models/emailtemplate.model';

dotenv.config();

type Locale = 'hu' | 'en' | 'de';
const locales: Locale[] = ['hu', 'en', 'de'];

type LocaleCopy = {
  subject: string;
  heading: string;
  paragraphs: string[];
  actions?: Array<{ label: string; urlVar: string }>;
};

type TemplateSchema = {
  key: string;
  name: string;
  description: string;
  category: 'tournament' | 'club' | 'feedback' | 'admin' | 'system' | 'auth';
  variables: string[];
  copy: Record<Locale, LocaleCopy>;
};

const englishLanguageRequest = 'Need this email in another language? Request it here: {languageRequestUrl}';

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtmlBody(copy: LocaleCopy) {
  const paragraphs = copy.paragraphs
    .map((paragraph) => `<p style="margin:0 0 14px 0;color:#334155;font-size:15px;line-height:1.65;">${paragraph}</p>`)
    .join('');

  const actions = (copy.actions || []).map((action, index) =>
    index === 0
      ? `<a href="{${action.urlVar}}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 18px;border-radius:10px;text-decoration:none;background:#b62441;color:#ffffff;font-size:14px;font-weight:700;border:1px solid #b62441;">${escapeHtml(action.label)}</a>`
      : `<a href="{${action.urlVar}}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 18px;border-radius:10px;text-decoration:none;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border:1px solid #cbd5e1;">${escapeHtml(action.label)}</a>`
  )
    .join('');

  const actionsBlock = actions
    ? `<div style="margin:8px 0 4px 0;">${actions}</div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;padding:14px 24px;border-bottom:3px solid #b62441;">
                <p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:0.08em;font-weight:700;text-transform:uppercase;">tDarts</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px 24px;">
                <h1 style="margin:0 0 14px 0;color:#0f172a;font-size:24px;line-height:1.3;font-weight:700;">${copy.heading}</h1>
                ${paragraphs}
                ${actionsBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px;">
                      <p style="margin:0;color:#475569;font-size:12px;line-height:1.55;">
                        Need this email in another language?
                        <a href="{languageRequestUrl}" style="color:#b62441;text-decoration:underline;font-weight:600;">Request it here</a>.
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0 0;color:#64748b;font-size:11px;line-height:1.5;">
                  This is an automated message from tDarts. Please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

function renderTextBody(copy: LocaleCopy) {
  const actions = (copy.actions || [])
    .map((action) => `${action.label}: {${action.urlVar}}`)
    .join('\n');

  const actionBlock = actions ? `\n\n${actions}` : '';

  return `${copy.heading}\n\n${copy.paragraphs.join('\n\n')}${actionBlock}\n\n${englishLanguageRequest}`.trim();
}

function ensureLanguageRequestVariable(vars: string[]) {
  return Array.from(new Set([...vars, 'languageRequestUrl']));
}

const templateSchemas: TemplateSchema[] = [
  {
    key: 'tournament_spot_available',
    name: 'Tournament Spot Available',
    description: 'Notification when a new tournament spot is open',
    category: 'tournament',
    variables: ['userName', 'tournamentName', 'tournamentCode', 'freeSpots', 'tournamentUrl', 'currentYear'],
    copy: {
      hu: {
        subject: 'Uj hely szabadult fel - {tournamentName}',
        heading: 'Szabad hely a tornan',
        paragraphs: [
          'Kedves {userName},',
          'A(z) {tournamentName} tornan uj hely szabadult fel.',
          'Jelenleg {freeSpots} hely erheto el. Torna kod: {tournamentCode}.',
        ],
        actions: [{ label: 'Torna megnyitasa', urlVar: 'tournamentUrl' }],
      },
      en: {
        subject: 'Spot available - {tournamentName}',
        heading: 'A tournament spot is available',
        paragraphs: [
          'Hi {userName},',
          'A spot has opened up for {tournamentName}.',
          'Current free spots: {freeSpots}. Tournament code: {tournamentCode}.',
        ],
        actions: [{ label: 'Open tournament', urlVar: 'tournamentUrl' }],
      },
      de: {
        subject: 'Freier Platz - {tournamentName}',
        heading: 'Ein Turnierplatz ist frei',
        paragraphs: [
          'Hallo {userName},',
          'Fuer {tournamentName} ist ein Platz frei geworden.',
          'Verfuegbare Plaetze: {freeSpots}. Turniercode: {tournamentCode}.',
        ],
        actions: [{ label: 'Turnier oeffnen', urlVar: 'tournamentUrl' }],
      },
    },
  },
  {
    key: 'club_registration',
    name: 'Club Registration Welcome',
    description: 'Welcome email after club registration',
    category: 'club',
    variables: ['clubName', 'email', 'password', 'loginUrl', 'clubUrl', 'profileUrl', 'howItWorksUrl', 'currentYear'],
    copy: {
      hu: {
        subject: 'Klub regisztracio sikeres - {clubName}',
        heading: 'Udvozlunk a tDarts rendszerben',
        paragraphs: [
          'Kedves {clubName},',
          'A klub fiok sikeresen letrejott.',
          'Belepesi adatok: {email} / {password}.',
        ],
        actions: [
          { label: 'Belepes', urlVar: 'loginUrl' },
          { label: 'Klub dashboard', urlVar: 'clubUrl' },
        ],
      },
      en: {
        subject: 'Club registration successful - {clubName}',
        heading: 'Welcome to tDarts',
        paragraphs: [
          'Hi {clubName},',
          'Your club account has been created successfully.',
          'Login credentials: {email} / {password}.',
        ],
        actions: [
          { label: 'Sign in', urlVar: 'loginUrl' },
          { label: 'Club dashboard', urlVar: 'clubUrl' },
        ],
      },
      de: {
        subject: 'Vereinsregistrierung erfolgreich - {clubName}',
        heading: 'Willkommen bei tDarts',
        paragraphs: [
          'Hallo {clubName},',
          'Ihr Vereinskonto wurde erfolgreich erstellt.',
          'Anmeldedaten: {email} / {password}.',
        ],
        actions: [
          { label: 'Anmelden', urlVar: 'loginUrl' },
          { label: 'Vereins-Dashboard', urlVar: 'clubUrl' },
        ],
      },
    },
  },
  {
    key: 'club_verification',
    name: 'Club Verification',
    description: 'Confirmation of verified club',
    category: 'club',
    variables: ['clubName', 'clubUrl', 'currentYear'],
    copy: {
      hu: {
        subject: 'Klub verifikacio sikeres - {clubName}',
        heading: 'A klub verifikalva lett',
        paragraphs: [
          'Kedves {clubName},',
          'A klub verifikacio sikeres.',
          'Mostantol OAC verifikalt versenyek is kezelhetok.',
        ],
        actions: [{ label: 'Klub dashboard', urlVar: 'clubUrl' }],
      },
      en: {
        subject: 'Club verification successful - {clubName}',
        heading: 'Your club is now verified',
        paragraphs: [
          'Hi {clubName},',
          'Club verification is complete.',
          'You can now manage OAC verified competitions.',
        ],
        actions: [{ label: 'Club dashboard', urlVar: 'clubUrl' }],
      },
      de: {
        subject: 'Vereinsverifizierung erfolgreich - {clubName}',
        heading: 'Ihr Verein ist jetzt verifiziert',
        paragraphs: [
          'Hallo {clubName},',
          'Die Verifizierung ist abgeschlossen.',
          'Sie koennen jetzt OAC-verifizierte Turniere verwalten.',
        ],
        actions: [{ label: 'Vereins-Dashboard', urlVar: 'clubUrl' }],
      },
    },
  },
  {
    key: 'player_tournament_notification',
    name: 'Player Tournament Notification',
    description: 'Custom player notification from tournament organizers',
    category: 'tournament',
    variables: ['playerName', 'tournamentName', 'customSubject', 'customMessage', 'language'],
    copy: {
      hu: {
        subject: '[{tournamentName}] {customSubject}',
        heading: '{customSubject}',
        paragraphs: ['Kedves {playerName},', 'A(z) {tournamentName} tornaval kapcsolatban:', '{customMessage}'],
      },
      en: {
        subject: '[{tournamentName}] {customSubject}',
        heading: '{customSubject}',
        paragraphs: ['Hi {playerName},', 'Regarding tournament {tournamentName}:', '{customMessage}'],
      },
      de: {
        subject: '[{tournamentName}] {customSubject}',
        heading: '{customSubject}',
        paragraphs: ['Hallo {playerName},', 'Bezuglich des Turniers {tournamentName}:', '{customMessage}'],
      },
    },
  },
  {
    key: 'admin_user_notification',
    name: 'Admin to User Notification',
    description: 'Manual message sent by admin',
    category: 'admin',
    variables: ['userName', 'customSubject', 'customMessage', 'language'],
    copy: {
      hu: {
        subject: '[tDarts Admin] {customSubject}',
        heading: '{customSubject}',
        paragraphs: ['Kedves {userName},', '{customMessage}'],
      },
      en: {
        subject: '[tDarts Admin] {customSubject}',
        heading: '{customSubject}',
        paragraphs: ['Hi {userName},', '{customMessage}'],
      },
      de: {
        subject: '[tDarts Admin] {customSubject}',
        heading: '{customSubject}',
        paragraphs: ['Hallo {userName},', '{customMessage}'],
      },
    },
  },
  {
    key: 'feedback_confirmation',
    name: 'Feedback Confirmation',
    description: 'Confirmation after feedback submission',
    category: 'feedback',
    variables: ['feedbackCategory', 'feedbackTitle', 'feedbackDescription', 'feedbackId', 'currentDate'],
    copy: {
      hu: {
        subject: 'Visszajelzes rogzitve - {feedbackTitle}',
        heading: 'Koszonjuk a visszajelzest',
        paragraphs: [
          'A visszajelzest sikeresen rogzitettuk.',
          'Kategoria: {feedbackCategory}',
          'Azonosito: {feedbackId}',
        ],
      },
      en: {
        subject: 'Feedback received - {feedbackTitle}',
        heading: 'Thank you for your feedback',
        paragraphs: ['Your feedback has been recorded successfully.', 'Category: {feedbackCategory}', 'Reference ID: {feedbackId}'],
      },
      de: {
        subject: 'Feedback erhalten - {feedbackTitle}',
        heading: 'Danke fuer Ihr Feedback',
        paragraphs: ['Ihr Feedback wurde erfolgreich gespeichert.', 'Kategorie: {feedbackCategory}', 'Referenz: {feedbackId}'],
      },
    },
  },
  {
    key: 'feedback_admin_reply',
    name: 'Feedback Admin Reply',
    description: 'Reply from admin on feedback thread',
    category: 'feedback',
    variables: ['customSubject', 'customMessage', 'feedbackId', 'feedbackTitle', 'feedbackStatus', 'feedbackResolution', 'adminNotes'],
    copy: {
      hu: {
        subject: '{customSubject}',
        heading: 'Frissites a visszajelzesrol',
        paragraphs: ['{customMessage}', 'Azonosito: {feedbackId}'],
      },
      en: {
        subject: '{customSubject}',
        heading: 'Feedback update',
        paragraphs: ['{customMessage}', 'Reference ID: {feedbackId}'],
      },
      de: {
        subject: '{customSubject}',
        heading: 'Aktualisierung zu Ihrem Feedback',
        paragraphs: ['{customMessage}', 'Referenz: {feedbackId}'],
      },
    },
  },
  {
    key: 'tournament_reminder',
    name: 'Tournament Day Reminder',
    description: 'Reminder on tournament day',
    category: 'tournament',
    variables: ['userName', 'tournamentName', 'tournamentDate', 'tournamentUrl', 'currentYear'],
    copy: {
      hu: {
        subject: 'Mai torna emlekezteto - {tournamentName}',
        heading: 'Ma versenynap van',
        paragraphs: ['Kedves {userName},', 'A(z) {tournamentName} verseny ma esedekes.', 'Idopont: {tournamentDate}'],
        actions: [{ label: 'Torna megnyitasa', urlVar: 'tournamentUrl' }],
      },
      en: {
        subject: 'Tournament reminder - {tournamentName}',
        heading: 'Tournament day reminder',
        paragraphs: ['Hi {userName},', '{tournamentName} takes place today.', 'Time: {tournamentDate}'],
        actions: [{ label: 'Open tournament', urlVar: 'tournamentUrl' }],
      },
      de: {
        subject: 'Turniererinnerung - {tournamentName}',
        heading: 'Erinnerung an den Turniertag',
        paragraphs: ['Hallo {userName},', '{tournamentName} findet heute statt.', 'Zeit: {tournamentDate}'],
        actions: [{ label: 'Turnier oeffnen', urlVar: 'tournamentUrl' }],
      },
    },
  },
  {
    key: 'email_verification',
    name: 'Email Verification',
    description: 'Verification code email',
    category: 'auth',
    variables: ['userName', 'verificationCode', 'currentYear'],
    copy: {
      hu: {
        subject: 'Email ellenorzo kod',
        heading: 'Email megerosites',
        paragraphs: ['Kedves {userName},', 'Hasznald ezt a kodot az email megerositesehez: {verificationCode}'],
      },
      en: {
        subject: 'Email verification code',
        heading: 'Verify your email',
        paragraphs: ['Hi {userName},', 'Use this code to verify your email: {verificationCode}'],
      },
      de: {
        subject: 'E-Mail Verifizierungscode',
        heading: 'E-Mail bestaetigen',
        paragraphs: ['Hallo {userName},', 'Verwenden Sie diesen Code zur Bestaetigung: {verificationCode}'],
      },
    },
  },
  {
    key: 'password_reset',
    name: 'Password Reset',
    description: 'Password reset code email',
    category: 'auth',
    variables: ['userName', 'resetCode', 'currentYear'],
    copy: {
      hu: {
        subject: 'Jelszo visszaallito kod',
        heading: 'Jelszo visszaallitas',
        paragraphs: ['Kedves {userName},', 'Hasznald ezt a kodot a jelszo visszaallitasahoz: {resetCode}'],
      },
      en: {
        subject: 'Password reset code',
        heading: 'Reset your password',
        paragraphs: ['Hi {userName},', 'Use this code to reset your password: {resetCode}'],
      },
      de: {
        subject: 'Passwort-Zuruecksetzen Code',
        heading: 'Passwort zuruecksetzen',
        paragraphs: ['Hallo {userName},', 'Verwenden Sie diesen Code: {resetCode}'],
      },
    },
  },
  {
    key: 'team_invitation',
    name: 'Team Invitation',
    description: 'Invitation to join a team',
    category: 'tournament',
    variables: ['inviterName', 'inviteeName', 'teamName', 'tournamentName', 'tournamentUrl', 'acceptUrl', 'declineUrl', 'currentYear'],
    copy: {
      hu: {
        subject: '{inviterName} meghivott egy csapatba - {tournamentName}',
        heading: 'Csapat meghivo',
        paragraphs: ['Kedves {inviteeName},', '{inviterName} meghivott a(z) {teamName} csapatba ({tournamentName}).'],
        actions: [
          { label: 'Elfogadas', urlVar: 'acceptUrl' },
          { label: 'Elutasitas', urlVar: 'declineUrl' },
        ],
      },
      en: {
        subject: '{inviterName} invited you to a team - {tournamentName}',
        heading: 'Team invitation',
        paragraphs: ['Hi {inviteeName},', '{inviterName} invited you to join {teamName} ({tournamentName}).'],
        actions: [
          { label: 'Accept', urlVar: 'acceptUrl' },
          { label: 'Decline', urlVar: 'declineUrl' },
        ],
      },
      de: {
        subject: '{inviterName} hat Sie ins Team eingeladen - {tournamentName}',
        heading: 'Team-Einladung',
        paragraphs: ['Hallo {inviteeName},', '{inviterName} hat Sie in das Team {teamName} ({tournamentName}) eingeladen.'],
        actions: [
          { label: 'Annehmen', urlVar: 'acceptUrl' },
          { label: 'Ablehnen', urlVar: 'declineUrl' },
        ],
      },
    },
  },
  {
    key: 'team_invitation_accepted',
    name: 'Team Invitation Accepted',
    description: 'Invitation accepted message',
    category: 'tournament',
    variables: ['inviterName', 'accepterName', 'teamName', 'tournamentName', 'tournamentUrl', 'currentYear'],
    copy: {
      hu: {
        subject: '{accepterName} elfogadta a csapatmeghivot',
        heading: 'Meghivo elfogadva',
        paragraphs: ['Kedves {inviterName},', '{accepterName} elfogadta a meghivast a(z) {teamName} csapatba.'],
        actions: [{ label: 'Torna megnyitasa', urlVar: 'tournamentUrl' }],
      },
      en: {
        subject: '{accepterName} accepted your team invite',
        heading: 'Invitation accepted',
        paragraphs: ['Hi {inviterName},', '{accepterName} accepted your invite to {teamName}.'],
        actions: [{ label: 'Open tournament', urlVar: 'tournamentUrl' }],
      },
      de: {
        subject: '{accepterName} hat die Team-Einladung angenommen',
        heading: 'Einladung angenommen',
        paragraphs: ['Hallo {inviterName},', '{accepterName} hat Ihre Einladung fuer {teamName} angenommen.'],
        actions: [{ label: 'Turnier oeffnen', urlVar: 'tournamentUrl' }],
      },
    },
  },
  {
    key: 'team_invitation_declined',
    name: 'Team Invitation Declined',
    description: 'Invitation declined message',
    category: 'tournament',
    variables: ['inviterName', 'declinerName', 'teamName', 'tournamentName', 'currentYear'],
    copy: {
      hu: {
        subject: '{declinerName} elutasitotta a csapatmeghivot',
        heading: 'Meghivo elutasitva',
        paragraphs: ['Kedves {inviterName},', '{declinerName} elutasitotta a meghivast a(z) {teamName} csapatba.'],
      },
      en: {
        subject: '{declinerName} declined your team invite',
        heading: 'Invitation declined',
        paragraphs: ['Hi {inviterName},', '{declinerName} declined your invite to {teamName}.'],
      },
      de: {
        subject: '{declinerName} hat die Team-Einladung abgelehnt',
        heading: 'Einladung abgelehnt',
        paragraphs: ['Hallo {inviterName},', '{declinerName} hat Ihre Einladung fuer {teamName} abgelehnt.'],
      },
    },
  },
];

const schemaByKey = new Map(templateSchemas.map((schema) => [schema.key, schema]));

type ExistingTemplate = {
  key: string;
  locale?: Locale;
  name?: string;
  description?: string;
  category?: TemplateSchema['category'];
  variables?: string[];
  isDefault?: boolean;
  isActive?: boolean;
};

type BuiltTemplateDoc = {
  key: string;
  locale: Locale;
  name: string;
  description: string;
  category: TemplateSchema['category'];
  subject: string;
  textContent: string;
  htmlContent: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  lastModified: Date;
};

function buildTemplateDoc(key: string, templates: ExistingTemplate[], locale: Locale): BuiltTemplateDoc {
  const base = templates.find((template) => template.locale === 'hu') || templates[0];
  const existing = templates.find((template) => template.locale === locale);
  const schema = schemaByKey.get(key);

  const name = existing?.name || schema?.name || base?.name || `${key} (${locale.toUpperCase()})`;
  const description = existing?.description || schema?.description || base?.description || `Auto standardized template for ${key}`;
  const category = existing?.category || schema?.category || base?.category || 'system';
  const isDefault = typeof existing?.isDefault === 'boolean' ? existing.isDefault : Boolean(base?.isDefault);
  const isActive = typeof existing?.isActive === 'boolean' ? existing.isActive : true;

  const localeCopy = schema?.copy[locale];
  const subject = localeCopy?.subject || `${name} - ${locale.toUpperCase()}`;
  const htmlContent = localeCopy
    ? renderHtmlBody(localeCopy)
    : renderHtmlBody({
        subject,
        heading: name,
        paragraphs: [
          locale === 'en'
            ? 'This is a standardized tDarts email template.'
            : locale === 'de'
              ? 'Dies ist eine standardisierte tDarts E-Mail-Vorlage.'
              : 'Ez egy standardizalt tDarts email sablon.',
        ],
      });
  const textContent = localeCopy ? renderTextBody(localeCopy) : `${name}\n\n${englishLanguageRequest}`;
  const baseVariables = Array.isArray(existing?.variables)
    ? existing.variables
    : Array.isArray(schema?.variables)
      ? schema.variables
      : Array.isArray(base?.variables)
        ? base.variables
        : [];
  const variables = ensureLanguageRequestVariable(baseVariables);

  return {
    key,
    locale,
    name,
    description,
    category,
    subject,
    textContent,
    htmlContent,
    variables,
    isDefault,
    isActive,
    lastModified: new Date(),
  };
}

async function ensureLocaleIndexes(dryRun: boolean) {
  const indexes = await EmailTemplateModel.collection.indexes();
  const legacyUniqueKeyIndex = indexes.find((index: any) => {
    const keys = Object.keys(index.key || {});
    return index.unique === true && keys.length === 1 && keys[0] === 'key';
  });

  if (legacyUniqueKeyIndex) {
    const legacyIndexName = String(legacyUniqueKeyIndex.name || 'key_1');
    if (dryRun) {
      console.log(`[dry-run] Found legacy unique index '${legacyIndexName}' on key only. It will be dropped in --apply mode.`);
    } else {
      console.log(`[apply] Dropping legacy unique index '${legacyIndexName}'`);
      await EmailTemplateModel.collection.dropIndex(legacyIndexName);
    }
  }

  const compoundKeyLocale = indexes.find((index: any) => {
    const key = index.key || {};
    return key.key === 1 && key.locale === 1 && index.unique === true;
  });

  if (!compoundKeyLocale) {
    if (dryRun) {
      console.log("[dry-run] Missing unique compound index { key: 1, locale: 1 }. It will be created in --apply mode.");
    } else {
      console.log("[apply] Creating unique compound index { key: 1, locale: 1 }");
      await EmailTemplateModel.collection.createIndex({ key: 1, locale: 1 }, { unique: true });
    }
  }
}

async function run() {
  const shouldApply = process.argv.includes('--apply');
  const dryRun = !shouldApply;
  const safeUpsert = process.argv.includes('--safe-upsert');
  const replaceAll = shouldApply && !safeUpsert;

  await connectMongo();
  await ensureLocaleIndexes(dryRun);
  const allTemplates = (await EmailTemplateModel.find().lean()) as ExistingTemplate[];
  const byKey = new Map<string, ExistingTemplate[]>();

  for (const template of allTemplates) {
    const key = template.key;
    const group = byKey.get(key) || [];
    group.push(template);
    byKey.set(key, group);
  }

  const allKeys = Array.from(new Set([...Array.from(byKey.keys()), ...templateSchemas.map((schema) => schema.key)]));
  const builtDocs: BuiltTemplateDoc[] = [];

  for (const key of allKeys) {
    const templates = byKey.get(key) || [];

    for (const locale of locales) {
      builtDocs.push(buildTemplateDoc(key, templates, locale));
    }
  }

  if (dryRun) {
    for (const doc of builtDocs) {
      console.log(`[dry-run] ${doc.key} / ${doc.locale} -> ${replaceAll ? 'replace-all insert' : 'overwrite'}`);
    }
    console.log(`Completed. Mode=dry-run, writes=${builtDocs.length}, strategy=${replaceAll ? 'replace-all' : 'upsert'}`);
    return;
  }

  if (replaceAll) {
    console.log('[apply] Replacing all email templates: delete all -> insert rebuilt docs');
    await EmailTemplateModel.deleteMany({});
    await EmailTemplateModel.insertMany(builtDocs, { ordered: true });
    console.log(`[apply] Inserted ${builtDocs.length} standardized templates`);
  } else {
    for (const doc of builtDocs) {
      await EmailTemplateModel.updateOne(
        { key: doc.key, locale: doc.locale },
        {
          $set: {
            ...doc,
          },
        },
        { upsert: true }
      );
      console.log(`[apply] ${doc.key} / ${doc.locale} overwritten`);
    }
  }

  console.log(`Completed. Mode=apply, writes=${builtDocs.length}, strategy=${replaceAll ? 'replace-all' : 'upsert'}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('overwrite-email-templates failed:', error);
    process.exit(1);
  });
