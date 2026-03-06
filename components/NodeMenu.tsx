import React from 'react';
import { MindMapNode, COLOR_PALETTE, NODE_STYLES, IconType, IconPosition } from '../types';
import { Trash2, Palette, AlignLeft, CornerDownLeft, SeparatorHorizontal } from 'lucide-react';

interface NodeMenuProps {
  node: MindMapNode;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onIconChange: (id: string, icon: IconType) => void;
  onIconPositionChange: (id: string, position: IconPosition) => void;
  onTitleVisibleChange: (id: string, visible: boolean) => void;
  darkMode?: boolean;
}

const ICONS: { type: IconType; symbol: string }[] = [
  { type: 'none', symbol: '○' },
  { type: 'star', symbol: '⭐' },
  { type: 'circle', symbol: '🔴' },
  { type: 'check', symbol: '✅' },
  { type: 'lightning', symbol: '⚡' },
  { type: 'bulb', symbol: '💡' },
  { type: 'question', symbol: '❓' },
];

export const NodeMenu: React.FC<NodeMenuProps> = ({
  node,
  onDelete,
  onColorChange,
  onIconChange,
  onIconPositionChange,
  onTitleVisibleChange,
  darkMode = false
}) => {
  return (
    <div 
      className="mindo-node-menu"
      style={{
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: darkMode ? 'var(--background-secondary)' : 'var(--background-primary)',
        padding: '8px 12px',
        borderRadius: '9999px',
        boxShadow: darkMode 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        zIndex: 90,
        width: 'auto',
        whiteSpace: 'nowrap',
        maxWidth: '95vw',
        overflowX: 'auto',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        transition: 'all 0.3s ease'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Icon Title with Position Toggle */}
        <button
          onClick={() => {
            if (node.icon && node.icon !== 'none') {
              const newPosition = (node.iconPosition === 'corner' || !node.iconPosition) ? 'inline' : 'corner';
              onIconPositionChange(node.id, newPosition);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: node.icon && node.icon !== 'none' ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            boxShadow: 'none',
            outline: 'none',
            appearance: 'none',
            fontSize: '14px',
            color: 'var(--text-muted)',
            fontWeight: '500'
          }}
          title={node.icon && node.icon !== 'none' ? `切换图标位置: ${(node.iconPosition === 'corner' || !node.iconPosition) ? '左上角' : '标题前'}` : '请先选择图标'}
        >
          图标
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {ICONS.map((icon) => {
            const iconTitleMap: Record<IconType, string> = {
              none: '无',
              star: '收藏',
              circle: '重要',
              check: '完成',
              lightning: '紧急',
              bulb: '想法',
              question: '待定'
            };
            return (
              <button
                key={icon.type}
                onClick={() => onIconChange(node.id, icon.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: node.icon === icon.type ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none',
                  outline: 'none',
                  appearance: 'none',
                  position: 'relative'
                }}
                title={iconTitleMap[icon.type]}
              >
                <span style={{ fontSize: '16px' }}>{icon.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Palette size={16} color="var(--text-muted)" />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(node.id, color)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                border: node.color === color ? '2px solid var(--text-normal)' : '2px solid transparent',
                backgroundColor: NODE_STYLES[color].picker,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                transform: node.color === color ? 'scale(1.1)' : 'scale(1)',
                padding: 0,
                flexShrink: 0,
                boxShadow: 'none',
                outline: 'none',
                appearance: 'none'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Title Visibility Toggle */}
      <button
        onClick={() => onTitleVisibleChange(node.id, !(node.titleVisible !== false))}
        disabled={!(node.content && node.content.trim().length > 0) && node.type !== 'image'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: node.titleVisible !== false ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          color: 'var(--text-normal)',
          cursor: (!(node.content && node.content.trim().length > 0) && node.type !== 'image') ? 'not-allowed' : 'pointer',
          opacity: (!(node.content && node.content.trim().length > 0) && node.type !== 'image') ? 0.5 : 1,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          boxShadow: 'none',
          outline: 'none',
          appearance: 'none'
        }}
        title={!(node.content && node.content.trim().length > 0) && node.type !== 'image' ? '需要有内容才能隐藏标题' : (node.titleVisible !== false ? '隐藏标题' : '显示标题')}
      >
        <SeparatorHorizontal size={16} />
      </button>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--text-normal)',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          boxShadow: 'none',
          outline: 'none',
          appearance: 'none'
        }}
        title="删除节点"
      >
        <Trash2 size={14} />
        <span>删除</span>
      </button>
    </div>
  );
};
