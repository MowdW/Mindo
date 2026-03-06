
import React, { useState, useEffect } from 'react';
import { MindMapEdge, MindMapNode, Position, EDGE_COLORS, EdgeType, ViewportTransform } from '../types';
import { getEdgePath, getHandlePosition, getBezierMidpoint, getQuadraticAngleAtT, getCubicAngleAtT, screenToWorld } from '../utils/geometry';
import { Trash2, Type, ArrowLeftRight, Activity, Spline, ArrowUpRight, GitCommitHorizontal, Tag } from 'lucide-react';

interface EdgeComponentProps {
  edge: MindMapEdge;
  // 旧的使用方式
  sourceNode?: MindMapNode;
  targetNode?: MindMapNode;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent, id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<MindMapEdge>) => void;
  onInteractStart?: () => void;
  transform?: ViewportTransform;
  // 新的使用方式
  nodes?: MindMapNode[];
  onEdgeSelect?: (e: React.MouseEvent, id: string) => void;
  onEdgeReconnectStart?: (e: React.MouseEvent, edgeId: string, which: 'from' | 'to') => void;
  selectedEdgeId?: string | null;
  darkMode?: boolean;
}

export const EdgeComponent: React.FC<EdgeComponentProps> = ({
  edge,
  // 旧的使用方式
  sourceNode,
  targetNode,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  onInteractStart,
  transform = { x: 0, y: 0, scale: 1 },
  // 新的使用方式
  nodes,
  onEdgeSelect,
  onEdgeReconnectStart,
  selectedEdgeId,
  darkMode
}) => {
  // 兼容两种使用方式
  const finalSourceNode = sourceNode || (nodes ? nodes.find(n => n.id === edge.from) : undefined);
  const finalTargetNode = targetNode || (nodes ? nodes.find(n => n.id === edge.to) : undefined);
  const finalIsSelected = isSelected !== undefined ? isSelected : (selectedEdgeId === edge.id);
  const finalOnSelect = onSelect || onEdgeSelect || (() => {});
  const finalOnDelete = onDelete || (() => {});
  const finalOnUpdate = onUpdate || (() => {});
  const finalOnInteractStart = onInteractStart || (() => {});
  const [isHovered, setIsHovered] = useState(false);
  const scale = transform.scale;
  
  // 如果找不到源节点或目标节点，返回 null
  if (!finalSourceNode || !finalTargetNode) {
    return null;
  }
  
  // Calculate geometric points
  const start = getHandlePosition(finalSourceNode, edge.fromHandle);
  const end = getHandlePosition(finalTargetNode, edge.toHandle);
  
  // Backwards compatibility for single control point
  const breakpoints = edge.breakpoints || (edge.controlPoint ? [edge.controlPoint] : []);

  // Path Generation
  const pathD = getEdgePath(finalSourceNode, finalTargetNode, edge.fromHandle, edge.toHandle, edge.controlPoint, edge.type, breakpoints);
  
  const strokeColor = edge.color || '#94a3b8';
  const strokeWidth = finalIsSelected || isHovered ? 3 : 2;
  const strokeDashArray = edge.style === 'dashed' ? '5,5' : edge.style === 'dotted' ? '2,2' : 'none';

  // --- Arrow Logic ---
  const renderArrow = (position: 'start' | 'end') => {
      let angle = 0;
      let pos = { x: 0, y: 0 };
      const arrowType = edge.type || 'bezier';

      if (arrowType === 'step') {
           if (position === 'start') {
               pos = start;
               switch (edge.fromHandle) {
                   case 'top': angle = 90; break;     // Line goes Up, Arrow points Down at node
                   case 'bottom': angle = 270; break; // Line goes Down, Arrow points Up at node
                   case 'left': angle = 0; break;     // Line goes Left, Arrow points Right at node
                   case 'right': angle = 180; break;  // Line goes Right, Arrow points Left at node
               }
           } else {
               pos = end;
               switch (edge.toHandle) {
                   case 'top': angle = 90; break;     // Line enters from Top, Arrow points Down
                   case 'bottom': angle = 270; break; // Line enters from Bottom, Arrow points Up
                   case 'left': angle = 0; break;     // Line enters from Left, Arrow points Right
                   case 'right': angle = 180; break;  // Line enters from Right, Arrow points Left
               }
           }
      } else if (arrowType === 'straight') {
          // Straight / Polyline Logic
          if (position === 'start') {
             const target = breakpoints.length > 0 ? breakpoints[0] : end;
             angle = Math.atan2(target.y - start.y, target.x - start.x) * (180 / Math.PI) + 180;
             pos = start;
          } else {
             const source = breakpoints.length > 0 ? breakpoints[breakpoints.length - 1] : start;
             angle = Math.atan2(end.y - source.y, end.x - source.x) * (180 / Math.PI);
             pos = end;
          }
      } else if (breakpoints.length === 1) {
          // Quadratic Arrow Calculation
          const cp = breakpoints[0];
          if (position === 'start') {
             angle = getQuadraticAngleAtT(start, cp, end, 0) + 180;
             pos = start;
          } else {
             angle = getQuadraticAngleAtT(start, cp, end, 1);
             pos = end;
          }
      } else {
           // Cubic Arrow Calculation (Approximated)
           const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
           const controlOffset = Math.min(dist * 0.5, 100);
           let cp1 = { ...start };
           let cp2 = { ...end };
           
           if(edge.fromHandle === 'top') cp1.y -= controlOffset;
           if(edge.fromHandle === 'bottom') cp1.y += controlOffset;
           if(edge.fromHandle === 'left') cp1.x -= controlOffset;
           if(edge.fromHandle === 'right') cp1.x += controlOffset;
           
           if(edge.toHandle === 'top') cp2.y -= controlOffset;
           if(edge.toHandle === 'bottom') cp2.y += controlOffset;
           if(edge.toHandle === 'left') cp2.x -= controlOffset;
           if(edge.toHandle === 'right') cp2.x += controlOffset;

           if (position === 'start') {
               angle = getCubicAngleAtT(start, cp1, cp2, end, 0) + 180;
               pos = start;
           } else {
               angle = getCubicAngleAtT(start, cp1, cp2, end, 1);
               pos = end;
           }
      }

      return (
        <path
            d="M 0 0 L -10 -5 L -10 5 Z"
            fill={strokeColor}
            transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}
            pointerEvents="none"
        />
      );
  };

  const showStartArrow = edge.arrow === 'from' || edge.arrow === 'both';
  const showEndArrow = edge.arrow === 'to' || edge.arrow === 'both' || !edge.arrow; // Default to 'to'

  // --- Event Handlers ---
  const handleMouseDownBreakpoint = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      e.preventDefault();
      
      if(finalOnInteractStart) finalOnInteractStart();

      const startX = e.clientX;
      const startY = e.clientY;
      const initialPoint = breakpoints[index];

      const handleMouseMove = (mv: MouseEvent) => {
          const dx = (mv.clientX - startX) / scale;
          const dy = (mv.clientY - startY) / scale;
          
          const newBreakpoints = [...breakpoints];
          newBreakpoints[index] = {
              x: initialPoint.x + dx,
              y: initialPoint.y + dy
          };

          finalOnUpdate(edge.id, { breakpoints: newBreakpoints, controlPoint: undefined });
      };
      
      const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClickLine = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(finalOnInteractStart) finalOnInteractStart();
      
      const worldPos = screenToWorld({ x: e.clientX, y: e.clientY }, transform);
      const newType = edge.type === 'step' ? 'straight' : (edge.type || 'bezier');
      
      finalOnUpdate(edge.id, {
          type: newType,
          breakpoints: [...breakpoints, worldPos],
          controlPoint: undefined 
      });
  };

  const handleDoubleClickBreakpoint = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if(finalOnInteractStart) finalOnInteractStart();

      const newBreakpoints = breakpoints.filter((_, i) => i !== index);
      finalOnUpdate(edge.id, { breakpoints: newBreakpoints });
  };

  return (
    <g 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
        className="group"
    >
        {/* Hit Area */}
        <path
            d={pathD}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            cursor="pointer"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => finalOnSelect(e, edge.id)}
            onDoubleClick={handleDoubleClickLine}
        />

        {/* Visible Path */}
        <path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDashArray}
            fill="none"
            pointerEvents="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
                filter: finalIsSelected ? `drop-shadow(0 0 3px ${strokeColor})` : 'none',
                opacity: isHovered || finalIsSelected ? 1 : 0.8
            }}
        />

        {/* Arrows */}
        {showStartArrow && renderArrow('start')}
        {showEndArrow && renderArrow('end')}

        {/* Breakpoints / Controls */}
        {finalIsSelected && edge.type !== 'step' && (
            <>
                {breakpoints.map((bp, index) => (
                    <circle
                        key={index}
                        cx={bp.x}
                        cy={bp.y}
                        r={6}
                        fill="white"
                        stroke={strokeColor}
                        strokeWidth={2}
                        cursor="move"
                        onMouseDown={(e) => handleMouseDownBreakpoint(e, index)}
                        onDoubleClick={(e) => handleDoubleClickBreakpoint(e, index)}
                        style={{ pointerEvents: 'auto' }}
                    />
                ))}
            </>
        )}
    </g>
  );
};

