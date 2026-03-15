import { MindMapNode, MindMapEdge, Position, HandlePosition, EdgeType, EdgeStyle, NODE_STYLES, LayoutType } from '../types';

export const getCenter = (node: MindMapNode): Position => {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getHandlePosition = (node: MindMapNode, handle: HandlePosition): Position => {
  switch (handle) {
    case 'top': return { x: node.x + node.width / 2, y: node.y };
    case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
    case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left': return { x: node.x, y: node.y + node.height / 2 };
    default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }
};

// Find the closest handle on any node to a given point
export const getNearestHandle = (
  point: Position, 
  nodes: MindMapNode[], 
  excludeNodeId: string, 
  threshold: number = 30
): { nodeId: string; handle: HandlePosition } | null => {
  let closest: { nodeId: string; handle: HandlePosition; dist: number } | null = null;

  for (const node of nodes) {
    if (node.id === excludeNodeId) continue;

    const handles: HandlePosition[] = ['top', 'right', 'bottom', 'left'];
    for (const h of handles) {
      const pos = getHandlePosition(node, h);
      const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
      
      if (dist < threshold) {
        if (!closest || dist < closest.dist) {
          closest = { nodeId: node.id, handle: h, dist };
        }
      }
    }
  }

  return closest ? { nodeId: closest.nodeId, handle: closest.handle } : null;
};

// --- Path Generation Strategies ---

// Helper to get critical points for step path to reuse in label calculation
const getStepPoints = (start: Position, end: Position, sourceHandle: HandlePosition, targetHandle: HandlePosition): Position[] => {
    const offset = 20;
    let pStart = { ...start };
    let pEnd = { ...end };
    
    // Calculate intermediate start point based on source handle
    switch(sourceHandle) {
        case 'top': pStart.y -= offset; break;
        case 'bottom': pStart.y += offset; break;
        case 'left': pStart.x -= offset; break;
        case 'right': pStart.x += offset; break;
    }

    // Calculate intermediate end point based on target handle
    switch(targetHandle) {
        case 'top': pEnd.y -= offset; break;
        case 'bottom': pEnd.y += offset; break;
        case 'left': pEnd.x -= offset; break;
        case 'right': pEnd.x += offset; break;
    }

    const midX = (pStart.x + pEnd.x) / 2;
    const midY = (pStart.y + pEnd.y) / 2;
    const startVertical = sourceHandle === 'top' || sourceHandle === 'bottom';
    const endVertical = targetHandle === 'top' || targetHandle === 'bottom';

    const points: Position[] = [start, pStart];

    if (startVertical === endVertical) {
        if (startVertical) {
             // Both vertical
             if ((sourceHandle === 'bottom' && pEnd.y > pStart.y) || (sourceHandle === 'top' && pEnd.y < pStart.y)) {
                 points.push({ x: pStart.x, y: midY });
                 points.push({ x: pEnd.x, y: midY });
             } else {
                 points.push({ x: pStart.x, y: midY });
                 points.push({ x: pEnd.x, y: midY });
             }
        } else {
            // Both horizontal
            points.push({ x: midX, y: pStart.y });
            points.push({ x: midX, y: pEnd.y });
        }
    } else {
        if (startVertical) {
             // Start Vertical, End Horizontal
             points.push({ x: pStart.x, y: pEnd.y });
        } else {
             // Start Horizontal, End Vertical
             points.push({ x: pEnd.x, y: pStart.y });
        }
    }

    points.push(pEnd);
    points.push(end);
    return points;
};

const getStepPath = (start: Position, end: Position, sourceHandle: HandlePosition, targetHandle: HandlePosition): string => {
    const points = getStepPoints(start, end, sourceHandle, targetHandle);
    // 从start开始，到end结束，但使用中间的控制点
    let d = `M ${start.x} ${start.y}`;
    for (let i = 1; i < points.length - 1; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ` L ${end.x} ${end.y}`;
    return d;
};

const getPolylinePath = (start: Position, end: Position, breakpoints: Position[]): string => {
    let d = `M ${start.x} ${start.y}`;
    breakpoints.forEach(p => {
        d += ` L ${p.x} ${p.y}`;
    });
    d += ` L ${end.x} ${end.y}`;
    return d;
};

// Calculate a smooth cubic bezier curve
export const getEdgePath = (
  source: MindMapNode, 
  target: MindMapNode, 
  sourceHandle: HandlePosition, 
  targetHandle: HandlePosition,
  manualControlPoint?: Position,
  type: EdgeType = 'bezier',
  breakpoints: Position[] = []
): string => {
  const start = getHandlePosition(source, sourceHandle);
  const end = getHandlePosition(target, targetHandle);

  if (type === 'step') {
      return getStepPath(start, end, sourceHandle, targetHandle);
  }

  if (type === 'straight') {
      return getPolylinePath(start, end, breakpoints);
  }

  // Type: Bezier (Default)
  if (breakpoints.length > 0) {
      if (breakpoints.length === 1 && !manualControlPoint) {
         return `M ${start.x} ${start.y} Q ${breakpoints[0].x} ${breakpoints[0].y} ${end.x} ${end.y}`;
      }
      return getPolylinePath(start, end, breakpoints);
  }

  if (manualControlPoint) {
      return `M ${start.x} ${start.y} Q ${manualControlPoint.x} ${manualControlPoint.y} ${end.x} ${end.y}`;
  }

  const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  const controlOffset = Math.min(dist * 0.5, 100);

  let cp1 = { ...start };
  let cp2 = { ...end };

  switch (sourceHandle) {
    case 'top': cp1.y -= controlOffset; break;
    case 'bottom': cp1.y += controlOffset; break;
    case 'left': cp1.x -= controlOffset; break;
    case 'right': cp1.x += controlOffset; break;
  }

  switch (targetHandle) {
    case 'top': cp2.y -= controlOffset; break;
    case 'bottom': cp2.y += controlOffset; break;
    case 'left': cp2.x -= controlOffset; break;
    case 'right': cp2.x += controlOffset; break;
  }

  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
};

// Calculate the point at t=0.5 for the label position
export const getBezierMidpoint = (
    start: Position, 
    end: Position, 
    sourceHandle: HandlePosition, 
    targetHandle: HandlePosition,
    manualControlPoint?: Position,
    type: EdgeType = 'bezier',
    breakpoints: Position[] = []
): Position => {
    // FIX: Calculate actual center of the Step path segments
    if (type === 'step') {
        const points = getStepPoints(start, end, sourceHandle, targetHandle);
        // Step paths usually have an even number of points (Start, pStart, corner(s), pEnd, End)
        // We want the visual center.
        if (points.length >= 2) {
             // Find the middle segment
             const totalPoints = points.length;
             const midIndex = Math.floor((totalPoints - 1) / 2);
             const p1 = points[midIndex];
             const p2 = points[midIndex + 1];
             return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        }
        return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    }
    
    if (breakpoints.length === 1) {
        const t = 0.5;
        const cp = breakpoints[0];
        const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cp.x + t * t * end.x;
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cp.y + t * t * end.y;
        return { x, y };
    }

    if (breakpoints.length > 1) {
        const midIdx = Math.floor(breakpoints.length / 2);
        const p1 = breakpoints[midIdx];
        const p2 = breakpoints[midIdx + 1] || end;
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }; 
    }

    if (manualControlPoint) {
        const t = 0.5;
        const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * manualControlPoint.x + t * t * end.x;
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * manualControlPoint.y + t * t * end.y;
        return { x, y };
    }

    // Cubic Approximation for label
    const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const controlOffset = Math.min(dist * 0.5, 100);
    
    let cp1 = { ...start };
    let cp2 = { ...end };
    
    if(sourceHandle === 'top') cp1.y -= controlOffset;
    if(sourceHandle === 'bottom') cp1.y += controlOffset;
    if(sourceHandle === 'left') cp1.x -= controlOffset;
    if(sourceHandle === 'right') cp1.x += controlOffset;
    
    if(targetHandle === 'top') cp2.y -= controlOffset;
    if(targetHandle === 'bottom') cp2.y += controlOffset;
    if(targetHandle === 'left') cp2.x -= controlOffset;
    if(targetHandle === 'right') cp2.x += controlOffset;

    const t = 0.5;
    const x = Math.pow(1-t,3)*start.x + 3*Math.pow(1-t,2)*t*cp1.x + 3*(1-t)*t*t*cp2.x + t*t*t*end.x;
    const y = Math.pow(1-t,3)*start.y + 3*Math.pow(1-t,2)*t*cp1.y + 3*(1-t)*t*t*cp2.y + t*t*t*end.y;
    return { x, y };
};

// Calculate angle for arrows
export const getQuadraticAngleAtT = (start: Position, cp: Position, end: Position, t: number): number => {
    const dx = 2 * (1 - t) * (cp.x - start.x) + 2 * t * (end.x - cp.x);
    const dy = 2 * (1 - t) * (cp.y - start.y) + 2 * t * (end.y - cp.y);
    return Math.atan2(dy, dx) * (180 / Math.PI);
};

// Simplified cubic angle at endpoints
export const getCubicAngleAtT = (start: Position, cp1: Position, cp2: Position, end: Position, t: number): number => {
    // Derivative of Cubic Bezier
    const dx = 3 * Math.pow(1 - t, 2) * (cp1.x - start.x) + 
               6 * (1 - t) * t * (cp2.x - cp1.x) + 
               3 * Math.pow(t, 2) * (end.x - cp2.x);
    const dy = 3 * Math.pow(1 - t, 2) * (cp1.y - start.y) + 
               6 * (1 - t) * t * (cp2.y - cp1.y) + 
               3 * Math.pow(t, 2) * (end.y - cp2.y);
    return Math.atan2(dy, dx) * (180 / Math.PI);
};

// Find the closest pair of handles between two nodes
export const getClosestHandlePair = (
  sourceNode: MindMapNode, 
  targetNode: MindMapNode
): { sourceHandle: HandlePosition; targetHandle: HandlePosition } => {
  const handles: HandlePosition[] = ['top', 'right', 'bottom', 'left'];
  let closestPair: { sourceHandle: HandlePosition; targetHandle: HandlePosition; distance: number } | null = null;

  for (const sourceHandle of handles) {
    for (const targetHandle of handles) {
      const sourcePos = getHandlePosition(sourceNode, sourceHandle);
      const targetPos = getHandlePosition(targetNode, targetHandle);
      const distance = Math.sqrt(
        Math.pow(sourcePos.x - targetPos.x, 2) + 
        Math.pow(sourcePos.y - targetPos.y, 2)
      );

      if (!closestPair || distance < closestPair.distance) {
        closestPair = {
          sourceHandle,
          targetHandle,
          distance
        };
      }
    }
  }

  return {
    sourceHandle: closestPair!.sourceHandle,
    targetHandle: closestPair!.targetHandle
  };
};

export const screenToWorld = (screenPos: Position, transform: { x: number; y: number; scale: number }): Position => {
  return {
    x: (screenPos.x - transform.x) / transform.scale,
    y: (screenPos.y - transform.y) / transform.scale,
  };
};



// Calculate relationship weights based on node and edge properties
export const calculateRelationshipWeights = (nodes: MindMapNode[], edges: MindMapEdge[]): MindMapEdge[] => {
  return edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.from);
    const targetNode = nodes.find(n => n.id === edge.to);
    let relationshipType: 'parent-child' | 'sibling' | 'association' | 'causal' = 'association';
    let weight = 0.5; // Default weight
    
    // Determine relationship type
    if (sourceNode && targetNode) {
      if (targetNode.parentId === sourceNode.id) {
        relationshipType = 'parent-child';
        weight = 1.0; // Strongest relationship
      } else if (sourceNode.parentId && sourceNode.parentId === targetNode.parentId) {
        relationshipType = 'sibling';
        weight = 0.7; // Medium relationship
      } else if (edge.label && (edge.label.includes('因果') || edge.label.includes('导致') || edge.label.includes('因为') || edge.label.includes('所以'))) {
        relationshipType = 'causal';
        weight = 0.9; // Strong relationship
      } else {
        relationshipType = 'association';
        weight = 0.3; // Weak relationship
      }
    }
    
    return {
      ...edge,
      relationshipType,
      weight
    };
  });
};

