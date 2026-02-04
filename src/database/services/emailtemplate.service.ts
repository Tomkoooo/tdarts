import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel, IEmailTemplate } from '@/database/models/emailtemplate.model';

export class EmailTemplateService {
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
    variables: Record<string, any>
  ): Promise<{
    subject: string;
    html: string;
    text: string;
  } | null> {
    try {
      await connectMongo();
      
      const template = await EmailTemplateModel.findOne({
        key: templateKey,
        isActive: true,
      });

      if (!template) {
        console.warn(`Email template not found: ${templateKey}`);
        return null;
      }

      return {
        subject: this.renderTemplate(template.subject, variables),
        html: this.renderTemplate(template.htmlContent, variables),
        text: this.renderTemplate(template.textContent, variables),
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
      return await EmailTemplateModel.find().sort({ category: 1, name: 1 });
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw error;
    }
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
