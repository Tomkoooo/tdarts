declare module 'react-quill' {
    import React from 'react';
    export interface ReactQuillProps {
        value?: string;
        defaultValue?: string;
        readOnly?: boolean;
        theme?: string;
        modules?: any;
        formats?: string[];
        onChange?: (content: string, delta: any, source: string, editor: any) => void;
        placeholder?: string;
        className?: string;
    }
    const ReactQuill: React.FC<ReactQuillProps>;
    export default ReactQuill;
}

declare module 'quill-image-resize-module-react' {
    const content: any;
    export default content;
}