// Seperate Component for Label (HTML Layer)
export const EdgeLabel: React.FC<{
    edge: MindMapEdge;
    sourceNode: MindMapNode;
    targetNode: MindMapNode;
    onSelect: (e: React.MouseEvent, id: string) => void;
    darkMode?: boolean;
}> = ({ edge, sourceNode, targetNode, onSelect, darkMode = false }) => {
    if (!edge.label) return null;

    const start = getHandlePosition(sourceNode, edge.fromHandle);
    const end = getHandlePosition(targetNode, edge.toHandle);
    const breakpoints = edge.breakpoints || (edge.controlPoint ? [edge.controlPoint] : []);
    const midPoint = getBezierMidpoint(start, end, edge.fromHandle, edge.toHandle, edge.controlPoint, edge.type, breakpoints);
    const strokeColor = edge.color || '#94a3b8';

    return (
        <div 
            style={{
                position: 'absolute',
                left: `${midPoint.x}px`,
                top: `${midPoint.y}px`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', // Allow clicking through empty areas of container div
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20
            }}
        >
             <div 
                className={`mindo-edge-label ${edge.labelStyle === 'border' ? 'border' : 'plain'}`}
                onMouseDown={(e) => { e.stopPropagation(); onSelect(e, edge.id); }}
                style={{
                    // Apply dynamic colors for the 'border' style
                    borderColor: edge.labelStyle === 'border' ? strokeColor : undefined,
                    borderWidth: edge.labelStyle === 'border' ? '1.5px' : undefined,
                    borderStyle: edge.labelStyle === 'border' ? 'solid' : undefined,
                    color: edge.labelStyle === 'border' ? strokeColor : undefined,
                    backgroundColor: 'var(--background-primary)',
                    pointerEvents: 'auto', // Re-enable pointer events for the label
                    padding: edge.labelStyle === 'border' ? '3px 8px' : '2px 4px',
                    borderRadius: edge.labelStyle === 'border' ? '6px' : '0px',
                }}
            >
                {edge.label}
            </div>
        </div>
    );
}

