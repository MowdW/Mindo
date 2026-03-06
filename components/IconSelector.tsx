import React from 'react';
import { IconType } from '../types';

interface IconSelectorProps {
  onSelectIcon: (icon: IconType) => void;
  onClose: () => void;
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

export const IconSelector: React.FC<IconSelectorProps> = ({
  onSelectIcon,
  onClose,
  darkMode = false
}) => {
  return (
    <div 
      className="mindo-icon-selector-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20000
      }}
      onClick={onClose}
    >
      <div 
        className="mindo-icon-selector"
        style={{
          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          minWidth: '240px',
          maxWidth: '320px',
          zIndex: 20001
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}
        >
          <h3 style={{ 
            margin: 0, 
            color: darkMode ? '#e5e7eb' : '#111827',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            选择图标
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: darkMode ? '#9ca3af' : '#6b7280',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}
        >
          {ICONS.map((icon) => (
            <button
              key={icon.type}
              onClick={() => onSelectIcon(icon.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                borderRadius: '6px',
                border: `2px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                aspectRatio: '1/1'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '28px' }}>{icon.symbol}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
