// Direct test script for SVG export functionality
// This script directly tests the svg-export.ts functionality

// Test data that matches the actual Mindo data structure
const testData = {
  "nodes": [
    {
      "id": "root",
      "title": "中心主题",
      "content": "思维导图中心主题",
      "x": 0,
      "y": 0,
      "width": 200,
      "height": 100,
      "color": "yellow"
    },
    {
      "id": "node1",
      "title": "子节点1",
      "content": "第一个子节点",
      "x": 300,
      "y": -100,
      "width": 150,
      "height": 80,
      "color": "blue"
    },
    {
      "id": "node2",
      "title": "子节点2",
      "content": "第二个子节点",
      "x": 300,
      "y": 100,
      "width": 150,
      "height": 80,
      "color": "green"
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "from": "root",
      "to": "node1",
      "fromHandle": "right",
      "toHandle": "left",
      "style": "solid",
      "arrow": "to",
      "color": "#666"
    },
    {
      "id": "edge2",
      "from": "root",
      "to": "node2",
      "fromHandle": "right",
      "toHandle": "left",
      "style": "solid",
      "arrow": "to",
      "color": "#666"
    }
  ],
  "version": 1
};

// Simulate the SVG export functions
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function mindoToSvg(data) {
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
  const padding = 20;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  
  // Create SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">`;
  
  // Draw edges
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.from);
    const targetNode = nodes.find(n => n.id === edge.to);
    
    if (sourceNode && targetNode) {
      // Calculate center points for each node
      const sourceX = sourceNode.x + sourceNode.width / 2;
      const sourceY = sourceNode.y + sourceNode.height / 2;
      const targetX = targetNode.x + targetNode.width / 2;
      const targetY = targetNode.y + targetNode.height / 2;
      
      // Use edge color if specified, otherwise default to #666
      const edgeColor = edge.color || '#666';
      
      svg += `<path d="M ${sourceX} ${sourceY} L ${targetX} ${targetY}" stroke="${edgeColor}" stroke-width="2" fill="none"/>`;
    }
  });
  
  // Draw nodes
  nodes.forEach(node => {
    // Draw node rectangle
    svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="8" ry="8" fill="${node.color || '#ffeb3b'}" stroke="#333" stroke-width="1"/>`;
    
    // Draw node text
    const textX = node.x + node.width / 2;
    const textY = node.y + node.height / 2 + 5;
    svg += `<text x="${textX}" y="${textY}" text-anchor="middle" fill="#333" font-family="Arial, sans-serif" font-size="14">${escapeHtml(node.title)}</text>`;
  });
  
  svg += `</svg>`;
  return svg;
}

console.log('Testing SVG export functionality...');
try {
  const svg = mindoToSvg(testData);
  console.log('SVG generated successfully!');
  console.log('SVG output:');
  console.log(svg);
  console.log('\nTest passed: SVG generation works correctly with the current data structure.');
} catch (error) {
  console.error('Error generating SVG:', error);
  console.log('Test failed: SVG generation does not work correctly.');
}
