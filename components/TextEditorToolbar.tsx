import React from 'react';
import { Bold, Italic, Strikethrough, Highlighter, Eraser } from 'lucide-react';

interface TextEditorToolbarProps {
  onFormat: (type: 'bold' | 'italic' | 'strikethrough' | 'highlight' | 'clear') => void;
  darkMode?: boolean;
}

export const TextEditorToolbar: React.FC<TextEditorToolbarProps> = ({
  onFormat,
  darkMode = false
}) => {
  const handleButtonClick = (e: React.MouseEvent, type: 'bold' | 'italic' | 'strikethrough' | 'highlight' | 'clear') => {
    e.stopPropagation();
    onFormat(type);
  };

  return (
    <div className="mindo-text-editor-toolbar">
      <button 
        onClick={(e) => handleButtonClick(e, 'bold')} 
        className="mindo-toolbar-btn" 
        title="加粗"
      >
        <Bold size={16} />
      </button>
      <button 
        onClick={(e) => handleButtonClick(e, 'italic')} 
        className="mindo-toolbar-btn" 
        title="倾斜"
      >
        <Italic size={16} />
      </button>
      <button 
        onClick={(e) => handleButtonClick(e, 'strikethrough')} 
        className="mindo-toolbar-btn" 
        title="删除线"
      >
        <Strikethrough size={16} />
      </button>
      <button 
        onClick={(e) => handleButtonClick(e, 'highlight')} 
        className="mindo-toolbar-btn" 
        title="高亮"
      >
        <Highlighter size={16} />
      </button>
      <div className="mindo-toolbar-divider" />
      <button 
        onClick={(e) => handleButtonClick(e, 'clear')} 
        className="mindo-toolbar-btn" 
        title="清除格式"
      >
        <Eraser size={16} />
      </button>
    </div>
  );
};