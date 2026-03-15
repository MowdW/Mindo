import { MindMapNode, MindMapEdge, HandlePosition, EdgeStyle, EdgeArrow, NodeColor } from '../types';

// 生成随机ID
const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

// 生成基于内容的稳定ID
export const generateStableId = (title: string, depth: number): string => {
    // 使用标题和层级生成稳定的ID
    const hash = title + depth.toString();
    let h = 0;
    for (let i = 0; i < hash.length; i++) {
        h = ((h << 5) - h) + hash.charCodeAt(i);
        h = h & h; // 转换为32位整数
    }
    return Math.abs(h).toString(36);
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
    const roots = nodes.filter(n => (inDegree.get(n.id) || 0) === 0);

    let markdownOutput = "";

    // 3. DFS Traversal to build Markdown
    const visited = new Set<string>();

    // 计算节点的内容量（子节点数量）
    const getNodeContentSize = (nodeId: string): number => {
        let size = 1; // 节点本身
        const childrenIds = adj.get(nodeId) || [];
        childrenIds.forEach(childId => {
            size += getNodeContentSize(childId);
        });
        return size;
    };

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
                markdownOutput += `${headingPrefix} ${node.title || '无标题'}\n`;
            } else {
                markdownOutput += `${"  ".repeat(depth - 6)}- **${node.title || '无标题'}**\n`;
            }

            if (node.content && node.content.trim()) {
                markdownOutput += `\n${node.content.trim()}\n`;
            }
        }
        
        markdownOutput += "\n";

        // Get children
        const childrenIds = adj.get(nodeId) || [];
        // 按内容量（子节点数量）排序，内容量多的排在前面
        const childrenNodes = childrenIds
            .map(id => nodes.find(n => n.id === id))
            .filter((n): n is MindMapNode => !!n)
            .sort((a, b) => {
                // 按内容量排序，内容量多的排在前面
                const sizeA = getNodeContentSize(a.id);
                const sizeB = getNodeContentSize(b.id);
                return sizeB - sizeA; // 降序排列
            });

        childrenNodes.forEach(child => {
            processNode(child.id, depth + 1);
        });
    };

    // 按内容量（子节点数量）排序根节点，内容量多的排在前面
    const sortedRoots = roots.sort((a, b) => {
        const sizeA = getNodeContentSize(a.id);
        const sizeB = getNodeContentSize(b.id);
        return sizeB - sizeA; // 降序排列
    });

    // 处理根节点
    if (sortedRoots.length > 0) {
        // 按内容量排序后的顺序处理根节点
        sortedRoots.forEach((root, index) => {
            if (index > 0) {
                markdownOutput += "---\n\n"; // Separator for unconnected trees
            }
            processNode(root.id, 0);
        });
    } else if (nodes.length > 0) {
        // 如果没有找到根节点，使用所有节点作为根节点
        // 按内容量排序节点
        const sortedNodes = nodes.sort((a, b) => {
            const sizeA = getNodeContentSize(a.id);
            const sizeB = getNodeContentSize(b.id);
            return sizeB - sizeA; // 降序排列
        });
        
        sortedNodes.forEach(node => {
            if (!visited.has(node.id)) {
                processNode(node.id, 0);
                markdownOutput += "---\n\n"; // Separator for unconnected trees
            }
        });
    }

    // 如果仍然没有生成内容，添加一个默认的标题
    if (markdownOutput.trim() === "") {
        markdownOutput = "# 思维导图\n\n没有内容可导出\n";
    }

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
    
    // 用于跟踪每个父节点的子节点计数，用于垂直位置偏移
    const childCounts: { [key: string]: number } = {};
    
    // 节点之间的垂直间距
    const yStep = 100;
    
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
            const nodeId = generateStableId(title, depth);
            const color = colors[Math.min(depth, colors.length - 1)];
            
            // 计算节点位置，使节点更靠近上级节点
            let x = 0;
            let y = 0;
            
            if (stack.length > 0) {
                // 子节点位置：在父节点右侧
                const parentId = stack[stack.length - 1];
                const parentPos = nodePositions[parentId];
                if (parentPos) {
                    // 子节点在父节点右侧 150px 处（更靠近父节点）
                    x = parentPos.x + 150;
                    
                    // 计算垂直位置，为每个子节点添加偏移，避免重叠
                    const childCount = childCounts[parentId] || 0;
                    y = parentPos.y + (childCount * (yStep / 2)); // 子节点之间的间距为 yStep/2
                    
                    // 更新父节点的子节点计数
                    childCounts[parentId] = childCount + 1;
                }
            } else {
                // 根节点位置：中心
                x = 0;
                y = 0;
            }
            
            const node: MindMapNode = {
                id: nodeId,
                title: title,
                content: '',
                x: x - 75, // 向左偏移节点宽度的一半，使节点中心对齐计算位置
                y: y - 40, // 向上偏移节点高度的一半，使节点中心对齐计算位置
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
                    const nodeId = generateStableId(assetPath, stack.length);
                    const depth = stack.length;
                    const color = colors[Math.min(depth, colors.length - 1)];
                    
                    // 计算节点位置，使节点更靠近上级节点
                    let x = 0;
                    let y = 0;
                    
                    if (stack.length > 0) {
                        // 图片节点位置：在父节点右侧
                        const parentId = stack[stack.length - 1];
                        const parentPos = nodePositions[parentId];
                        if (parentPos) {
                            // 图片节点在父节点右侧 150px 处（更靠近父节点）
                            x = parentPos.x + 150;
                            
                            // 计算垂直位置，为每个子节点添加偏移，避免重叠
                            const childCount = childCounts[parentId] || 0;
                            y = parentPos.y + (childCount * (yStep / 2)); // 子节点之间的间距为 yStep/2
                            
                            // 更新父节点的子节点计数
                            childCounts[parentId] = childCount + 1;
                        }
                    } else {
                        // 根节点位置：中心
                        x = 0;
                        y = 0;
                    }
                    
                    const node: MindMapNode = {
                        id: nodeId,
                        title: assetPath.split('/').pop() || 'Image',
                        content: '',
                        imageUrl: '', // 实际的图片 URL 需要在视图中通过 onResolveResource 处理
                        assetPath: assetPath,
                        x: x - 100, // 向左偏移节点宽度的一半，使节点中心对齐计算位置
                        y: y - 75, // 向上偏移节点高度的一半，使节点中心对齐计算位置
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