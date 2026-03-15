// Test script for SVG export functionality
const { generateSvgFromMindoContent } = require('./web.js');

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

// Convert test data to JSON string
const testDataString = JSON.stringify(testData, null, 2);

console.log('Testing SVG export functionality...');
try {
  const svg = generateSvgFromMindoContent(testDataString);
  console.log('SVG generated successfully!');
  console.log('SVG output:');
  console.log(svg);
} catch (error) {
  console.error('Error generating SVG:', error);
}
