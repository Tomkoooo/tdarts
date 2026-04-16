/**
 * Update auth-related email templates in MongoDB (add magic link placeholders + magic_login).
 * Does not wipe other templates (unlike seed-email-templates).
 *
 * Usage:
 *   npx tsx src/database/scripts/migrate-auth-email-templates.ts
 *   npx tsx src/database/scripts/migrate-auth-email-templates.ts --dry-run
 */
import { connectMongo, EmailTemplateModel } from '@tdarts/core';

const dryRun = process.argv.includes('--dry-run');

const patches: Array<{
  key: string;
  locale: string;
  set: Record<string, unknown>;
}> = [
  {
    key: 'email_verification',
    locale: 'hu',
    set: {
      variables: ['userName', 'verificationCode', 'verificationLink', 'expiresInMinutes', 'currentYear'],
      textContent: `Kedves {userName}!

Köszönjük a regisztrációt a TDarts-ban! Kérjük, erősítse meg email címét az alábbi verifikációs kóddal:

{verificationCode}

Vagy nyisd meg ezt a linket (érvényes {expiresInMinutes} percig):
{verificationLink}

Adja meg a kódot a TDarts weboldalon az email cím megerősítéséhez.

Üdvözlettel,
TDarts Csapat`,
      htmlContent: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;background:#0c1414;color:#f2f2f2;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#1a2424;padding:24px;border-radius:8px;border:1px solid #333;">
<div style="text-align:center;font-size:28px;color:#cc3333;">🎯 TDarts</div>
<h2>Email megerősítés</h2>
<p>Kedves {userName}!</p>
<p>Használd a 6 számjegyű kódot, vagy erősítsd meg egy kattintással.</p>
<div style="font-size:32px;font-weight:bold;text-align:center;letter-spacing:6px;color:#cc3333;margin:24px 0;">{verificationCode}</div>
<p><a href="{verificationLink}" style="color:#cc3333;">Email megerősítése</a> (érvényes {expiresInMinutes} percig).</p>
<p style="color:#888;font-size:14px;">© {currentYear} tDarts</p>
</div></body></html>`,
    },
  },
  {
    key: 'password_reset',
    locale: 'hu',
    set: {
      variables: ['userName', 'resetCode', 'resetLink', 'expiresInMinutes', 'currentYear'],
      textContent: `Kedves {userName}!

Jelszó visszaállítást kezdeményeztek a fiókjához. Kérjük, használja az alábbi kódot:

{resetCode}

Vagy nyisd meg ezt a linket (érvényes {expiresInMinutes} percig):
{resetLink}

Üdvözlettel,
TDarts Csapat`,
      htmlContent: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;background:#0c1414;color:#f2f2f2;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#1a2424;padding:24px;border-radius:8px;border:1px solid #333;">
<div style="text-align:center;font-size:28px;color:#cc3333;">🎯 TDarts</div>
<h2>Jelszó visszaállítás</h2>
<p>Kedves {userName}!</p>
<div style="font-size:32px;font-weight:bold;text-align:center;letter-spacing:6px;color:#cc3333;margin:24px 0;">{resetCode}</div>
<p><a href="{resetLink}" style="color:#cc3333;">Jelszó visszaállítása</a> (érvényes {expiresInMinutes} percig).</p>
<p style="color:#888;font-size:14px;">© {currentYear} tDarts</p>
</div></body></html>`,
    },
  },
  {
    key: 'magic_login',
    locale: 'hu',
    set: {
      name: 'Magic login',
      description: 'Passwordless sign-in link',
      category: 'auth',
      subject: '🎯 TDarts bejelentkezési link',
      variables: ['userName', 'loginLink', 'expiresInMinutes', 'currentYear'],
      textContent: `Kedves {userName}!

Jelentkezz be a tDarts-ba az alábbi linkkel (érvényes {expiresInMinutes} percig):
{loginLink}

Ha nem te kérted, hagyd figyelmen kívül ezt az üzenetet.

Üdvözlettel,
TDarts Csapat`,
      htmlContent: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;background:#0c1414;color:#f2f2f2;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#1a2424;padding:24px;border-radius:8px;border:1px solid #333;">
<p>Kedves {userName}!</p>
<p><a href="{loginLink}" style="color:#cc3333;font-weight:bold;">Bejelentkezés a tDarts-ba</a> (érvényes {expiresInMinutes} percig).</p>
<p style="color:#888;font-size:14px;">© {currentYear} tDarts</p>
</div></body></html>`,
      isActive: true,
      isDefault: true,
    },
  },
  {
    key: 'email_verification',
    locale: 'en',
    set: {
      variables: ['userName', 'verificationCode', 'verificationLink', 'expiresInMinutes', 'currentYear'],
      textContent: `Dear {userName},

Use this code to verify your email address:
{verificationCode}

Or open this link (expires in {expiresInMinutes} minutes):
{verificationLink}

Best regards,
tDarts Team`,
      htmlContent: `<p>Dear {userName},</p><p>Use this code:</p><p style="font-size:24px;font-weight:bold;">{verificationCode}</p><p><a href="{verificationLink}">Confirm email</a> (expires in {expiresInMinutes} minutes).</p>`,
    },
  },
  {
    key: 'password_reset',
    locale: 'en',
    set: {
      variables: ['userName', 'resetCode', 'resetLink', 'expiresInMinutes', 'currentYear'],
      textContent: `Dear {userName},

Use this code to reset your password:
{resetCode}

Or use this link (expires in {expiresInMinutes} minutes):
{resetLink}

Best regards,
tDarts Team`,
      htmlContent: `<p>Dear {userName},</p><p>Use this code:</p><p style="font-size:24px;font-weight:bold;">{resetCode}</p><p><a href="{resetLink}">Reset password</a> (expires in {expiresInMinutes} minutes).</p>`,
    },
  },
  {
    key: 'magic_login',
    locale: 'en',
    set: {
      name: 'Magic login (EN)',
      description: 'English passwordless sign-in',
      category: 'auth',
      subject: '🎯 tDarts sign-in link',
      variables: ['userName', 'loginLink', 'expiresInMinutes', 'currentYear'],
      textContent: `Dear {userName},

Sign in to tDarts (link expires in {expiresInMinutes} minutes):
{loginLink}

If you did not request this, ignore this email.

Best regards,
tDarts Team`,
      htmlContent: `<p>Dear {userName},</p><p><a href="{loginLink}">Sign in to tDarts</a> (expires in {expiresInMinutes} minutes).</p>`,
      isActive: true,
      isDefault: true,
    },
  },
];

async function main() {
  await connectMongo();
  for (const p of patches) {
    const filter = { key: p.key, locale: p.locale };
    if (dryRun) {
      const existing = await EmailTemplateModel.findOne(filter).lean();
      console.log('[dry-run]', p.key, p.locale, existing ? 'would update' : 'would upsert');
      continue;
    }
    await EmailTemplateModel.updateOne(
      filter,
      {
        $set: { ...p.set, lastModified: new Date() },
        $setOnInsert: { key: p.key, locale: p.locale },
      },
      { upsert: true },
    );
    console.log('Updated', p.key, p.locale);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
