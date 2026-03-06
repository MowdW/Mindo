// Image generation service for Mindo
import { MindMapNode, MindMapEdge } from '../types';
import * as htmlToImage from 'html-to-image';

interface MindoData {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    version: number;
    transform?: any;
}

/**
 * Generate a unique filename for the mindo image
 */
export function generateImageFilename(mindoPath: string): string {
    const fileName = mindoPath.split('/').pop()?.replace('.mindo', '') || 'untitled';
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${safeName}_preview.png`;
}

/**
 * Create a temporary element to render the mindo content
 */
function createMindoElement(data: MindoData): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.backgroundColor = '#ffffff';
    container.style.overflow = 'hidden';
    
    // Calculate bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    data.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    
    const padding = 30;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    
    // Draw edges
    data.edges.forEach(edge => {
        const sourceNode = data.nodes.find(n => n.id === edge.from);
        const targetNode = data.nodes.find(n => n.id === edge.to);
        
        if (sourceNode && targetNode) {
            const sourceX = sourceNode.x - minX + padding + sourceNode.width / 2;
            const sourceY = sourceNode.y - minY + padding + sourceNode.height / 2;
            const targetX = targetNode.x - minX + padding + targetNode.width / 2;
            const targetY = targetNode.y - minY + padding + targetNode.height / 2;
            
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.left = '0';
            line.style.top = '0';
            line.style.width = '100%';
            line.style.height = '100%';
            line.style.pointerEvents = 'none';
            line.style.zIndex = '1';
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            
            // Create curved path instead of straight line
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const controlPointX = sourceX + dx / 2;
            const controlPointY = sourceY + dy / 2 - distance / 4;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${sourceX} ${sourceY} Q ${controlPointX} ${controlPointY} ${targetX} ${targetY}`);
            path.setAttribute('stroke', edge.color || '#666666');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            
            svg.appendChild(path);
            line.appendChild(svg);
            container.appendChild(line);
        }
    });
    
    // Draw nodes
    data.nodes.forEach(node => {
        const x = node.x - minX + padding;
        const y = node.y - minY + padding;
        
        const nodeElement = document.createElement('div');
        nodeElement.style.position = 'absolute';
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
        nodeElement.style.width = `${node.width}px`;
        nodeElement.style.height = `${node.height}px`;
        nodeElement.style.backgroundColor = node.color || '#ffeb3b';
        nodeElement.style.borderRadius = '8px';
        nodeElement.style.border = '1px solid #333333';
        nodeElement.style.display = 'flex';
        nodeElement.style.flexDirection = 'column';
        nodeElement.style.alignItems = 'center';
        nodeElement.style.justifyContent = 'center';
        nodeElement.style.padding = '8px';
        nodeElement.style.boxSizing = 'border-box';
        nodeElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        nodeElement.style.zIndex = '2';
        
        // Handle image nodes
        if (node.type === 'image' && node.imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = node.imageUrl;
            imgElement.style.maxWidth = '100%';
            imgElement.style.maxHeight = '80%';
            imgElement.style.objectFit = 'contain';
            imgElement.style.marginBottom = '4px';
            nodeElement.appendChild(imgElement);
        }
        
        const textElement = document.createElement('div');
        textElement.style.color = '#333333';
        textElement.style.fontFamily = 'Arial, sans-serif';
        textElement.style.fontSize = '12px';
        textElement.style.textAlign = 'center';
        textElement.style.wordWrap = 'break-word';
        textElement.style.maxWidth = '100%';
        textElement.textContent = node.title;
        
        nodeElement.appendChild(textElement);
        container.appendChild(nodeElement);
    });
    
    return container;
}

/**
 * Generate image data URL from mindo content
 */
export async function generateImageFromMindoContent(content: string): Promise<string> {
    try {
        const data = JSON.parse(content) as MindoData;
        
        // Create temporary element to render the mindo content
        const mindoElement = createMindoElement(data);
        
        // Add to DOM temporarily
        document.body.appendChild(mindoElement);
        
        try {
            // Generate image using html-to-image
            const dataUrl = await htmlToImage.toPng(mindoElement, {
                backgroundColor: '#ffffff',
                pixelRatio: 2
            });
            
            return dataUrl;
        } finally {
            // Remove temporary element
            document.body.removeChild(mindoElement);
        }
    } catch (error) {
        console.error('Failed to generate image from mindo content:', error);
        throw error;
    }
}
