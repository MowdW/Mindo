
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MindMapNode, MindMapEdge, ViewportTransform, Position, HandlePosition, MindoSettings, NodeColor, EdgeStyle, EdgeArrow, NODE_STYLES, LayoutType, IconPosition } from './types';
import { generateId, screenToWorld, getHandlePosition, getNearestHandle, getCenter, getBezierMidpoint, getClosestHandlePair, calculateAutomaticLayout, calculateRelationshipWeights, updateEdgeStyles } from './utils/geometry';
import { NodeComponent } from './components/NodeComponent';
import { EdgeComponent, EdgeMenu, EdgeLabel } from './components/EdgeComponent';
import { Toolbar } from './components/Toolbar';
import { SearchBar } from './components/SearchBar';
import { ContextMenu } from './components/ContextMenu';
import { IconSelector } from './components/IconSelector';
import { NodeMenu } from './components/NodeMenu';
import { ImageOperationModal, ImageOperationOptions } from './components/ImageOperationModal';
import * as htmlToImage from 'html-to-image';

import { MarkdownView } from './components/MarkdownView';
import { IconType } from './types';




import { generateMarkdown, parseMarkdown } from './utils/markdownExport';
import { brainstorm, deepenContent } from './services/aiService';

import './styles.css';

interface AppProps {
    initialData?: { nodes: MindMapNode[], edges: MindMapEdge[], transform?: ViewportTransform };
    onSave: (data: string) => void;
    fileName: string;
    settings: MindoSettings;
    onShowMessage?: (message: string) => void;
    onRenderMarkdown?: (content: string, el: HTMLElement) => void;
    onSaveAsset?: (file: File) => Promise<string>; // Returns vault path
    onRenameAsset?: (oldPath: string, newName: string) => Promise<string>; // Handle renaming
    onResolveResource?: (path: string) => string; // Returns displayable URL
    onSaveMarkdown?: (filename: string, content: string) => void;
    onOpenLink?: (linkPath: string) => void; // Handle opening links
    app?: any; // Obsidian app object
}

const DEFAULT_INITIAL_NODES: MindMapNode[] = [
  { id: 'root', title: 'Mindo', content: '中心主题', x: 0, y: 0, width: 150, height: 100, color: 'yellow' }
];

interface HistoryState {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
}

