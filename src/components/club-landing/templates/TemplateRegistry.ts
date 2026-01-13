import { LandingTemplateComponent } from './BaseTemplate';
import { ClassicTemplate } from './ClassicTemplate';
// import { ModernTemplate } from './ModernTemplate';

export const TemplateRegistry: Record<string, LandingTemplateComponent> = {
  classic: ClassicTemplate,
  // modern: ModernTemplate,
};

export const getTemplate = (templateName: string): LandingTemplateComponent => {
  return TemplateRegistry[templateName] || TemplateRegistry['classic'];
};
