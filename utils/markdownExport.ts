import { MindMapNode, MindMapEdge, HandlePosition, EdgeStyle, EdgeArrow, NodeColor } from '../types';

// 生成唯一ID
const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

export const generateMarkdown = (nodes: MindMapNode[], edges: MindMapEdge[]): string => {
    // 1. Build Adjacency List (Parent -> Children)
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach(n => {
        adj.set(n.id, []);
        inDegree.set(n.id, 0);
    });

    edges.forEach(e => {
        if (adj.has(e.from)) {
            adj.get(e.from)?.push(e.to);
            inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
        }
    });

    // 2. Identify Root Nodes (In-degree 0)
    // Filter out group nodes from being strictly "content roots", 
    // unless they contain nodes, but usually we just want the content structure.
    // However, if a node is inside a group (parentId), it is visually a child of that group.
    // For markdown export, let's treat visual connection (edges) as the primary hierarchy.
    // If a node has no incoming edges, it's a root.
    
    const roots = nodes.filter(n => (inDegree.get(n.id) || 0) === 0);

    // Sort roots by Y position (top to bottom)
    roots.sort((a, b) => a.y - b.y);

    let markdownOutput = "";

    // 3. DFS Traversal to build Markdown
    const visited = new Set<string>();

    const processNode = (nodeId: string, depth: number) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        // Image Handling
        if (node.type === 'image') {
            const indent = "  ".repeat(depth);
            if (node.assetPath) {
                // Use Obsidian Wikilink format for images stored in vault
                markdownOutput += `${indent}![[${node.assetPath}]]\n`;
            } else {
                // Fallback for embedded base64 or external links
                markdownOutput += `${indent}![${node.title}](${node.imageUrl || ''})\n`;
            }
            // Continue to process children of image nodes if any
        } else {
            // Heading formatting
            // Level 1 (#), Level 2 (##), etc.
            const headingPrefix = "#".repeat(Math.min(depth + 1, 6)); 
            
            if (depth < 6) {
                markdownOutput += `${headingPrefix} ${node.title}\n`;
            } else {
                markdownOutput += `${"  ".repeat(depth - 6)}- **${node.title}**\n`;
            }

            if (node.content && node.content.trim()) {
                markdownOutput += `\n${node.content.trim()}\n`;
            }
        }
        
        markdownOutput += "\n";

        // Get children
        const childrenIds = adj.get(nodeId) || [];
        // Sort children by Y position (or X if same Y)
        const childrenNodes = childrenIds
            .map(id => nodes.find(n => n.id === id))
            .filter((n): n is MindMapNode => !!n)
            .sort((a, b) => a.y - b.y || a.x - b.x);

        childrenNodes.forEach(child => {
            processNode(child.id, depth + 1);
        });
    };

    roots.forEach(root => {
        processNode(root.id, 0);
        markdownOutput += "---\n\n"; // Separator for unconnected trees
    });

    return markdownOutput.trim();
};

export const parseMarkdown = (markdown: string): { nodes: MindMapNode[], edges: MindMapEdge[] } => {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];
    
    // 解析Markdown内容
    const lines = markdown.split('\n');
    
    // 用于跟踪节点层级和父节点
    const stack: string[] = [];
    const nodePositions: { [key: string]: { x: number, y: number } } = {};
    
    // 颜色数组，用于为不同层级的节点分配不同的颜色
    const colors: NodeColor[] = ['yellow', 'blue', 'green', 'purple', 'red', 'orange'];
    
    let currentY = 0;
    const yStep = 120; // 节点之间的垂直间距
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 跳过分隔线
        if (line === '---') return;
        
        // 处理标题
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const depth = headingMatch[1].length - 1;
            const title = headingMatch[2];
            
            // 调整栈的大小，确保与当前层级匹配
            while (stack.length > depth) {
                stack.pop();
            }
            
            // 创建新节点
            const nodeId = generateId();
            const color = colors[Math.min(depth, colors.length - 1)];
            
            // 计算节点位置，使节点更靠近视图中心
            const x = depth * 100; // 减少每级缩进，从200px改为100px
            const y = currentY;
            currentY += yStep;
            
            const node: MindMapNode = {
                id: nodeId,
                title: title,
                content: '',
                x: x - 100, // 向左偏移100px，使根节点更靠近中心
                y: y - 100, // 向上偏移100px，使根节点更靠近中心
                width: 150,
                height: 80,
                color: color,
                type: 'node'
            };
            
            nodes.push(node);
            nodePositions[nodeId] = { x, y };
            
            // 如果不是根节点，创建与父节点的连接
            if (stack.length > 0) {
                const parentId = stack[stack.length - 1];
                const edge: MindMapEdge = {
                    id: generateId(),
                    from: parentId,
                    to: nodeId,
                    fromHandle: 'right' as HandlePosition,
                    toHandle: 'left' as HandlePosition,
                    style: 'solid' as EdgeStyle,
                    arrow: 'to' as EdgeArrow,
                    color: '#94a3b8' // 使用默认的灰色连接线颜色
                };
                edges.push(edge);
            }
            
            // 将当前节点ID推入栈中
            stack.push(nodeId);
            
        } else if (stack.length > 0) {
            // 处理内容行，包括图片链接
            const currentNodeId = stack[stack.length - 1];
            const currentNode = nodes.find(n => n.id === currentNodeId);
            if (currentNode) {
                // 检查是否是图片链接
                const imageMatch = line.match(/!\[\[(.*?)\]\]/); // 匹配 Obsidian 双链格式
                if (imageMatch) {
                    // 对于图片链接，创建独立的图片节点
                    const assetPath = imageMatch[1];
                    const nodeId = generateId();
                    const depth = stack.length;
                    const color = colors[Math.min(depth, colors.length - 1)];
                    
                    // 计算节点位置，使节点更靠近视图中心
                    const x = depth * 100; // 减少每级缩进，从200px改为100px
                    const y = currentY;
                    currentY += yStep;
                    
                    const node: MindMapNode = {
                        id: nodeId,
                        title: assetPath.split('/').pop() || 'Image',
                        content: '',
                        imageUrl: '', // 实际的图片 URL 需要在视图中通过 onResolveResource 处理
                        assetPath: assetPath,
                        x: x - 100, // 向左偏移100px，使根节点更靠近中心
                        y: y - 100, // 向上偏移100px，使根节点更靠近中心
                        width: 200,
                        height: 150,
                        color: color,
                        type: 'image'
                    };
                    
                    nodes.push(node);
                    nodePositions[nodeId] = { x, y };
                    
                    // 创建与父节点的连接
                    const parentId = currentNodeId;
                    const edge: MindMapEdge = {
                        id: generateId(),
                        from: parentId,
                        to: nodeId,
                        fromHandle: 'right' as HandlePosition,
                        toHandle: 'left' as HandlePosition,
                        style: 'solid' as EdgeStyle,
                        arrow: 'to' as EdgeArrow,
                        color: '#94a3b8' // 使用默认的灰色连接线颜色
                    };
                    edges.push(edge);
                } else {
                    // 处理普通内容行，添加到当前节点的content中
                    currentNode.content += (currentNode.content ? '\n' : '') + line;
                }
            }
        }
    });
    
    return { nodes, edges };
};