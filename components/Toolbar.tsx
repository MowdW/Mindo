import React, { useState } from 'react';
import { Minus, Plus, Maximize, Sparkles, RefreshCcw, Image as ImageIcon, BoxSelect, AlignCenterHorizontal, AlignCenterVertical, ChevronDown, FileText, RotateCcw, RotateCw, LayoutGrid, FileCode, Grid, Layers, Zap, Settings, Sliders } from 'lucide-react';

interface ToolbarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAddGroup: () => void;
  onOpenImageOperationModal: () => void;
  onExportMarkdown: () => void;
  onToggleView: () => void;
  currentView: 'mindmap' | 'markdown';
  onAlign?: (direction: 'horizontal' | 'vertical') => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAutoLayout?: () => void;
  onBackgroundChange?: (pattern: 'none' | 'dots' | 'grid' | 'lines') => void;
  currentBackground?: 'none' | 'dots' | 'grid' | 'lines';
  layoutSettings?: {
    repulsionForce: number;
    attractionForce: number;
    minDistance: number;
    iterations: number;
  };
  onLayoutSettingsChange?: (settings: {
    repulsionForce: number;
    attractionForce: number;
    minDistance: number;
    iterations: number;
  }) => void;
  canGroup: boolean;
  canAlign?: boolean;
  hasSingleSelection: boolean;
  nodeCount: number;
  snapToGrid?: boolean;
  onSnapToGridChange?: (value: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddGroup,
  onOpenImageOperationModal,
  onExportMarkdown,
  onToggleView,
  currentView,
  onAlign,
  onUndo,
  onRedo,
  onAutoLayout,
  onBackgroundChange,
  currentBackground,
  layoutSettings,
  onLayoutSettingsChange,
  canGroup,
  canAlign,
  hasSingleSelection,
  nodeCount,
  snapToGrid = true,
  onSnapToGridChange
}) => {
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  // Local state for layout settings to handle slider changes
  const [localLayoutSettings, setLocalLayoutSettings] = useState({
    repulsionForce: layoutSettings?.repulsionForce || 25000,
    attractionForce: layoutSettings?.attractionForce || 0.08,
    minDistance: layoutSettings?.minDistance || 100,
    iterations: layoutSettings?.iterations || 80
  });
  
  // Effect to handle clicking outside the layout settings menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Get the layout settings button and menu elements
      const layoutSettingsButton = document.querySelector('.mindo-toolbar-btn[title="布局设置"]');
      const layoutSettingsMenu = document.querySelector('.mindo-select-container > div[style*="position: absolute"]');
      
      // Check if the click is outside both the button and the menu
      if (showLayoutSettings && layoutSettingsButton && layoutSettingsMenu) {
        const target = event.target as HTMLElement;
        if (!layoutSettingsButton.contains(target) && !layoutSettingsMenu.contains(target)) {
          setShowLayoutSettings(false);
        }
      }
    };
    
    // Add event listener when showLayoutSettings is true
    if (showLayoutSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup event listener on unmount or when showLayoutSettings changes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLayoutSettings]);

  return (
    <>
      <div className="mindo-toolbar">
        
        {/* Left: Export */}
        <div className="mindo-toolbar-section">
          <button 
              onClick={onUndo} 
              className="mindo-toolbar-btn" 
              title="撤销 (Ctrl+Z)"
              disabled={!onUndo}
          >
              <RotateCcw size={18} />
          </button>
          <button 
              onClick={onRedo} 
              className="mindo-toolbar-btn" 
              title="重做 (Ctrl+Y)"
              disabled={!onRedo}
          >
              <RotateCw size={18} />
          </button>
          <div className="mindo-toolbar-divider" />
          <button 
              onClick={onOpenImageOperationModal} 
              className="mindo-toolbar-btn" 
              title="图片操作"
          >
              <ImageIcon size={18} />
          </button>

        <button 
            onClick={onExportMarkdown} 
            className="mindo-toolbar-btn" 
            title="导出 Markdown"
        >
            <FileText size={18} />
        </button>
        <button 
            onClick={onToggleView} 
            className="mindo-toolbar-btn" 
            title={currentView === 'mindmap' ? '切换到 Markdown 视图' : '切换到脑图视图'}
        >
            <FileCode size={18} />
        </button>
      </div>

      <div className="mindo-toolbar-divider" />

      {/* Middle-Left: Group & Align */}
      <button 
        onClick={onAddGroup} 
        className={`mindo-toolbar-btn ${!canGroup ? 'disabled' : ''}`} 
        title="编组"
        disabled={!canGroup}
      >
          <BoxSelect size={18} style={{ strokeDasharray: '4 2', opacity: canGroup ? 1 : 0.5 }} />
      </button>

      {canAlign && onAlign && (
          <>
            <button onClick={() => onAlign('horizontal')} className="mindo-toolbar-btn" title="水平对齐">
                <AlignCenterHorizontal size={18} />
            </button>
            <button onClick={() => onAlign('vertical')} className="mindo-toolbar-btn" title="垂直对齐">
                <AlignCenterVertical size={18} />
            </button>
          </>
      )}

      {onAutoLayout && (
          <button onClick={onAutoLayout} className="mindo-toolbar-btn" title="自动布局">
              <LayoutGrid size={18} />
          </button>
      )}
      


      
      {/* Layout Settings */}
      {onLayoutSettingsChange && (
        <div className="mindo-select-container" style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowLayoutSettings(!showLayoutSettings)} 
            className="mindo-toolbar-btn" 
            title="布局设置"
          >
            <Sliders size={18} />
          </button>
          {showLayoutSettings && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'var(--background-primary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '16px',
              minWidth: '300px',
              zIndex: 101
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>布局设置</h3>
              
              {/* 排斥力 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                  <span>排斥力</span>
                  <span>{localLayoutSettings.repulsionForce}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="50000"
                  step="1000"
                  value={localLayoutSettings.repulsionForce}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    setLocalLayoutSettings(prev => ({
                      ...prev,
                      repulsionForce: newValue
                    }));
                    // 立即更新设置
                    onLayoutSettingsChange({
                      ...localLayoutSettings,
                      repulsionForce: newValue
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--background-modifier-border)',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  节点之间的排斥力，值越大节点间距越大。
                </div>
              </div>
              
              {/* 吸引力 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                  <span>吸引力</span>
                  <span>{localLayoutSettings.attractionForce.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.2"
                  step="0.01"
                  value={localLayoutSettings.attractionForce}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value);
                    setLocalLayoutSettings(prev => ({
                      ...prev,
                      attractionForce: newValue
                    }));
                    // 立即更新设置
                    onLayoutSettingsChange({
                      ...localLayoutSettings,
                      attractionForce: newValue
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--background-modifier-border)',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  连接节点之间的吸引力，值越小节点间距越大。
                </div>
              </div>
              
              {/* 最小间距 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                  <span>最小间距</span>
                  <span>{localLayoutSettings.minDistance}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={localLayoutSettings.minDistance}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    setLocalLayoutSettings(prev => ({
                      ...prev,
                      minDistance: newValue
                    }));
                    // 立即更新设置
                    onLayoutSettingsChange({
                      ...localLayoutSettings,
                      minDistance: newValue
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--background-modifier-border)',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  节点之间的最小间距，值越大节点间距越大。
                </div>
              </div>
              
              {/* 迭代次数 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                  <span>迭代次数</span>
                  <span>{localLayoutSettings.iterations}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={localLayoutSettings.iterations}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    setLocalLayoutSettings(prev => ({
                      ...prev,
                      iterations: newValue
                    }));
                    // 立即更新设置
                    onLayoutSettingsChange({
                      ...localLayoutSettings,
                      iterations: newValue
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--background-modifier-border)',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  布局计算的迭代次数，值越大布局越稳定。
                </div>
              </div>
              

            </div>
          )}
        </div>
      )}
      
      <div className="mindo-toolbar-divider" />

      {/* Middle-Right: Zoom */}
      <button onClick={onZoomOut} className="mindo-toolbar-btn" title="缩小">
        <Minus size={16} />
      </button>
      
      <span className="mindo-zoom-text">
        {Math.round(scale * 100)}%
      </span>

      <button onClick={onZoomIn} className="mindo-toolbar-btn" title="放大">
        <Plus size={16} />
      </button>

      {/* Right: View Controls */}
      <div className="mindo-toolbar-divider" />

      <button onClick={onFitView} className="mindo-toolbar-btn" title="适应视图">
        <Maximize size={16} />
      </button>
      
      <div className="mindo-toolbar-divider" />
      
      {/* Background Control */}
      {onBackgroundChange && (
        <div className="mindo-select-container" style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowBackgroundMenu(!showBackgroundMenu)} 
            className="mindo-toolbar-btn" 
            title="背景设置"
          >
            <Grid size={18} />
          </button>
          {showBackgroundMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'var(--background-primary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '4px 0',
              minWidth: '120px',
              zIndex: 101
            }}>
              <div 
                onClick={() => {
                  onBackgroundChange('none');
                  setShowBackgroundMenu(false);
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Zap size={14} />
                <span>无背景</span>
              </div>
              <div 
                onClick={() => {
                  onBackgroundChange('dots');
                  setShowBackgroundMenu(false);
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Grid size={14} />
                <span>点阵</span>
              </div>
              <div 
                onClick={() => {
                  onBackgroundChange('grid');
                  setShowBackgroundMenu(false);
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Layers size={14} />
                <span>网格</span>
              </div>
              <div 
                onClick={() => {
                  onBackgroundChange('lines');
                  setShowBackgroundMenu(false);
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <AlignCenterHorizontal size={14} />
                <span>线条</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mindo-toolbar-divider" />
      
      <div className="mindo-node-count" title="节点数量">
        {nodeCount}
      </div>
    </div>
    </>
  );
};