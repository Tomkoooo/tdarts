import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel, IEmailTemplate } from '@/database/models/emailtemplate.model';
import { EmailLocale, normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from '@/lib/email-layout';

const SUPPORTED_EMAIL_LOCALES: EmailLocale[] = ['hu', 'en', 'de'];

const CRITICAL_TEAM_INVITE_TEMPLATES: Array<Partial<IEmailTemplate> & { key: string; locale: EmailLocale }> = [
  {
    key: 'team_invitation',
    locale: 'hu',
    name: 'Team Invitation',
    description: 'Sent when a player invites someone to form a team for a tournament',
    category: 'tournament',
    subject: '🎯 {inviterName} meghívott egy csapatba - {tournamentName}',
    variables: ['inviterName', 'inviteeName', 'teamName', 'tournamentName', 'tournamentUrl', 'acceptUrl', 'declineUrl', 'currentYear'],
    textContent: `Kedves {inviteeName}!\n\n{inviterName} meghívott, hogy társként vegyél részt a {tournamentName} tornán.\n\nCsapat: {teamName}\nElfogadás: {acceptUrl}\nElutasítás: {declineUrl}\n\n© {currentYear} tDarts`,
    htmlContent: `<p>Kedves {inviteeName}!</p><p><strong>{inviterName}</strong> meghívott a(z) <strong>{teamName}</strong> csapatba a(z) <strong>{tournamentName}</strong> tornára.</p><p><a href="{acceptUrl}">Elfogadás</a> • <a href="{declineUrl}">Elutasítás</a></p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'team_invitation_accepted',
    locale: 'hu',
    name: 'Team Invitation Accepted',
    description: 'Sent to inviter when invitation accepted',
    category: 'tournament',
    subject: '✅ {accepterName} elfogadta a csapat meghívót - {teamName}',
    variables: ['inviterName', 'accepterName', 'teamName', 'tournamentName', 'tournamentUrl', 'currentYear'],
    textContent: `Kedves {inviterName}!\n\n{accepterName} elfogadta a meghívást a(z) {teamName} csapatba.\nTorna: {tournamentName}\nRészletek: {tournamentUrl}\n\n© {currentYear} tDarts`,
    htmlContent: `<p>Kedves {inviterName}!</p><p><strong>{accepterName}</strong> elfogadta a meghívást a(z) <strong>{teamName}</strong> csapatba.</p><p>Torna: {tournamentName}</p><p><a href="{tournamentUrl}">Torna megnyitása</a></p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'team_invitation_declined',
    locale: 'hu',
    name: 'Team Invitation Declined',
    description: 'Sent to inviter when invitation declined',
    category: 'tournament',
    subject: '❌ {declinerName} elutasította a csapat meghívót',
    variables: ['inviterName', 'declinerName', 'teamName', 'tournamentName', 'currentYear'],
    textContent: `Kedves {inviterName}!\n\n{declinerName} elutasította a meghívást a(z) {teamName} csapatba.\nTorna: {tournamentName}\n\n© {currentYear} tDarts`,
    htmlContent: `<p>Kedves {inviterName}!</p><p><strong>{declinerName}</strong> elutasította a meghívást a(z) <strong>{teamName}</strong> csapatba.</p><p>Torna: {tournamentName}</p>`,
    isActive: true,
    isDefault: true,
  },
];

export interface EmailTemplateGroup {
  key: string;
  name: string;
  description: string;
  category: IEmailTemplate['category'];
  variables: string[];
  isDefault: boolean;
  locales: Partial<Record<EmailLocale, IEmailTemplate>>;
  availableLocales: EmailLocale[];
}

export class EmailTemplateService {
  private static async ensureCriticalTemplates(): Promise<void> {
    for (const template of CRITICAL_TEAM_INVITE_TEMPLATES) {
      await EmailTemplateModel.updateOne(
        { key: template.key, locale: template.locale },
        {
          $setOnInsert: {
            ...template,
            lastModified: new Date(),
          },
        },
        { upsert: true }
      );
    }
  }

  /**
   * Render an email template by replacing variables with actual data
   * Variables in template use {variableName} syntax
   */
  static renderTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    let rendered = template;
    
    // Replace all {variableName} placeholders with actual values
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      rendered = rendered.replace(placeholder, String(value ?? ''));
    }
    
    return rendered;
  }

  /**
   * Get template by key and render it with provided variables
   */
  static async getRenderedTemplate(
    templateKey: string,
    variables: Record<string, any>,
    options?: {
      locale?: string;
      fallbackLocale?: EmailLocale;
      applySharedLayout?: boolean;
      titleOverride?: string;
    }
  ): Promise<{
    subject: string;
    html: string;
    text: string;
    locale: EmailLocale;
  } | null> {
    try {
      await connectMongo();
      const locale = normalizeEmailLocale(options?.locale, options?.fallbackLocale || 'hu');
      const fallbackLocale = options?.fallbackLocale || 'hu';

      let template = await EmailTemplateModel.findOne({
        key: templateKey,
        locale,
        isActive: true,
      });

      if (!template) {
        template = await EmailTemplateModel.findOne({
          key: templateKey,
          $or: [{ locale: fallbackLocale }, { locale: { $exists: false } }],
          isActive: true,
        });
      }

      if (!template) {
        template = await EmailTemplateModel.findOne({
          key: templateKey,
          isActive: true,
        });
      }

      if (!template) {
        console.warn(`Email template not found: ${templateKey}`);
        return null;
      }

      const renderedSubject = this.renderTemplate(template.subject, variables);
      const renderedText = this.renderTemplate(template.textContent, variables);
      const renderedHtml = this.renderTemplate(template.htmlContent, variables);

      const hasOwnHtmlDocument = /<html[\s>]/i.test(renderedHtml);
      const shouldApplyLayout = options?.applySharedLayout !== false && !hasOwnHtmlDocument;
      const finalHtml = shouldApplyLayout
        ? renderMinimalEmailLayout({
            locale: template.locale || locale,
            title: options?.titleOverride || renderedSubject,
            heading: options?.titleOverride || renderedSubject,
            bodyHtml: renderedHtml || textToEmailHtml(renderedText),
          })
        : renderedHtml;

      return {
        subject: renderedSubject,
        html: finalHtml,
        text: renderedText,
        locale: normalizeEmailLocale(template.locale || locale),
      };
    } catch (error) {
      console.error('Error rendering email template:', error);
      return null;
    }
  }

  /**
   * Get all email templates
   */
  static async getAllTemplates(): Promise<IEmailTemplate[]> {
    try {
      await connectMongo();
      await this.ensureCriticalTemplates();
      return await EmailTemplateModel.find().sort({ category: 1, name: 1 });
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw error;
    }
  }

  static async getGroupedTemplates(): Promise<EmailTemplateGroup[]> {
    const templates = await this.getAllTemplates();
    const groupedMap = new Map<string, EmailTemplateGroup>();

    for (const template of templates) {
      const existing = groupedMap.get(template.key);
      const locale = (template.locale || 'hu') as EmailLocale;
      if (!existing) {
        groupedMap.set(template.key, {
          key: template.key,
          name: template.name,
          description: template.description,
          category: template.category,
          variables: template.variables || [],
          isDefault: template.isDefault,
          locales: { [locale]: template } as Partial<Record<EmailLocale, IEmailTemplate>>,
          availableLocales: [locale],
        });
      } else {
        existing.locales[locale] = template;
        if (!existing.availableLocales.includes(locale)) {
          existing.availableLocales.push(locale);
        }
      }
    }

    return Array.from(groupedMap.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  }

  static async getTemplateGroupById(id: string): Promise<EmailTemplateGroup | null> {
    const selected = await this.getTemplateById(id);
    if (!selected) return null;
    const grouped = await this.getGroupedTemplates();
    return grouped.find((group) => group.key === selected.key) || null;
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<IEmailTemplate | null> {
    try {
      await connectMongo();
      return await EmailTemplateModel.findById(id);
    } catch (error) {
      console.error('Error fetching email template:', error);
      throw error;
    }
  }

  /**
   * Update email template
   */
  static async updateTemplate(
    id: string,
    updates: Partial<IEmailTemplate>,
    userId?: string
  ): Promise<IEmailTemplate | null> {
    try {
      await connectMongo();
      
      const updateData: any = {
        ...updates,
        lastModified: new Date(),
      };

      if (userId) {
        updateData.modifiedBy = userId;
      }

      return await EmailTemplateModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
    } catch (error) {
      console.error('Error updating email template:', error);
      throw error;
    }
  }

  static async upsertTemplateLocales(
    key: string,
    locales: Partial<Record<EmailLocale, Partial<IEmailTemplate>>>,
    userId?: string
  ): Promise<EmailTemplateGroup | null> {
    await connectMongo();

    for (const locale of SUPPORTED_EMAIL_LOCALES) {
      const localeUpdate = locales[locale];
      if (!localeUpdate) continue;

      const setPayload: any = {
        ...localeUpdate,
        locale,
        key,
        lastModified: new Date(),
      };
      if (userId) setPayload.modifiedBy = userId;

      await EmailTemplateModel.updateOne(
        { key, locale },
        { $set: setPayload },
        { upsert: true }
      );
    }

    const grouped = await this.getGroupedTemplates();
    return grouped.find((group) => group.key === key) || null;
  }

  /**
   * Reset template to default
   */
  static async resetToDefault(templateKey: string): Promise<IEmailTemplate | null> {
    try {
      await connectMongo();
      
      // This would require storing default templates separately
      // For now, we'll just mark it for manual reset
      const template = await EmailTemplateModel.findOne({ key: templateKey });
      
      if (!template) {
        return null;
      }

      // TODO: Implement default template restoration
      return template;
    } catch (error) {
      console.error('Error resetting email template:', error);
      throw error;
    }
  }

  /**
   * Create a new email template
   */
  static async createTemplate(
    templateData: Partial<IEmailTemplate>
  ): Promise<IEmailTemplate> {
    try {
      await connectMongo();
      
      const template = new EmailTemplateModel(templateData);
      return await template.save();
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }
}
