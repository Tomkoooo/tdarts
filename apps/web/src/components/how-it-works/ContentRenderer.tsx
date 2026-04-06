import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface NoteProps {
  type: 'info' | 'warning' | 'tip' | 'important';
  content: string;
}

const Note: React.FC<NoteProps> = ({ type, content }) => {
  const t = useTranslations('ContentRenderer.notes');
  const getNoteStyles = () => {
    switch (type) {
      case 'info':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
      case 'warning':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
      case 'tip':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
      case 'important':
        return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
      default:
        return { bg: 'bg-muted/20', text: 'text-muted-foreground', border: 'border-border/40' };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'tip':
        return '💡';
      case 'important':
        return '❗';
      default:
        return '📝';
    }
  };

  const styles = getNoteStyles();

  return (
    <div className={cn("p-4 rounded-xl", styles.bg, styles.border, "border")}>
      <p className={cn("text-sm leading-relaxed", styles.text)}>
        <span className="mr-2">{getIcon()}</span>
        <strong>{t(type || 'default')}</strong> {content}
      </p>
    </div>
  );
};

interface ContentRendererProps {
  content: any;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ content }) => {
  if (!content || !content.sections) {
    return null;
  }

  return (
    <div className="space-y-8">
      {content.sections.map((section: any, index: number) => {
        if (section.type === 'text') {
          return (
            <p key={index} className="text-foreground/90 leading-relaxed text-base" 
               dangerouslySetInnerHTML={{ __html: section.content }}>
            </p>
          );
        }

        if (section.type === 'subsection') {
          return (
            <section key={index} className="space-y-4">
              <h3 className="font-semibold text-foreground text-xl">{section.title}</h3>
              
              {Array.isArray(section.content) ? (
                <ul className="text-foreground/80 space-y-3 list-none">
                  {section.content.map((item: string, itemIndex: number) => (
                    <li key={itemIndex} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item }}></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-foreground/80 leading-relaxed" 
                   dangerouslySetInnerHTML={{ __html: section.content }}>
                </p>
              )}

              {section.list && (
                <div className="bg-muted/20 p-4 rounded-xl">
                  <ul className="text-foreground/80 space-y-2 text-sm">
                    {section.list.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: item }}></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {section.subsections && (
                <div className="space-y-6 ml-2 pl-4 border-l-2 border-border/40">
                  {section.subsections.map((sub: any, subIndex: number) => (
                    <div key={subIndex} className="space-y-3">
                      <h4 className="font-semibold text-foreground text-lg">{sub.title}</h4>
                      {Array.isArray(sub.content) ? (
                        <ul className="text-foreground/80 space-y-2 text-sm list-none">
                          {sub.content.map((item: string, itemIndex: number) => (
                            <li key={itemIndex} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item }}></span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-foreground/80 text-sm leading-relaxed" 
                           dangerouslySetInnerHTML={{ __html: sub.content }}>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.note && (
                <Note type={section.note.type} content={section.note.content} />
              )}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ContentRenderer;
