import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ContextMenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  subItems?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  isVisible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  darkMode?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isVisible,
  onClose,
  items,
  darkMode = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openSubMenu, setOpenSubMenu] = useState<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
        setOpenSubMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        setOpenSubMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const renderMenuItem = (item: ContextMenuItem, index: number) => (
    <div key={index}>
      <div
        className={`mindo-context-menu-item ${item.disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!item.disabled && item.onClick) {
            item.onClick();
            onClose();
            setOpenSubMenu(null);
          }
        }}
        style={{
          padding: '8px 16px',
          cursor: item.subItems ? 'pointer' : (item.disabled ? 'not-allowed' : 'pointer'),
          color: item.disabled ? 'var(--text-muted)' : 'var(--text-normal)',
          fontSize: '14px',
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        onMouseEnter={(e) => {
          if (!item.disabled) {
            e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
            if (item.subItems) {
              setOpenSubMenu(index);
            }
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {item.label}
        {item.subItems && <span style={{ marginLeft: '8px' }}>▶</span>}
      </div>
      
      {item.subItems && openSubMenu === index && (
        <div
          className={`mindo-context-submenu ${darkMode ? 'dark' : ''}`}
          style={{
            position: 'absolute',
            left: '100%',
            top: `${index * 36}px`,
            zIndex: 10001,
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '4px 0',
            minWidth: '180px',
            pointerEvents: 'auto'
          }}
        >
          {item.subItems.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
        </div>
      )}
    </div>
  );

  const menuElement = (
    <div
      ref={menuRef}
      className={`mindo-context-menu ${darkMode ? 'dark' : ''}`}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        backgroundColor: 'var(--background-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '4px 0',
        minWidth: '180px',
        pointerEvents: 'auto'
      }}
    >
      {items.map((item, index) => renderMenuItem(item, index))}
    </div>
  );

  return ReactDOM.createPortal(menuElement, document.body);
};