// Update edge styles based on relationship type and layout needs
export const updateEdgeStyles = (edges: MindMapEdge[], nodes: MindMapNode[]): MindMapEdge[] => {
  return edges.map(edge => {
    // 如果边缘已经有类型信息，保持不变
    if (edge.type) {
      return edge;
    }
    
    const sourceNode = nodes.find(n => n.id === edge.from);
    const targetNode = nodes.find(n => n.id === edge.to);
    let style: EdgeStyle = 'solid';
    let color: string = '#a3a3a3'; // Default gray
    let type: EdgeType = 'bezier'; // Default curve
    
    // Determine relationship type if not already set
    let relationshipType = edge.relationshipType || 'association';
    if (!edge.relationshipType && sourceNode && targetNode) {
      if (targetNode.parentId === sourceNode.id) {
        relationshipType = 'parent-child';
      } else if (sourceNode.parentId && sourceNode.parentId === targetNode.parentId) {
        relationshipType = 'sibling';
      } else if (edge.label && (edge.label.includes('因果') || edge.label.includes('导致'))) {
        relationshipType = 'causal';
      }
    }
    
    // Set style based on relationship type
    switch (relationshipType) {
      case 'parent-child':
        style = 'solid';
        break;
      case 'sibling':
        style = 'dashed';
        break;
      case 'causal':
        style = 'solid';
        break;
      default: // association
        style = 'dotted';
    }
    
    // Set color based on node hierarchy
    if (sourceNode && targetNode) {
      switch (relationshipType) {
        case 'parent-child':
          // Parent-child connection: use parent node color
          if (targetNode.parentId === sourceNode.id) {
            // Source is parent, target is child
            color = NODE_STYLES[sourceNode.color].picker;
          } else if (sourceNode.parentId === targetNode.id) {
            // Target is parent, source is child
            color = NODE_STYLES[targetNode.color].picker;
          }
          break;
        case 'sibling':
          // Sibling connection: use child node color (either source or target)
          color = NODE_STYLES[sourceNode.color].picker;
          break;
        case 'causal':
          // Causal connection: use source node color
          color = NODE_STYLES[sourceNode.color].picker;
          break;
        default: // association
          // Association: use average color or source color
          color = NODE_STYLES[sourceNode.color].picker;
      }
    }
    
    // Set edge type based on distance
    if (sourceNode && targetNode) {
      const distance = Math.sqrt(
        Math.pow(targetNode.x - sourceNode.x, 2) + Math.pow(targetNode.y - sourceNode.y, 2)
      );
      
      if (distance < 100) {
        type = 'straight'; // Short distance
      } else if (distance > 300) {
        type = 'step'; // Long distance
      }
    }
    
    return {
      ...edge,
      style,
      color,
      type,
      relationshipType
    };
  });
};

