
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type NodeColor = 'yellow' | 'green' | 'blue' | 'purple' | 'red' | 'gray' | 'black';
export type HandlePosition = 'top' | 'right' | 'bottom' | 'left';
export type EdgeStyle = 'solid' | 'dashed' | 'dotted';
export type EdgeArrow = 'none' | 'to' | 'from' | 'both';
export type EdgeType = 'bezier' | 'straight' | 'step';
export type EdgeLabelStyle = 'plain' | 'border'; // New type for label styling
export type IconType = 'star' | 'circle' | 'check' | 'lightning' | 'bulb' | 'question' | 'none'; // Icon types for node annotation
export type IconPosition = 'corner' | 'inline'; // Icon position: corner (top-left) or inline (before title)

export interface MindoSettings {
  aiProvider: 'gemini' | 'openai';
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  // New Image Settings
  imageSaveLocation: 'obsidian' | 'folder';
  imageFolderPath: string;
  // Layout Settings
  layoutRepulsionForce: number;
  layoutAttractionForce: number;
  layoutMinDistance: number;
  layoutIterations: number;
}

export interface MindMapNode {
  id: string;
  type?: 'node' | 'group' | 'image'; // Distinguish between standard nodes, groups, and images
  title: string;
  content?: string; // Optional body content
  imageUrl?: string; // For image nodes (Display URL)
  assetPath?: string; // Path in Obsidian vault (Persistence)
  x: number;
  y: number;
  width: number;
  height: number;
  color: NodeColor;
  icon?: IconType; // Icon for node annotation
  iconPosition?: IconPosition; // Icon position: corner (top-left) or inline (before title)
  parentId?: string; // For tree structure logic
  titleVisible?: boolean; // Whether to show title area
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  fromHandle: HandlePosition;
  toHandle: HandlePosition;
  // New features
  label?: string;
  labelStyle?: EdgeLabelStyle; // New property
  style?: EdgeStyle;
  color?: string; // Hex code or standard color name
  arrow?: EdgeArrow;
  type?: EdgeType; // bezier, straight, step
  breakpoints?: Position[]; // List of intermediate control points
  controlPoint?: Position; // Deprecated in favor of breakpoints, kept for backward compat or single bezier control
  // Relationship properties for layout optimization
  relationshipType?: 'parent-child' | 'sibling' | 'association' | 'causal';
  weight?: number; // Relationship weight (0-1)
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

// Unified Color Definitions (Fresh & Bright Palette)
const PALETTE_DEF = {
    gray:   { hex: '#a3a3a3', className: 'mindo-theme-gray' },   // Neutral Gray
    red:    { hex: '#ff6b6b', className: 'mindo-theme-red' },    // Fresh Coral
    yellow: { hex: '#fcc419', className: 'mindo-theme-yellow' }, // Vivid Yellow/Orange
    green:  { hex: '#51cf66', className: 'mindo-theme-green' },  // Fresh Green
    blue:   { hex: '#4dabf7', className: 'mindo-theme-blue' },   // Fresh Sky Blue
    purple: { hex: '#cc5de8', className: 'mindo-theme-purple' }, // Fresh Purple
    black:  { hex: '#343a40', className: 'mindo-theme-black' },  // Dark Slate
};

export const NODE_STYLES: Record<NodeColor, { className: string; picker: string }> = {
  gray:   { className: PALETTE_DEF.gray.className,   picker: PALETTE_DEF.gray.hex },
  red:    { className: PALETTE_DEF.red.className,    picker: PALETTE_DEF.red.hex },
  yellow: { className: PALETTE_DEF.yellow.className, picker: PALETTE_DEF.yellow.hex },
  green:  { className: PALETTE_DEF.green.className,  picker: PALETTE_DEF.green.hex },
  blue:   { className: PALETTE_DEF.blue.className,   picker: PALETTE_DEF.blue.hex },
  purple: { className: PALETTE_DEF.purple.className, picker: PALETTE_DEF.purple.hex },
  black:  { className: PALETTE_DEF.black.className,  picker: PALETTE_DEF.black.hex },
};

export const COLOR_PALETTE: NodeColor[] = ['gray', 'red', 'yellow', 'green', 'blue', 'purple', 'black'];

// Ensure Edge Colors match the Node Palette exactly
export const EDGE_COLORS = [
    PALETTE_DEF.gray.hex,
    PALETTE_DEF.red.hex,
    PALETTE_DEF.yellow.hex,
    PALETTE_DEF.green.hex,
    PALETTE_DEF.blue.hex,
    PALETTE_DEF.purple.hex,
    PALETTE_DEF.black.hex,
];

// Layout type enum
export enum LayoutType {
  LOGICAL = 'logical', // 逻辑图（右侧分布）
  MIND_MAP = 'mind_map', // 思维导图（两侧分布）
  ORGANIZATION = 'organization', // 组织架构图
  RADIAL = 'radial', // 放射状
  FISHBONE = 'fishbone', // 鱼骨图
  TIMELINE = 'timeline', // 时间线
  MATRIX = 'matrix', // 矩阵
  ONION = 'onion' // 洋葱图
}