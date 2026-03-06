import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightSpecialChars, drawSelection, lineNumbers, rectangularSelection, crosshairCursor, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'markdown' | 'javascript';
  theme?: 'light' | 'dark';
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language = 'markdown',
  theme = 'light',
  placeholder = '在此输入内容...',
  className = '',
  style = {}
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isInitializedRef = useRef(false);

  // 保持 onChange 为最新的
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current || isInitializedRef.current) return;

    // 创建编辑器状态
    const startState = EditorState.create({
      doc: value,
      extensions: [
        highlightSpecialChars(),
        drawSelection(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, indentWithTab]),
        language === 'markdown' && markdown ? markdown() : [],
        theme === 'dark' && oneDark ? oneDark : [],
        EditorView.updateListener.of(update => {
          if (update.changes) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            backgroundColor: 'transparent',
            /* allow natural height so editor expands and doesn't scroll internally */
            height: 'auto',
            border: 'none',
            outline: 'none'
          },
          '.cm-content': {
            fontFamily: 'inherit',
            fontSize: 'inherit',
            backgroundColor: 'transparent'
          },
          '.cm-gutters': {
            display: 'none'
          },
          '.cm-scroller': {
            backgroundColor: 'transparent',
            /* allow the scroller to expand rather than scrolling internally */
            height: 'auto',
            overflow: 'visible'
          }
        }),
        // 禁用 CodeMirror 的滚动行为，让滚动事件传递给父容器
        EditorView.domEventHandlers({
          wheel: (e, view) => {
            // 阻止 CodeMirror 捕获滚动事件，让事件传递给父容器
            e.preventDefault();
            e.stopPropagation();
            // 手动触发父容器的滚动
            const container = view.dom.closest('.mindo-markdown-view');
            if (container) {
              container.scrollTop += e.deltaY;
            }
          }
        })
      ]
    });

    try {
      // 创建编辑器视图
      const view = new EditorView({
        state: startState,
        parent: editorRef.current
      });

      viewRef.current = view;
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize CodeMirror:', error);
    }

    // 清理函数
    return () => {
      try {
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
          isInitializedRef.current = false;
        }
      } catch (e) {
        console.error('Error destroying CodeMirror:', e);
      }
    };
  }, [language, theme]);

  // 当 value 外部变化时更新编辑器内容（不是来自编辑器自身的变化）
  useEffect(() => {
    if (viewRef.current && isInitializedRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (currentContent !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: value
          }
        });
      }
    }
  }, [value]);

  return (
    <div 
      ref={editorRef} 
      className={`codemirror-editor ${className}`}
      style={{
        width: '100%',
        /* allow editor to expand vertically with its content instead of
           forcing a fixed height; outer container will scroll */
        /* height: '100%', */
        minHeight: '100px',
        fontSize: '14px',
        ...style
      }}
    />
  );
};
