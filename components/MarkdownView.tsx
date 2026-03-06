import React, { useState, useEffect, useCallback } from 'react';
import { CodeMirrorEditor } from './CodeMirrorEditor';

interface MarkdownViewProps {
  markdown: string;
  onChange: (markdown: string) => void;
  darkMode: boolean;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ markdown, onChange, darkMode }) => {
  const [content, setContent] = useState(markdown);

  useEffect(() => {
    setContent(markdown);
  }, [markdown]);

  const handleChange = useCallback((value: string) => {
    setContent(value);
    onChange(value);
  }, [onChange]);

  return (
    <div className="mindo-markdown-view" style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'transparent',
      color: darkMode ? '#e5e7eb' : '#1f2937',
      position: 'relative'
    }}>
      <div className="mindo-markdown-content" style={{
        /* allow parent container (App) to handle scrolling so that wheel
           events work consistently; avoid nested scroll areas that may eat
           the event (CodeMirror also has its own scroller). */
        overflow: 'visible',
        display: 'flex',
        justifyContent: 'center',
        padding: '0 20px'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          padding: '20px 0'
        }}>
          <CodeMirrorEditor
            value={content}
            onChange={handleChange}
            language="markdown"
            theme={darkMode ? 'dark' : 'light'}
            placeholder="在此编辑 Markdown 内容..."
            className="mindo-codemirror-editor"
            style={{ 
              width: '100%', 
              /* remove fixed height so editor grows with content */
              minHeight: '600px',
              color: 'inherit'
            }}
          />
        </div>
      </div>
    </div>
  );
};