const App: React.FC<AppProps> = ({ 
    initialData, 
    onSave, 
    fileName, 
    settings, 
    onShowMessage,
    onRenderMarkdown,
    onSaveAsset,
    onRenameAsset,
    onResolveResource,
    onSaveMarkdown,
    onOpenLink,
    app
}) => {
  // --- State ---
  const [nodes, setNodes] = useState<MindMapNode[]>(initialData?.nodes || DEFAULT_INITIAL_NODES);
  const [edges, setEdges] = useState<MindMapEdge[]>(initialData?.edges || []);
  const [transform, setTransform] = useState<ViewportTransform>(initialData?.transform || { x: 0, y: 0, scale: 1 });
  
  // History State
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // Skill Panel State


  // Selection
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  // Interaction State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggedChildrenIds, setDraggedChildrenIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ start: Position, end: Position } | null>(null);
  const [lastDraggedNodeIds, setLastDraggedNodeIds] = useState<string[]>([]);

  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, handle: HandlePosition } | null>(null); 
  const [tempConnectionEnd, setTempConnectionEnd] = useState<Position | null>(null);
  const [snapPreview, setSnapPreview] = useState<{ nodeId: string, handle: HandlePosition } | null>(null);

  // Reconnection State
  const [reconnectingEdge, setReconnectingEdge] = useState<{ edgeId: string, which: 'from' | 'to' } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Layout State
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(LayoutType.MIND_MAP);
  
  // Background State
  const [currentBackground, setCurrentBackground] = useState<'none' | 'dots' | 'grid' | 'lines'>('none');
  
  // Feature toggle states
  const [snapToGrid, setSnapToGrid] = useState(true); // 对齐功能开关
  const [autoSelectNearestHandle, setAutoSelectNearestHandle] = useState(true); // 连接线自动选择最近连接点的开关
  
  // File search state
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  

  
  // View state
  const [currentView, setCurrentView] = useState<'mindmap' | 'markdown'>('mindmap');
  const [markdownContent, setMarkdownContent] = useState('');
  
  // Image operation modal reference
  const imageOperationModalRef = useRef<ImageOperationModal | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    type: 'canvas' as 'canvas' | 'node',
    nodeId: null as string | null
  });
  
  // Icon Selector State
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [currentIconNodeId, setCurrentIconNodeId] = useState<string | null>(null);
  
  // Node Menu State
  const [selectedNodeForMenu, setSelectedNodeForMenu] = useState<MindMapNode | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  // wrapper for markdown view scroll handling
  const markdownWrapperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 }); 
  const itemStartRef = useRef<Position>({ x: 0, y: 0 });
  const hasCentered = useRef(false);
  const rafRef = useRef<number | null>(null); 
  const initialNodesRef = useRef<MindMapNode[]>([]);
  
  // State Refs for Event Handlers (Prevent Stale Closures without re-binding)
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const selectedNodeIdsRef = useRef(selectedNodeIds);
  selectedNodeIdsRef.current = selectedNodeIds;

  const draggingNodeIdRef = useRef(draggingNodeId);
  draggingNodeIdRef.current = draggingNodeId;

  const connectionStartRef = useRef(connectionStart);
  connectionStartRef.current = connectionStart;
  
  const reconnectingEdgeRef = useRef(reconnectingEdge);
  reconnectingEdgeRef.current = reconnectingEdge;

  const isPanningRef = useRef(isPanning);
  isPanningRef.current = isPanning;

  const selectionBoxRef = useRef(selectionBox);
  selectionBoxRef.current = selectionBox;
  
  // Data Sync Refs
  const lastSavedData = useRef<string>("");

  // Handler Refs (defined early to be available in callbacks)
  const snapPreviewRef = useRef(snapPreview);
  snapPreviewRef.current = snapPreview;

  const mouseMoveHandlerRef = useRef<(e: MouseEvent) => void>(() => {});
  const mouseUpHandlerRef = useRef<() => void>(() => {});

  // Dark Mode Detection
  useEffect(() => {
    const checkDarkMode = () => {
        const isDark = document.body.classList.contains('theme-dark');
        setDarkMode(isDark);
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // non-passive wheel listener for markdown scrolling
  useEffect(() => {
    const el = markdownWrapperRef.current;
    if (el) {
      const listener = (e: WheelEvent) => {
        if (currentView === 'markdown') {
          // 直接滚动容器，确保即使 CodeMirror 获得焦点也能正常滚动
          el.scrollTop += e.deltaY;
          e.preventDefault();
        }
      };
      
      // 只为 Markdown 视图容器添加滚动事件监听器
      // 这样只会影响 Markdown 视图区域，不会影响整个 Obsidian
      el.addEventListener('wheel', listener, { passive: false });
      
      return () => {
        el.removeEventListener('wheel', listener);
      };
    }
    return;
  }, [currentView]);

  // Sync with Prop Updates & Resolve Asset Paths
  useEffect(() => {
    if (initialData) {
        let loadedNodes = initialData.nodes || DEFAULT_INITIAL_NODES;

        // Resolve asset paths to display URLs
        if (onResolveResource) {
            loadedNodes = loadedNodes.map((node: MindMapNode) => {
                if (node.type === 'image' && node.assetPath) {
                    return { ...node, imageUrl: onResolveResource(node.assetPath) };
                }
                return node;
            });
        }

        const incomingData = {
            nodes: loadedNodes,
            edges: initialData.edges || [],
            transform: initialData.transform || { x: 0, y: 0, scale: 1 },
            snapToGrid: initialData.snapToGrid !== undefined ? initialData.snapToGrid : true,
            autoSelectNearestHandle: initialData.autoSelectNearestHandle !== undefined ? initialData.autoSelectNearestHandle : true,
            version: 1
        };
        const incomingString = JSON.stringify(incomingData, null, 2);

        setNodes(incomingData.nodes);
        setEdges(incomingData.edges);
        setTransform(incomingData.transform);
        setSnapToGrid(incomingData.snapToGrid);
        setAutoSelectNearestHandle(incomingData.autoSelectNearestHandle);
    }
  }, [initialData, onResolveResource]);

  // Centering helper that can be called from multiple places.  Uses refs for
  // current node data so that we don't have to include `nodes` in its
  // dependency list (which would cause it to fire every time a node is added
  // while the user is interacting).
  const pendingCenterRef = useRef(false);

  const performCenter = useCallback(() => {
    if (!containerRef.current) return;

    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) {
      // size still invalid; leave pending so we try again later
      pendingCenterRef.current = true;
      return;
    }

    if (initialData?.transform) {
      hasCentered.current = true;
      pendingCenterRef.current = false;
      return;
    }

    const current = nodesRef.current;
    let targetX = clientWidth / 2 - 100;
    let targetY = clientHeight / 2 - 50;

    if (current.length > 0) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      current.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
      });

      if (minX !== Infinity) {
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        targetX = clientWidth / 2 - centerX;
        targetY = clientHeight / 2 - centerY;
      }
    }

    setTransform({ x: targetX, y: targetY, scale: 1 });
    hasCentered.current = true;
    pendingCenterRef.current = false;
  }, [initialData]);

  // Initial Center Logic
  useEffect(() => {
    // perform immediately on mount
    pendingCenterRef.current = false;
    performCenter();

    const observer = new ResizeObserver(() => {
      // if we're currently dragging/panning, hold the centre operation until
      // the interaction finishes
      if (draggingNodeIdRef.current || isPanningRef.current) {
        pendingCenterRef.current = true;
        return;
      }

      // if we've never successfully centred yet, or a previous attempt was
      // deferred, try now
      if (!hasCentered.current || pendingCenterRef.current) {
        performCenter();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [performCenter]); // Depend on nodes to ensure we have content to center

  // Auto Save
  useEffect(() => {
      const currentData = { 
        nodes, 
        edges, 
        transform, 
        snapToGrid, 
        autoSelectNearestHandle, 
        version: 1 
      };
      const dataString = JSON.stringify(currentData, null, 2);

      if (dataString === lastSavedData.current) return;

      lastSavedData.current = dataString;
      onSave?.(dataString);
  }, [nodes, edges, transform, snapToGrid, autoSelectNearestHandle, onSave]);

  // --- History Management ---  
  const saveHistory = useCallback(() => {
      setPast(prev => [...prev, { nodes: nodesRef.current, edges: edgesRef.current }]);
      setFuture([]);
  }, []);

  const undo = useCallback(() => {
      if (past.length === 0) return;
      
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      
      setFuture(prev => [{ nodes: nodesRef.current, edges: edgesRef.current }, ...prev]);
      
      setNodes(previous.nodes);
      setEdges(previous.edges);
      setPast(newPast);
  }, [past]);

  const redo = useCallback(() => {
      if (future.length === 0) return;
      
      const next = future[0];
      const newFuture = future.slice(1);
      
      setPast(prev => [...prev, { nodes: nodesRef.current, edges: edgesRef.current }]);
      
      setNodes(next.nodes);
      setEdges(next.edges);
      setFuture(newFuture);
  }, [future]);


  // --- Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    // if markdown view, handle scroll directly
    if (currentView === 'markdown') {
      const el = markdownWrapperRef.current;
      if (el) {
        el.scrollTop += e.deltaY;
        e.preventDefault();
      }
      return;
    }

    // zoom mindmap
    if (!hasCentered.current) hasCentered.current = true;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(transform.scale * (1 + delta), 0.1), 5);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;

    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {

    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
        setIsPanning(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        itemStartRef.current = { x: transform.x, y: transform.y };
        return;
    }

    if (e.button === 0) {
        if (!e.shiftKey) {
            setSelectedNodeIds(new Set());
            setSelectedEdgeId(null);
            setSelectedNodeForMenu(null);
        }
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setSelectionBox({ start: startPos, end: startPos });
        }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'canvas',
      nodeId: null
    });
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedNodeIds(new Set([nodeId]));
    setSelectedEdgeId(null);
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'node',
      nodeId
    });
  };

  const handleNodeSelect = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNodeForMenu(node);
    }
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleAddIcon = (nodeId: string) => {
    setCurrentIconNodeId(nodeId);
    setShowIconSelector(true);
    closeContextMenu();
  };

  const handleSelectIcon = (icon: IconType) => {
    if (currentIconNodeId) {
      saveHistory();
      setNodes(prev => prev.map(node => 
        node.id === currentIconNodeId ? { ...node, icon: icon === 'none' ? undefined : icon } : node
      ));
    }
    setShowIconSelector(false);
    setCurrentIconNodeId(null);
  };

  const handleIconChange = (nodeId: string, icon: IconType) => {
    saveHistory();
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, icon: icon === 'none' ? undefined : icon } : node
    ));
    // 更新selectedNodeForMenu中的图标
    setSelectedNodeForMenu(prev => prev?.id === nodeId ? { ...prev, icon: icon === 'none' ? undefined : icon } : prev);
  };

  const handleIconPositionChange = (nodeId: string, position: IconPosition) => {
    saveHistory();
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, iconPosition: position } : node
    ));
    // 更新selectedNodeForMenu中的图标位置
    setSelectedNodeForMenu(prev => prev?.id === nodeId ? { ...prev, iconPosition: position } : prev);
  };

  const handleTitleVisibleChange = (nodeId: string, visible: boolean) => {
    saveHistory();
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, titleVisible: visible } : node
    ));
    // 更新selectedNodeForMenu中的标题可见性
    setSelectedNodeForMenu(prev => prev?.id === nodeId ? { ...prev, titleVisible: visible } : prev);
  };

  const handleBrainstorm = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      const brainstormResult = await brainstorm(node, settings);
      saveHistory();
      
      const newNodes: MindMapNode[] = [];
      const newEdges: MindMapEdge[] = [];
      
      // 递归创建多级节点
      const createNodesRecursively = (parentNode: MindMapNode, ideas: any[], level: number, maxLevel: number) => {
        if (level >= maxLevel) return;
        
        ideas.forEach((idea, index) => {
          const angle = (index * 360) / ideas.length;
          const distance = 200 + (level * 100); // 每级增加100的距离
          const x = parentNode.x + Math.cos(angle * Math.PI / 180) * distance;
          const y = parentNode.y + Math.sin(angle * Math.PI / 180) * distance;
          
          const newNode: MindMapNode = {
            id: generateId(),
            title: idea.title,
            content: '',
            x: x - 80,
            y: y - 40,
            width: 160,
            height: 80,
            color: level === 0 ? 'blue' : level === 1 ? 'green' : 'purple' as NodeColor,
            icon: 'none' as IconType
          };
          
          newNodes.push(newNode);
          
          // 创建连接
          newEdges.push({
            id: generateId(),
            from: parentNode.id,
            to: newNode.id,
            fromHandle: 'right' as HandlePosition,
            toHandle: 'left' as HandlePosition,
            style: 'solid' as EdgeStyle,
            arrow: 'to' as EdgeArrow,
            color: darkMode ? '#a3a3a3' : '#94a3b8'
          });
          
          // 递归创建子节点
          if (idea.children && idea.children.length > 0) {
            createNodesRecursively(newNode, idea.children, level + 1, maxLevel);
          }
        });
      };
      
      // 开始创建节点，最多3级
      createNodesRecursively(node, brainstormResult.ideas, 0, 3);
      
      setNodes(prev => [...prev, ...newNodes]);
      setEdges(prev => [...prev, ...newEdges]);
      
      if (onShowMessage) onShowMessage(`已生成多级创意想法`);
    } catch (error) {
      console.error('Brainstorm failed:', error);
      if (onShowMessage) onShowMessage(`头脑风暴失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    closeContextMenu();
  };

  // 一键生成功能
  const handleGenerateMindMap = async () => {
    try {
      // 确定中心节点：使用现有的中心节点（没有入边的节点），如果没有则创建新的
      let centerNode: MindMapNode;
      
      // 找出没有入边的节点作为中心节点
      const childNodeIds = new Set(edges.map(edge => edge.to));
      const existingCenterNodes = nodes.filter(node => !childNodeIds.has(node.id));
      
      if (existingCenterNodes.length > 0) {
        // 使用第一个找到的中心节点
        centerNode = existingCenterNodes[0];
      } else if (nodes.length > 0) {
        // 如果没有找到中心节点但有其他节点，使用第一个节点作为中心
        centerNode = nodes[0];
      } else {
        // 如果没有任何节点，创建一个新的中心节点
        centerNode = {
          id: generateId(),
          title: '中心主题',
          content: '思维导图中心主题',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          color: 'yellow',
          icon: 'none' as IconType
        };
      }
      
      // 生成思维导图结构，基于中心节点的实际内容
      const brainstormResult = await brainstorm(centerNode, settings);
      saveHistory();
      
      // 保留中心节点，只添加新生成的节点
      const newNodes: MindMapNode[] = [centerNode];
      const newEdges: MindMapEdge[] = [];
      
      // 递归创建多级节点
      const createNodesRecursively = (parentNode: MindMapNode, ideas: any[], level: number, maxLevel: number) => {
        if (level >= maxLevel) return;
        
        ideas.forEach((idea, index) => {
          const angle = (index * 360) / ideas.length;
          const distance = 200 + (level * 100); // 每级增加100的距离
          const x = parentNode.x + Math.cos(angle * Math.PI / 180) * distance;
          const y = parentNode.y + Math.sin(angle * Math.PI / 180) * distance;
          
          const newNode: MindMapNode = {
            id: generateId(),
            title: idea.title,
            content: '',
            x: x - 80,
            y: y - 40,
            width: 160,
            height: 80,
            color: level === 0 ? 'blue' : level === 1 ? 'green' : 'purple' as NodeColor,
            icon: 'none' as IconType
          };
          
          newNodes.push(newNode);
          
          // 创建连接
          newEdges.push({
            id: generateId(),
            from: parentNode.id,
            to: newNode.id,
            fromHandle: 'right' as HandlePosition,
            toHandle: 'left' as HandlePosition,
            style: 'solid' as EdgeStyle,
            arrow: 'to' as EdgeArrow,
            color: darkMode ? '#a3a3a3' : '#94a3b8'
          });
          
          // 递归创建子节点
          if (idea.children && idea.children.length > 0) {
            createNodesRecursively(newNode, idea.children, level + 1, maxLevel);
          }
        });
      };
      
      // 开始创建节点，最多3级
      createNodesRecursively(centerNode, brainstormResult.ideas, 0, 3);
      
      // 清空现有节点和边，添加新生成的内容
      setNodes(newNodes);
      setEdges(newEdges);
      
      // 调整视图以显示整个思维导图
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect) {
          setTransform({
            x: rect.width / 2 - centerNode.width / 2,
            y: rect.height / 2 - centerNode.height / 2,
            scale: 1
          });
        }
      }
      
      if (onShowMessage) onShowMessage(`已基于中心主题生成思维导图`);
    } catch (error) {
      console.error('Generate mind map failed:', error);
      if (onShowMessage) onShowMessage(`生成思维导图失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    closeContextMenu();
  };

  // 智能配色功能
  const handleSmartColorScheme = () => {
    try {
      saveHistory();
      
      // 定义颜色方案
      const colorPalette: NodeColor[] = ['yellow', 'blue', 'green', 'purple', 'red', 'gray'];
      
      // 构建节点层级关系和父子关系
      const nodeLevels = new Map<string, number>();
      const parentChildMap = new Map<string, string[]>();
      const nodePositions = new Map<string, number>(); // 记录节点在同级中的位置
      
      // 首先通过边构建父子关系
      edges.forEach(edge => {
        if (!parentChildMap.has(edge.from)) {
          parentChildMap.set(edge.from, []);
        }
        parentChildMap.get(edge.from)!.push(edge.to);
      });
      
      // 确定根节点：没有入边的节点
      const nodeIds = new Set(nodes.map(node => node.id));
      const childNodeIds = new Set(edges.map(edge => edge.to));
      const rootNodes = nodes.filter(node => !childNodeIds.has(node.id));
      
      // 如果没有根节点（比如只有一个节点），则使用所有节点作为根节点
      const finalRootNodes = rootNodes.length > 0 ? rootNodes : nodes;
      
      // 递归计算节点层级和位置
      const calculateLevelAndPosition = (nodeId: string, level: number = 0, position: number = 0) => {
        nodeLevels.set(nodeId, level);
        nodePositions.set(nodeId, position);
        
        const children = parentChildMap.get(nodeId) || [];
        children.forEach((childId, index) => {
          calculateLevelAndPosition(childId, level + 1, index);
        });
      };
      
      // 计算所有节点的层级和位置
      finalRootNodes.forEach((root, index) => {
        calculateLevelAndPosition(root.id, 0, index);
      });
      
      // 为节点分配颜色
      const updatedNodes = nodes.map((node, nodeIndex) => {
        const level = nodeLevels.get(node.id) || 0;
        const position = nodePositions.get(node.id) || 0;
        
        // 根据层级、位置和节点索引分配颜色，确保不同节点有不同颜色
        const colorIndex = (level * 5 + position * 3 + nodeIndex) % colorPalette.length;
        const color = colorPalette[colorIndex];
        
        return {
          ...node,
          color
        };
      });
      
      setNodes(updatedNodes);
      
      // 更新边的颜色，使其与父节点颜色一致
      const updatedEdges = edges.map(edge => {
        const sourceNode = updatedNodes.find(n => n.id === edge.from);
        if (sourceNode) {
          return {
            ...edge,
            color: NODE_STYLES[sourceNode.color].picker
          };
        }
        return edge;
      });
      
      setEdges(updatedEdges);
      
      if (onShowMessage) onShowMessage(`已应用智能配色`);
    } catch (error) {
      console.error('Smart color scheme failed:', error);
      if (onShowMessage) onShowMessage(`应用智能配色失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    closeContextMenu();
  };

  const handleDeepenContent = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      const deepenedContent = await deepenContent(node, settings);
      saveHistory();
      setNodes(prev => prev.map(n => 
        n.id === nodeId ? { ...n, content: deepenedContent } : n
      ));
      
      if (onShowMessage) onShowMessage('内容已深化');
    } catch (error) {
      console.error('Deepen content failed:', error);
      if (onShowMessage) onShowMessage(`内容深化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    closeContextMenu();
  };

  const handleExportImage = useCallback(async (options: ImageOperationOptions) => {
    if (currentView !== "mindmap" || canvasContainerRef.current === null || canvasContentRef.current === null) {
      return;
    }
    try {
      // 计算所有节点的边界
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      
      // 计算内容中心和尺寸
      const contentWidth = maxX - minX + 100; // 增加边距
      const contentHeight = maxY - minY + 100;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // 设置导出区域大小
      const exportWidth = Math.max(contentWidth, 800);
      const exportHeight = Math.max(contentHeight, 600);
      
      // 创建一个专门用于导出的容器
      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'absolute';
      exportContainer.style.top = '0';
      exportContainer.style.left = '0';
      exportContainer.style.width = `${exportWidth}px`;
      exportContainer.style.height = `${exportHeight}px`;
      exportContainer.style.overflow = 'hidden';
      exportContainer.style.zIndex = '1000';
      exportContainer.style.pointerEvents = 'none';
      
      // 应用与插件界面相同的背景纹理类名
      exportContainer.className = `mindo-canvas-container ${currentBackground !== 'none' ? `mindo-bg-pattern-${currentBackground}` : ''}`;
      
      // 从实际的canvasContainerRef获取背景颜色，确保跟随Obsidian主题色
      const actualBackgroundColor = getComputedStyle(canvasContainerRef.current).backgroundColor;
      exportContainer.style.backgroundColor = actualBackgroundColor;
      
      // 复制canvasContentRef的内容到导出容器
      const contentClone = canvasContentRef.current.cloneNode(true) as HTMLElement;
      contentClone.style.transform = `translate(${(exportWidth / 2) - centerX}px, ${(exportHeight / 2) - centerY}px) scale(1)`;
      contentClone.style.position = 'absolute';
      contentClone.style.top = '0';
      contentClone.style.left = '0';
      contentClone.style.width = '100%';
      contentClone.style.height = '100%';
      contentClone.style.pointerEvents = 'auto';
      contentClone.style.opacity = '1';
      contentClone.style.zIndex = '1';
      
      // 确保SVG元素正确渲染
      const svgElements = contentClone.querySelectorAll('svg');
      svgElements.forEach(svg => {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.overflow = 'visible';
        svg.style.zIndex = '1';
      });
      
      // 确保节点在SVG之上
      const nodeContainers = contentClone.querySelectorAll('div[style*="position: absolute"]');
      nodeContainers.forEach(container => {
        container.style.zIndex = '2';
      });
      
      // 将克隆的内容添加到导出容器
      exportContainer.appendChild(contentClone);
      
      // 将导出容器添加到canvasContainerRef中
      canvasContainerRef.current.appendChild(exportContainer);
      
      // 等待DOM更新
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 导出图片
      const dataUrl = await htmlToImage.toPng(exportContainer, {
        backgroundColor: actualBackgroundColor,
        pixelRatio: options.resolution,
        padding: options.margin,
        width: exportWidth,
        height: exportHeight,
        // 确保包含SVG元素
        allowTaint: true,
        useCORS: true,
        // 提高捕获质量
        quality: 1.0
      });
      
      // 移除导出容器
      canvasContainerRef.current.removeChild(exportContainer);
      
      // 下载图片
      const link = document.createElement("a");
      const timestamp = Date.now();
      link.download = `${fileName || "思维导图"}_${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  }, [fileName, currentView, nodes, currentBackground]);

  const handleCopyImage = useCallback(async (options: ImageOperationOptions) => {
    if (currentView !== "mindmap" || nodes.length === 0 || canvasContainerRef.current === null) {
      if (onShowMessage) onShowMessage('复制图片失败');
      return;
    }
    try {
      // 从实际的canvasContainerRef获取背景颜色，确保跟随Obsidian主题色
      const actualBackgroundColor = getComputedStyle(canvasContainerRef.current).backgroundColor;
      
      // 创建临时容器
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.width = '2000px';
      tempContainer.style.height = '1500px';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.zIndex = '1000';
      
      // 应用与插件界面相同的背景纹理类名
      tempContainer.className = `mindo-canvas-container ${currentBackground !== 'none' ? `mindo-bg-pattern-${currentBackground}` : ''}`;
      tempContainer.style.backgroundColor = actualBackgroundColor;
      
      // 计算所有节点的边界
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      
      // 计算偏移量，使所有内容居中
      const centerX = 1000 - (maxX + minX) / 2;
      const centerY = 750 - (maxY + minY) / 2;
      
      // 复制边到临时容器
      const svg = document.createElement('svg');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.overflow = 'visible';
      
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const startX = source.x + source.width / 2 + centerX;
          const startY = source.y + source.height / 2 + centerY;
          const endX = target.x + target.width / 2 + centerX;
          const endY = target.y + target.height / 2 + centerY;
          
          // 创建简单的贝塞尔曲线
          const controlX1 = startX + (endX - startX) / 3;
          const controlY1 = startY;
          const controlX2 = endX - (endX - startX) / 3;
          const controlY2 = endY;
          
          path.setAttribute('d', `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`);
          path.setAttribute('stroke', edge.color || '#94a3b8');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('fill', 'none');
          
          // 添加箭头
          if (edge.arrow === 'to') {
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const arrowSize = 8;
            const angle = Math.atan2(endY - startY, endX - startX);
            const arrowX = endX - arrowSize * Math.cos(angle);
            const arrowY = endY - arrowSize * Math.sin(angle);
            const arrowX1 = arrowX - arrowSize * Math.cos(angle - Math.PI / 6);
            const arrowY1 = arrowY - arrowSize * Math.sin(angle - Math.PI / 6);
            const arrowX2 = arrowX - arrowSize * Math.cos(angle + Math.PI / 6);
            const arrowY2 = arrowY - arrowSize * Math.sin(angle + Math.PI / 6);
            
            arrow.setAttribute('d', `M ${endX} ${endY} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`);
            arrow.setAttribute('fill', edge.color || '#94a3b8');
            svg.appendChild(arrow);
          }
          
          svg.appendChild(path);
        }
      });
      
      tempContainer.appendChild(svg);
      
      // 复制节点到临时容器
      nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.style.position = 'absolute';
        nodeEl.style.left = (node.x + centerX) + 'px';
        nodeEl.style.top = (node.y + centerY) + 'px';
        nodeEl.style.width = node.width + 'px';
        nodeEl.style.height = node.height + 'px';
        nodeEl.style.backgroundColor = node.color === 'yellow' ? '#fef3c7' : 
                                      node.color === 'blue' ? '#dbeafe' : 
                                      node.color === 'green' ? '#d1fae5' : 
                                      node.color === 'purple' ? '#f3e8ff' : 
                                      node.color === 'red' ? '#fee2e2' : '#f3f4f6';
        nodeEl.style.borderRadius = node.shape === 'circle' ? '50%' : '8px';
        nodeEl.style.display = 'flex';
        nodeEl.style.flexDirection = 'column';
        nodeEl.style.justifyContent = 'center';
        nodeEl.style.alignItems = 'center';
        nodeEl.style.padding = '10px';
        nodeEl.style.boxSizing = 'border-box';
        nodeEl.style.fontFamily = 'sans-serif';
        nodeEl.style.color = darkMode ? '#ffffff' : '#000000';
        nodeEl.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        
        // 添加标题
        const titleEl = document.createElement('div');
        titleEl.style.fontSize = '14px';
        titleEl.style.fontWeight = 'bold';
        titleEl.style.marginBottom = '5px';
        titleEl.style.textAlign = 'center';
        titleEl.textContent = node.title;
        nodeEl.appendChild(titleEl);
        
        // 添加内容
        if (node.content) {
          const contentEl = document.createElement('div');
          contentEl.style.fontSize = '12px';
          contentEl.style.textAlign = 'center';
          contentEl.textContent = node.content;
          nodeEl.appendChild(contentEl);
        }
        
        tempContainer.appendChild(nodeEl);
      });
      
      // 将临时容器添加到文档中
      document.body.appendChild(tempContainer);
      
      // 生成图片
      const dataUrl = await htmlToImage.toPng(tempContainer, {
        backgroundColor: actualBackgroundColor,
        pixelRatio: options.resolution,
        padding: options.margin,
        width: 2000,
        height: 1500
      });
      
      // 移除临时容器
      document.body.removeChild(tempContainer);
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
          new ClipboardItem({
              'image/png': blob
          })
      ]);
      
      if (onShowMessage) onShowMessage('图片已复制到剪贴板');
    } catch (err) {
        console.error('Copy image failed', err);
        if (onShowMessage) onShowMessage('复制图片失败');
    }
  }, [onShowMessage, currentView, nodes, edges, darkMode, currentBackground, canvasContainerRef]);

  const handleOpenImageOperationModal = useCallback(() => {
    if (app) {
      try {
        if (!imageOperationModalRef.current) {
          imageOperationModalRef.current = new ImageOperationModal({
            app,
            onClose: () => {},
            onExportImage: handleExportImage,
            onCopyImage: handleCopyImage
          });
        }
        imageOperationModalRef.current.open();
      } catch (error) {
        console.error('Failed to open image operation modal:', error);
        // 开发模式下的备用方案
        if (process.env.NODE_ENV === 'development') {
          // 直接调用导出功能，使用默认选项
          handleExportImage({ resolution: 1, margin: 20, theme: 'light' });
        }
      }
    } else {
      console.error('App object is not available');
      // 直接调用导出功能，使用默认选项
      handleExportImage({ resolution: 1, margin: 20, theme: 'light' });
    }
  }, [app, handleExportImage, handleCopyImage]);

  const handleDoubleClickCanvas = (e: React.MouseEvent) => {
    saveHistory(); // History: Node Add
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mousePos, transform);
    const newNode: MindMapNode = {
      id: generateId(),
      title: '新节点',
      content: '',
      x: worldPos.x - 50, 
      y: worldPos.y - 40,
      width: 100, 
      height: 80, 
      color: 'blue',
      type: 'node'
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
    setSelectedEdgeId(null);
  };

  // ... (processImageFile and handlePaste unchanged)
  const processImageFile = async (file: File, x: number, y: number, index: number) => {
    if (onSaveAsset && onResolveResource) {
        try {
            const assetPath = await onSaveAsset(file);
            const imageUrl = onResolveResource(assetPath);
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 300;
                const ratio = img.width / img.height;
                const width = Math.min(img.width, MAX_WIDTH);
                const HEADER_HEIGHT = 44; 
                const imageHeight = width / ratio;
                const height = imageHeight + HEADER_HEIGHT;
                const newNode: MindMapNode = {
                    id: generateId(),
                    type: 'image',
                    title: file.name,
                    content: '',
                    imageUrl: imageUrl,
                    assetPath: assetPath, 
                    x: x + (index * 20),
                    y: y + (index * 20),
                    width: width,
                    height: height, 
                    color: 'gray'
                };
                setNodes(prev => [...prev, newNode]);
            };
            img.src = imageUrl;
        } catch (e) {
            console.error("Failed to save image asset", e);
            if (onShowMessage) onShowMessage("图片保存失败");
        }
    } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            if (result) {
                const img = new Image();
                img.onload = () => {
                    const MAX_WIDTH = 300;
                    const ratio = img.width / img.height;
                    const width = Math.min(img.width, MAX_WIDTH);
                    const HEADER_HEIGHT = 44; 
                    const imageHeight = width / ratio;
                    const height = imageHeight + HEADER_HEIGHT;
                    const newNode: MindMapNode = {
                        id: generateId(),
                        type: 'image',
                        title: file.name,
                        content: '',
                        imageUrl: result,
                        x: x + (index * 20),
                        y: y + (index * 20),
                        width: width,
                        height: height, 
                        color: 'gray'
                    };
                    setNodes(prev => [...prev, newNode]);
                };
                img.src = result;
            }
        };
        reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
            return;
        }

        // Handle files from clipboard (existing logic)
        if (e.clipboardData && e.clipboardData.files.length > 0) {
            const files = Array.from(e.clipboardData.files) as File[];
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                e.preventDefault();
                saveHistory(); 
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
                const worldPos = screenToWorld(centerScreen, transformRef.current);
                imageFiles.forEach((file, index) => {
                    processImageFile(file, worldPos.x, worldPos.y, index);
                });
                return;
            }
        }

        // Handle clipboard items (for screenshots)
        if (e.clipboardData && e.clipboardData.items) {
            const items = Array.from(e.clipboardData.items);
            const imageItems = items.filter(item => item.type === 'image/png');
            if (imageItems.length > 0) {
                e.preventDefault();
                saveHistory(); 
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
                const worldPos = screenToWorld(centerScreen, transformRef.current);
                
                imageItems.forEach((item, index) => {
                    const blob = item.getAsFile();
                    if (blob) {
                        // Create a File object from the blob
                        const file = new File([blob], `screenshot_${Date.now()}.png`, { type: 'image/png' });
                        processImageFile(file, worldPos.x, worldPos.y, index);
                    }
                });
                return;
            }
        }

        // Handle JSON data (nodes) from clipboard
        try {
            const text = await navigator.clipboard.readText();
            if (!text || text.trim() === '') {
                return;
            }
            
            const data = JSON.parse(text);
            if (data.nodes && Array.isArray(data.nodes)) {
                e.preventDefault();
                saveHistory();
                
                // 为新节点生成新 ID，并调整位置
                const idMap = new Map<string, string>();
                const newNodes = data.nodes.map((node: MindMapNode) => {
                    const newId = generateId();
                    idMap.set(node.id, newId);
                    return {
                        ...node,
                        id: newId,
                        x: node.x + 20,  // 偏移 20px
                        y: node.y + 20
                    };
                });
                
                // 为新边生成新 ID，并更新节点引用
                const newEdges = (data.edges || []).map((edge: MindMapEdge) => {
                    return {
                        ...edge,
                        id: generateId(),
                        from: idMap.get(edge.from) || edge.from,
                        to: idMap.get(edge.to) || edge.to
                    };
                });
                
                // 添加新节点和边
                setNodes(prev => [...prev, ...newNodes]);
                setEdges(prev => [...prev, ...newEdges]);
                
                // 选中新粘贴的节点
                setSelectedNodeIds(new Set(newNodes.map((node: MindMapNode) => node.id)));
                setSelectedEdgeId(null);
                
                onShowMessage && onShowMessage("粘贴成功");
            }
        } catch (err) {
            // 不是有效的 JSON 数据，忽略错误
            console.log("剪贴板中不是有效的节点数据:", err);
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [saveHistory, onSaveAsset, onResolveResource, onShowMessage]); 

  // ... (handleCreateGroup, handleAlign, update logic helpers unchanged)
  const handleCreateGroup = () => {
    if (selectedNodeIds.size === 0) return;
    saveHistory(); 
    const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
    if (selectedNodes.length === 0) return;
    selectedNodes.sort((a, b) => a.y - b.y || a.x - b.x);
    const columns = Math.ceil(Math.sqrt(selectedNodes.length));
    const GAP = 20;
    let currentX = 0;
    let currentY = 0;
    let rowMaxHeight = 0;
    const minX = Math.min(...selectedNodes.map(n => n.x));
    const minY = Math.min(...selectedNodes.map(n => n.y));
    const layoutMap = new Map<string, Position>();
    selectedNodes.forEach((node, index) => {
        if (index > 0 && index % columns === 0) {
            currentX = 0;
            currentY += rowMaxHeight + GAP;
            rowMaxHeight = 0;
        }
        layoutMap.set(node.id, { x: minX + currentX, y: minY + currentY });
        currentX += node.width + GAP;
        rowMaxHeight = Math.max(rowMaxHeight, node.height);
    });
    let updatedNodes = nodes.map(n => {
        if (layoutMap.has(n.id)) {
            const pos = layoutMap.get(n.id)!;
            return { ...n, x: pos.x, y: pos.y };
        }
        return n;
    });
    const newGroupId = generateId();
    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    selectedNodes.forEach(n => {
        const pos = layoutMap.get(n.id)!;
        gMinX = Math.min(gMinX, pos.x);
        gMinY = Math.min(gMinY, pos.y);
        gMaxX = Math.max(gMaxX, pos.x + n.width);
        gMaxY = Math.max(gMaxY, pos.y + n.height);
    });
    const PADDING = 40;
    const TITLE_OFFSET = 40;
    const groupNode: MindMapNode = {
        id: newGroupId,
        type: 'group',
        title: '新分组',
        content: '',
        x: gMinX - PADDING,
        y: gMinY - PADDING - TITLE_OFFSET,
        width: (gMaxX - gMinX) + (PADDING * 2),
        height: (gMaxY - gMinY) + (PADDING * 2) + TITLE_OFFSET,
        color: 'gray'
    };
    updatedNodes = updatedNodes.map(n => {
        if (selectedNodeIds.has(n.id)) {
            return { ...n, parentId: newGroupId };
        }
        return n;
    });
    setNodes([...updatedNodes, groupNode]);
    setSelectedNodeIds(new Set([newGroupId]));
  };

  const handleAlign = (type: 'horizontal' | 'vertical', alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedNodeIds.size < 2) return;
    saveHistory(); 
    const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
    if (selectedNodes.length === 0) return;
    
    if (type === 'horizontal') {
        let referenceValue: number;
        switch (alignment) {
            case 'left':
                referenceValue = Math.min(...selectedNodes.map(n => n.x));
                break;
            case 'center':
                const totalX = selectedNodes.reduce((sum, n) => sum + (n.x + n.width/2), 0);
                referenceValue = totalX / selectedNodes.length;
                break;
            case 'right':
                referenceValue = Math.max(...selectedNodes.map(n => n.x + n.width));
                break;
            default:
                return;
        }
        
        setNodes(prev => prev.map(n => {
            if (selectedNodeIds.has(n.id)) {
                switch (alignment) {
                    case 'left':
                        return { ...n, x: referenceValue };
                    case 'center':
                        return { ...n, x: referenceValue - n.width/2 };
                    case 'right':
                        return { ...n, x: referenceValue - n.width };
                    default:
                        return n;
                }
            }
            return n;
        }));
    } else {
        let referenceValue: number;
        switch (alignment) {
            case 'top':
                referenceValue = Math.min(...selectedNodes.map(n => n.y));
                break;
            case 'middle':
                const totalY = selectedNodes.reduce((sum, n) => sum + (n.y + n.height/2), 0);
                referenceValue = totalY / selectedNodes.length;
                break;
            case 'bottom':
                referenceValue = Math.max(...selectedNodes.map(n => n.y + n.height));
                break;
            default:
                return;
        }
        
        setNodes(prev => prev.map(n => {
            if (selectedNodeIds.has(n.id)) {
                switch (alignment) {
                    case 'top':
                        return { ...n, y: referenceValue };
                    case 'middle':
                        return { ...n, y: referenceValue - n.height/2 };
                    case 'bottom':
                        return { ...n, y: referenceValue - n.height };
                    default:
                        return n;
                }
            }
            return n;
        }));
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent native drag
    
    // 当节点被点击时，显示NodeMenu
    const node = nodes.find(n => n.id === id);
    if (node) {
      setSelectedNodeForMenu(node);
    }

    // 确保开始拖动节点时，isPanning 为 false
    setIsPanning(false);
    isPanningRef.current = false; // 直接更新 ref 以确保立即生效
    
    if (e.shiftKey) {
        setSelectedNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setSelectedEdgeId(null);
    } else {
        if (!selectedNodeIds.has(id)) {
            setSelectedNodeIds(new Set([id]));
        }
        setSelectedEdgeId(null);
    }

    setDraggingNodeId(id);
    draggingNodeIdRef.current = id; // 直接更新 ref 以确保立即生效
    
    // 无论是否找到节点，都设置 initialNodesRef，确保拖动逻辑可以执行
    initialNodesRef.current = nodes;
    
    if (node) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      if (node.type === 'group') {
          const children = nodes.filter(n => n.parentId === id);
          setDraggedChildrenIds(children.map(c => c.id));
      } else {
          setDraggedChildrenIds([]);
      }
    }
  };

  const handleEdgeSelect = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedEdgeId(id);
      setSelectedNodeIds(new Set());
      setSelectedNodeForMenu(null);
  };
  const handleConnectStart = (e: React.MouseEvent, nodeId: string, handle: HandlePosition) => {
    setConnectionStart({ nodeId, handle });
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
       const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
       const worldPos = screenToWorld(mousePos, transform);
       setTempConnectionEnd(worldPos);
    }
  };
  const handleEdgeReconnectStart = (e: React.MouseEvent, edgeId: string, which: 'from' | 'to') => {
      e.stopPropagation();
      e.preventDefault();
      const edge = edges.find(ed => ed.id === edgeId);
      if(!edge) return;
      setReconnectingEdge({ edgeId, which });
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const worldPos = screenToWorld(mousePos, transform);
        setTempConnectionEnd(worldPos);
     }
  };
  const handleConnectEnd = (e: React.MouseEvent, targetId: string, targetHandle: HandlePosition) => {
     createConnection(targetId, targetHandle);
  };
  const createConnection = (targetId: string, targetHandle: HandlePosition) => {
    if (connectionStart && connectionStart.nodeId !== targetId) {
        const exists = edges.some(edge => 
          (edge.from === connectionStart.nodeId && edge.to === targetId) ||
          (edge.from === targetId && edge.to === connectionStart.nodeId)
        );
        if (!exists) {
          saveHistory(); 
          const newEdge: MindMapEdge = {
              id: generateId(),
              from: connectionStart.nodeId,
              to: targetId,
              fromHandle: connectionStart.handle,
              toHandle: targetHandle,
              style: 'solid',
              arrow: 'to',
              color: darkMode ? '#a3a3a3' : '#94a3b8'
          };
          setEdges(prev => [...prev, newEdge]);
        }
      }
      setConnectionStart(null);
      setTempConnectionEnd(null);
      setSnapPreview(null);
  };

  // --- Optimized Event Handlers using Refs to prevent re-binding ---
  
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
       if (rafRef.current) return;
       const clientX = e.clientX;
       const clientY = e.clientY;
       
       rafRef.current = requestAnimationFrame(() => {
         try {
           const isPanning = isPanningRef.current;
           const selectionBox = selectionBoxRef.current;
           const draggingNodeId = draggingNodeIdRef.current;
           const connectionStart = connectionStartRef.current;
           const reconnectingEdge = reconnectingEdgeRef.current;
           
           const currentTransform = transformRef.current;
           const currentNodes = nodesRef.current;

           if (isPanning) {
               const dx = clientX - dragStartRef.current.x;
               const dy = clientY - dragStartRef.current.y;
               setTransform(prev => ({
                 ...prev,
                 x: itemStartRef.current.x + dx,
                 y: itemStartRef.current.y + dy
               }));
           } 
           else if (selectionBox) {
               const rect = containerRef.current?.getBoundingClientRect();
               if (rect) {
                   setSelectionBox(prev => prev ? ({ ...prev, end: { x: clientX - rect.left, y: clientY - rect.top } }) : null);
               }
           }
           else if (draggingNodeId) {
              const dx = (clientX - dragStartRef.current.x) / currentTransform.scale;
              const dy = (clientY - dragStartRef.current.y) / currentTransform.scale;
              
              const isDraggingSelection = selectedNodeIdsRef.current.has(draggingNodeId);
              const nodesToMove = isDraggingSelection ? Array.from(selectedNodeIdsRef.current) : [draggingNodeId];
              
              setNodes(prev => prev.map(n => {
                  if (nodesToMove.includes(n.id)) {
                      const start = initialNodesRef.current.find(sn => sn.id === n.id) || n;
                      let newX = start.x + dx;
                      let newY = start.y + dy;
                      
                      // 网格吸附逻辑
                      if (snapToGrid) {
                          const GRID_SIZE = 20; // 定义网格大小
                          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                      }
                      
                      return { ...n, x: newX, y: newY };
                  }
                  // Move children of groups if group is moved
                  const parentInSelection = n.parentId && nodesToMove.includes(n.parentId);
                  if (parentInSelection) {
                       const start = initialNodesRef.current.find(sn => sn.id === n.id) || n;
                       let newX = start.x + dx;
                       let newY = start.y + dy;
                       
                       // 网格吸附逻辑
                       if (snapToGrid) {
                           const GRID_SIZE = 20; // 定义网格大小
                           newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                           newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                       }
                       
                       return { ...n, x: newX, y: newY };
                  }
                  return n;
              }));
           } 
           else if (connectionStart && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const mousePos = { x: clientX - rect.left, y: clientY - rect.top };
              const worldPos = screenToWorld(mousePos, currentTransform);
              setTempConnectionEnd(worldPos);
              if (autoSelectNearestHandle) {
                const nearest = getNearestHandle(worldPos, currentNodes, connectionStart.nodeId, 50);
                setSnapPreview(nearest);
              } else {
                setSnapPreview(null);
              }
           }
           else if (reconnectingEdge && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const mousePos = { x: clientX - rect.left, y: clientY - rect.top };
              const worldPos = screenToWorld(mousePos, currentTransform);
              setTempConnectionEnd(worldPos);
              if (autoSelectNearestHandle) {
                const edge = edgesRef.current.find(ed => ed.id === reconnectingEdge.edgeId);
                const excludeNodeId = edge ? (reconnectingEdge.which === 'from' ? edge.to : edge.from) : '';
                const nearest = getNearestHandle(worldPos, currentNodes, excludeNodeId, 50);
                setSnapPreview(nearest);
              } else {
                setSnapPreview(null);
              }
           }
         } finally {
            rafRef.current = null;
         }
       });
  }, [snapToGrid, autoSelectNearestHandle]);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }

    // If we deferred centering while the user was interacting, perform it
    // now.  The pending flag is cleared by performCenter itself.
    if (pendingCenterRef.current) {
      performCenter();
    }

    const selectionBox = selectionBoxRef.current;
    if (selectionBox) {
        const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
        const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
        const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
        const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);

        const currentTransform = transformRef.current;
        const currentNodes = nodesRef.current;

        const p1 = screenToWorld({x: x1, y: y1}, currentTransform);
        const p2 = screenToWorld({x: x2, y: y2}, currentTransform);
        
        const minWX = Math.min(p1.x, p2.x);
        const minWY = Math.min(p1.y, p2.y);
        const maxWX = Math.max(p1.x, p2.x);
        const maxWY = Math.max(p1.y, p2.y);

        const selected = new Set<string>();
        currentNodes.forEach(n => {
            if (n.x >= minWX && n.x + n.width <= maxWX && n.y >= minWY && n.y + n.height <= maxWY) {
                selected.add(n.id);
            }
        });
        
        if (selected.size > 0) setSelectedNodeIds(selected);
        setSelectionBox(null);
    }

    const connectionStart = connectionStartRef.current;
    const reconnectingEdge = reconnectingEdgeRef.current;
    const snap = snapPreviewRef.current; // Use Ref
    const draggingId = draggingNodeIdRef.current;

    if (autoSelectNearestHandle && connectionStart && snap) {
         const exists = edgesRef.current.some(edge => 
            (edge.from === connectionStart.nodeId && edge.to === snap.nodeId) ||
            (edge.from === snap.nodeId && edge.to === connectionStart.nodeId)
        );
        
        if (!exists) {
            const newEdge: MindMapEdge = {
                id: generateId(),
                from: connectionStart.nodeId,
                to: snap.nodeId,
                fromHandle: connectionStart.handle,
                toHandle: snap.handle,
                style: 'solid' as EdgeStyle,
                arrow: 'to' as EdgeArrow,
                color: darkMode ? '#a3a3a3' : '#94a3b8'
            };
            
            setEdges(prev => [...prev, newEdge]);
        }
    }

    if (autoSelectNearestHandle && reconnectingEdge && snap) {
        setEdges(prev => prev.map(e => {
            if (e.id === reconnectingEdge.edgeId) {
                if (reconnectingEdge.which === 'from') return { ...e, from: snap.nodeId, fromHandle: snap.handle };
                else return { ...e, to: snap.nodeId, toHandle: snap.handle };
            }
            return e;
        }));
    }

    if (draggingId) {
        // Record dragged node IDs
        const isDraggingSelection = selectedNodeIdsRef.current.has(draggingId);
        const draggedNodeIds = isDraggingSelection ? Array.from(selectedNodeIdsRef.current) : [draggingId];
        setLastDraggedNodeIds(draggedNodeIds);
        
        // Recalculate groups
        setNodes(prev => {
            const isDraggingSelection = selectedNodeIdsRef.current.has(draggingId);
            const nodesToCheck = isDraggingSelection ? Array.from(selectedNodeIdsRef.current) : [draggingId];
            let current = prev;
            if (nodesToCheck.length === 1) current = updateParentIds(current, nodesToCheck[0]);
            return recalculateGroupBounds(current);
        });
        
        // Save history after drag completion
        saveHistory();
    }

    setIsPanning(false);
    setDraggingNodeId(null);
    setDraggedChildrenIds([]);
    setConnectionStart(null);
    setTempConnectionEnd(null);
    setSnapPreview(null);
    setReconnectingEdge(null);
  }, [darkMode]);

  // Sync handlers to refs
  useEffect(() => {
      mouseMoveHandlerRef.current = handleGlobalMouseMove;
      mouseUpHandlerRef.current = handleMouseUp;
  }, [handleGlobalMouseMove, handleMouseUp]);

  // Update edge handles when nodes are moved
  useEffect(() => {
      if (lastDraggedNodeIds.length > 0 && autoSelectNearestHandle) {
          setEdges(prevEdges => {
              return prevEdges.map(edge => {
                  // Check if this edge is connected to any dragged node
                  if (lastDraggedNodeIds.includes(edge.from) || lastDraggedNodeIds.includes(edge.to)) {
                      const sourceNode = nodesRef.current.find(n => n.id === edge.from);
                      const targetNode = nodesRef.current.find(n => n.id === edge.to);
                        
                      if (sourceNode && targetNode) {
                          // Calculate closest handle pair
                          const closestPair = getClosestHandlePair(sourceNode, targetNode);
                          return {
                              ...edge,
                              fromHandle: closestPair.sourceHandle,
                              toHandle: closestPair.targetHandle
                          };
                      }
                  }
                  return edge;
              });
          });
          
          // Clear last dragged node IDs after updating edges
          setLastDraggedNodeIds([]);
      }
  }, [lastDraggedNodeIds, autoSelectNearestHandle]);

  // Removed the useEffect hook that was causing infinite loops and group node shaking
  // The group node positions are now handled directly in the handleAutoLayout function

  useEffect(() => {
    const onMove = (e: MouseEvent) => mouseMoveHandlerRef.current(e);
    const onUp = (e: MouseEvent) => mouseUpHandlerRef.current(); // Ignore event arg

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []); // Run ONCE




  // ... (updateParentIds, recalculateGroupBounds, updateNodeData, updateNodeResize, updateNodeColor, updateEdge, deleteNode, deleteSelected)
  const updateParentIds = (currentNodes: MindMapNode[], specificNodeId?: string): MindMapNode[] => {
      return currentNodes.map(node => {
          if (node.type === 'group') return node; 
          if (specificNodeId && node.id !== specificNodeId) return node;
          const center = getCenter(node);
          const targetGroup = currentNodes.find(g => 
              g.type === 'group' && 
              g.id !== node.id && 
              center.x >= g.x && center.x <= g.x + g.width &&
              center.y >= g.y && center.y <= g.y + g.height
          );
          if (targetGroup) return { ...node, parentId: targetGroup.id };
          else return { ...node, parentId: undefined };
      });
  };
  const recalculateGroupBounds = (currentNodes: MindMapNode[]): MindMapNode[] => {
    return currentNodes.map(node => {
        if (node.type === 'group') {
            const children = currentNodes.filter(n => n.parentId === node.id);
            if (children.length === 0) return node; 
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            children.forEach(child => {
                minX = Math.min(minX, child.x);
                minY = Math.min(minY, child.y);
                maxX = Math.max(maxX, child.x + child.width);
                maxY = Math.max(maxY, child.y + child.height);
            });
            const PADDING = 30;
            const TITLE_OFFSET = 40;
            const newX = minX - PADDING;
            const newY = minY - PADDING - TITLE_OFFSET;
            const newWidth = (maxX - minX) + (PADDING * 2);
            const newHeight = (maxY - minY) + (PADDING * 2) + TITLE_OFFSET;
            if (Math.abs(newX - node.x) < 1 && Math.abs(newWidth - node.width) < 1 && Math.abs(newHeight - node.height) < 1) return node;
            return { ...node, x: newX, y: newY, width: newWidth, height: newHeight };
        }
        return node;
    });
  };
  
  const updateNodeData = async (id: string, title: string, content: string) => {
    saveHistory(); 
    
    // Check if this is an image node rename operation
    const node = nodes.find(n => n.id === id);
    if (node && node.type === 'image' && node.assetPath && node.title !== title && onRenameAsset) {
        try {
            // Attempt to rename the file in vault
            const newPath = await onRenameAsset(node.assetPath, title);
            // Update node with new path
            setNodes(prev => prev.map(n => n.id === id ? { ...n, title, content, assetPath: newPath } : n));
        } catch (e) {
            console.error("Rename failed", e);
            // If rename fails (e.g. duplicate name), we might want to alert or prevent the title change
            // For now, allow the title change in UI but show warning
             if (onShowMessage) onShowMessage("重命名失败，文件名可能已存在");
             // Still update the title in UI? Maybe better not to if file didn't change
             // setNodes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
        }
    } else {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
    }
  };
  
  const updateNodeResize = (id: string, width: number, height: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
  };
  const updateNodeColor = (id: string, color: NodeColor) => {
    saveHistory(); 
    setNodes(prev => prev.map(n => n.id === id ? { ...n, color } : n));
  };

  // Handle node shape change
  const updateNodeShape = (id: string, shape: 'rectangle' | 'circle') => {
    saveHistory();
    setNodes(prev => prev.map(n => n.id === id ? { ...n, shape } : n));
  };
  const updateEdge = (id: string, updates: Partial<MindMapEdge>) => {
      setEdges(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };
  const deleteNode = (id: string) => {
    saveHistory(); 
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(edge => edge.from !== id && edge.to !== id));
    if (selectedNodeIds.has(id)) {
        const next = new Set(selectedNodeIds);
        next.delete(id);
        setSelectedNodeIds(next);
    }
    // 清除编辑栏，如果删除的是当前选中的节点
    if (selectedNodeForMenu && selectedNodeForMenu.id === id) {
        setSelectedNodeForMenu(null);
    }
  };
  const deleteSelected = () => {
      saveHistory(); 
      if (selectedNodeIds.size > 0) {
          setNodes(prev => prev.filter(n => !selectedNodeIds.has(n.id)));
          setEdges(prev => prev.filter(e => !selectedNodeIds.has(e.from) && !selectedNodeIds.has(e.to)));
          // 清除编辑栏，如果当前选中的节点被删除
          if (selectedNodeForMenu && selectedNodeIds.has(selectedNodeForMenu.id)) {
              setSelectedNodeForMenu(null);
          }
          setSelectedNodeIds(new Set());
      }
      if (selectedEdgeId) {
          setEdges(prev => prev.filter(e => e.id !== selectedEdgeId));
          setSelectedEdgeId(null);
      }
  };

  // Copy selected nodes and edges to clipboard
  const handleCopy = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      const nodesToCopy = nodes.filter(node => selectedNodeIds.has(node.id));
      const edgesToCopy = edges.filter(edge => 
        nodesToCopy.some(node => node.id === edge.from || node.id === edge.to)
      );
      
      const data = {
        nodes: nodesToCopy,
        edges: edgesToCopy,
        timestamp: Date.now()
      };
      
      const jsonStr = JSON.stringify(data);
      navigator.clipboard.writeText(jsonStr)
        .then(() => {
          onShowMessage && onShowMessage("已复制到剪贴板");
        })
        .catch(err => {
          console.error("复制失败:", err);
          onShowMessage && onShowMessage("复制失败");
        });
    }
  }, [selectedNodeIds, nodes, edges, onShowMessage]);

  // Paste nodes and edges from clipboard
  const handlePaste = useCallback(() => {
    navigator.clipboard.readText()
      .then(text => {
        // 检查文本是否为空
        if (!text || text.trim() === '') {
          onShowMessage && onShowMessage("剪贴板为空");
          return;
        }
        
        try {
          const data = JSON.parse(text);
          if (data.nodes && Array.isArray(data.nodes)) {
            saveHistory();
            
            // 为新节点生成新 ID，并调整位置
            const idMap = new Map<string, string>();
            const newNodes = data.nodes.map((node: MindMapNode) => {
              const newId = generateId();
              idMap.set(node.id, newId);
              return {
                ...node,
                id: newId,
                x: node.x + 20,  // 偏移 20px
                y: node.y + 20
              };
            });
            
            // 为新边生成新 ID，并更新节点引用
            const newEdges = (data.edges || []).map((edge: MindMapEdge) => {
              return {
                ...edge,
                id: generateId(),
                from: idMap.get(edge.from) || edge.from,
                to: idMap.get(edge.to) || edge.to
              };
            });
            
            // 添加新节点和边
            setNodes(prev => [...prev, ...newNodes]);
            setEdges(prev => [...prev, ...newEdges]);
            
            // 选中新粘贴的节点
            setSelectedNodeIds(new Set(newNodes.map((node: MindMapNode) => node.id)));
            setSelectedEdgeId(null);
            
            onShowMessage && onShowMessage("粘贴成功");
          } else {
            onShowMessage && onShowMessage("剪贴板中不是有效的节点数据");
          }
        } catch (err) {
          // 当剪贴板内容不是有效的 JSON 时，给出友好提示
          console.error("粘贴失败:", err);
          onShowMessage && onShowMessage("剪贴板中不是有效的节点数据");
        }
      })
      .catch(err => {
        console.error("读取剪贴板失败:", err);
        onShowMessage && onShowMessage("读取剪贴板失败");
      });
  }, [saveHistory, onShowMessage]);

  // Keyboard event listener for Delete key, undo/redo, and copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond when no active input fields
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
        return;
      }
      
      // Handle Delete and Backspace keys
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
      
      // Handle undo/redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      
      // Handle copy shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      
      // Handle Tab key for creating child node
      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedNodeIds.size === 1) {
          const selectedNodeId = Array.from(selectedNodeIds)[0];
          const selectedNode = nodes.find(n => n.id === selectedNodeId);
          if (selectedNode) {
            saveHistory();
            const newNode: MindMapNode = {
              id: generateId(),
              title: '新子节点',
              content: '',
              x: selectedNode.x,
              y: selectedNode.y + selectedNode.height + 40,
              width: 100,
              height: 80,
              color: 'green',
              type: 'node'
            };
            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds(new Set([newNode.id]));
            setSelectedEdgeId(null);
            
            // Create connection between parent and child
            const newEdge: MindMapEdge = {
              id: generateId(),
              from: selectedNode.id,
              to: newNode.id,
              fromHandle: 'bottom' as HandlePosition,
              toHandle: 'top' as HandlePosition,
              style: 'solid' as EdgeStyle,
              arrow: 'to' as EdgeArrow,
              color: darkMode ? '#a3a3a3' : '#94a3b8'
            };
            setEdges(prev => [...prev, newEdge]);
          }
        }
      }
      
      // Handle Enter key for creating sibling node
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedNodeIds.size === 1) {
          const selectedNodeId = Array.from(selectedNodeIds)[0];
          const selectedNode = nodes.find(n => n.id === selectedNodeId);
          if (selectedNode) {
            saveHistory();
            const newNode: MindMapNode = {
              id: generateId(),
              title: '新同级节点',
              content: '',
              x: selectedNode.x + selectedNode.width + 40,
              y: selectedNode.y,
              width: 100,
              height: 80,
              color: 'blue',
              type: 'node'
            };
            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds(new Set([newNode.id]));
            setSelectedEdgeId(null);
            
            // Find parent node of selected node
            const parentEdge = edges.find(edge => edge.to === selectedNode.id);
            if (parentEdge) {
              // Create connection between parent and sibling
              const newEdge: MindMapEdge = {
                id: generateId(),
                from: parentEdge.from,
                to: newNode.id,
                fromHandle: 'right' as HandlePosition,
                toHandle: 'left' as HandlePosition,
                style: 'solid' as EdgeStyle,
                arrow: 'to' as EdgeArrow,
                color: darkMode ? '#a3a3a3' : '#94a3b8'
              };
              setEdges(prev => [...prev, newEdge]);
            } else if (selectedNode.id === nodes[0]?.id) {
              // If selected node is root, no need for connection
            }
          }
        }
      }
      
      // Paste is handled by the clipboard event listener
      // Removed Ctrl+V handling to avoid JSON parsing errors when pasting images
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, undo, redo, handleCopy, handlePaste, nodes, edges, selectedNodeIds, saveHistory, generateId]);

  // AI expand functionality is now available via Skills panel (merged).



  // 合并 Markdown 解析结果与原有脑图状态，保留原有节点的位置和边的样式
  const mergeMarkdownWithExistingGraph = useCallback((
    originalNodes: MindMapNode[],
    originalEdges: MindMapEdge[],
    parsedNodes: MindMapNode[],
    parsedEdges: MindMapEdge[]
  ) => {
    // 创建原有节点的映射，使用更精确的匹配方式
    // 对于图片节点，使用 assetPath 作为键；对于普通节点，使用标题作为键
    // 对于组节点，使用特殊标记
    const originalNodesMap = new Map<string, MindMapNode>();
    const originalGroupNodes = new Map<string, MindMapNode>();
    
    originalNodes.forEach(node => {
      if (node.type === 'group') {
        // 组节点使用特殊标记
        let key = `group:${node.title}`;
        let index = 0;
        while (originalGroupNodes.has(key)) {
          index++;
          key = `group:${node.title}:${index}`;
        }
        originalGroupNodes.set(key, node);
      } else if (node.type === 'image' && node.assetPath) {
        originalNodesMap.set(`image:${node.assetPath}`, node);
      } else {
        // 为普通节点添加索引，避免同名节点冲突
        let key = `node:${node.title}`;
        let index = 0;
        while (originalNodesMap.has(key)) {
          index++;
          key = `node:${node.title}:${index}`;
        }
        originalNodesMap.set(key, node);
      }
    });

    // 创建原有边的映射，按 (fromId, toId) 对进行匹配
    const originalEdgesByPair = new Map<string, MindMapEdge>();
    originalEdges.forEach(edge => {
      originalEdgesByPair.set(`${edge.from}=>${edge.to}`, edge);
    });

    // ID 映射表：从新 ID（parsedNodes 中）到原有 ID
    const idMap = new Map<string, string>();
    
    // 用于跟踪普通节点的标题计数，避免同名节点冲突
    const titleCounts = new Map<string, number>();
    const groupTitleCounts = new Map<string, number>();
    
    // 使用原有节点的位置和样式更新解析后的节点
    const mergedNodes = parsedNodes.map(newNode => {
      let originalNode: MindMapNode | undefined;
      let key: string;
      
      // 首先尝试匹配组节点
      const groupBaseKey = `group:${newNode.title}`;
      const groupCount = groupTitleCounts.get(newNode.title) || 0;
      const groupKey = groupCount === 0 ? groupBaseKey : `${groupBaseKey}:${groupCount}`;
      originalNode = originalGroupNodes.get(groupKey);
      
      if (originalNode) {
        // 记录 ID 映射
        idMap.set(newNode.id, originalNode.id);
        // 保留原有组节点的所有属性
        return {
          ...originalNode
        };
      }
      
      // 然后尝试匹配图片节点
      if (newNode.type === 'image' && newNode.assetPath) {
        key = `image:${newNode.assetPath}`;
        originalNode = originalNodesMap.get(key);
      } else {
        // 最后尝试匹配普通节点
        const baseKey = `node:${newNode.title}`;
        const count = titleCounts.get(newNode.title) || 0;
        key = count === 0 ? baseKey : `${baseKey}:${count}`;
        originalNode = originalNodesMap.get(key);
        titleCounts.set(newNode.title, count + 1);
      }
      
      if (originalNode) {
        // 记录 ID 映射
        idMap.set(newNode.id, originalNode.id);
        // 保留原有节点的位置、样式、颜色等
        return {
          ...newNode,
          id: originalNode.id, // 保留原有 ID
          x: originalNode.x,
          y: originalNode.y,
          width: originalNode.width,
          height: originalNode.height,
          color: originalNode.color,
          icon: originalNode.icon,
          iconPosition: originalNode.iconPosition,
          type: originalNode.type, // 保留原有类型
          // 对于图片节点，保留原有的 imageUrl
          imageUrl: originalNode.imageUrl || newNode.imageUrl,
          // 对于组节点，保留原有属性
          parentId: originalNode.parentId
        };
      }
      
      // 新节点保持解析后的样式，但仍记录 ID 映射
      idMap.set(newNode.id, newNode.id);
      return newNode;
    });

    // 添加未在解析结果中但存在于原有节点中的组节点
    originalGroupNodes.forEach((groupNode, key) => {
      const groupTitle = groupNode.title;
      const groupCount = groupTitleCounts.get(groupTitle) || 0;
      const groupKey = groupCount === 0 ? `group:${groupTitle}` : `group:${groupTitle}:${groupCount}`;
      
      // 检查组节点是否已经被匹配
      const isGroupMatched = mergedNodes.some(node => node.id === groupNode.id);
      if (!isGroupMatched) {
        mergedNodes.push(groupNode);
        idMap.set(groupNode.id, groupNode.id);
        groupTitleCounts.set(groupTitle, groupCount + 1);
      }
    });

    // 使用原有边的样式更新解析后的边
    const mergedEdges = parsedEdges.map(newEdge => {
      const fromNode = parsedNodes.find(n => n.id === newEdge.from);
      const toNode = parsedNodes.find(n => n.id === newEdge.to);
      
      if (fromNode && toNode) {
        const mappedFromId = idMap.get(newEdge.from) || newEdge.from;
        const mappedToId = idMap.get(newEdge.to) || newEdge.to;
        const originalEdge = originalEdgesByPair.get(`${mappedFromId}=>${mappedToId}`);

        if (originalEdge) {
          // 保留原有边的样式和颜色
          return {
            ...newEdge,
            id: originalEdge.id,
            from: mappedFromId,
            to: mappedToId,
            style: originalEdge.style,
            arrow: originalEdge.arrow,
            color: originalEdge.color,
            fromHandle: originalEdge.fromHandle,
            toHandle: originalEdge.toHandle
          };
        }

        // 源边不存在，只更新 ID 映射
        return {
          ...newEdge,
          from: mappedFromId,
          to: mappedToId
        };
      }

      return newEdge;
    });

    // 添加未在解析结果中但存在于原有边中的边
    originalEdges.forEach(originalEdge => {
      const edgeKey = `${originalEdge.from}=>${originalEdge.to}`;
      const isEdgeExists = mergedEdges.some(edge => 
        edge.from === originalEdge.from && edge.to === originalEdge.to
      );
      if (!isEdgeExists) {
        mergedEdges.push(originalEdge);
      }
    });

    return { nodes: mergedNodes, edges: mergedEdges };
  }, []);

  // 保存脑图状态的ref
  const mindmapStateRef = useRef({ nodes: nodes, edges: edges, transform: transform, markdown: markdownContent });
  
  // 当脑图状态（节点/边/视口）变化时更新 ref 中对应字段，但不要覆盖 ref 中已保存的 markdown
  useEffect(() => {
    mindmapStateRef.current = { nodes, edges, transform, markdown: mindmapStateRef.current.markdown };
  }, [nodes, edges, transform]);

  // Handle background pattern change
  const handleBackgroundChange = useCallback((pattern: 'none' | 'dots' | 'grid' | 'lines') => {
    setCurrentBackground(pattern);
  }, []);

  const handleToggleView = useCallback(() => {
    if (currentView === 'mindmap') {
      // 从脑图视图切换到Markdown视图
      saveHistory(); // 保存当前状态到历史记录
      const md = generateMarkdown(nodes, edges);
      // 保存Markdown内容
      setMarkdownContent(md);
      // 更新mindmapStateRef中的markdown内容
      mindmapStateRef.current = { nodes, edges, transform, markdown: md };
      // 保存当前脑图状态
      const currentData = { nodes, edges, transform, version: 1 };
      const dataString = JSON.stringify(currentData, null, 2);
      onSave?.(dataString);
      // 更新视图状态
      setCurrentView('markdown');
    } else {
        // 从Markdown视图切换到脑图视图
        saveHistory(); // 保存当前状态到历史记录
        
        // 检查Markdown内容是否有变化
        if (markdownContent !== mindmapStateRef.current.markdown) {
          // 如果Markdown内容有变化，重新解析生成新的节点和边
          let { nodes: parsedNodes, edges: parsedEdges } = parseMarkdown(markdownContent);
          
          // 解析图片节点的assetPath为imageUrl
          if (onResolveResource) {
              parsedNodes = parsedNodes.map((node: MindMapNode) => {
                  if (node.type === 'image' && node.assetPath) {
                      return { ...node, imageUrl: onResolveResource(node.assetPath) };
                  }
                  return node;
              });
          }
          
          // 合并解析结果与原有脑图状态，保留原有节点的位置和边的样式
          const { nodes: mergedNodes, edges: mergedEdges } = mergeMarkdownWithExistingGraph(
            mindmapStateRef.current.nodes,
            mindmapStateRef.current.edges,
            parsedNodes,
            parsedEdges
          );
          
          // 直接更新状态
          setNodes(mergedNodes);
          setEdges(mergedEdges);
          // 立即更新mindmapStateRef，使用合并后的节点和边
          mindmapStateRef.current = { 
            nodes: mergedNodes, 
            edges: mergedEdges, 
            transform: mindmapStateRef.current.transform, 
            markdown: markdownContent 
          };
          // 保存切换后的状态
          const currentData = { nodes: mergedNodes, edges: mergedEdges, transform: mindmapStateRef.current.transform, version: 1 };
          const dataString = JSON.stringify(currentData, null, 2);
          onSave?.(dataString);
        } else {
          // 如果Markdown内容没有变化，使用之前保存的脑图状态
          const { nodes: savedNodes, edges: savedEdges, transform: savedTransform } = mindmapStateRef.current;
          setNodes(savedNodes);
          setEdges(savedEdges);
          setTransform(savedTransform);
          // 保存切换后的状态
          const currentData = { nodes: savedNodes, edges: savedEdges, transform: savedTransform, version: 1 };
          const dataString = JSON.stringify(currentData, null, 2);
          onSave?.(dataString);
        }
        
        setCurrentView('mindmap');
      }
  }, [currentView, nodes, edges, transform, markdownContent, onSave, saveHistory, mergeMarkdownWithExistingGraph]);

  const handleMarkdownChange = useCallback((content: string) => {
    setMarkdownContent(content);
    // 只更新markdownContent状态，不更新mindmapStateRef
    // 这样在切换回脑图视图时，通过比较markdownContent和mindmapStateRef.current.markdown
    // 就能正确检测到内容变化
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const md = generateMarkdown(nodes, edges);
    if (onSaveMarkdown) {
        onSaveMarkdown(`${fileName || '思维导图'}.md`, md);
    } else {
        // Fallback for web
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName || '思维导图'}.md`;
        link.click();
        URL.revokeObjectURL(url);
    }
    if (onShowMessage) onShowMessage("已导出 Markdown 文件");
  }, [nodes, edges, fileName, onShowMessage, onSaveMarkdown]);

  // Handle automatic layout
  const handleAutoLayout = useCallback(() => {
    saveHistory(); // Save current state to history
    
    // Calculate relationship weights
    const edgesWithWeights = calculateRelationshipWeights(nodes, edges);
    
    // Get layout parameters from settings
    const layoutParams = {
      repulsionForce: settings.layoutRepulsionForce,
      attractionForce: settings.layoutAttractionForce,
      minDistance: settings.layoutMinDistance,
      iterations: settings.layoutIterations
    };
    
    // Calculate new layout
    const newNodes = calculateAutomaticLayout(nodes, edgesWithWeights, currentLayout, layoutParams);
    
    // Apply the new layout and recalculate group bounds to get final node positions
    const finalNodes = recalculateGroupBounds(newNodes);
    setNodes(finalNodes);

    // Update edge handles based on final node positions (keep original styles)
    const updatedEdges = edges.map(edge => {
      const sourceNode = finalNodes.find(n => n.id === edge.from);
      const targetNode = finalNodes.find(n => n.id === edge.to);
        
      if (sourceNode && targetNode) {
        const closestPair = getClosestHandlePair(sourceNode, targetNode);
        return {
          ...edge,
          fromHandle: closestPair.sourceHandle,
          toHandle: closestPair.targetHandle
        };
      }
      return edge;
    });
    
    // Update edges with new handles only (keep original styles)
    setEdges(updatedEdges);

    // Fit view to new layout using the current scale to compute transform
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        finalNodes.forEach(node => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x + node.width);
          maxY = Math.max(maxY, node.y + node.height);
        });

        if (minX !== Infinity) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          // Use functional update to avoid stale transform, and account for current scale
          setTransform(prev => ({
            ...prev,
            x: rect.width / 2 - centerX * prev.scale,
            y: rect.height / 2 - centerY * prev.scale
          }));
        }
      }
    }
    
    if (onShowMessage) onShowMessage("已自动调整布局");
  }, [nodes, edges, saveHistory, onShowMessage, transform, currentLayout]);

  // Handle layout settings change
  const handleLayoutSettingsChange = useCallback((settings: {
    repulsionForce: number;
    attractionForce: number;
    minDistance: number;
    iterations: number;
  }) => {
    // Layout settings are controlled by the plugin settings, not local state
    // This function is currently a no-op as settings are managed by the plugin
  }, []);



  // Handle opening links
  const handleOpenLink = useCallback((linkPath: string) => {
    if (app && app.workspace) {
        // 尝试使用Obsidian API打开文件
        try {
            // 首先尝试直接打开路径
            app.workspace.openLinkText(linkPath, '', false);
        } catch (error) {
            console.error('Failed to open link:', error);
            // 如果失败，尝试其他方法
            if (app.vault) {
                const file = app.vault.getAbstractFileByPath(linkPath);
                if (file) {
                    app.workspace.openLeaf().then((leaf: any) => {
                        leaf.openFile(file as any);
                    });
                }
            }
        }
    } else {
        console.log('App object not available, cannot open link:', linkPath);
    }
  }, [app]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Add visual feedback if needed
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    saveHistory();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mousePos, transform);
    
    // Handle Obsidian internal file drag
    const obsidianData = e.dataTransfer.getData('application/x-obsidian-md');
    if (obsidianData) {
      try {
        const data = JSON.parse(obsidianData);
        if (data.files && data.files.length > 0) {
          data.files.forEach((filePath: string, index: number) => {
            createFileNode(filePath, worldPos.x, worldPos.y, index);
          });
        }
      } catch (error) {
        console.error('Failed to parse Obsidian drag data:', error);
      }
    }
    
    // Handle external file drag
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          processImageFile(file, worldPos.x, worldPos.y, index);
        } else {
          createExternalFileNode(file, worldPos.x, worldPos.y, index);
        }
      });
    }
  };

  const createFileNode = (filePath: string, x: number, y: number, index: number) => {
    const fileName = filePath.split('/').pop() || filePath;
    
    // 确保路径格式正确，去除多余空格
    let cleanPath = filePath.trim();
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
    
    let content: string;
    if (isImage) {
      // 对于图片，使用普通双链格式
      content = `![[${cleanPath}]]`;
    } else {
      // 对于非图片文件，使用obsidian://open URL格式
      // 移除.md扩展名
      if (cleanPath.endsWith('.md')) {
        cleanPath = cleanPath.substring(0, cleanPath.length - 3);
      }
      // 生成obsidian://open URL，添加new-tab参数使其在新标签页打开
      const encodedVault = encodeURIComponent(''); // 留空，Obsidian会使用当前库
      const encodedFile = encodeURIComponent(cleanPath);
      const obsidianUrl = `obsidian://open?vault=${encodedVault}&file=${encodedFile}&new-tab=true`;
      content = `[${fileName}](${obsidianUrl})`;
    }
    
    const newNode: MindMapNode = {
      id: generateId(),
      title: fileName,
      content: content,
      x: x + (index * 20),
      y: y + (index * 20),
      width: 150,
      height: 80,
      color: 'blue',
      type: 'node'
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
  };

  const createExternalFileNode = (file: File, x: number, y: number, index: number) => {
    const newNode: MindMapNode = {
      id: generateId(),
      title: file.name,
      content: `[${file.name}](file:///)`,
      x: x + (index * 20),
      y: y + (index * 20),
      width: 150,
      height: 80,
      color: 'purple',
      type: 'node'
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
  };

  // File search and import functions
  const searchFiles = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      if (app && app.vault && app.vault.getFiles) {
        // Use actual Obsidian API to get files
        const allFiles = app.vault.getFiles();
        const filteredFiles = allFiles.filter((file: any) => 
          file.name.toLowerCase().includes(query.toLowerCase()) ||
          file.path.toLowerCase().includes(query.toLowerCase())
        );
        
        // Convert to search result format
        const results = filteredFiles.map((file: any) => ({
          path: file.path,
          name: file.name
        }));
        
        setSearchResults(results);
      } else {
        // Fallback to mock data if API not available
        const mockResults = [
          { path: 'notes/file1.md', name: 'file1.md' },
          { path: 'notes/file2.md', name: 'file2.md' },
          { path: 'images/pic1.png', name: 'pic1.png' }
        ].filter(file => 
          file.name.toLowerCase().includes(query.toLowerCase()) ||
          file.path.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(mockResults);
      }
    } catch (error) {
      console.error('Failed to search files:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [app]);

  const importFile = useCallback((file: any) => {
    saveHistory();
    // 计算视图中心位置，使新节点更靠近中心
    let centerX = 0;
    let centerY = 0;
    
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0) {
      // 计算所有节点的边界框，然后取边界框的中心
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      currentNodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      
      // 计算边界框的中心
      const boundsCenterX = (minX + maxX) / 2;
      const boundsCenterY = (minY + maxY) / 2;
      
      // 调整新节点的位置，使其位于边界框中心
      centerX = boundsCenterX - 75; // 75是节点宽度的一半
      centerY = boundsCenterY - 40; // 40是节点高度的一半
    }
    
    // Detect file type based on extension
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
    
    // Use different format based on file type
    // 确保路径格式正确，去除多余空格
    let cleanPath = file.path.trim();
    
    let content: string;
    if (isImage) {
      // 对于图片，使用普通双链格式
      content = `![[${cleanPath}]]`;
    } else {
      // 对于非图片文件，使用obsidian://open URL格式
      // 移除.md扩展名
      if (cleanPath.endsWith('.md')) {
        cleanPath = cleanPath.substring(0, cleanPath.length - 3);
      }
      // 生成obsidian://open URL，添加new-tab参数使其在新标签页打开
      const encodedVault = encodeURIComponent(''); // 留空，Obsidian会使用当前库
      const encodedFile = encodeURIComponent(cleanPath);
      const obsidianUrl = `obsidian://open?vault=${encodedVault}&file=${encodedFile}&new-tab=true`;
      content = `[${file.name}](${obsidianUrl})`;
    }
    
    const newNode: MindMapNode = {
      id: generateId(),
      title: file.name,
      content: content,
      x: centerX,
      y: centerY,
      width: 150,
      height: 80,
      color: isImage ? 'green' : 'blue',
      type: 'node'
    };
    
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
    setSearchQuery('');
    setSearchResults([]);
  }, [saveHistory]);

  const selectedEdgeObj = edges.find(e => e.id === selectedEdgeId);
  const groupNodes = nodes.filter(n => n.type === 'group');
  const standardNodes = nodes.filter(n => n.type !== 'group');

  return (
    <div 
      ref={containerRef}
      className={`mindo-canvas-container ${currentBackground !== 'none' ? `mindo-bg-pattern-${currentBackground}` : ''}`}
      onWheel={handleWheel}
    >
      {currentView === 'mindmap' && (
        <div 
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, outline: 'none', cursor: isPanning ? 'grabbing' : 'default' }}
          onMouseDown={handleMouseDownCanvas}
          onDoubleClick={handleDoubleClickCanvas}
          onContextMenu={handleContextMenu}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div 
            style={{ 
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              width: '100%', 
              height: '100%',
              position: 'relative'
            }}
          >
            {groupNodes.map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                scale={transform.scale}
                isSelected={selectedNodeIds.has(node.id)}
                isDragging={draggingNodeId === node.id || (selectedNodeIds.has(node.id) && !!draggingNodeId)}
                onMouseDown={handleNodeMouseDown}
                onMouseUp={handleMouseUp} // Use stable handler
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onUpdate={updateNodeData}
                onResize={updateNodeResize}
                onResizeStart={saveHistory} 
                onDelete={deleteNode}
                onColorChange={updateNodeColor}
                onShapeChange={updateNodeShape}
                onContextMenu={handleNodeContextMenu}
                onRenderMarkdown={onRenderMarkdown}
                onOpenLink={handleOpenLink}
                useCodeMirror={false}
                darkMode={darkMode}
              />
            ))}
            <svg style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%', zIndex: 25 }}>
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.from);
                const target = nodes.find(n => n.id === edge.to);
                if (!source || !target) return null;
                return (
                  <EdgeComponent
                    key={edge.id}
                    edge={edge}
                    sourceNode={source}
                    targetNode={target}
                    isSelected={selectedEdgeId === edge.id}
                    onSelect={handleEdgeSelect}
                    onDelete={() => { saveHistory(); setEdges(prev => prev.filter(e => e.id !== edge.id)); }}
                    onUpdate={updateEdge}
                    onInteractStart={saveHistory} 
                    transform={transform}
                  />
                );
              })}
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.from);
                const target = nodes.find(n => n.id === edge.to);
                if (!source || !target) return null;
                return (
                  <EdgeLabel
                    key={edge.id}
                    edge={edge}
                    sourceNode={source}
                    targetNode={target}
                    onSelect={handleEdgeSelect}
                    darkMode={darkMode}
                  />
                );
              })}
            </div>
            {standardNodes.map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                scale={transform.scale}
                isSelected={selectedNodeIds.has(node.id)}
                isDragging={draggingNodeId === node.id || (selectedNodeIds.has(node.id) && !!draggingNodeId)}
                onMouseDown={handleNodeMouseDown}
                onMouseUp={handleMouseUp}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onUpdate={updateNodeData}
                onResize={updateNodeResize}
                onResizeStart={saveHistory} 
                onDelete={deleteNode}
                onColorChange={updateNodeColor}
                onShapeChange={updateNodeShape}
                onContextMenu={handleNodeContextMenu}
                onRenderMarkdown={onRenderMarkdown}
                onOpenLink={handleOpenLink}
                useCodeMirror={false}
                darkMode={darkMode}
              />
            ))}
            <svg style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%', zIndex: 60 }}>
              {selectedEdgeObj && selectedEdgeId && (() => {
                  const source = nodes.find(n => n.id === selectedEdgeObj.from);
                  const target = nodes.find(n => n.id === selectedEdgeObj.to);
                  if (!source || !target) return null;
                  const start = getHandlePosition(source, selectedEdgeObj.fromHandle);
                  const end = getHandlePosition(target, selectedEdgeObj.toHandle);
                  const color = selectedEdgeObj.color || '#94a3b8';
                  return (
                      <>
                           <circle
                              cx={start.x}
                              cy={start.y}
                              r={6}
                              fill="white"
                              stroke={color}
                              strokeWidth={2}
                              cursor="crosshair"
                              pointerEvents="auto"
                              onMouseDown={(e) => handleEdgeReconnectStart(e, selectedEdgeObj.id, 'from')}
                          />
                           <circle
                              cx={end.x}
                              cy={end.y}
                              r={6}
                              fill="white"
                              stroke={color}
                              strokeWidth={2}
                              cursor="crosshair"
                              pointerEvents="auto"
                              onMouseDown={(e) => handleEdgeReconnectStart(e, selectedEdgeObj.id, 'to')}
                          />
                      </>
                  );
              })()}
              {(connectionStart || reconnectingEdge) && tempConnectionEnd && (
                  <>
                  <path
                      d={(() => {
                          let startPoint: Position;
                          if (reconnectingEdge) {
                              const edge = edges.find(e => e.id === reconnectingEdge.edgeId);
                              if (!edge) return '';
                              if (reconnectingEdge.which === 'to') {
                                  const source = nodes.find(n => n.id === edge.from);
                                  if (!source) return '';
                                  startPoint = getHandlePosition(source, edge.fromHandle);
                              } else {
                                  const target = nodes.find(n => n.id === edge.to);
                                  if (!target) return '';
                                  startPoint = getHandlePosition(target, edge.toHandle);
                              }
                          } else if (connectionStart) {
                               const source = nodes.find(n => n.id === connectionStart.nodeId);
                               if (!source) return '';
                               startPoint = getHandlePosition(source, connectionStart.handle);
                          } else {
                              return '';
                          }
                          const endPoint = snapPreview 
                              ? getHandlePosition(nodes.find(n => n.id === snapPreview.nodeId)!, snapPreview.handle)
                              : tempConnectionEnd;
                          return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
                      })()}
                      className={`mindo-connection-preview ${snapPreview ? 'snapping' : ''}`}
                  />
                  </>
              )}
            </svg>
            {selectionBox && (
                <div 
                    className="mindo-selection-box"
                    style={{
                        left: Math.min(selectionBox.start.x, selectionBox.end.x) / transform.scale - transform.x / transform.scale,
                        top: Math.min(selectionBox.start.y, selectionBox.end.y) / transform.scale - transform.y / transform.scale,
                        width: Math.abs(selectionBox.end.x - selectionBox.start.x) / transform.scale,
                        height: Math.abs(selectionBox.end.y - selectionBox.start.y) / transform.scale
                    }}
                />
            )}
          </div>
        </div>
      )}
      {currentView === 'mindmap' && selectedEdgeId && selectedEdgeObj && (
          <EdgeMenu 
              edge={selectedEdgeObj} 
              onUpdate={(id, updates) => {
                  saveHistory(); 
                  updateEdge(id, updates);
              }}
              onDelete={(id) => {
                  saveHistory(); 
                  setEdges(prev => prev.filter(e => e.id !== selectedEdgeObj.id));
              }}
          />
      )}
      {/* Search Bar */}
      {currentView === 'mindmap' && (
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          onSearch={searchFiles}
          onImportFile={importFile}
          isVisible={!selectedEdgeId && selectedNodeIds.size === 0}
        />
      )}
      
      <Toolbar
        scale={transform.scale}
        onZoomIn={() => setTransform(t => ({ ...t, scale: Math.min(t.scale + 0.2, 5) }))}
        onZoomOut={() => setTransform(t => ({ ...t, scale: Math.max(t.scale - 0.2, 0.1) }))}
        onFitView={() => {
            if (containerRef.current && nodes.length > 0) {
                // 计算所有节点的边界
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                nodes.forEach(node => {
                    minX = Math.min(minX, node.x);
                    minY = Math.min(minY, node.y);
                    maxX = Math.max(maxX, node.x + node.width);
                    maxY = Math.max(maxY, node.y + node.height);
                });
                
                // 计算边界的宽度和高度
                const boundsWidth = maxX - minX;
                const boundsHeight = maxY - minY;
                
                // 获取容器的宽度和高度
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                
                // 计算缩放比例，确保所有节点都在视图中
                const scaleX = (containerWidth * 0.8) / boundsWidth; // 留20%的边距
                const scaleY = (containerHeight * 0.8) / boundsHeight;
                const scale = Math.min(scaleX, scaleY, 1); // 最大缩放比例为1
                
                // 计算中心位置
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                // 设置新的变换
                setTransform({ 
                    x: containerWidth/2 - centerX * scale, 
                    y: containerHeight/2 - centerY * scale, 
                    scale: scale 
                });
            }
        }}
        
        onAddGroup={handleCreateGroup}
        onOpenImageOperationModal={handleOpenImageOperationModal}
        onExportMarkdown={handleExportMarkdown}
        onToggleView={handleToggleView}
        currentView={currentView}
        onAlign={handleAlign}
        onUndo={undo}
        onRedo={redo}
        onAutoLayout={handleAutoLayout}
        onBackgroundChange={handleBackgroundChange}
        currentBackground={currentBackground}
        layoutSettings={{
          repulsionForce: settings.layoutRepulsionForce,
          attractionForce: settings.layoutAttractionForce,
          minDistance: settings.layoutMinDistance,
          iterations: settings.layoutIterations
        }}
        onLayoutSettingsChange={handleLayoutSettingsChange}
        canGroup={selectedNodeIds.size > 1}
        canAlign={selectedNodeIds.size > 1}
        hasSingleSelection={selectedNodeIds.size === 1}
        nodeCount={nodes.length}
        snapToGrid={snapToGrid}
        onSnapToGridChange={setSnapToGrid}
      />
      {/* toolbar always rendered but marked fixed via css */}
      
      {/* 脑图视图容器 */}
      <div 
        ref={canvasContainerRef}
        className="mindo-canvas"
        style={{ 
          flex: 1, 
          position: 'relative', 
          overflow: 'hidden',
          backgroundColor: darkMode ? '#111827' : '#f3f4f6',
          transition: 'opacity 0.3s ease-in-out'
        }}
        onMouseDown={handleMouseDownCanvas}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClickCanvas}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onWheel={handleWheel}
      >
        {/* 脑图内容容器 - 总是渲染，确保导出功能正常工作 */}
        <div 
          ref={canvasContentRef}
          className="mindo-canvas-content"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: currentView !== 'mindmap' ? 'none' : 'auto',
            opacity: currentView === 'mindmap' ? 1 : 0,
            zIndex: currentView === 'mindmap' ? 1 : -1
          }}
        >
          {/* Edges */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            {edges.map(edge => (
              <EdgeComponent
                key={edge.id}
                edge={edge}
                nodes={nodes}
                onEdgeSelect={handleEdgeSelect}
                onEdgeReconnectStart={handleEdgeReconnectStart}
                selectedEdgeId={selectedEdgeId}
                darkMode={darkMode}
              />
            ))}
          </svg>
          
          {/* Nodes */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            {nodes.map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNodeIds.has(node.id)}
                isDragging={draggingNodeId === node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={() => setDraggingNodeId(null)}
                onConnectStart={(e, handle) => handleConnectStart(e, node.id, handle)}
                onConnectEnd={(e, handle) => handleConnectEnd(e, node.id, handle)}
                onUpdate={updateNodeData}
                onResize={updateNodeResize}
                onResizeStart={() => {}}
                onDelete={() => deleteNode(node.id)}
                onColorChange={(color) => updateNodeColor(node.id, color)}
                onShapeChange={(shape) => updateNodeShape(node.id, shape)}
                onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                onSelect={() => handleNodeSelect(node.id)}
                scale={transform.scale}
                onRenderMarkdown={onRenderMarkdown}
                onOpenLink={handleOpenLink}
                useCodeMirror={true}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
        
        {/* Temp Connection */}
        {connectionStart && tempConnectionEnd && (
          <svg 
            className="mindo-temp-connection" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <line 
              x1={getHandlePosition(nodes.find(n => n.id === connectionStart.nodeId)!, connectionStart.handle).x + transform.x}
              y1={getHandlePosition(nodes.find(n => n.id === connectionStart.nodeId)!, connectionStart.handle).y + transform.y}
              x2={tempConnectionEnd.x * transform.scale + transform.x}
              y2={tempConnectionEnd.y * transform.scale + transform.y}
              stroke={darkMode ? '#a3a3a3' : '#94a3b8'}
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          </svg>
        )}
        
        {/* Selection Box */}
        {selectionBox && (
          <div 
            className="mindo-selection-box"
            style={{
              position: 'absolute',
              left: Math.min(selectionBox.start.x, selectionBox.end.x),
              top: Math.min(selectionBox.start.y, selectionBox.end.y),
              width: Math.abs(selectionBox.end.x - selectionBox.start.x),
              height: Math.abs(selectionBox.end.y - selectionBox.start.y),
              border: `1px dashed ${darkMode ? '#a3a3a3' : '#94a3b8'}`,
              backgroundColor: darkMode ? 'rgba(163, 163, 163, 0.1)' : 'rgba(148, 163, 184, 0.1)',
              pointerEvents: 'none'
            }}
          />
        )}
        
        {/* Search Bar */}
        {showSearchBox && (
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            onSelectResult={(nodeId) => {
              const node = nodes.find(n => n.id === nodeId);
              if (node) {
                setTransform(prev => ({
                  ...prev,
                  x: containerRef.current!.clientWidth / 2 - (node.x + node.width / 2) * prev.scale,
                  y: containerRef.current!.clientHeight / 2 - (node.y + node.height / 2) * prev.scale
                }));
                setSelectedNodeIds(new Set([nodeId]));
                setShowSearchBox(false);
              }
            }}
            onClose={() => setShowSearchBox(false)}
            darkMode={darkMode}
          />
        )}
      </div>
      
      {/* Markdown View */}
      {currentView === 'markdown' && (
        <div 
          ref={markdownWrapperRef}
          className="mindo-markdown-view"
          style={{ 
            flex: 1, 
            position: 'relative', 
            overflow: 'auto',
            backgroundColor: 'transparent',
            padding: '20px',
            transition: 'opacity 0.3s ease-in-out',
            border: 'none',
            margin: 0
          }}
        >
          <MarkdownView
            markdown={markdownContent}
            onChange={handleMarkdownChange}
            darkMode={darkMode}
          />
        </div>
      )}
      
      {/* Context Menu */}
      {currentView === 'mindmap' && (
        <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.visible}
        onClose={closeContextMenu}
        darkMode={darkMode}
        items={contextMenu.type === 'node' ? [
          { label: '头脑风暴', onClick: () => contextMenu.nodeId && handleBrainstorm(contextMenu.nodeId) },
          { label: '内容深化', onClick: () => contextMenu.nodeId && handleDeepenContent(contextMenu.nodeId) },
          { label: '删除节点', onClick: () => contextMenu.nodeId && deleteNode(contextMenu.nodeId) }
        ] : [
          { label: '一键生成', onClick: handleGenerateMindMap },
          { label: '智能配色', onClick: handleSmartColorScheme },
          selectedNodeIds.size >= 2 && {
            label: '对齐',
            subItems: [
              {
                label: '水平对齐',
                subItems: [
                  { label: '左对齐', onClick: () => handleAlign('horizontal', 'left') },
                  { label: '水平居中', onClick: () => handleAlign('horizontal', 'center') },
                  { label: '右对齐', onClick: () => handleAlign('horizontal', 'right') }
                ]
              },
              {
                label: '垂直对齐',
                subItems: [
                  { label: '顶部对齐', onClick: () => handleAlign('vertical', 'top') },
                  { label: '垂直居中', onClick: () => handleAlign('vertical', 'middle') },
                  { label: '底部对齐', onClick: () => handleAlign('vertical', 'bottom') }
                ]
              }
            ]
          },
          {
            label: `对齐功能: ${snapToGrid ? '开' : '关'}`,
            onClick: () => setSnapToGrid(!snapToGrid)
          },
          {
            label: `切换连接点: ${autoSelectNearestHandle ? '开' : '关'}`,
            onClick: () => setAutoSelectNearestHandle(!autoSelectNearestHandle)
          }
        ].filter(Boolean)}
      />
      )}
      
      {/* Icon Selector */}
      {currentView === 'mindmap' && showIconSelector && (
        <IconSelector
          onSelectIcon={handleSelectIcon}
          onClose={() => setShowIconSelector(false)}
          darkMode={darkMode}
        />
      )}
      
      {/* Node Menu */}
      {currentView === 'mindmap' && selectedNodeForMenu && (
        <NodeMenu
          node={selectedNodeForMenu}
          onDelete={deleteNode}
          onColorChange={updateNodeColor}
          onIconChange={handleIconChange}
          onIconPositionChange={handleIconPositionChange}
          onTitleVisibleChange={handleTitleVisibleChange}
          darkMode={darkMode}
        />
      )}



    </div>
  );
};

export default App;