// Node layout structure for hierarchical layout
interface NodeLayout {
  node: MindMapNode;
  x: number;
  y: number;
  mod: number;
  thread: NodeLayout | null;
  parent: NodeLayout | null;
  children: NodeLayout[];
  left: NodeLayout | null;
  right: NodeLayout | null;
  ancestor: NodeLayout;
  change: number;
  shift: number;
}

// Calculate automatic layout for mind map nodes
export const calculateAutomaticLayout = (
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  layoutType: LayoutType = LayoutType.MIND_MAP,
  layoutParams?: {
    repulsionForce?: number;
    attractionForce?: number;
    minDistance?: number;
    iterations?: number;
  }
): MindMapNode[] => {
  // Check if we have non-tree edges
  const hasNonTreeEdges = edges.some(edge => {
    const sourceNode = nodes.find(n => n.id === edge.from);
    const targetNode = nodes.find(n => n.id === edge.to);
    return !sourceNode?.parentId || !targetNode?.parentId || sourceNode.parentId !== targetNode.parentId;
  });

  // If we have non-tree edges, use force-directed layout
  if (hasNonTreeEdges) {
    return applyForceDirectedLayout(nodes, edges, layoutParams);
  }

  // Build parent-child relationships
  const parentChildMap = new Map<string, string[]>();
  const childParentMap = new Map<string, string>();
  const rootNodes: string[] = [];

  // Initialize parent-child map
  nodes.forEach(node => {
    if (node.parentId) {
      if (!parentChildMap.has(node.parentId)) {
        parentChildMap.set(node.parentId, []);
      }
      parentChildMap.get(node.parentId)!.push(node.id);
      childParentMap.set(node.id, node.parentId);
    } else {
      rootNodes.push(node.id);
    }
  });

  // Calculate node depths (levels)
  const nodeDepths = new Map<string, number>();
  
  const calculateDepth = (nodeId: string, depth: number = 0) => {
    nodeDepths.set(nodeId, depth);
    const children = parentChildMap.get(nodeId) || [];
    children.forEach(childId => {
      calculateDepth(childId, depth + 1);
    });
  };
  
  rootNodes.forEach(rootId => calculateDepth(rootId));

  // Get node by ID
  const getNodeById = (id: string): MindMapNode | undefined => {
    return nodes.find(node => node.id === id);
  };

  // Create node layout structure
  const createNodeLayout = (node: MindMapNode, parent: NodeLayout | null): NodeLayout => {
    return {
      node,
      x: 0,
      y: nodeDepths.get(node.id) || 0,
      mod: 0,
      thread: null,
      parent,
      children: [],
      left: null,
      right: null,
      ancestor: null!,
      change: 0,
      shift: 0
    };
  };

  // Build node layout tree
  const buildLayoutTree = (nodeId: string, parent: NodeLayout | null): NodeLayout => {
    const node = getNodeById(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const layoutNode = createNodeLayout(node, parent);
    const children = parentChildMap.get(nodeId) || [];

    // If this node is a group, treat it as a single unit for layout:
    // do NOT recurse into its children here so the group and its contents
    // move together as a unit during automatic layout. Children will be
    // adjusted later based on the group's new position.
    if (node.type === 'group') {
      return layoutNode;
    }

    // Process children recursively for non-group nodes
    if (children.length > 0) {
      let previous: NodeLayout | null = null;
      children.forEach(childId => {
        const childLayout = buildLayoutTree(childId, layoutNode);
        layoutNode.children.push(childLayout);
        if (previous) {
          previous.right = childLayout;
          childLayout.left = previous;
        }
        previous = childLayout;
      });
    }

    return layoutNode;
  };

  // Build layout trees for all root nodes
  const nodeLayouts = rootNodes.map(rootId => buildLayoutTree(rootId, null));

  // First walk: calculate preliminary x positions
  const firstWalk = (node: NodeLayout, level: number = 0) => {
    const children = node.children;
    const siblings = node.parent ? node.parent.children : [];
    const index = siblings.indexOf(node);
    const previousSibling = index > 0 ? siblings[index - 1] : null;
    
    if (children.length > 0) {
      // Process children
      children.forEach(child => {
        firstWalk(child, level + 1);
      });
      
      // Calculate center of children
      const firstChild = children[0];
      const lastChild = children[children.length - 1];
      const midPoint = (firstChild.x + lastChild.x) / 2;
      
      if (previousSibling) {
        // Position relative to previous sibling
        // For group siblings, consider their actual width
        let spacing = 100;
        if (previousSibling.node.type === 'group') {
          spacing = 150; // More spacing for group nodes
        }
        node.x = previousSibling.x + spacing;
        node.mod = node.x - midPoint;
      } else {
        // First child of parent
        node.x = midPoint;
      }
    } else if (node.node.type === 'group') {
      // Group node: treat as a single unit with fixed width
      if (previousSibling) {
        // For group nodes, consider the previous sibling's type
        let spacing = 100;
        if (previousSibling.node.type === 'group') {
          spacing = 150; // More spacing for group nodes
        } else if (previousSibling.children.length > 0) {
          // If previous sibling has children, use more spacing
          spacing = 120;
        }
        node.x = previousSibling.x + spacing;
      } else {
        node.x = 0;
      }
    } else {
      // Leaf node
      if (previousSibling) {
        // For leaf nodes, adjust spacing based on previous sibling type
        let spacing = 100;
        if (previousSibling.node.type === 'group') {
          spacing = 120; // More spacing after group nodes
        }
        node.x = previousSibling.x + spacing;
      } else {
        node.x = 0;
      }
    }
  };

  // Second walk: adjust x positions based on parent and siblings
  const secondWalk = (node: NodeLayout, modSum: number = 0) => {
    node.x += modSum;
    node.mod += modSum;
    
    node.children.forEach(child => {
      secondWalk(child, modSum + node.mod);
    });
  };

  // Perform layout calculation
  nodeLayouts.forEach(layoutRoot => {
    firstWalk(layoutRoot);
    secondWalk(layoutRoot);
  });

  // Apply layout type transformation
  const applyLayoutTransformation = (node: NodeLayout, layoutType: LayoutType) => {
    switch (layoutType) {
      case LayoutType.LOGICAL:
        // 逻辑图：根节点在左，子节点向右排
        break;
      
      case LayoutType.MIND_MAP:
        // 思维导图：根节点居中，子节点分置左右
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const midIndex = Math.floor(children.length / 2);
          
          // 计算基础位置
          let baseX = node.x;
          
          // 对于组节点，调整位置以避免与其他节点重叠
          if (node.node.type === 'group') {
            // 组节点需要更多空间，调整其位置
            if (index >= midIndex) {
              // 右侧组节点
              baseX = node.x + 50; // 向右偏移以避免与普通节点重叠
            } else {
              // 左侧组节点
              baseX = -node.x - 50; // 向左偏移以避免与普通节点重叠
            }
          } else {
            // 普通节点
            if (index >= midIndex) {
              // 右侧子节点
              baseX = node.x;
            } else {
              // 左侧子节点
              baseX = -node.x;
            }
          }
          
          node.node.x = baseX;
        }
        break;
      
      case LayoutType.ORGANIZATION:
        // 组织架构图：根在上，子在下
        const tempX = node.node.x;
        node.node.x = node.node.y;
        node.node.y = tempX;
        break;
      
      case LayoutType.RADIAL:
        // 放射状布局：中心节点位于中心，子节点均匀分布在圆周上
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const totalChildren = children.length;
          const angle = (index * 360) / totalChildren;
          const radius = node.y * 200; // 每级增加200的半径
          
          node.node.x = Math.cos(angle * Math.PI / 180) * radius;
          node.node.y = Math.sin(angle * Math.PI / 180) * radius;
        } else {
          // 根节点位于中心
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
      
      case LayoutType.FISHBONE:
        // 鱼骨图布局：中心节点在左侧，主分支向右延伸，子分支垂直展开
        if (node.parent) {
          if (node.parent.parent) {
            // 子分支
            const children = node.parent.children;
            const index = children.indexOf(node);
            const midIndex = Math.floor(children.length / 2);
            const offset = (index - midIndex) * 100;
            
            node.node.x = node.parent.node.x + 150;
            node.node.y = node.parent.node.y + offset;
          } else {
            // 主分支
            const children = node.parent.children;
            const index = children.indexOf(node);
            node.node.x = node.parent.node.x + 300;
            node.node.y = node.parent.node.y + (index - Math.floor(children.length / 2)) * 150;
          }
        } else {
          // 根节点在左侧
          node.node.x = 100;
          node.node.y = 0;
        }
        break;
      
      case LayoutType.TIMELINE:
        // 时间线布局：时间轴水平排列，事件节点沿时间轴分布
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          node.node.x = index * 200;
          node.node.y = node.parent.node.y + (index % 2 === 0 ? -100 : 100);
        } else {
          // 根节点作为时间轴起点
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
      
      case LayoutType.MATRIX:
        // 矩阵布局：节点按二维矩阵排列
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const rows = Math.ceil(Math.sqrt(children.length));
          const cols = Math.ceil(children.length / rows);
          const row = Math.floor(index / cols);
          const col = index % cols;
          
          node.node.x = col * 200;
          node.node.y = row * 150;
        } else {
          // 根节点在左上角
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
      
      case LayoutType.ONION:
        // 洋葱图布局：中心节点位于核心，外层节点围绕中心层层展开
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const totalChildren = children.length;
          const angle = (index * 360) / totalChildren;
          const radius = node.y * 150; // 每级增加150的半径
          
          node.node.x = Math.cos(angle * Math.PI / 180) * radius;
          node.node.y = Math.sin(angle * Math.PI / 180) * radius;
        } else {
          // 根节点位于中心
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
    }
  };

  // Apply layout transformation to all nodes
  const applyTransformationToTree = (node: NodeLayout) => {
    applyLayoutTransformation(node, layoutType);
    node.children.forEach(child => applyTransformationToTree(child));
  };

  nodeLayouts.forEach(layoutRoot => {
    applyTransformationToTree(layoutRoot);
  });

  // Create a map of layout nodes for quick lookup
  const layoutNodeMap = new Map<string, NodeLayout>();
  
  const buildLayoutNodeMap = (layoutNodes: NodeLayout[]) => {
    for (const layoutNode of layoutNodes) {
      layoutNodeMap.set(layoutNode.node.id, layoutNode);
      buildLayoutNodeMap(layoutNode.children);
    }
  };
  
  buildLayoutNodeMap(nodeLayouts);

  // Force update all node positions, including group nodes
  // For group nodes, use the layout position
  // For child nodes inside groups, keep their original positions temporarily
  // They will be adjusted later based on group position and their relative position within the group
  const updatedNodes = nodes.map(node => {
    const layoutNode = layoutNodeMap.get(node.id);
    if (layoutNode) {
      // Only update position for group nodes and non-group nodes that are not children of groups
      const parentId = node.parentId;
      const isChildOfGroup = parentId ? nodes.some(n => n.id === parentId && n.type === 'group') : false;
      
      if (node.type === 'group' || !isChildOfGroup) {
        return {
          ...node,
          x: layoutNode.node.x,
          y: layoutNode.node.y
        };
      }
    }
    // For nodes inside groups, keep their original positions
    // They will be adjusted later based on group position
    return node;
  });

  // Root node positions are now calculated automatically by the layout algorithm

  // Handle group nodes and their children as a single unit
  // First, separate group nodes and non-group nodes
  const groupMap = new Map<string, MindMapNode>();
  const nonGroupNodes = updatedNodes.filter(node => node.type !== 'group');
  const groupNodes = updatedNodes.filter(node => node.type === 'group');

  // Create a map of original nodes for reference
  const originalNodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => {
    originalNodeMap.set(node.id, node);
  });

  // Now, adjust all nodes to be part of their respective groups
  // Create a map of group nodes for quick lookup
  const groupNodeMap = new Map<string, MindMapNode>();
  groupNodes.forEach(group => {
    groupNodeMap.set(group.id, group);
  });

  // Adjust child nodes positions based on their parent group's new position
  // and their original relative position within the group
  const adjustedChildNodes = nonGroupNodes.map(node => {
    if (node.parentId) {
      const parentGroup = groupNodeMap.get(node.parentId);
      if (parentGroup) {
        // Get original positions for both the group and the child
        const originalParentGroup = originalNodeMap.get(parentGroup.id);
        const originalChildNode = originalNodeMap.get(node.id);
        
        if (originalParentGroup && originalChildNode) {
          // Calculate original relative position of child within group
          const originalRelativeX = originalChildNode.x - originalParentGroup.x;
          const originalRelativeY = originalChildNode.y - originalParentGroup.y;
          
          // Calculate new absolute position based on group's new position
          // and original relative position
          const newX = parentGroup.x + originalRelativeX;
          const newY = parentGroup.y + originalRelativeY;
          
          return {
            ...node,
            x: newX,
            y: newY
          };
        }
      }
    }
    return node;
  });

  // Calculate group sizes based on their adjusted children
  const calculatedGroups = groupNodes.map(group => {
    const children = adjustedChildNodes.filter(node => node.parentId === group.id);
    if (children.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      children.forEach(child => {
        minX = Math.min(minX, child.x);
        minY = Math.min(minY, child.y);
        maxX = Math.max(maxX, child.x + child.width);
        maxY = Math.max(maxY, child.y + child.height);
      });

      const PADDING = 30; // Padding for groups
      const TITLE_OFFSET = 40; // Title offset

      // Calculate group size based on children positions
      // but keep the group's position from the layout algorithm
      const groupWidth = (maxX - minX) + (PADDING * 2);
      const groupHeight = (maxY - minY) + (PADDING * 2) + TITLE_OFFSET;

      return {
        ...group,
        width: groupWidth,
        height: groupHeight
      };
    }
    return group;
  });

  // Combine groups and adjusted child nodes
  const finalNodes = [...calculatedGroups, ...adjustedChildNodes];

  // Final cleanup: Ensure no duplicate updates or position inconsistencies
  const finalCleanNodes = finalNodes.map(node => {
    // For group nodes, ensure their size is consistent with their children
    // but keep their position from the layout algorithm
    if (node.type === 'group') {
      const children = finalNodes.filter(n => n.parentId === node.id);
      if (children.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        children.forEach(child => {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
        });

        const PADDING = 30;
        const TITLE_OFFSET = 40;
        const groupWidth = (maxX - minX) + (PADDING * 2);
        const groupHeight = (maxY - minY) + (PADDING * 2) + TITLE_OFFSET;

        return {
          ...node,
          width: groupWidth,
          height: groupHeight
        };
      }
    }
    return node;
  });

  return finalCleanNodes;
};

