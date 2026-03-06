// SVG export functionality for Mindo
import { MindMapNode, MindMapEdge, NodeColor } from './types';

interface MindoData {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    version: number;
    transform?: any;
}

// SVG cache to avoid redundant generation
interface SvgCache {
    contentHash: string;
    svg: string;
    timestamp: number;
}

const svgCache = new Map<string, SvgCache>();
const CACHE_MAX_SIZE = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Color palette matching types.ts
const COLOR_MAP: Record<NodeColor, { bg: string; text: string; dark: string }> = {
    gray:   { bg: '#a3a3a3', text: '#ffffff', dark: '#525252' },
    red:    { bg: '#ff6b6b', text: '#ffffff', dark: '#e03131' },
    yellow: { bg: '#fcc419', text: '#ffffff', dark: '#f59f00' },
    green:  { bg: '#51cf66', text: '#ffffff', dark: '#2f9e44' },
    blue:   { bg: '#4dabf7', text: '#ffffff', dark: '#1971c2' },
    purple: { bg: '#cc5de8', text: '#ffffff', dark: '#9c36b5' },
    black:  { bg: '#343a40', text: '#ffffff', dark: '#212529' }
};

/**
 * Generate a hash from content
 */
function generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Clean up old cache entries
 */
function cleanupCache() {
    const now = Date.now();
    const entries = Array.from(svgCache.entries());
    
    // Remove expired entries
    for (const [key, cache] of entries) {
        if (now - cache.timestamp > CACHE_TTL) {
            svgCache.delete(key);
        }
    }
    
    // If still too big, remove oldest entries
    if (svgCache.size > CACHE_MAX_SIZE) {
        const sortedEntries = entries
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, svgCache.size - CACHE_MAX_SIZE);
        
        for (const [key] of sortedEntries) {
            svgCache.delete(key);
        }
    }
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontSize * 0.6)));
    const lines: string[] = [];
    const words = text.split('\n');
    
    for (const word of words) {
        if (word.length <= charsPerLine) {
            lines.push(word);
        } else {
            for (let i = 0; i < word.length; i += charsPerLine) {
                lines.push(word.substring(i, i + charsPerLine));
            }
        }
    }
    
    return lines;
}

/**
 * Convert mindo data to SVG with proper styling
 */
export function mindoToSvg(data: MindoData): string {
    const nodes = data.nodes || [];
    const edges = data.edges || [];
    
    // Calculate SVG dimensions
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    
    // Add padding
    const padding = 30;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    // Create SVG with defs for shadows
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">`;
    
    // Add filter definitions for shadows
    svg += `<defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.25" />
        </filter>
    </defs>`;
    
    // Draw edges first (so they appear behind nodes)
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.from);
        const targetNode = nodes.find(n => n.id === edge.to);
        
        if (sourceNode && targetNode) {
            // Calculate center points for each node
            const sourceX = sourceNode.x + sourceNode.width / 2;
            const sourceY = sourceNode.y + sourceNode.height / 2;
            const targetX = targetNode.x + targetNode.width / 2;
            const targetY = targetNode.y + targetNode.height / 2;
            
            // Use edge color or default gray
            const edgeColor = edge.color || '#9ca3af';
            const strokeWidth = 2;
            const strokeDasharray = edge.style === 'dashed' ? '5,5' : edge.style === 'dotted' ? '2,3' : 'none';
            
            // Draw arrow if needed
            if (edge.arrow && edge.arrow !== 'none') {
                svg += `<defs><marker id="arrowhead-${edge.id}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="${edgeColor}" />
                </marker></defs>`;
            }
            
            const markerEnd = (edge.arrow === 'to' || edge.arrow === 'both') ? `marker-end="url(#arrowhead-${edge.id})"` : '';
            const markerStart = (edge.arrow === 'from' || edge.arrow === 'both') ? `marker-start="url(#arrowhead-${edge.id})"` : '';
            
            svg += `<path d="M ${sourceX} ${sourceY} L ${targetX} ${targetY}" 
                stroke="${edgeColor}" 
                stroke-width="${strokeWidth}" 
                fill="none"
                ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                ${markerEnd}
                ${markerStart}
                opacity="0.7"
            />`;
        }
    });
    
    // Draw nodes
    nodes.forEach(node => {
        const color = node.color || 'gray';
        const colorScheme = COLOR_MAP[color];
        const bgColor = colorScheme.bg;
        const textColor = colorScheme.text;
        
        // Draw node rectangle with shadow
        const rx = 8;
        const ry = 8;
        svg += `<rect 
            x="${node.x}" 
            y="${node.y}" 
            width="${node.width}" 
            height="${node.height}" 
            rx="${rx}" 
            ry="${ry}" 
            fill="${bgColor}" 
            stroke="none"
            filter="url(#shadow)"
        />`;
        
        // Draw subtle border
        svg += `<rect 
            x="${node.x}" 
            y="${node.y}" 
            width="${node.width}" 
            height="${node.height}" 
            rx="${rx}" 
            ry="${ry}" 
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            stroke-width="0.5"
        />`;
        
        // Draw node text with wrapping
        const fontSize = Math.min(14, Math.max(10, node.height / 3));
        const padding = 8;
        const textWidth = node.width - padding * 2;
        const lines = wrapText(node.title, textWidth, fontSize);
        
        const lineHeight = fontSize * 1.4;
        const totalHeight = lines.length * lineHeight;
        const startY = node.y + (node.height - totalHeight) / 2 + fontSize / 2;
        
        lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            svg += `<text 
                x="${node.x + node.width / 2}" 
                y="${y}" 
                text-anchor="middle" 
                fill="${textColor}" 
                font-family="Arial, Helvetica, sans-serif" 
                font-size="${fontSize}"
                font-weight="500"
                word-wrap="break-word"
            >${escapeHtml(line)}</text>`;
        });
    });
    
    svg += `</svg>`;
    return svg;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generate SVG from mindo file content with caching
 */
export function generateSvgFromMindoContent(content: string): string {
    try {
        // Validate input
        if (!content || typeof content !== 'string') {
            console.error('Invalid content provided to generateSvgFromMindoContent:', content);
            return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" text-anchor="middle" fill="red">Invalid input content</text></svg>`;
        }
        
        // Clean up cache
        cleanupCache();
        
        // Generate content hash
        const contentHash = generateContentHash(content);
        
        // Check cache
        const cached = svgCache.get(contentHash);
        if (cached) {
            console.log('[Mindo] SVG cache hit for content hash:', contentHash);
            return cached.svg;
        }
        
        console.log('[Mindo] SVG cache miss, generating new SVG');
        
        // Generate new SVG
        const data = JSON.parse(content) as MindoData;
        
        // Validate data structure
        if (!data.nodes || !Array.isArray(data.nodes)) {
            console.error('Invalid data structure: nodes array is missing or not an array');
            return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" text-anchor="middle" fill="red">Invalid data structure: nodes array missing</text></svg>`;
        }
        
        const svg = mindoToSvg(data);
        
        // Store in cache
        svgCache.set(contentHash, {
            contentHash,
            svg,
            timestamp: Date.now()
        });
        
        console.log('[Mindo] SVG generated and cached successfully');
        return svg;
    } catch (error) {
        console.error('[Mindo] Failed to generate SVG from mindo content:', error);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" text-anchor="middle" fill="red">Error: ${error instanceof Error ? error.message : 'Unknown error'}</text></svg>`;
    }
}