import * as dotenv from 'dotenv';
import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel } from '@/database/models/emailtemplate.model';

dotenv.config();

type Locale = 'hu' | 'en' | 'de';
const locales: Locale[] = ['hu', 'en', 'de'];

function localizedTitle(locale: Locale) {
  if (locale === 'en') return 'Notification from tDarts';
  if (locale === 'de') return 'Benachrichtigung von tDarts';
  return 'Ertesites a tDarts rendszerbol';
}

function localizedBody(locale: Locale, templateName: string) {
  if (locale === 'en') {
    return `You are receiving this message from tDarts.\n\nTemplate: ${templateName}\n\n{customMessage}\n\nNeed this email in another language? Request it here: {languageRequestUrl}\n`;
  }
  if (locale === 'de') {
    return `Sie erhalten diese Nachricht von tDarts.\n\nVorlage: ${templateName}\n\n{customMessage}\n\nNeed this email in another language? Request it here: {languageRequestUrl}\n`;
  }
  return `Ezt az uzenetet a tDarts rendszer kuldte.\n\nSablon: ${templateName}\n\n{customMessage}\n\nNeed this email in another language? Request it here: {languageRequestUrl}\n`;
}

function toHtml(text: string) {
  return text.replace(/\n/g, '<br>');
}

async function ensureLocaleIndexes(dryRun: boolean) {
  const indexes = await EmailTemplateModel.collection.indexes();
  const legacyUniqueKeyIndex = indexes.find((index: any) => {
    const keys = Object.keys(index.key || {});
    return index.unique === true && keys.length === 1 && keys[0] === 'key';
  });

  if (legacyUniqueKeyIndex) {
    if (dryRun) {
      console.log(`[dry-run] Found legacy unique index '${legacyUniqueKeyIndex.name}' on key only. It will be dropped in --apply mode.`);
    } else {
      console.log(`[apply] Dropping legacy unique index '${legacyUniqueKeyIndex.name}'`);
      await EmailTemplateModel.collection.dropIndex(legacyUniqueKeyIndex.name);
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

  await connectMongo();
  await ensureLocaleIndexes(dryRun);
  const allTemplates = await EmailTemplateModel.find().lean();
  const byKey = new Map<string, any[]>();

  for (const template of allTemplates) {
    const key = template.key;
    const group = byKey.get(key) || [];
    group.push(template);
    byKey.set(key, group);
  }

  let plannedWrites = 0;

  for (const [key, templates] of byKey.entries()) {
    const base = templates.find((template) => template.locale === 'hu') || templates[0];

    for (const locale of locales) {
      const existing = templates.find((template) => template.locale === locale);
      const name = existing?.name || `${base.name} (${locale.toUpperCase()})`;
      const description = existing?.description || base.description;
      const category = existing?.category || base.category;
      const isDefault = typeof existing?.isDefault === 'boolean' ? existing.isDefault : base.isDefault;
      const isActive = typeof existing?.isActive === 'boolean' ? existing.isActive : true;

      const subject = `${localizedTitle(locale)} - ${name}`;
      const textContent = localizedBody(locale, name);
      const htmlContent = `<p>${toHtml(localizedBody(locale, name))}</p>`;
      const baseVariables = Array.isArray(existing?.variables) ? existing.variables : Array.isArray(base.variables) ? base.variables : [];
      const variables = Array.from(new Set([...baseVariables, 'customMessage', 'languageRequestUrl']));

      plannedWrites += 1;

      if (dryRun) {
        console.log(`[dry-run] ${key} / ${locale} -> overwrite`);
        continue;
      }

      await EmailTemplateModel.updateOne(
        { key, locale },
        {
          $set: {
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
          },
        },
        { upsert: true }
      );
      console.log(`[apply] ${key} / ${locale} overwritten`);
    }
  }

  console.log(`Completed. Mode=${dryRun ? 'dry-run' : 'apply'}, writes=${plannedWrites}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('overwrite-email-templates failed:', error);
    process.exit(1);
  });