// Apply force-directed layout to improve node spacing
const applyForceDirectedLayout = (
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  layoutParams?: {
    repulsionForce?: number;
    attractionForce?: number;
    minDistance?: number;
    iterations?: number;
  }
): MindMapNode[] => {
  // Make a copy of the nodes to modify
  let currentNodes = [...nodes];

  // Lock nodes that are children of group nodes so their positions won't be updated
  const lockedNodeIds = new Set<string>();
  nodes.forEach(n => {
    if (n.parentId) {
      const parent = nodes.find(p => p.id === n.parentId);
      if (parent && parent.type === 'group') {
        lockedNodeIds.add(n.id);
      }
    }
  });

  // Build expanded bounding boxes for groups based on their children so
  // other nodes are repelled from entering the visual area of a group.
  const GROUP_PADDING = 15; // Further reduced padding around group children to prevent excessive repulsion
  const groupBoxes: Array<{ id: string; left: number; right: number; top: number; bottom: number }> = [];
  nodes.forEach(n => {
    if (n.type === 'group') {
      const children = nodes.filter(c => c.parentId === n.id);
      if (children.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        children.forEach(child => {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
        });
        // Calculate group box with minimal padding
        groupBoxes.push({
          id: n.id,
          left: minX - GROUP_PADDING,
          top: minY - GROUP_PADDING,
          right: maxX + GROUP_PADDING,
          bottom: maxY + GROUP_PADDING
        });
      } else {
        // Fallback to group's own box if no children, with minimal size
        groupBoxes.push({
          id: n.id,
          left: n.x - GROUP_PADDING,
          top: n.y - GROUP_PADDING,
          right: n.x + (n.width || 120) + GROUP_PADDING,
          bottom: n.y + (n.height || 80) + GROUP_PADDING
        });
      }
    }
  });

  // Layout parameters - optimized for better group node placement and performance
  const ITERATIONS = layoutParams?.iterations || 50; // Further reduced iterations for faster performance
  const REPULSION_FORCE = layoutParams?.repulsionForce || 12000; // Further reduced repulsion force to prevent group nodes from moving too far
  const ATTRACTION_FORCE = layoutParams?.attractionForce || 0.12; // Further increased attraction force to keep connected nodes together
  const DAMPING = 0.9; // Damping factor to reduce movement over time
  const MIN_DISTANCE = layoutParams?.minDistance || 80; // Further reduced minimum distance for better spacing
  const CENTER_ATTRACTION = 0.06; // Further increased center attraction to keep nodes clustered
  const CENTER_THRESHOLD = 100; // Further reduced threshold for stronger center attraction

  // Calculate initial center of all nodes
  const calculateCenter = (nodeList: MindMapNode[]) => {
    let totalX = 0;
    let totalY = 0;
    nodeList.forEach(node => {
      totalX += node.x + node.width / 2;
      totalY += node.y + node.height / 2;
    });
    return {
      x: totalX / nodeList.length,
      y: totalY / nodeList.length
    };
  };

  let currentCenter = calculateCenter(currentNodes);

  // Helper function to get node center
  const getNodeCenter = (node: MindMapNode) => {
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (p1: Position, p2: Position) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Helper function to calculate bounding box distance between two nodes
  const calculateBoundingBoxDistance = (nodeA: MindMapNode, nodeB: MindMapNode) => {
    // If either node is inside any group's expanded box (and not a child of that group),
    // treat that overlap as negative distance to push the other node out.
    for (const gb of groupBoxes) {
      const inA = (nodeA.x + nodeA.width/2) >= gb.left && (nodeA.x + nodeA.width/2) <= gb.right && (nodeA.y + nodeA.height/2) >= gb.top && (nodeA.y + nodeA.height/2) <= gb.bottom;
      const inB = (nodeB.x + nodeB.width/2) >= gb.left && (nodeB.x + nodeB.width/2) <= gb.right && (nodeB.y + nodeB.height/2) >= gb.top && (nodeB.y + nodeB.height/2) <= gb.bottom;

      // If one node is inside the group's box but does not belong to it, return negative overlap
      if (inA && nodeA.parentId !== gb.id && nodeA.id !== gb.id) {
        // Compute overlap depth between nodeA and group box
        const overlapH = Math.max(0, Math.min(gb.right, nodeA.x + nodeA.width) - Math.max(gb.left, nodeA.x));
        const overlapV = Math.max(0, Math.min(gb.bottom, nodeA.y + nodeA.height) - Math.max(gb.top, nodeA.y));
        const overlap = Math.sqrt(overlapH * overlapH + overlapV * overlapV) || 100;
        return -overlap;
      }

      if (inB && nodeB.parentId !== gb.id && nodeB.id !== gb.id) {
        const overlapH = Math.max(0, Math.min(gb.right, nodeB.x + nodeB.width) - Math.max(gb.left, nodeB.x));
        const overlapV = Math.max(0, Math.min(gb.bottom, nodeB.y + nodeB.height) - Math.max(gb.top, nodeB.y));
        const overlap = Math.sqrt(overlapH * overlapH + overlapV * overlapV) || 100;
        return -overlap;
      }
    }

    // Calculate bounding boxes (for groups, prefer the expanded box)
    const findGroupBoxFor = (node: MindMapNode) => groupBoxes.find(gb => gb.id === node.id);
    const gbA = findGroupBoxFor(nodeA);
    const gbB = findGroupBoxFor(nodeB);

    const boxA = gbA ? { left: gbA.left, right: gbA.right, top: gbA.top, bottom: gbA.bottom } : {
      left: nodeA.x,
      right: nodeA.x + nodeA.width,
      top: nodeA.y,
      bottom: nodeA.y + nodeA.height
    };

    const boxB = gbB ? { left: gbB.left, right: gbB.right, top: gbB.top, bottom: gbB.bottom } : {
      left: nodeB.x,
      right: nodeB.x + nodeB.width,
      top: nodeB.y,
      bottom: nodeB.y + nodeB.height
    };

    // Calculate horizontal and vertical distances
    const horizontalDist = Math.max(0, Math.min(boxA.right, boxB.right) - Math.max(boxA.left, boxB.left));
    const verticalDist = Math.max(0, Math.min(boxA.bottom, boxB.bottom) - Math.max(boxA.top, boxB.top));

    // If boxes overlap, return negative distance
    if (horizontalDist > 0 && verticalDist > 0) {
      return -Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
    }

    // Calculate distance between closest edges
    let dx, dy;
    if (boxA.right < boxB.left) {
      dx = boxB.left - boxA.right;
    } else if (boxA.left > boxB.right) {
      dx = boxA.left - boxB.right;
    } else {
      dx = 0;
    }

    if (boxA.bottom < boxB.top) {
      dy = boxB.top - boxA.bottom;
    } else if (boxA.top > boxB.bottom) {
      dy = boxA.top - boxB.bottom;
    } else {
      dy = 0;
    }

    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to calculate force direction based on bounding boxes
  const calculateForceDirection = (nodeA: MindMapNode, nodeB: MindMapNode) => {
    const centerA = getNodeCenter(nodeA);
    const centerB = getNodeCenter(nodeB);
    const distance = calculateDistance(centerA, centerB);
    
    if (distance < 1) {
      // If nodes are at the same position, use random direction
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.cos(angle),
        y: Math.sin(angle)
      };
    }
    
    return {
      x: (centerB.x - centerA.x) / distance,
      y: (centerB.y - centerA.y) / distance
    };
  };

  // Main force-directed iteration loop
  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Update center position dynamically
    currentCenter = calculateCenter(currentNodes);
    
    // Calculate forces for each node
    const forces = new Map<string, Position>();
    
    // Initialize forces to zero
    currentNodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });

    // Calculate repulsion forces between all pairs of nodes
    for (let i = 0; i < currentNodes.length; i++) {
      const nodeA = currentNodes[i];

      // Skip group child nodes in repulsion force calculation
      if (lockedNodeIds.has(nodeA.id)) {
        continue;
      }

      for (let j = i + 1; j < currentNodes.length; j++) {
        const nodeB = currentNodes[j];

        // Skip group child nodes in repulsion force calculation
        if (lockedNodeIds.has(nodeB.id)) {
          continue;
        }

        // Calculate bounding box distance
        const distance = calculateBoundingBoxDistance(nodeA, nodeB);
        
        // Calculate repulsion force
        // Use a stronger force when nodes are close or overlapping
        let forceMagnitude;
        if (distance < 0) {
          // Nodes are overlapping, use strong force
          forceMagnitude = REPULSION_FORCE * 2 / (1 + Math.abs(distance));
        } else if (distance < MIN_DISTANCE) {
          // Nodes are close, use strong force
          forceMagnitude = REPULSION_FORCE / (distance * distance);
        } else if (distance < 300) {
          // Nodes are moderately far, use medium force
          forceMagnitude = REPULSION_FORCE / (distance * distance) * 0.8;
        } else {
          // Nodes are far, use stronger force to bring them closer
          forceMagnitude = REPULSION_FORCE / (distance * distance) * 1.5;
        }
        
        // Calculate force direction
        const direction = calculateForceDirection(nodeA, nodeB);
        const forceX = direction.x * forceMagnitude;
        const forceY = direction.y * forceMagnitude;

        // Apply forces (opposite directions for each node)
        const forceA = forces.get(nodeA.id)!;
        forces.set(nodeA.id, { x: forceA.x - forceX, y: forceA.y - forceY });

        const forceB = forces.get(nodeB.id)!;
        forces.set(nodeB.id, { x: forceB.x + forceX, y: forceB.y + forceY });
      }
    }

    // Calculate attraction forces for connected nodes (edges)
    edges.forEach(edge => {
      const sourceNode = currentNodes.find(n => n.id === edge.from);
      const targetNode = currentNodes.find(n => n.id === edge.to);

      if (sourceNode && targetNode) {
        const centerSource = getNodeCenter(sourceNode);
        const centerTarget = getNodeCenter(targetNode);

        // Calculate distance
        const distance = calculateDistance(centerSource, centerTarget);
        
        // Calculate attraction force
        const forceMagnitude = ATTRACTION_FORCE * distance * (edge.weight || 1);
        
        // Calculate force direction
        const direction = calculateForceDirection(sourceNode, targetNode);
        const forceX = direction.x * forceMagnitude;
        const forceY = direction.y * forceMagnitude;

        // Apply forces
        const forceSource = forces.get(sourceNode.id)!;
        forces.set(sourceNode.id, { x: forceSource.x + forceX, y: forceSource.y + forceY });

        const forceTarget = forces.get(targetNode.id)!;
        forces.set(targetNode.id, { x: forceTarget.x - forceX, y: forceTarget.y - forceY });
      }
    });

    // Add center attraction force to keep nodes near the current center
    currentNodes.forEach(node => {
      // Skip group child nodes in center attraction force calculation
      if (lockedNodeIds.has(node.id)) {
        return;
      }

      const center = getNodeCenter(node);
      const distanceToCenter = calculateDistance(center, currentCenter);
      
      if (distanceToCenter > CENTER_THRESHOLD) { // Apply to more nodes
        // Increase force magnitude for distant nodes
        let forceMagnitude = CENTER_ATTRACTION * distanceToCenter;
        if (distanceToCenter > 500) {
          // Stronger force for very distant nodes
          forceMagnitude *= 1.5;
        }
        
        const direction = {
          x: (currentCenter.x - center.x) / distanceToCenter,
          y: (currentCenter.y - center.y) / distanceToCenter
        };
        const forceX = direction.x * forceMagnitude;
        const forceY = direction.y * forceMagnitude;
        
        const currentForce = forces.get(node.id)!;
        forces.set(node.id, {
          x: currentForce.x + forceX,
          y: currentForce.y + forceY
        });
      }
    });

    // Apply forces to update node positions
    // Use a more gradual damping strategy
    let dampingFactor: number = 0;
    if (iter < 50) {
      // Higher damping in early iterations for faster movement
      dampingFactor = DAMPING;
    } else {
      // Gradually increase damping in later iterations for stability
      dampingFactor = Math.pow(DAMPING, (iter - 49) / 50);
    }
    
    currentNodes = currentNodes.map(node => {
      const force = forces.get(node.id)!;
      
      // Limit maximum force to avoid large jumps but allow more movement
      const maxForce = 50; // Increased maximum force for faster convergence
      const limitedForceX = Math.max(-maxForce, Math.min(maxForce, force.x));
      const limitedForceY = Math.max(-maxForce, Math.min(maxForce, force.y));
      
      // If node is locked (child of a group), keep its original position
      if (lockedNodeIds.has(node.id)) {
        return node;
      }

      // Calculate new position for movable nodes
      const newX = node.x + limitedForceX * dampingFactor;
      const newY = node.y + limitedForceY * dampingFactor;

      return {
        ...node,
        x: newX,
        y: newY
      };
    });
  }

  return currentNodes;
};