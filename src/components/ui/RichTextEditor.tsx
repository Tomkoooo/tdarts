'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill-new');
  const { default: ImageResize } = await import('quill-image-resize-module-react');
  
  // Register module
  RQ.Quill.register('modules/imageResize', ImageResize);

  const DynamicComponent = ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
  DynamicComponent.displayName = 'ReactQuillDynamic';
  return DynamicComponent;
}, { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {

  // We need a ref to access the editor instance for the image handler
  const quillRef = React.useRef<any>(null);

  const modules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: () => {
             const input = document.createElement('input');
             input.setAttribute('type', 'file');
             input.setAttribute('accept', 'image/*');
             input.click();
 
             input.onchange = async () => {
               const file = input.files ? input.files[0] : null;
               if (file) {
                 if (file.size > 15 * 1024 * 1024) {
                     alert('A fájl túl nagy (max 15MB)');
                     return;
                 }
                 const formData = new FormData();
                 formData.append('file', file);
                 
                 try {
                    const res = await fetch('/api/media', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error('Upload failed');
                    const data = await res.json();
                    
                    const quill = quillRef.current?.getEditor();
                    const range = quill?.getSelection();
                    if (quill && range) {
                        quill.insertEmbed(range.index, 'image', data.url);
                    }
                 } catch (e) {
                     console.error(e);
                     alert('Hiba a kép feltöltésekor');
                 }
               }
             };
        }
      }
    },
    imageResize: {
        parchment: typeof window !== "undefined" ? (window as any).Quill?.import('parchment') : undefined,
        modules: ['Resize', 'DisplaySize']
    }
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', // Removed 'bullet'
    'link', 'image'
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md rich-text-editor-container">
      <ReactQuill
        forwardedRef={quillRef}
        theme="snow" // Standard theme
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="h-64 mb-12 text-gray-900 dark:text-gray-100" 
      />
      <style jsx global>{`
        /* Reset Quill defaults to use theme variables */
        .rich-text-editor-container .ql-toolbar.ql-snow,
        .rich-text-editor-container .ql-container.ql-snow {
            border: 1px solid var(--border) !important;
            font-family: inherit;
        }

        .rich-text-editor-container .ql-toolbar.ql-snow {
            border-top-left-radius: var(--radius);
            border-top-right-radius: var(--radius);
            background-color: var(--card);
            color: var(--foreground);
        }

        .rich-text-editor-container .ql-container.ql-snow {
            border-bottom-left-radius: var(--radius);
            border-bottom-right-radius: var(--radius);
            background-color: var(--background);
            color: var(--foreground);
            font-size: 1rem;
        }

        /* Toolbar Buttons & Icons - Use currentColor for robust theming */
        .rich-text-editor-container .ql-snow.ql-toolbar button {
            color: var(--foreground) !important;
            transition: color 0.2s;
        }

        /* SVG Elements */
        .rich-text-editor-container .ql-snow .ql-stroke {
            stroke: currentColor !important;
        }
        
        .rich-text-editor-container .ql-snow .ql-fill {
            fill: currentColor !important;
        }
        
        .rich-text-editor-container .ql-snow .ql-stroke.ql-fill {
            fill: currentColor !important;
            stroke: currentColor !important;
        }
        
        /* Dropdowns (Pickers) */
        .rich-text-editor-container .ql-snow .ql-picker {
            color: var(--foreground) !important;
        }
        .rich-text-editor-container .ql-snow .ql-picker-label {
            color: inherit !important;
        }
        .rich-text-editor-container .ql-snow .ql-picker-label svg .ql-stroke {
            stroke: currentColor !important; /* Ensure dropdown arrow matches text */
        }

        /* Dropdown Options */
        .rich-text-editor-container .ql-snow .ql-picker-options {
            background-color: var(--popover) !important;
            border-color: var(--border) !important;
            color: var(--popover-foreground) !important;
        }
        .rich-text-editor-container .ql-snow .ql-picker-item {
            color: var(--popover-foreground) !important;
        }
        
        /* Active / Hover States */
        /* Buttons */
        .rich-text-editor-container .ql-snow.ql-toolbar button:hover,
        .rich-text-editor-container .ql-snow.ql-toolbar button:focus,
        .rich-text-editor-container .ql-snow.ql-toolbar button.ql-active {
            color: var(--primary) !important;
        }
        
        /* Pickers */
        .rich-text-editor-container .ql-snow.ql-toolbar .ql-picker-label:hover,
        .rich-text-editor-container .ql-snow.ql-toolbar .ql-picker-label.ql-active {
            color: var(--primary) !important;
        }
        
        /* Picker Items */
        .rich-text-editor-container .ql-snow .ql-picker-item:hover,
        .rich-text-editor-container .ql-snow .ql-picker-item.ql-selected {
            color: var(--primary) !important;
        }

        /* Editor content placeholder */
        .rich-text-editor-container .ql-editor.ql-blank::before {
            color: var(--muted-foreground) !important;
            font-style: italic;
        }
      `}</style>
    </div>
  );
}