export const EdgeMenu: React.FC<{
    edge: MindMapEdge;
    onUpdate: (id: string, updates: Partial<MindMapEdge>) => void;
    onDelete: (id: string) => void;
}> = ({ edge, onUpdate, onDelete }) => {
    const [labelInput, setLabelInput] = useState(edge.label || '');

    useEffect(() => {
        setLabelInput(edge.label || '');
    }, [edge.id, edge.label]);

    const toggleArrow = () => {
        const sequence: MindMapEdge['arrow'][] = ['to', 'both', 'from', 'none'];
        const currentIdx = sequence.indexOf(edge.arrow || 'to');
        onUpdate(edge.id, { arrow: sequence[(currentIdx + 1) % sequence.length] });
    };

    const toggleStyle = () => {
        const styles: MindMapEdge['style'][] = ['solid', 'dashed', 'dotted'];
        const currentIdx = styles.indexOf(edge.style || 'solid');
        onUpdate(edge.id, { style: styles[(currentIdx + 1) % styles.length] });
    };

    const toggleLabelStyle = () => {
        const newStyle = edge.labelStyle === 'border' ? 'plain' : 'border';
        onUpdate(edge.id, { labelStyle: newStyle });
    };

    const setType = (type: EdgeType) => {
        onUpdate(edge.id, { type });
    };

    return (
        <div 
            className="mindo-edge-menu"
            onMouseDown={e => e.stopPropagation()} 
        >
             {/* Label Input */}
             <div className="mindo-edge-label-input">
                <Type size={14} color="#9ca3af" />
                <input 
                    placeholder="标签..."
                    value={labelInput}
                    onChange={(e) => {
                        setLabelInput(e.target.value);
                        onUpdate(edge.id, { label: e.target.value });
                    }}
                />
            </div>

            {/* Line Type Selector */}
            <div className="mindo-edge-type-group">
                <button 
                    onClick={() => setType('bezier')}
                    className={`mindo-edge-type-btn ${(!edge.type || edge.type === 'bezier') ? 'active' : ''}`}
                    title="曲线"
                >
                    <Spline size={16} />
                </button>
                <button 
                    onClick={() => setType('straight')}
                    className={`mindo-edge-type-btn ${edge.type === 'straight' ? 'active' : ''}`}
                    title="直线"
                >
                    <ArrowUpRight size={16} />
                </button>
                <button 
                    onClick={() => setType('step')}
                    className={`mindo-edge-type-btn ${edge.type === 'step' ? 'active' : ''}`}
                    title="直角/折线"
                >
                    <GitCommitHorizontal size={16} />
                </button>
            </div>

            {/* Colors */}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' }}>
                {EDGE_COLORS.map(c => (
                    <button
                        key={c}
                        style={{ 
                            width: '1.25rem', 
                            height: '1.25rem', 
                            borderRadius: '9999px', 
                            border: edge.color === c ? '2px solid #9ca3af' : '2px solid transparent',
                            backgroundColor: c,
                            cursor: 'pointer',
                            transform: edge.color === c ? 'scale(1.1)' : 'scale(1)',
                            transition: 'transform 0.2s',
                            padding: 0,
                            flexShrink: 0
                        }}
                        onClick={() => onUpdate(edge.id, { color: c })}
                        title={c}
                    />
                ))}
            </div>

            {/* Actions */}
            <div className="mindo-edge-menu-row">
                 {/* Label Style Toggle */}
                <button
                    onClick={toggleLabelStyle}
                    className={`mindo-edge-action-btn ${edge.labelStyle === 'border' ? 'active' : ''}`}
                    title="切换标签样式 (边框/无)"
                    style={{ backgroundColor: edge.labelStyle === 'border' ? 'rgba(0,0,0,0.05)' : 'transparent' }}
                >
                    <Tag size={16} />
                    <span>边框</span>
                </button>

                <button 
                    onClick={toggleArrow} 
                    className="mindo-edge-action-btn" 
                    title="切换箭头方向"
                >
                    <ArrowLeftRight size={16} />
                    <span>箭头</span>
                </button>
                <button 
                    onClick={toggleStyle} 
                    className="mindo-edge-action-btn" 
                    title="切换线条样式"
                >
                    <Activity size={16} />
                    <span>样式</span>
                </button>
                <button 
                    onClick={() => onDelete(edge.id)} 
                    className="mindo-edge-action-btn delete" 
                    title="删除连接"
                >
                    <Trash2 size={16} />
                    <span>删除</span>
                </button>
            </div>
        </div>
    );
}
