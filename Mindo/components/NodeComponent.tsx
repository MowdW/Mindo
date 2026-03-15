import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { MindMapNode, NODE_STYLES, NodeColor, HandlePosition, COLOR_PALETTE } from '../types';
import { Trash2 } from 'lucide-react';
import { TextEditorToolbar } from './TextEditorToolbar';

interface NodeComponentProps {
  node: MindMapNode;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onMouseUp: (e: React.MouseEvent, nodeId: string) => void;
  onConnectStart: (e: React.MouseEvent, nodeId: string, handle: HandlePosition) => void;
  onConnectEnd: (e: React.MouseEvent, nodeId: string, handle: HandlePosition) => void;
  onUpdate: (id: string, title: string, content: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  onResizeStart?: () => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: NodeColor) => void;
  onShapeChange?: (id: string, shape: 'rectangle' | 'circle') => void;
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
  onSelect?: (nodeId: string) => void;
  scale: number;
  onRenderMarkdown?: (content: string, el: HTMLElement) => void;
  onOpenLink?: (linkPath: string) => void;
  darkMode?: boolean;
}

export const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  isSelected,
  isDragging,
  onMouseDown,
  onMouseUp,
  onConnectStart,
  onConnectEnd,
  onUpdate,
  onResize,
  onResizeStart,
  onDelete,
  onColorChange,
  onShapeChange,
  onContextMenu,
  onSelect,
  scale,
  onRenderMarkdown,
  onOpenLink,
  darkMode = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'title' | 'content'>('title');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);
  const titleMarkdownRef = useRef<HTMLDivElement>(null);

  const getIconSymbol = (icon?: string) => {
    const iconMap: Record<string, string> = {
      star: '⭐',
      circle: '🔴',
      check: '✅',
      lightning: '⚡',
      bulb: '💡',
      question: '❓'
    };
    return iconMap[icon || ''] || '';
  };

  const themeClass = NODE_STYLES[node.color]?.className || NODE_STYLES['gray'].className;
  const isGroup = node.type === 'group';
  const isImage = node.type === 'image';

  const hasContent = (node.content && node.content.trim().length > 0) || isImage;
  const showContent = isEditing || hasContent;
  const showTitle = node.titleVisible !== false;

  useLayoutEffect(() => {
      if (nodeRef.current && !isGroup && !isEditing) {
          const obs = new ResizeObserver(entries => {
              for (const entry of entries) {
                  const el = nodeRef.current;
                  if (el && el.offsetWidth > 10 && el.offsetHeight > 10) {
                      if (Math.abs(el.offsetWidth - node.width) > 2 || Math.abs(el.offsetHeight - node.height) > 2) {
                          onResize(node.id, el.offsetWidth, el.offsetHeight);
                      }
                  }
              }
          });
          obs.observe(nodeRef.current);
          return () => obs.disconnect();
      }
  }, [node.id, node.width, node.height, onResize, isGroup, isEditing]);

  // Render Markdown for Content
  useEffect(() => {
      if (!isEditing && markdownRef.current && onRenderMarkdown && node.content && !isImage) {
          markdownRef.current.innerHTML = '';
          onRenderMarkdown(node.content, markdownRef.current);
      }
  }, [isEditing, node.content, onRenderMarkdown, isImage]);

  // Render Markdown for Title (Support MathJax)
  useEffect(() => {
      if (!isEditing && titleMarkdownRef.current && onRenderMarkdown && node.title && !isGroup && showTitle) {
          titleMarkdownRef.current.innerHTML = '';
          onRenderMarkdown(node.title, titleMarkdownRef.current);
      }
  }, [isEditing, node.title, onRenderMarkdown, isGroup, showTitle]);

  const adjustTextareaHeight = () => {
    if (contentInputRef.current) {
        contentInputRef.current.style.height = 'auto';
        contentInputRef.current.style.height = contentInputRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    if (isEditing) {
        setTimeout(() => {
            if (focusTarget === 'title' && titleInputRef.current) {
                titleInputRef.current.focus();
                if (node.title === 'New Node' || node.title === '新节点' || node.title === 'New Group' || node.title === '新分组') {
                    titleInputRef.current.select();
                }
            } else if (focusTarget === 'content' && contentInputRef.current) {
                contentInputRef.current.focus();
                adjustTextareaHeight();
                const val = contentInputRef.current.value;
                contentInputRef.current.setSelectionRange(val.length, val.length);
            }
        }, 10);
    }
  }, [isEditing, focusTarget]);

  const handleFormat = (type: 'bold' | 'italic' | 'strikethrough' | 'highlight' | 'clear') => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = textarea.value;

    switch (type) {
      case 'bold':
        if (selectedText) {
          newText = newText.substring(0, start) + `**${selectedText}**` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + '****' + newText.substring(start);
        }
        break;
      case 'italic':
        if (selectedText) {
          newText = newText.substring(0, start) + `*${selectedText}*` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + '**' + newText.substring(start);
        }
        break;
      case 'strikethrough':
        if (selectedText) {
          newText = newText.substring(0, start) + `~~${selectedText}~~` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + '~~~~' + newText.substring(start);
        }
        break;
      case 'highlight':
        if (selectedText) {
          newText = newText.substring(0, start) + `==${selectedText}==` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + '====' + newText.substring(start);
        }
        break;
      case 'clear':
        if (selectedText) {
          // 清除选中文本的格式
          let cleanedText = selectedText
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/==(.*?)==/g, '$1');
          newText = newText.substring(0, start) + cleanedText + newText.substring(end);
        } else {
          // 清除所有文本的格式
          newText = newText
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/==(.*?)==/g, '$1');
        }
        break;
    }

    textarea.value = newText;
    adjustTextareaHeight();

    // 设置光标位置
    if (!selectedText) {
      let cursorPos = start;
      switch (type) {
        case 'bold':
        case 'strikethrough':
        case 'highlight':
          cursorPos += 2;
          break;
        case 'italic':
          cursorPos += 1;
          break;
      }
      textarea.setSelectionRange(cursorPos, cursorPos);
    } else {
      let newCursorPos = start;
      switch (type) {
        case 'bold':
          newCursorPos += 2 + selectedText.length + 2;
          break;
        case 'italic':
          newCursorPos += 1 + selectedText.length + 1;
          break;
        case 'strikethrough':
        case 'highlight':
          newCursorPos += 2 + selectedText.length + 2;
          break;
        case 'clear':
          newCursorPos += selectedText.length - (selectedText.length - newText.substring(start, end + (newText.length - textarea.value.length)).length);
          break;
      }
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }

    textarea.focus();
  };

  const saveChanges = () => {
    const newTitle = titleInputRef.current?.value ?? node.title;
    const newContent = contentInputRef.current?.value ?? node.content ?? "";
    onUpdate(node.id, newTitle, newContent);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    
    if (isImage) {
        setFocusTarget('title');
    } else if (!showTitle) {
        // 当标题不可见时，直接编辑内容
        setFocusTarget('content');
    } else {
        if (target.closest('.mindo-node-content')) {
            setFocusTarget('content');
        } else {
            setFocusTarget('title');
        }
    }
    setIsEditing(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // 检查相关目标是否在节点内部或工具栏内部
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (nodeRef.current && (nodeRef.current.contains(relatedTarget) || relatedTarget?.closest('.mindo-text-editor-toolbar'))) {
        return;
    }
    setIsEditing(false);
    saveChanges();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 格式化快捷键
    if ((e.metaKey || e.ctrlKey)) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          return;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          return;
      }
    }
    
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { 
       setIsEditing(false);
       saveChanges();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      saveChanges();
    }
  };

  const stopProp = (e: React.MouseEvent) => {
      e.stopPropagation();
  };

  const handleLinkClick = (e: React.MouseEvent) => {
      // 允许链接的默认行为
      // 但阻止事件冒泡到节点的其他处理器
      e.stopPropagation();
      
      // 检查是否点击了普通双链
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
          const href = target.getAttribute('href');
          // 处理普通双链点击
          if (href && href.startsWith('#')) {
              // 这可能是一个普通双链，尝试处理它
              const linkText = target.textContent || '';
              // 提取双链内容，例如从 [[path]] 中提取 path
              const match = linkText.match(/\[\[(.*?)\]\]/);
              if (match && match[1]) {
                  const linkPath = match[1];
                  // 使用onOpenLink prop处理普通双链点击
                  if (onOpenLink) {
                      onOpenLink(linkPath);
                  } else {
                      console.log('普通双链点击:', linkPath);
                  }
              }
          }
      }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onResizeStart) onResizeStart();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = node.width;
      const startHeight = node.height;

      const handleMouseMove = (mv: MouseEvent) => {
          const dx = (mv.clientX - startX) / scale;
          const dy = (mv.clientY - startY) / scale;
          onResize(node.id, Math.max(100, startWidth + dx), Math.max(50, startHeight + dy));
      };
      const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };

  const handleHandleMouseDown = (e: React.MouseEvent, h: HandlePosition) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectStart(e, node.id, h);
  };

  const handleHandleMouseUp = (e: React.MouseEvent, h: HandlePosition) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectEnd(e, node.id, h);
  };

  // Group Rendering
  if (isGroup) {
      return (
        <div
          ref={nodeRef}
          className={`mindo-node mindo-group ${themeClass}
            ${isDragging ? 'dragging' : ''}
            ${isSelected ? 'selected' : ''}
          `}
          style={{
            transform: `translate(${node.x}px, ${node.y}px)`,
            width: node.width,
            height: node.height,
          }}
          onMouseDown={(e) => onMouseDown(e, node.id)}
          onMouseUp={(e) => onMouseUp(e, node.id)}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => onContextMenu && onContextMenu(e, node.id)}
          tabIndex={-1} 
          onBlur={handleBlur}
        >
             <div className="mindo-group-label">
                {isEditing ? (
                <input
                    ref={titleInputRef}
                    defaultValue={node.title}
                    placeholder="分组名称"
                    className="mindo-input-reset"
                    style={{ width: '6rem', color: 'inherit', padding: 0, margin: 0 }}
                    onKeyDown={handleKeyDown}
                    onMouseDown={stopProp}
                />
                ) : (
                <div style={{ userSelect: 'none' }}>
                    {node.title || "分组"}
                </div>
                )}
            </div>
            
            <div 
                className="mindo-resize-handle"
                onMouseDown={handleResizeMouseDown}
            />
             

        </div>
      );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        zIndex: isSelected ? 10 : 1,
        width: node.width,
        textAlign: 'center'
      }}
    >
      {/* 文本编辑工具栏 */}
      {isEditing && !isGroup && !isImage && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '0',
          right: '0',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <TextEditorToolbar 
            onFormat={handleFormat} 
            darkMode={darkMode} 
          />
        </div>
      )}
      
      <div
        ref={nodeRef}
        className={`mindo-node ${themeClass}
          ${isDragging ? 'dragging' : ''}
          ${isSelected ? 'selected' : ''}
        `}
        style={{
          width: '100%',
          height: isImage ? Math.max(node.height, 100) : 'auto',
          minHeight: isImage ? Math.max(node.height, 100) : 'auto',
          display: 'flex',
          flexDirection: 'column',
          willChange: isDragging ? 'transform' : 'auto'
        }}
        onMouseDown={(e) => onMouseDown(e, node.id)}
        onMouseUp={(e) => onMouseUp(e, node.id)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => onContextMenu && onContextMenu(e, node.id)}
        tabIndex={-1} 
        onBlur={handleBlur}
      >
      {/* Icon - Corner Position */}
      {node.icon && (node.iconPosition === 'corner' || !node.iconPosition) && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          zIndex: 10,
          backgroundColor: 'transparent',
          borderRadius: '50%',
          width: '31px',
          height: '31px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '18px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)' }}>{getIconSymbol(node.icon)}</span>
        </div>
      )}
      
      {/* Title */}
      {showTitle && (
        <div className={`mindo-node-header ${showContent ? 'has-content' : ''}`}>
          {isEditing ? (
            <div style={{ position: 'relative', width: '100%', textAlign: 'center', paddingLeft: node.icon && node.iconPosition === 'inline' ? '24px' : '0' }}>
              {/* Inline Icon in Editing Mode */}
              {node.icon && node.iconPosition === 'inline' && (
                <span style={{ 
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px', 
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>{getIconSymbol(node.icon)}</span>
              )}
              <input
                ref={titleInputRef}
                defaultValue={node.title}
                placeholder="标题"
                className="mindo-input-reset mindo-editing-mono"
                style={{ 
                  width: '100%', 
                  fontWeight: 'bold', 
                  padding: 0, 
                  margin: 0, 
                  color: 'inherit', 
                  textAlign: 'center'
                }}
                onKeyDown={handleKeyDown}
                onMouseDown={stopProp}
              />
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', textAlign: 'center', paddingLeft: node.icon && node.iconPosition === 'inline' ? '24px' : '0' }}>
              {/* Inline Icon in View Mode */}
              {node.icon && node.iconPosition === 'inline' && (
                <span style={{ 
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  fontSize: '18px', 
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>{getIconSymbol(node.icon)}</span>
              )}
              <div style={{ lineHeight: 1.4, textAlign: 'center' }}>
                {onRenderMarkdown ? (
                    <div 
                      ref={titleMarkdownRef} 
                      className="mindo-markdown-content"
                      style={{ userSelect: 'none', textAlign: 'center' }}
                      onClick={handleLinkClick}
                    />
                ) : (
                   <div style={{ userSelect: 'none', whiteSpace: 'pre-wrap', overflow: 'hidden', textAlign: 'center' }}>
                      {node.title || "未命名"}
                   </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {showContent && (
        <div className="mindo-node-content" style={{ height: isImage ? (showTitle ? 'calc(100% - 44px)' : '100%') : 'auto', overflow: isImage ? 'hidden' : 'visible', textAlign: 'left' }}>
             {isImage ? (
                 <img 
                    src={node.imageUrl} 
                    alt={node.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px', pointerEvents: 'none', display: 'block', backgroundColor: 'transparent' }} 
                 />
             ) : (
                 <>
                    {isEditing ? (
                            <textarea
                                ref={contentInputRef}
                                defaultValue={node.content}
                                placeholder="描述..."
                                className="mindo-input-reset mindo-editing-mono"
                                style={{ width: '100%', resize: 'none', color: 'inherit', padding: 0, margin: 0, overflow: 'hidden', height: 'auto', minHeight: '1.5em', textAlign: 'left' }}
                                onInput={adjustTextareaHeight}
                                onKeyDown={handleKeyDown}
                                onMouseDown={stopProp}
                            />
                    ) : (
                        <div ref={markdownRef} className="mindo-markdown-content" style={{ textAlign: 'left' }} onClick={handleLinkClick}>
                            {!onRenderMarkdown && node.content}
                        </div>
                    )}
                </>
             )}
        </div>
      )}

      {showContent && (
        <div 
            className="mindo-resize-handle"
            onMouseDown={handleResizeMouseDown}
        />
      )}

      {/* Handles */}
      <div className="mindo-handle mindo-handle-top" onMouseDown={(e) => handleHandleMouseDown(e, 'top')} onMouseUp={(e) => handleHandleMouseUp(e, 'top')} />
      <div className="mindo-handle mindo-handle-right" onMouseDown={(e) => handleHandleMouseDown(e, 'right')} onMouseUp={(e) => handleHandleMouseUp(e, 'right')} />
      <div className="mindo-handle mindo-handle-bottom" onMouseDown={(e) => handleHandleMouseDown(e, 'bottom')} onMouseUp={(e) => handleHandleMouseUp(e, 'bottom')} />
      <div className="mindo-handle mindo-handle-left" onMouseDown={(e) => handleHandleMouseDown(e, 'left')} onMouseUp={(e) => handleHandleMouseUp(e, 'left')} />


    </div>
    </div>
  );
};