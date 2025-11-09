import React from 'react';

interface NoteProps {
  type: 'info' | 'warning' | 'tip' | 'important';
  content: string;
}

const Note: React.FC<NoteProps> = ({ type, content }) => {
  const getNoteStyles = () => {
    switch (type) {
      case 'info':
        return 'bg-blue-500/10 border  text-blue-400';
      case 'warning':
        return 'bg-red-500/10 border  text-red-400';
      case 'tip':
        return 'bg-yellow-500/10 border  text-yellow-400';
      case 'important':
        return 'bg-orange-500/10 border  text-orange-400';
      default:
        return 'bg-gray-500/10 border  text-gray-400';
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

  return (
    <div className={`${getNoteStyles()} p-4 rounded-lg`}>
      <p className="text-sm">
        <span className="mr-2">{getIcon()}</span>
        <strong>{type === 'info' ? 'Info:' : type === 'warning' ? 'Fontos:' : type === 'tip' ? 'Tipp:' : 'Megjegyzés:'}</strong> {content}
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
    <div className="space-y-6">
      {content.sections.map((section: any, index: number) => {
        if (section.type === 'text') {
          return (
            <p key={index} className="text-gray-300 leading-relaxed" 
               dangerouslySetInnerHTML={{ __html: section.content }}>
            </p>
          );
        }

        if (section.type === 'subsection') {
          return (
            <div key={index} className="space-y-4">
              <h4 className="font-semibold text-white text-lg">{section.title}</h4>
              
              {Array.isArray(section.content) ? (
                <ul className="text-gray-300 space-y-2">
                  {section.content.map((item: string, itemIndex: number) => (
                    <li key={itemIndex} className="flex items-start">
                      <span className="mr-2 mt-1">•</span>
                      <span dangerouslySetInnerHTML={{ __html: item }}></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300 leading-relaxed" 
                   dangerouslySetInnerHTML={{ __html: section.content }}>
                </p>
              )}

              {section.list && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <ul className="text-gray-300 space-y-1 text-sm">
                    {section.list.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} dangerouslySetInnerHTML={{ __html: `• ${item}` }}></li>
                    ))}
                  </ul>
                </div>
              )}

              {section.subsections && (
                <div className="space-y-4 ml-4">
                  {section.subsections.map((sub: any, subIndex: number) => (
                    <div key={subIndex} className="space-y-2">
                      <h5 className="font-medium text-white text-base">{sub.title}</h5>
                      {Array.isArray(sub.content) ? (
                        <ul className="text-gray-300 space-y-1 text-sm">
                          {sub.content.map((item: string, itemIndex: number) => (
                            <li key={itemIndex} className="flex items-start">
                              <span className="mr-2 mt-1">•</span>
                              <span dangerouslySetInnerHTML={{ __html: item }}></span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-300 text-sm" 
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
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ContentRenderer;
