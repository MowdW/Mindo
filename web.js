// index.tsx
import React7 from "react";
import ReactDOM2 from "react-dom/client";

// App.tsx
import { useState as useState6, useRef as useRef3, useEffect as useEffect4, useCallback } from "react";

// types.ts
var PALETTE_DEF = {
  gray: { hex: "#a3a3a3", className: "mindo-theme-gray" },
  // Neutral Gray
  red: { hex: "#ff6b6b", className: "mindo-theme-red" },
  // Fresh Coral
  yellow: { hex: "#fcc419", className: "mindo-theme-yellow" },
  // Vivid Yellow/Orange
  green: { hex: "#51cf66", className: "mindo-theme-green" },
  // Fresh Green
  blue: { hex: "#4dabf7", className: "mindo-theme-blue" },
  // Fresh Sky Blue
  purple: { hex: "#cc5de8", className: "mindo-theme-purple" },
  // Fresh Purple
  black: { hex: "#343a40", className: "mindo-theme-black" }
  // Dark Slate
};
var NODE_STYLES = {
  gray: { className: PALETTE_DEF.gray.className, picker: PALETTE_DEF.gray.hex },
  red: { className: PALETTE_DEF.red.className, picker: PALETTE_DEF.red.hex },
  yellow: { className: PALETTE_DEF.yellow.className, picker: PALETTE_DEF.yellow.hex },
  green: { className: PALETTE_DEF.green.className, picker: PALETTE_DEF.green.hex },
  blue: { className: PALETTE_DEF.blue.className, picker: PALETTE_DEF.blue.hex },
  purple: { className: PALETTE_DEF.purple.className, picker: PALETTE_DEF.purple.hex },
  black: { className: PALETTE_DEF.black.className, picker: PALETTE_DEF.black.hex }
};
var COLOR_PALETTE = ["gray", "red", "yellow", "green", "blue", "purple", "black"];
var EDGE_COLORS = [
  PALETTE_DEF.gray.hex,
  PALETTE_DEF.red.hex,
  PALETTE_DEF.yellow.hex,
  PALETTE_DEF.green.hex,
  PALETTE_DEF.blue.hex,
  PALETTE_DEF.purple.hex,
  PALETTE_DEF.black.hex
];

// utils/geometry.ts
var getCenter = (node) => {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2
  };
};
var generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};
var getHandlePosition = (node, handle) => {
  switch (handle) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "left":
      return { x: node.x, y: node.y + node.height / 2 };
    default:
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }
};
var getNearestHandle = (point, nodes, excludeNodeId, threshold = 30) => {
  let closest = null;
  for (const node of nodes) {
    if (node.id === excludeNodeId)
      continue;
    const handles = ["top", "right", "bottom", "left"];
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
var getStepPoints = (start, end, sourceHandle, targetHandle) => {
  const offset = 20;
  let pStart = { ...start };
  let pEnd = { ...end };
  switch (sourceHandle) {
    case "top":
      pStart.y -= offset;
      break;
    case "bottom":
      pStart.y += offset;
      break;
    case "left":
      pStart.x -= offset;
      break;
    case "right":
      pStart.x += offset;
      break;
  }
  switch (targetHandle) {
    case "top":
      pEnd.y -= offset;
      break;
    case "bottom":
      pEnd.y += offset;
      break;
    case "left":
      pEnd.x -= offset;
      break;
    case "right":
      pEnd.x += offset;
      break;
  }
  const midX = (pStart.x + pEnd.x) / 2;
  const midY = (pStart.y + pEnd.y) / 2;
  const startVertical = sourceHandle === "top" || sourceHandle === "bottom";
  const endVertical = targetHandle === "top" || targetHandle === "bottom";
  const points = [start, pStart];
  if (startVertical === endVertical) {
    if (startVertical) {
      if (sourceHandle === "bottom" && pEnd.y > pStart.y || sourceHandle === "top" && pEnd.y < pStart.y) {
        points.push({ x: pStart.x, y: midY });
        points.push({ x: pEnd.x, y: midY });
      } else {
        points.push({ x: pStart.x, y: midY });
        points.push({ x: pEnd.x, y: midY });
      }
    } else {
      points.push({ x: midX, y: pStart.y });
      points.push({ x: midX, y: pEnd.y });
    }
  } else {
    if (startVertical) {
      points.push({ x: pStart.x, y: pEnd.y });
    } else {
      points.push({ x: pEnd.x, y: pStart.y });
    }
  }
  points.push(pEnd);
  points.push(end);
  return points;
};
var getBezierMidpoint = (start, end, sourceHandle, targetHandle, manualControlPoint, type = "bezier", breakpoints = []) => {
  if (type === "step") {
    const points = getStepPoints(start, end, sourceHandle, targetHandle);
    if (points.length >= 2) {
      const totalPoints = points.length;
      const midIndex = Math.floor((totalPoints - 1) / 2);
      const p1 = points[midIndex];
      const p2 = points[midIndex + 1];
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  }
  if (breakpoints.length === 1) {
    const t2 = 0.5;
    const cp = breakpoints[0];
    const x2 = (1 - t2) * (1 - t2) * start.x + 2 * (1 - t2) * t2 * cp.x + t2 * t2 * end.x;
    const y2 = (1 - t2) * (1 - t2) * start.y + 2 * (1 - t2) * t2 * cp.y + t2 * t2 * end.y;
    return { x: x2, y: y2 };
  }
  if (breakpoints.length > 1) {
    const midIdx = Math.floor(breakpoints.length / 2);
    const p1 = breakpoints[midIdx];
    const p2 = breakpoints[midIdx + 1] || end;
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }
  if (manualControlPoint) {
    const t2 = 0.5;
    const x2 = (1 - t2) * (1 - t2) * start.x + 2 * (1 - t2) * t2 * manualControlPoint.x + t2 * t2 * end.x;
    const y2 = (1 - t2) * (1 - t2) * start.y + 2 * (1 - t2) * t2 * manualControlPoint.y + t2 * t2 * end.y;
    return { x: x2, y: y2 };
  }
  const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  const controlOffset = Math.min(dist * 0.5, 100);
  let cp1 = { ...start };
  let cp2 = { ...end };
  if (sourceHandle === "top")
    cp1.y -= controlOffset;
  if (sourceHandle === "bottom")
    cp1.y += controlOffset;
  if (sourceHandle === "left")
    cp1.x -= controlOffset;
  if (sourceHandle === "right")
    cp1.x += controlOffset;
  if (targetHandle === "top")
    cp2.y -= controlOffset;
  if (targetHandle === "bottom")
    cp2.y += controlOffset;
  if (targetHandle === "left")
    cp2.x -= controlOffset;
  if (targetHandle === "right")
    cp2.x += controlOffset;
  const t = 0.5;
  const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * t * t * cp2.x + t * t * t * end.x;
  const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * t * t * cp2.y + t * t * t * end.y;
  return { x, y };
};
var getQuadraticAngleAtT = (start, cp, end, t) => {
  const dx = 2 * (1 - t) * (cp.x - start.x) + 2 * t * (end.x - cp.x);
  const dy = 2 * (1 - t) * (cp.y - start.y) + 2 * t * (end.y - cp.y);
  return Math.atan2(dy, dx) * (180 / Math.PI);
};
var getCubicAngleAtT = (start, cp1, cp2, end, t) => {
  const dx = 3 * Math.pow(1 - t, 2) * (cp1.x - start.x) + 6 * (1 - t) * t * (cp2.x - cp1.x) + 3 * Math.pow(t, 2) * (end.x - cp2.x);
  const dy = 3 * Math.pow(1 - t, 2) * (cp1.y - start.y) + 6 * (1 - t) * t * (cp2.y - cp1.y) + 3 * Math.pow(t, 2) * (end.y - cp2.y);
  return Math.atan2(dy, dx) * (180 / Math.PI);
};
var getClosestHandlePair = (sourceNode, targetNode) => {
  const handles = ["top", "right", "bottom", "left"];
  let closestPair = null;
  for (const sourceHandle of handles) {
    for (const targetHandle of handles) {
      const sourcePos = getHandlePosition(sourceNode, sourceHandle);
      const targetPos = getHandlePosition(targetNode, targetHandle);
      const distance = Math.sqrt(
        Math.pow(sourcePos.x - targetPos.x, 2) + Math.pow(sourcePos.y - targetPos.y, 2)
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
    sourceHandle: closestPair.sourceHandle,
    targetHandle: closestPair.targetHandle
  };
};
var screenToWorld = (screenPos, transform) => {
  return {
    x: (screenPos.x - transform.x) / transform.scale,
    y: (screenPos.y - transform.y) / transform.scale
  };
};
var calculateRelationshipWeights = (nodes, edges) => {
  return edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.from);
    const targetNode = nodes.find((n) => n.id === edge.to);
    let relationshipType = "association";
    let weight = 0.5;
    if (sourceNode && targetNode) {
      if (targetNode.parentId === sourceNode.id) {
        relationshipType = "parent-child";
        weight = 1;
      } else if (sourceNode.parentId && sourceNode.parentId === targetNode.parentId) {
        relationshipType = "sibling";
        weight = 0.7;
      } else if (edge.label && (edge.label.includes("\u56E0\u679C") || edge.label.includes("\u5BFC\u81F4") || edge.label.includes("\u56E0\u4E3A") || edge.label.includes("\u6240\u4EE5"))) {
        relationshipType = "causal";
        weight = 0.9;
      } else {
        relationshipType = "association";
        weight = 0.3;
      }
    }
    return {
      ...edge,
      relationshipType,
      weight
    };
  });
};
var calculateAutomaticLayout = (nodes, edges, layoutType = "mind_map" /* MIND_MAP */, layoutParams) => {
  const hasNonTreeEdges = edges.some((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.from);
    const targetNode = nodes.find((n) => n.id === edge.to);
    return !sourceNode?.parentId || !targetNode?.parentId || sourceNode.parentId !== targetNode.parentId;
  });
  if (hasNonTreeEdges) {
    return applyForceDirectedLayout(nodes, edges, layoutParams);
  }
  const parentChildMap = /* @__PURE__ */ new Map();
  const childParentMap = /* @__PURE__ */ new Map();
  const rootNodes = [];
  nodes.forEach((node) => {
    if (node.parentId) {
      if (!parentChildMap.has(node.parentId)) {
        parentChildMap.set(node.parentId, []);
      }
      parentChildMap.get(node.parentId).push(node.id);
      childParentMap.set(node.id, node.parentId);
    } else {
      rootNodes.push(node.id);
    }
  });
  const nodeDepths = /* @__PURE__ */ new Map();
  const calculateDepth = (nodeId, depth = 0) => {
    nodeDepths.set(nodeId, depth);
    const children = parentChildMap.get(nodeId) || [];
    children.forEach((childId) => {
      calculateDepth(childId, depth + 1);
    });
  };
  rootNodes.forEach((rootId) => calculateDepth(rootId));
  const getNodeById = (id) => {
    return nodes.find((node) => node.id === id);
  };
  const createNodeLayout = (node, parent) => {
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
      ancestor: null,
      change: 0,
      shift: 0
    };
  };
  const buildLayoutTree = (nodeId, parent) => {
    const node = getNodeById(nodeId);
    if (!node)
      throw new Error(`Node ${nodeId} not found`);
    const layoutNode = createNodeLayout(node, parent);
    const children = parentChildMap.get(nodeId) || [];
    if (node.type === "group") {
      return layoutNode;
    }
    if (children.length > 0) {
      let previous = null;
      children.forEach((childId) => {
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
  const nodeLayouts = rootNodes.map((rootId) => buildLayoutTree(rootId, null));
  const firstWalk = (node, level = 0) => {
    const children = node.children;
    const siblings = node.parent ? node.parent.children : [];
    const index = siblings.indexOf(node);
    const previousSibling = index > 0 ? siblings[index - 1] : null;
    if (children.length > 0) {
      children.forEach((child) => {
        firstWalk(child, level + 1);
      });
      const firstChild = children[0];
      const lastChild = children[children.length - 1];
      const midPoint = (firstChild.x + lastChild.x) / 2;
      if (previousSibling) {
        let spacing = 100;
        if (previousSibling.node.type === "group") {
          spacing = 150;
        }
        node.x = previousSibling.x + spacing;
        node.mod = node.x - midPoint;
      } else {
        node.x = midPoint;
      }
    } else if (node.node.type === "group") {
      if (previousSibling) {
        let spacing = 100;
        if (previousSibling.node.type === "group") {
          spacing = 150;
        } else if (previousSibling.children.length > 0) {
          spacing = 120;
        }
        node.x = previousSibling.x + spacing;
      } else {
        node.x = 0;
      }
    } else {
      if (previousSibling) {
        let spacing = 100;
        if (previousSibling.node.type === "group") {
          spacing = 120;
        }
        node.x = previousSibling.x + spacing;
      } else {
        node.x = 0;
      }
    }
  };
  const secondWalk = (node, modSum = 0) => {
    node.x += modSum;
    node.mod += modSum;
    node.children.forEach((child) => {
      secondWalk(child, modSum + node.mod);
    });
  };
  nodeLayouts.forEach((layoutRoot) => {
    firstWalk(layoutRoot);
    secondWalk(layoutRoot);
  });
  const applyLayoutTransformation = (node, layoutType2) => {
    switch (layoutType2) {
      case "logical" /* LOGICAL */:
        break;
      case "mind_map" /* MIND_MAP */:
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const midIndex = Math.floor(children.length / 2);
          let baseX = node.x;
          if (node.node.type === "group") {
            if (index >= midIndex) {
              baseX = node.x + 50;
            } else {
              baseX = -node.x - 50;
            }
          } else {
            if (index >= midIndex) {
              baseX = node.x;
            } else {
              baseX = -node.x;
            }
          }
          node.node.x = baseX;
        }
        break;
      case "organization" /* ORGANIZATION */:
        const tempX = node.node.x;
        node.node.x = node.node.y;
        node.node.y = tempX;
        break;
      case "radial" /* RADIAL */:
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const totalChildren = children.length;
          const angle = index * 360 / totalChildren;
          const radius = node.y * 200;
          node.node.x = Math.cos(angle * Math.PI / 180) * radius;
          node.node.y = Math.sin(angle * Math.PI / 180) * radius;
        } else {
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
      case "fishbone" /* FISHBONE */:
        if (node.parent) {
          if (node.parent.parent) {
            const children = node.parent.children;
            const index = children.indexOf(node);
            const midIndex = Math.floor(children.length / 2);
            const offset = (index - midIndex) * 100;
            node.node.x = node.parent.node.x + 150;
            node.node.y = node.parent.node.y + offset;
          } else {
            const children = node.parent.children;
            const index = children.indexOf(node);
            node.node.x = node.parent.node.x + 300;
            node.node.y = node.parent.node.y + (index - Math.floor(children.length / 2)) * 150;
          }
        } else {
          node.node.x = 100;
          node.node.y = 0;
        }
        break;
      case "timeline" /* TIMELINE */:
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          node.node.x = index * 200;
          node.node.y = node.parent.node.y + (index % 2 === 0 ? -100 : 100);
        } else {
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
      case "matrix" /* MATRIX */:
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
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
      case "onion" /* ONION */:
        if (node.parent) {
          const children = node.parent.children;
          const index = children.indexOf(node);
          const totalChildren = children.length;
          const angle = index * 360 / totalChildren;
          const radius = node.y * 150;
          node.node.x = Math.cos(angle * Math.PI / 180) * radius;
          node.node.y = Math.sin(angle * Math.PI / 180) * radius;
        } else {
          node.node.x = 0;
          node.node.y = 0;
        }
        break;
    }
  };
  const applyTransformationToTree = (node) => {
    applyLayoutTransformation(node, layoutType);
    node.children.forEach((child) => applyTransformationToTree(child));
  };
  nodeLayouts.forEach((layoutRoot) => {
    applyTransformationToTree(layoutRoot);
  });
  const layoutNodeMap = /* @__PURE__ */ new Map();
  const buildLayoutNodeMap = (layoutNodes) => {
    for (const layoutNode of layoutNodes) {
      layoutNodeMap.set(layoutNode.node.id, layoutNode);
      buildLayoutNodeMap(layoutNode.children);
    }
  };
  buildLayoutNodeMap(nodeLayouts);
  const updatedNodes = nodes.map((node) => {
    const layoutNode = layoutNodeMap.get(node.id);
    if (layoutNode) {
      const parentId = node.parentId;
      const isChildOfGroup = parentId ? nodes.some((n) => n.id === parentId && n.type === "group") : false;
      if (node.type === "group" || !isChildOfGroup) {
        return {
          ...node,
          x: layoutNode.node.x,
          y: layoutNode.node.y
        };
      }
    }
    return node;
  });
  const groupMap = /* @__PURE__ */ new Map();
  const nonGroupNodes = updatedNodes.filter((node) => node.type !== "group");
  const groupNodes = updatedNodes.filter((node) => node.type === "group");
  const originalNodeMap = /* @__PURE__ */ new Map();
  nodes.forEach((node) => {
    originalNodeMap.set(node.id, node);
  });
  const groupNodeMap = /* @__PURE__ */ new Map();
  groupNodes.forEach((group) => {
    groupNodeMap.set(group.id, group);
  });
  const adjustedChildNodes = nonGroupNodes.map((node) => {
    if (node.parentId) {
      const parentGroup = groupNodeMap.get(node.parentId);
      if (parentGroup) {
        const originalParentGroup = originalNodeMap.get(parentGroup.id);
        const originalChildNode = originalNodeMap.get(node.id);
        if (originalParentGroup && originalChildNode) {
          const originalRelativeX = originalChildNode.x - originalParentGroup.x;
          const originalRelativeY = originalChildNode.y - originalParentGroup.y;
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
  const calculatedGroups = groupNodes.map((group) => {
    const children = adjustedChildNodes.filter((node) => node.parentId === group.id);
    if (children.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      children.forEach((child) => {
        minX = Math.min(minX, child.x);
        minY = Math.min(minY, child.y);
        maxX = Math.max(maxX, child.x + child.width);
        maxY = Math.max(maxY, child.y + child.height);
      });
      const PADDING = 30;
      const TITLE_OFFSET = 40;
      const groupWidth = maxX - minX + PADDING * 2;
      const groupHeight = maxY - minY + PADDING * 2 + TITLE_OFFSET;
      return {
        ...group,
        width: groupWidth,
        height: groupHeight
      };
    }
    return group;
  });
  const finalNodes = [...calculatedGroups, ...adjustedChildNodes];
  const finalCleanNodes = finalNodes.map((node) => {
    if (node.type === "group") {
      const children = finalNodes.filter((n) => n.parentId === node.id);
      if (children.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        children.forEach((child) => {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
        });
        const PADDING = 30;
        const TITLE_OFFSET = 40;
        const groupWidth = maxX - minX + PADDING * 2;
        const groupHeight = maxY - minY + PADDING * 2 + TITLE_OFFSET;
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
var applyForceDirectedLayout = (nodes, edges, layoutParams) => {
  let currentNodes = [...nodes];
  const lockedNodeIds = /* @__PURE__ */ new Set();
  nodes.forEach((n) => {
    if (n.parentId) {
      const parent = nodes.find((p) => p.id === n.parentId);
      if (parent && parent.type === "group") {
        lockedNodeIds.add(n.id);
      }
    }
  });
  const GROUP_PADDING = 15;
  const groupBoxes = [];
  nodes.forEach((n) => {
    if (n.type === "group") {
      const children = nodes.filter((c) => c.parentId === n.id);
      if (children.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        children.forEach((child) => {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
        });
        groupBoxes.push({
          id: n.id,
          left: minX - GROUP_PADDING,
          top: minY - GROUP_PADDING,
          right: maxX + GROUP_PADDING,
          bottom: maxY + GROUP_PADDING
        });
      } else {
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
  const ITERATIONS = layoutParams?.iterations || 50;
  const REPULSION_FORCE = layoutParams?.repulsionForce || 12e3;
  const ATTRACTION_FORCE = layoutParams?.attractionForce || 0.12;
  const DAMPING = 0.9;
  const MIN_DISTANCE = layoutParams?.minDistance || 80;
  const CENTER_ATTRACTION = 0.06;
  const CENTER_THRESHOLD = 100;
  const calculateCenter = (nodeList) => {
    let totalX = 0;
    let totalY = 0;
    nodeList.forEach((node) => {
      totalX += node.x + node.width / 2;
      totalY += node.y + node.height / 2;
    });
    return {
      x: totalX / nodeList.length,
      y: totalY / nodeList.length
    };
  };
  let currentCenter = calculateCenter(currentNodes);
  const getNodeCenter = (node) => {
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
  };
  const calculateDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };
  const calculateBoundingBoxDistance = (nodeA, nodeB) => {
    for (const gb of groupBoxes) {
      const inA = nodeA.x + nodeA.width / 2 >= gb.left && nodeA.x + nodeA.width / 2 <= gb.right && nodeA.y + nodeA.height / 2 >= gb.top && nodeA.y + nodeA.height / 2 <= gb.bottom;
      const inB = nodeB.x + nodeB.width / 2 >= gb.left && nodeB.x + nodeB.width / 2 <= gb.right && nodeB.y + nodeB.height / 2 >= gb.top && nodeB.y + nodeB.height / 2 <= gb.bottom;
      if (inA && nodeA.parentId !== gb.id && nodeA.id !== gb.id) {
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
    const findGroupBoxFor = (node) => groupBoxes.find((gb) => gb.id === node.id);
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
    const horizontalDist = Math.max(0, Math.min(boxA.right, boxB.right) - Math.max(boxA.left, boxB.left));
    const verticalDist = Math.max(0, Math.min(boxA.bottom, boxB.bottom) - Math.max(boxA.top, boxB.top));
    if (horizontalDist > 0 && verticalDist > 0) {
      return -Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
    }
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
  const calculateForceDirection = (nodeA, nodeB) => {
    const centerA = getNodeCenter(nodeA);
    const centerB = getNodeCenter(nodeB);
    const distance = calculateDistance(centerA, centerB);
    if (distance < 1) {
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
  for (let iter = 0; iter < ITERATIONS; iter++) {
    currentCenter = calculateCenter(currentNodes);
    const forces = /* @__PURE__ */ new Map();
    currentNodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0 });
    });
    for (let i = 0; i < currentNodes.length; i++) {
      const nodeA = currentNodes[i];
      if (lockedNodeIds.has(nodeA.id)) {
        continue;
      }
      for (let j = i + 1; j < currentNodes.length; j++) {
        const nodeB = currentNodes[j];
        if (lockedNodeIds.has(nodeB.id)) {
          continue;
        }
        const distance = calculateBoundingBoxDistance(nodeA, nodeB);
        let forceMagnitude;
        if (distance < 0) {
          forceMagnitude = REPULSION_FORCE * 2 / (1 + Math.abs(distance));
        } else if (distance < MIN_DISTANCE) {
          forceMagnitude = REPULSION_FORCE / (distance * distance);
        } else if (distance < 300) {
          forceMagnitude = REPULSION_FORCE / (distance * distance) * 0.8;
        } else {
          forceMagnitude = REPULSION_FORCE / (distance * distance) * 1.5;
        }
        const direction = calculateForceDirection(nodeA, nodeB);
        const forceX = direction.x * forceMagnitude;
        const forceY = direction.y * forceMagnitude;
        const forceA = forces.get(nodeA.id);
        forces.set(nodeA.id, { x: forceA.x - forceX, y: forceA.y - forceY });
        const forceB = forces.get(nodeB.id);
        forces.set(nodeB.id, { x: forceB.x + forceX, y: forceB.y + forceY });
      }
    }
    edges.forEach((edge) => {
      const sourceNode = currentNodes.find((n) => n.id === edge.from);
      const targetNode = currentNodes.find((n) => n.id === edge.to);
      if (sourceNode && targetNode) {
        const centerSource = getNodeCenter(sourceNode);
        const centerTarget = getNodeCenter(targetNode);
        const distance = calculateDistance(centerSource, centerTarget);
        const forceMagnitude = ATTRACTION_FORCE * distance * (edge.weight || 1);
        const direction = calculateForceDirection(sourceNode, targetNode);
        const forceX = direction.x * forceMagnitude;
        const forceY = direction.y * forceMagnitude;
        const forceSource = forces.get(sourceNode.id);
        forces.set(sourceNode.id, { x: forceSource.x + forceX, y: forceSource.y + forceY });
        const forceTarget = forces.get(targetNode.id);
        forces.set(targetNode.id, { x: forceTarget.x - forceX, y: forceTarget.y - forceY });
      }
    });
    currentNodes.forEach((node) => {
      if (lockedNodeIds.has(node.id)) {
        return;
      }
      const center = getNodeCenter(node);
      const distanceToCenter = calculateDistance(center, currentCenter);
      if (distanceToCenter > CENTER_THRESHOLD) {
        let forceMagnitude = CENTER_ATTRACTION * distanceToCenter;
        if (distanceToCenter > 500) {
          forceMagnitude *= 1.5;
        }
        const direction = {
          x: (currentCenter.x - center.x) / distanceToCenter,
          y: (currentCenter.y - center.y) / distanceToCenter
        };
        const forceX = direction.x * forceMagnitude;
        const forceY = direction.y * forceMagnitude;
        const currentForce = forces.get(node.id);
        forces.set(node.id, {
          x: currentForce.x + forceX,
          y: currentForce.y + forceY
        });
      }
    });
    let dampingFactor = 0;
    if (iter < 50) {
      dampingFactor = DAMPING;
    } else {
      dampingFactor = Math.pow(DAMPING, (iter - 49) / 50);
    }
    currentNodes = currentNodes.map((node) => {
      const force = forces.get(node.id);
      const maxForce = 50;
      const limitedForceX = Math.max(-maxForce, Math.min(maxForce, force.x));
      const limitedForceY = Math.max(-maxForce, Math.min(maxForce, force.y));
      if (lockedNodeIds.has(node.id)) {
        return node;
      }
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

// utils/markdownExport.ts
var generateStableId = (title, depth) => {
  const hash = title + depth.toString();
  let h = 0;
  for (let i = 0; i < hash.length; i++) {
    h = (h << 5) - h + hash.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(36);
};

// components/NodeComponent.tsx
import { useRef, useEffect, useState, useLayoutEffect } from "react";

// components/TextEditorToolbar.tsx
import { Bold, Italic, Strikethrough, Highlighter, Eraser } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
var TextEditorToolbar = ({
  onFormat,
  darkMode = false
}) => {
  const handleButtonClick = (e, type) => {
    e.stopPropagation();
    onFormat(type);
  };
  return /* @__PURE__ */ jsxs("div", { className: "mindo-text-editor-toolbar", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: (e) => handleButtonClick(e, "bold"),
        className: "mindo-toolbar-btn",
        title: "\u52A0\u7C97",
        children: /* @__PURE__ */ jsx(Bold, { size: 16 })
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: (e) => handleButtonClick(e, "italic"),
        className: "mindo-toolbar-btn",
        title: "\u503E\u659C",
        children: /* @__PURE__ */ jsx(Italic, { size: 16 })
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: (e) => handleButtonClick(e, "strikethrough"),
        className: "mindo-toolbar-btn",
        title: "\u5220\u9664\u7EBF",
        children: /* @__PURE__ */ jsx(Strikethrough, { size: 16 })
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: (e) => handleButtonClick(e, "highlight"),
        className: "mindo-toolbar-btn",
        title: "\u9AD8\u4EAE",
        children: /* @__PURE__ */ jsx(Highlighter, { size: 16 })
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "mindo-toolbar-divider" }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: (e) => handleButtonClick(e, "clear"),
        className: "mindo-toolbar-btn",
        title: "\u6E05\u9664\u683C\u5F0F",
        children: /* @__PURE__ */ jsx(Eraser, { size: 16 })
      }
    )
  ] });
};

// components/NodeComponent.tsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var NodeComponent = ({
  node,
  isSelected,
  isDragging,
  onMouseDown,
  onMouseUp,
  onConnectStart,
  onConnectEnd,
  onUpdate,
  onResize,
  onResizeStart,
  onDelete,
  onColorChange,
  onShapeChange,
  onContextMenu,
  onSelect,
  scale,
  onRenderMarkdown,
  onOpenLink,
  darkMode = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [focusTarget, setFocusTarget] = useState("title");
  const titleInputRef = useRef(null);
  const contentInputRef = useRef(null);
  const nodeRef = useRef(null);
  const markdownRef = useRef(null);
  const titleMarkdownRef = useRef(null);
  const getIconSymbol = (icon) => {
    const iconMap = {
      star: "\u2B50",
      circle: "\u{1F534}",
      check: "\u2705",
      lightning: "\u26A1",
      bulb: "\u{1F4A1}",
      question: "\u2753"
    };
    return iconMap[icon || ""] || "";
  };
  const themeClass = NODE_STYLES[node.color]?.className || NODE_STYLES["gray"].className;
  const isGroup = node.type === "group";
  const isImage = node.type === "image";
  const hasContent = node.content && node.content.trim().length > 0 || isImage;
  const showContent = isEditing || hasContent;
  const showTitle = node.titleVisible !== false;
  useLayoutEffect(() => {
    if (nodeRef.current && !isGroup && !isEditing) {
      const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = nodeRef.current;
          if (el && el.offsetWidth > 10 && el.offsetHeight > 10) {
            if (Math.abs(el.offsetWidth - node.width) > 2 || Math.abs(el.offsetHeight - node.height) > 2) {
              onResize(node.id, el.offsetWidth, el.offsetHeight);
            }
          }
        }
      });
      obs.observe(nodeRef.current);
      return () => obs.disconnect();
    }
  }, [node.id, node.width, node.height, onResize, isGroup, isEditing]);
  useEffect(() => {
    if (!isEditing && markdownRef.current && onRenderMarkdown && node.content && !isImage) {
      markdownRef.current.innerHTML = "";
      onRenderMarkdown(node.content, markdownRef.current);
    }
  }, [isEditing, node.content, onRenderMarkdown, isImage]);
  useEffect(() => {
    if (!isEditing && titleMarkdownRef.current && onRenderMarkdown && node.title && !isGroup && showTitle) {
      titleMarkdownRef.current.innerHTML = "";
      onRenderMarkdown(node.title, titleMarkdownRef.current);
    }
  }, [isEditing, node.title, onRenderMarkdown, isGroup, showTitle]);
  const adjustTextareaHeight = () => {
    if (contentInputRef.current) {
      contentInputRef.current.style.height = "auto";
      contentInputRef.current.style.height = contentInputRef.current.scrollHeight + "px";
    }
  };
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        if (focusTarget === "title" && titleInputRef.current) {
          titleInputRef.current.focus();
          if (node.title === "New Node" || node.title === "\u65B0\u8282\u70B9" || node.title === "New Group" || node.title === "\u65B0\u5206\u7EC4") {
            titleInputRef.current.select();
          }
        } else if (focusTarget === "content" && contentInputRef.current) {
          contentInputRef.current.focus();
          adjustTextareaHeight();
          const val = contentInputRef.current.value;
          contentInputRef.current.setSelectionRange(val.length, val.length);
        }
      }, 10);
    }
  }, [isEditing, focusTarget]);
  const handleFormat = (type) => {
    const textarea = contentInputRef.current;
    if (!textarea)
      return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = textarea.value;
    switch (type) {
      case "bold":
        if (selectedText) {
          newText = newText.substring(0, start) + `**${selectedText}**` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + "****" + newText.substring(start);
        }
        break;
      case "italic":
        if (selectedText) {
          newText = newText.substring(0, start) + `*${selectedText}*` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + "**" + newText.substring(start);
        }
        break;
      case "strikethrough":
        if (selectedText) {
          newText = newText.substring(0, start) + `~~${selectedText}~~` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + "~~~~" + newText.substring(start);
        }
        break;
      case "highlight":
        if (selectedText) {
          newText = newText.substring(0, start) + `==${selectedText}==` + newText.substring(end);
        } else {
          newText = newText.substring(0, start) + "====" + newText.substring(start);
        }
        break;
      case "clear":
        if (selectedText) {
          let cleanedText = selectedText.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/~~(.*?)~~/g, "$1").replace(/==(.*?)==/g, "$1");
          newText = newText.substring(0, start) + cleanedText + newText.substring(end);
        } else {
          newText = newText.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/~~(.*?)~~/g, "$1").replace(/==(.*?)==/g, "$1");
        }
        break;
    }
    textarea.value = newText;
    adjustTextareaHeight();
    if (!selectedText) {
      let cursorPos = start;
      switch (type) {
        case "bold":
        case "strikethrough":
        case "highlight":
          cursorPos += 2;
          break;
        case "italic":
          cursorPos += 1;
          break;
      }
      textarea.setSelectionRange(cursorPos, cursorPos);
    } else {
      let newCursorPos = start;
      switch (type) {
        case "bold":
          newCursorPos += 2 + selectedText.length + 2;
          break;
        case "italic":
          newCursorPos += 1 + selectedText.length + 1;
          break;
        case "strikethrough":
        case "highlight":
          newCursorPos += 2 + selectedText.length + 2;
          break;
        case "clear":
          newCursorPos += selectedText.length - (selectedText.length - newText.substring(start, end + (newText.length - textarea.value.length)).length);
          break;
      }
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
    textarea.focus();
  };
  const saveChanges = () => {
    const newTitle = titleInputRef.current?.value ?? node.title;
    const newContent = contentInputRef.current?.value ?? node.content ?? "";
    onUpdate(node.id, newTitle, newContent);
  };
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    const target = e.target;
    if (isImage) {
      setFocusTarget("title");
    } else if (!showTitle) {
      setFocusTarget("content");
    } else {
      if (target.closest(".mindo-node-content")) {
        setFocusTarget("content");
      } else {
        setFocusTarget("title");
      }
    }
    setIsEditing(true);
  };
  const handleBlur = (e) => {
    const relatedTarget = e.relatedTarget;
    if (nodeRef.current && (nodeRef.current.contains(relatedTarget) || relatedTarget?.closest(".mindo-text-editor-toolbar"))) {
      return;
    }
    setIsEditing(false);
    saveChanges();
  };
  const handleKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          handleFormat("bold");
          return;
        case "i":
          e.preventDefault();
          handleFormat("italic");
          return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      setIsEditing(false);
      saveChanges();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      saveChanges();
    }
  };
  const stopProp = (e) => {
    e.stopPropagation();
  };
  const handleLinkClick = (e) => {
    e.stopPropagation();
    const target = e.target;
    if (target.tagName === "A") {
      const href = target.getAttribute("href");
      if (href && href.startsWith("#")) {
        const linkText = target.textContent || "";
        const match = linkText.match(/\[\[(.*?)\]\]/);
        if (match && match[1]) {
          const linkPath = match[1];
          if (onOpenLink) {
            onOpenLink(linkPath);
          } else {
            console.log("\u666E\u901A\u53CC\u94FE\u70B9\u51FB:", linkPath);
          }
        }
      }
    }
  };
  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onResizeStart)
      onResizeStart();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.width;
    const startHeight = node.height;
    const handleMouseMove = (mv) => {
      const dx = (mv.clientX - startX) / scale;
      const dy = (mv.clientY - startY) / scale;
      onResize(node.id, Math.max(100, startWidth + dx), Math.max(50, startHeight + dy));
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
  const handleHandleMouseDown = (e, h) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectStart(e, node.id, h);
  };
  const handleHandleMouseUp = (e, h) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectEnd(e, node.id, h);
  };
  if (isGroup) {
    return /* @__PURE__ */ jsxs2(
      "div",
      {
        ref: nodeRef,
        className: `mindo-node mindo-group ${themeClass}
            ${isDragging ? "dragging" : ""}
            ${isSelected ? "selected" : ""}
          `,
        style: {
          transform: `translate(${node.x}px, ${node.y}px)`,
          width: node.width,
          height: node.height
        },
        onMouseDown: (e) => onMouseDown(e, node.id),
        onMouseUp: (e) => onMouseUp(e, node.id),
        onDoubleClick: handleDoubleClick,
        onContextMenu: (e) => onContextMenu && onContextMenu(e, node.id),
        tabIndex: -1,
        onBlur: handleBlur,
        children: [
          /* @__PURE__ */ jsx2("div", { className: "mindo-group-label", children: isEditing ? /* @__PURE__ */ jsx2(
            "input",
            {
              ref: titleInputRef,
              defaultValue: node.title,
              placeholder: "\u5206\u7EC4\u540D\u79F0",
              className: "mindo-input-reset",
              style: { width: "6rem", color: "inherit", padding: 0, margin: 0 },
              onKeyDown: handleKeyDown,
              onMouseDown: stopProp
            }
          ) : /* @__PURE__ */ jsx2("div", { style: { userSelect: "none" }, children: node.title || "\u5206\u7EC4" }) }),
          /* @__PURE__ */ jsx2(
            "div",
            {
              className: "mindo-resize-handle",
              onMouseDown: handleResizeMouseDown
            }
          )
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs2(
    "div",
    {
      style: {
        position: "absolute",
        left: node.x,
        top: node.y,
        zIndex: isSelected ? 10 : 1,
        width: node.width,
        textAlign: "center"
      },
      children: [
        isEditing && !isGroup && !isImage && /* @__PURE__ */ jsx2("div", { style: {
          position: "absolute",
          top: "-40px",
          left: "0",
          right: "0",
          display: "flex",
          justifyContent: "center",
          zIndex: 100
        }, children: /* @__PURE__ */ jsx2(
          TextEditorToolbar,
          {
            onFormat: handleFormat,
            darkMode
          }
        ) }),
        /* @__PURE__ */ jsxs2(
          "div",
          {
            ref: nodeRef,
            className: `mindo-node ${themeClass}
          ${isDragging ? "dragging" : ""}
          ${isSelected ? "selected" : ""}
        `,
            style: {
              width: "100%",
              height: isImage ? Math.max(node.height, 100) : "auto",
              minHeight: isImage ? Math.max(node.height, 100) : "auto",
              display: "flex",
              flexDirection: "column",
              willChange: isDragging ? "transform" : "auto"
            },
            onMouseDown: (e) => onMouseDown(e, node.id),
            onMouseUp: (e) => onMouseUp(e, node.id),
            onDoubleClick: handleDoubleClick,
            onContextMenu: (e) => onContextMenu && onContextMenu(e, node.id),
            tabIndex: -1,
            onBlur: handleBlur,
            children: [
              node.icon && (node.iconPosition === "corner" || !node.iconPosition) && /* @__PURE__ */ jsx2("div", { style: {
                position: "absolute",
                top: "-8px",
                left: "-8px",
                zIndex: 10,
                backgroundColor: "transparent",
                borderRadius: "50%",
                width: "31px",
                height: "31px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }, children: /* @__PURE__ */ jsx2("span", { style: { fontSize: "18px", textShadow: "0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)" }, children: getIconSymbol(node.icon) }) }),
              showTitle && /* @__PURE__ */ jsx2("div", { className: `mindo-node-header ${showContent ? "has-content" : ""}`, children: isEditing ? /* @__PURE__ */ jsxs2("div", { style: { position: "relative", width: "100%", textAlign: "center", paddingLeft: node.icon && node.iconPosition === "inline" ? "24px" : "0" }, children: [
                node.icon && node.iconPosition === "inline" && /* @__PURE__ */ jsx2("span", { style: {
                  position: "absolute",
                  left: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.1)"
                }, children: getIconSymbol(node.icon) }),
                /* @__PURE__ */ jsx2(
                  "input",
                  {
                    ref: titleInputRef,
                    defaultValue: node.title,
                    placeholder: "\u6807\u9898",
                    className: "mindo-input-reset mindo-editing-mono",
                    style: {
                      width: "100%",
                      fontWeight: "bold",
                      padding: 0,
                      margin: 0,
                      color: "inherit",
                      textAlign: "center"
                    },
                    onKeyDown: handleKeyDown,
                    onMouseDown: stopProp
                  }
                )
              ] }) : /* @__PURE__ */ jsxs2("div", { style: { position: "relative", width: "100%", textAlign: "center", paddingLeft: node.icon && node.iconPosition === "inline" ? "24px" : "0" }, children: [
                node.icon && node.iconPosition === "inline" && /* @__PURE__ */ jsx2("span", { style: {
                  position: "absolute",
                  left: "0",
                  top: "0",
                  fontSize: "18px",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.1)"
                }, children: getIconSymbol(node.icon) }),
                /* @__PURE__ */ jsx2("div", { style: { lineHeight: 1.4, textAlign: "center" }, children: onRenderMarkdown ? /* @__PURE__ */ jsx2(
                  "div",
                  {
                    ref: titleMarkdownRef,
                    className: "mindo-markdown-content",
                    style: { userSelect: "none", textAlign: "center" },
                    onClick: handleLinkClick
                  }
                ) : /* @__PURE__ */ jsx2("div", { style: { userSelect: "none", whiteSpace: "pre-wrap", overflow: "hidden", textAlign: "center" }, children: node.title || "\u672A\u547D\u540D" }) })
              ] }) }),
              showContent && /* @__PURE__ */ jsx2("div", { className: "mindo-node-content", style: { height: isImage ? showTitle ? "calc(100% - 44px)" : "100%" : "auto", overflow: isImage ? "hidden" : "visible", textAlign: "left" }, children: isImage ? /* @__PURE__ */ jsx2(
                "img",
                {
                  src: node.imageUrl,
                  alt: node.title,
                  style: { width: "100%", height: "100%", objectFit: "contain", borderRadius: "4px", pointerEvents: "none", display: "block", backgroundColor: "transparent" }
                }
              ) : /* @__PURE__ */ jsx2(Fragment, { children: isEditing ? /* @__PURE__ */ jsx2(
                "textarea",
                {
                  ref: contentInputRef,
                  defaultValue: node.content,
                  placeholder: "\u63CF\u8FF0...",
                  className: "mindo-input-reset mindo-editing-mono",
                  style: { width: "100%", resize: "none", color: "inherit", padding: 0, margin: 0, overflow: "hidden", height: "auto", minHeight: "1.5em", textAlign: "left" },
                  onInput: adjustTextareaHeight,
                  onKeyDown: handleKeyDown,
                  onMouseDown: stopProp
                }
              ) : /* @__PURE__ */ jsx2("div", { ref: markdownRef, className: "mindo-markdown-content", style: { textAlign: "left" }, onClick: handleLinkClick, children: !onRenderMarkdown && node.content }) }) }),
              showContent && /* @__PURE__ */ jsx2(
                "div",
                {
                  className: "mindo-resize-handle",
                  onMouseDown: handleResizeMouseDown
                }
              ),
              /* @__PURE__ */ jsx2("div", { className: "mindo-handle mindo-handle-top", onMouseDown: (e) => handleHandleMouseDown(e, "top"), onMouseUp: (e) => handleHandleMouseUp(e, "top") }),
              /* @__PURE__ */ jsx2("div", { className: "mindo-handle mindo-handle-right", onMouseDown: (e) => handleHandleMouseDown(e, "right"), onMouseUp: (e) => handleHandleMouseUp(e, "right") }),
              /* @__PURE__ */ jsx2("div", { className: "mindo-handle mindo-handle-bottom", onMouseDown: (e) => handleHandleMouseDown(e, "bottom"), onMouseUp: (e) => handleHandleMouseUp(e, "bottom") }),
              /* @__PURE__ */ jsx2("div", { className: "mindo-handle mindo-handle-left", onMouseDown: (e) => handleHandleMouseDown(e, "left"), onMouseUp: (e) => handleHandleMouseUp(e, "left") })
            ]
          }
        )
      ]
    }
  );
};

// components/EdgeComponent.tsx
import { useState as useState2, useEffect as useEffect2 } from "react";
import { Trash2, Type, ArrowLeftRight, Activity, Spline, ArrowUpRight, GitCommitHorizontal, Tag } from "lucide-react";
import { Fragment as Fragment2, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var EdgeComponent = ({
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
  const finalSourceNode = sourceNode || (nodes ? nodes.find((n) => n.id === edge.from) : void 0);
  const finalTargetNode = targetNode || (nodes ? nodes.find((n) => n.id === edge.to) : void 0);
  const finalIsSelected = isSelected !== void 0 ? isSelected : selectedEdgeId === edge.id;
  const finalOnSelect = onSelect || onEdgeSelect || (() => {
  });
  const finalOnDelete = onDelete || (() => {
  });
  const finalOnUpdate = onUpdate || (() => {
  });
  const finalOnInteractStart = onInteractStart || (() => {
  });
  const [isHovered, setIsHovered] = useState2(false);
  const scale = transform.scale;
  if (!finalSourceNode || !finalTargetNode) {
    return null;
  }
  const start = getHandlePosition(finalSourceNode, edge.fromHandle);
  const end = getHandlePosition(finalTargetNode, edge.toHandle);
  const breakpoints = edge.breakpoints || (edge.controlPoint ? [edge.controlPoint] : []);
  const lineOffset = 1;
  const calculateAdjustedPoint = (point, isStart) => {
    let angle = 0;
    if (edge.type === "step") {
      const handle = isStart ? edge.fromHandle : edge.toHandle;
      switch (handle) {
        case "top":
          angle = 90;
          break;
        case "bottom":
          angle = 270;
          break;
        case "left":
          angle = 0;
          break;
        case "right":
          angle = 180;
          break;
      }
    } else {
      const target = isStart ? breakpoints.length > 0 ? breakpoints[0] : end : breakpoints.length > 0 ? breakpoints[breakpoints.length - 1] : start;
      angle = Math.atan2(target.y - point.y, target.x - point.x) * (180 / Math.PI);
    }
    const radians = angle * Math.PI / 180;
    return {
      x: point.x + Math.cos(radians) * lineOffset,
      y: point.y + Math.sin(radians) * lineOffset
    };
  };
  const adjustedStart = calculateAdjustedPoint(start, true);
  const adjustedEnd = calculateAdjustedPoint(end, false);
  const generateAdjustedPath = () => {
    if (edge.type === "step") {
      return generateStepPath();
    } else if (edge.type === "straight") {
      return generateStraightPath();
    } else {
      return generateBezierPath();
    }
  };
  const generateStepPath = () => {
    const offset = 20;
    let pStart = { ...adjustedStart };
    let pEnd = { ...adjustedEnd };
    switch (edge.fromHandle) {
      case "top":
        pStart.y -= offset;
        break;
      case "bottom":
        pStart.y += offset;
        break;
      case "left":
        pStart.x -= offset;
        break;
      case "right":
        pStart.x += offset;
        break;
    }
    switch (edge.toHandle) {
      case "top":
        pEnd.y -= offset;
        break;
      case "bottom":
        pEnd.y += offset;
        break;
      case "left":
        pEnd.x -= offset;
        break;
      case "right":
        pEnd.x += offset;
        break;
    }
    const midX = (pStart.x + pEnd.x) / 2;
    const midY = (pStart.y + pEnd.y) / 2;
    const startVertical = edge.fromHandle === "top" || edge.fromHandle === "bottom";
    const endVertical = edge.toHandle === "top" || edge.toHandle === "bottom";
    let d = `M ${adjustedStart.x} ${adjustedStart.y}`;
    d += ` L ${pStart.x} ${pStart.y}`;
    if (startVertical === endVertical) {
      if (startVertical) {
        d += ` L ${pStart.x} ${midY}`;
        d += ` L ${pEnd.x} ${midY}`;
      } else {
        d += ` L ${midX} ${pStart.y}`;
        d += ` L ${midX} ${pEnd.y}`;
      }
    } else {
      if (startVertical) {
        d += ` L ${pStart.x} ${pEnd.y}`;
      } else {
        d += ` L ${pEnd.x} ${pStart.y}`;
      }
    }
    d += ` L ${pEnd.x} ${pEnd.y}`;
    d += ` L ${adjustedEnd.x} ${adjustedEnd.y}`;
    return d;
  };
  const generateStraightPath = () => {
    let d = `M ${adjustedStart.x} ${adjustedStart.y}`;
    breakpoints.forEach((p) => {
      d += ` L ${p.x} ${p.y}`;
    });
    d += ` L ${adjustedEnd.x} ${adjustedEnd.y}`;
    return d;
  };
  const generateBezierPath = () => {
    if (breakpoints.length > 0) {
      if (breakpoints.length === 1) {
        return `M ${adjustedStart.x} ${adjustedStart.y} Q ${breakpoints[0].x} ${breakpoints[0].y} ${adjustedEnd.x} ${adjustedEnd.y}`;
      }
      let d = `M ${adjustedStart.x} ${adjustedStart.y}`;
      breakpoints.forEach((p) => {
        d += ` L ${p.x} ${p.y}`;
      });
      d += ` L ${adjustedEnd.x} ${adjustedEnd.y}`;
      return d;
    }
    if (edge.controlPoint) {
      return `M ${adjustedStart.x} ${adjustedStart.y} Q ${edge.controlPoint.x} ${edge.controlPoint.y} ${adjustedEnd.x} ${adjustedEnd.y}`;
    }
    const dist = Math.sqrt(Math.pow(adjustedEnd.x - adjustedStart.x, 2) + Math.pow(adjustedEnd.y - adjustedStart.y, 2));
    const controlOffset = Math.min(dist * 0.5, 100);
    let cp1 = { ...adjustedStart };
    let cp2 = { ...adjustedEnd };
    switch (edge.fromHandle) {
      case "top":
        cp1.y -= controlOffset;
        break;
      case "bottom":
        cp1.y += controlOffset;
        break;
      case "left":
        cp1.x -= controlOffset;
        break;
      case "right":
        cp1.x += controlOffset;
        break;
    }
    switch (edge.toHandle) {
      case "top":
        cp2.y -= controlOffset;
        break;
      case "bottom":
        cp2.y += controlOffset;
        break;
      case "left":
        cp2.x -= controlOffset;
        break;
      case "right":
        cp2.x += controlOffset;
        break;
    }
    return `M ${adjustedStart.x} ${adjustedStart.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${adjustedEnd.x} ${adjustedEnd.y}`;
  };
  const pathD = generateAdjustedPath();
  const strokeColor = edge.color || "#94a3b8";
  const strokeWidth = finalIsSelected || isHovered ? 3 : 2;
  const strokeDashArray = edge.style === "dashed" ? "5,5" : edge.style === "dotted" ? "2,2" : "none";
  const renderArrow = (position) => {
    let angle = 0;
    let pos = { x: 0, y: 0 };
    const arrowType = edge.type || "bezier";
    if (arrowType === "step") {
      if (position === "start") {
        pos = start;
        switch (edge.fromHandle) {
          case "top":
            angle = 90;
            break;
          case "bottom":
            angle = 270;
            break;
          case "left":
            angle = 0;
            break;
          case "right":
            angle = 180;
            break;
        }
      } else {
        pos = end;
        switch (edge.toHandle) {
          case "top":
            angle = 90;
            break;
          case "bottom":
            angle = 270;
            break;
          case "left":
            angle = 0;
            break;
          case "right":
            angle = 180;
            break;
        }
      }
    } else if (arrowType === "straight") {
      if (position === "start") {
        const target = breakpoints.length > 0 ? breakpoints[0] : end;
        angle = Math.atan2(target.y - start.y, target.x - start.x) * (180 / Math.PI) + 180;
        pos = start;
      } else {
        const source = breakpoints.length > 0 ? breakpoints[breakpoints.length - 1] : start;
        angle = Math.atan2(end.y - source.y, end.x - source.x) * (180 / Math.PI);
        pos = end;
      }
    } else if (breakpoints.length === 1) {
      const cp = breakpoints[0];
      if (position === "start") {
        angle = getQuadraticAngleAtT(start, cp, end, 0) + 180;
        pos = start;
      } else {
        angle = getQuadraticAngleAtT(start, cp, end, 1);
        pos = end;
      }
    } else {
      const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      const controlOffset = Math.min(dist * 0.5, 100);
      let cp1 = { ...start };
      let cp2 = { ...end };
      if (edge.fromHandle === "top")
        cp1.y -= controlOffset;
      if (edge.fromHandle === "bottom")
        cp1.y += controlOffset;
      if (edge.fromHandle === "left")
        cp1.x -= controlOffset;
      if (edge.fromHandle === "right")
        cp1.x += controlOffset;
      if (edge.toHandle === "top")
        cp2.y -= controlOffset;
      if (edge.toHandle === "bottom")
        cp2.y += controlOffset;
      if (edge.toHandle === "left")
        cp2.x -= controlOffset;
      if (edge.toHandle === "right")
        cp2.x += controlOffset;
      if (position === "start") {
        angle = getCubicAngleAtT(start, cp1, cp2, end, 0) + 180;
        pos = start;
      } else {
        angle = getCubicAngleAtT(start, cp1, cp2, end, 1);
        pos = end;
      }
    }
    const arrowOffset = 2;
    const radians = angle * Math.PI / 180;
    if (position === "end") {
      pos.x = end.x + Math.cos(radians) * arrowOffset;
      pos.y = end.y + Math.sin(radians) * arrowOffset;
    } else {
      pos.x = start.x + Math.cos(radians) * arrowOffset;
      pos.y = start.y + Math.sin(radians) * arrowOffset;
    }
    return /* @__PURE__ */ jsx3(
      "path",
      {
        d: "M 0 0 L -10 -5 L -10 5 Z",
        fill: strokeColor,
        transform: `translate(${pos.x}, ${pos.y}) rotate(${angle})`,
        pointerEvents: "none"
      }
    );
  };
  const showStartArrow = edge.arrow === "from" || edge.arrow === "both";
  const showEndArrow = edge.arrow === "to" || edge.arrow === "both" || !edge.arrow;
  const handleMouseDownBreakpoint = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    if (finalOnInteractStart)
      finalOnInteractStart();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPoint = breakpoints[index];
    const handleMouseMove = (mv) => {
      const dx = (mv.clientX - startX) / scale;
      const dy = (mv.clientY - startY) / scale;
      const newBreakpoints = [...breakpoints];
      newBreakpoints[index] = {
        x: initialPoint.x + dx,
        y: initialPoint.y + dy
      };
      finalOnUpdate(edge.id, { breakpoints: newBreakpoints, controlPoint: void 0 });
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
  const handleDoubleClickLine = (e) => {
    e.stopPropagation();
    if (finalOnInteractStart)
      finalOnInteractStart();
    const worldPos = screenToWorld({ x: e.clientX, y: e.clientY }, transform);
    const newType = edge.type === "step" ? "straight" : edge.type || "bezier";
    finalOnUpdate(edge.id, {
      type: newType,
      breakpoints: [...breakpoints, worldPos],
      controlPoint: void 0
    });
  };
  const handleDoubleClickBreakpoint = (e, index) => {
    e.stopPropagation();
    if (finalOnInteractStart)
      finalOnInteractStart();
    const newBreakpoints = breakpoints.filter((_, i) => i !== index);
    finalOnUpdate(edge.id, { breakpoints: newBreakpoints });
  };
  return /* @__PURE__ */ jsxs3(
    "g",
    {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      className: "group",
      children: [
        /* @__PURE__ */ jsx3(
          "path",
          {
            d: pathD,
            stroke: "transparent",
            strokeWidth: "20",
            fill: "none",
            cursor: "pointer",
            style: { pointerEvents: "auto" },
            onMouseDown: (e) => finalOnSelect(e, edge.id),
            onDoubleClick: handleDoubleClickLine
          }
        ),
        /* @__PURE__ */ jsx3(
          "path",
          {
            d: pathD,
            stroke: strokeColor,
            strokeWidth,
            strokeDasharray: strokeDashArray,
            fill: "none",
            pointerEvents: "none",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: {
              filter: finalIsSelected ? `drop-shadow(0 0 3px ${strokeColor})` : "none",
              opacity: isHovered || finalIsSelected ? 1 : 0.8,
              // 将线条向后移动3个像素，避免超出箭头
              transform: `translate(0, 0)`
            }
          }
        ),
        showStartArrow && renderArrow("start"),
        showEndArrow && renderArrow("end"),
        finalIsSelected && edge.type !== "step" && /* @__PURE__ */ jsx3(Fragment2, { children: breakpoints.map((bp, index) => /* @__PURE__ */ jsx3(
          "circle",
          {
            cx: bp.x,
            cy: bp.y,
            r: 6,
            fill: "white",
            stroke: strokeColor,
            strokeWidth: 2,
            cursor: "move",
            onMouseDown: (e) => handleMouseDownBreakpoint(e, index),
            onDoubleClick: (e) => handleDoubleClickBreakpoint(e, index),
            style: { pointerEvents: "auto" }
          },
          index
        )) })
      ]
    }
  );
};
var EdgeLabel = ({ edge, sourceNode, targetNode, onSelect, darkMode = false }) => {
  if (!edge.label)
    return null;
  const start = getHandlePosition(sourceNode, edge.fromHandle);
  const end = getHandlePosition(targetNode, edge.toHandle);
  const breakpoints = edge.breakpoints || (edge.controlPoint ? [edge.controlPoint] : []);
  const midPoint = getBezierMidpoint(start, end, edge.fromHandle, edge.toHandle, edge.controlPoint, edge.type, breakpoints);
  const strokeColor = edge.color || "#94a3b8";
  return /* @__PURE__ */ jsx3(
    "div",
    {
      style: {
        position: "absolute",
        left: `${midPoint.x}px`,
        top: `${midPoint.y}px`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        // Allow clicking through empty areas of container div
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20
      },
      children: /* @__PURE__ */ jsx3(
        "div",
        {
          className: `mindo-edge-label ${edge.labelStyle === "border" ? "border" : "plain"}`,
          onMouseDown: (e) => {
            e.stopPropagation();
            onSelect(e, edge.id);
          },
          style: {
            // Apply dynamic colors for the 'border' style
            borderColor: edge.labelStyle === "border" ? strokeColor : void 0,
            borderWidth: edge.labelStyle === "border" ? "1.5px" : void 0,
            borderStyle: edge.labelStyle === "border" ? "solid" : void 0,
            color: edge.labelStyle === "border" ? strokeColor : void 0,
            backgroundColor: "var(--background-primary)",
            pointerEvents: "auto",
            // Re-enable pointer events for the label
            padding: edge.labelStyle === "border" ? "3px 8px" : "2px 4px",
            borderRadius: edge.labelStyle === "border" ? "6px" : "0px"
          },
          children: edge.label
        }
      )
    }
  );
};
var EdgeMenu = ({ edge, onUpdate, onDelete }) => {
  const [labelInput, setLabelInput] = useState2(edge.label || "");
  useEffect2(() => {
    setLabelInput(edge.label || "");
  }, [edge.id, edge.label]);
  const toggleArrow = () => {
    const sequence = ["to", "both", "from", "none"];
    const currentIdx = sequence.indexOf(edge.arrow || "to");
    onUpdate(edge.id, { arrow: sequence[(currentIdx + 1) % sequence.length] });
  };
  const toggleStyle = () => {
    const styles = ["solid", "dashed", "dotted"];
    const currentIdx = styles.indexOf(edge.style || "solid");
    onUpdate(edge.id, { style: styles[(currentIdx + 1) % styles.length] });
  };
  const toggleLabelStyle = () => {
    const newStyle = edge.labelStyle === "border" ? "plain" : "border";
    onUpdate(edge.id, { labelStyle: newStyle });
  };
  const setType = (type) => {
    onUpdate(edge.id, { type });
  };
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      className: "mindo-edge-menu",
      onMouseDown: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs3("div", { className: "mindo-edge-label-input", children: [
          /* @__PURE__ */ jsx3(Type, { size: 14, color: "#9ca3af" }),
          /* @__PURE__ */ jsx3(
            "input",
            {
              placeholder: "\u6807\u7B7E...",
              value: labelInput,
              onChange: (e) => {
                setLabelInput(e.target.value);
                onUpdate(edge.id, { label: e.target.value });
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs3("div", { className: "mindo-edge-type-group", children: [
          /* @__PURE__ */ jsx3(
            "button",
            {
              onClick: () => setType("bezier"),
              className: `mindo-edge-type-btn ${!edge.type || edge.type === "bezier" ? "active" : ""}`,
              title: "\u66F2\u7EBF",
              children: /* @__PURE__ */ jsx3(Spline, { size: 16 })
            }
          ),
          /* @__PURE__ */ jsx3(
            "button",
            {
              onClick: () => setType("straight"),
              className: `mindo-edge-type-btn ${edge.type === "straight" ? "active" : ""}`,
              title: "\u76F4\u7EBF",
              children: /* @__PURE__ */ jsx3(ArrowUpRight, { size: 16 })
            }
          ),
          /* @__PURE__ */ jsx3(
            "button",
            {
              onClick: () => setType("step"),
              className: `mindo-edge-type-btn ${edge.type === "step" ? "active" : ""}`,
              title: "\u76F4\u89D2/\u6298\u7EBF",
              children: /* @__PURE__ */ jsx3(GitCommitHorizontal, { size: 16 })
            }
          )
        ] }),
        /* @__PURE__ */ jsx3("div", { style: { display: "flex", gap: "0.375rem", flexWrap: "nowrap" }, children: EDGE_COLORS.map((c) => /* @__PURE__ */ jsx3(
          "button",
          {
            style: {
              width: "1.25rem",
              height: "1.25rem",
              borderRadius: "9999px",
              border: edge.color === c ? "2px solid #9ca3af" : "2px solid transparent",
              backgroundColor: c,
              cursor: "pointer",
              transform: edge.color === c ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.2s",
              padding: 0,
              flexShrink: 0
            },
            onClick: () => onUpdate(edge.id, { color: c }),
            title: c
          },
          c
        )) }),
        /* @__PURE__ */ jsxs3("div", { className: "mindo-edge-menu-row", children: [
          /* @__PURE__ */ jsxs3(
            "button",
            {
              onClick: toggleLabelStyle,
              className: `mindo-edge-action-btn ${edge.labelStyle === "border" ? "active" : ""}`,
              title: "\u5207\u6362\u6807\u7B7E\u6837\u5F0F (\u8FB9\u6846/\u65E0)",
              style: { backgroundColor: edge.labelStyle === "border" ? "rgba(0,0,0,0.05)" : "transparent" },
              children: [
                /* @__PURE__ */ jsx3(Tag, { size: 16 }),
                /* @__PURE__ */ jsx3("span", { children: "\u8FB9\u6846" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs3(
            "button",
            {
              onClick: toggleArrow,
              className: "mindo-edge-action-btn",
              title: "\u5207\u6362\u7BAD\u5934\u65B9\u5411",
              children: [
                /* @__PURE__ */ jsx3(ArrowLeftRight, { size: 16 }),
                /* @__PURE__ */ jsx3("span", { children: "\u7BAD\u5934" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs3(
            "button",
            {
              onClick: toggleStyle,
              className: "mindo-edge-action-btn",
              title: "\u5207\u6362\u7EBF\u6761\u6837\u5F0F",
              children: [
                /* @__PURE__ */ jsx3(Activity, { size: 16 }),
                /* @__PURE__ */ jsx3("span", { children: "\u6837\u5F0F" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs3(
            "button",
            {
              onClick: () => onDelete(edge.id),
              className: "mindo-edge-action-btn delete",
              title: "\u5220\u9664\u8FDE\u63A5",
              children: [
                /* @__PURE__ */ jsx3(Trash2, { size: 16 }),
                /* @__PURE__ */ jsx3("span", { children: "\u5220\u9664" })
              ]
            }
          )
        ] })
      ]
    }
  );
};

// components/Toolbar.tsx
import React3, { useState as useState3 } from "react";
import { Minus, Plus, Maximize, Image as ImageIcon, BoxSelect, AlignCenterHorizontal, AlignCenterVertical, RotateCcw, RotateCw, LayoutGrid, Grid, Layers, Zap, Sliders } from "lucide-react";
import { Fragment as Fragment3, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var Toolbar = ({
  scale,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddGroup,
  onOpenImageOperationModal,
  onAlign,
  onUndo,
  onRedo,
  onAutoLayout,
  onBackgroundChange,
  currentBackground,
  layoutSettings,
  onLayoutSettingsChange,
  canGroup,
  canAlign,
  hasSingleSelection,
  nodeCount,
  snapToGrid = true,
  onSnapToGridChange
}) => {
  const [showBackgroundMenu, setShowBackgroundMenu] = useState3(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState3(false);
  const [localLayoutSettings, setLocalLayoutSettings] = useState3({
    repulsionForce: layoutSettings?.repulsionForce || 25e3,
    attractionForce: layoutSettings?.attractionForce || 0.08,
    minDistance: layoutSettings?.minDistance || 100,
    iterations: layoutSettings?.iterations || 80
  });
  React3.useEffect(() => {
    const handleClickOutside = (event) => {
      const layoutSettingsButton = document.querySelector('.mindo-toolbar-btn[title="\u5E03\u5C40\u8BBE\u7F6E"]');
      const layoutSettingsMenu = document.querySelector('.mindo-select-container > div[style*="position: absolute"]');
      if (showLayoutSettings && layoutSettingsButton && layoutSettingsMenu) {
        const target = event.target;
        if (!layoutSettingsButton.contains(target) && !layoutSettingsMenu.contains(target)) {
          setShowLayoutSettings(false);
        }
      }
    };
    if (showLayoutSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLayoutSettings]);
  return /* @__PURE__ */ jsx4(Fragment3, { children: /* @__PURE__ */ jsxs4("div", { className: "mindo-toolbar", children: [
    /* @__PURE__ */ jsxs4("div", { className: "mindo-toolbar-section", children: [
      /* @__PURE__ */ jsx4(
        "button",
        {
          onClick: onUndo,
          className: "mindo-toolbar-btn",
          title: "\u64A4\u9500 (Ctrl+Z)",
          disabled: !onUndo,
          children: /* @__PURE__ */ jsx4(RotateCcw, { size: 18 })
        }
      ),
      /* @__PURE__ */ jsx4(
        "button",
        {
          onClick: onRedo,
          className: "mindo-toolbar-btn",
          title: "\u91CD\u505A (Ctrl+Y)",
          disabled: !onRedo,
          children: /* @__PURE__ */ jsx4(RotateCw, { size: 18 })
        }
      ),
      /* @__PURE__ */ jsx4("div", { className: "mindo-toolbar-divider" }),
      /* @__PURE__ */ jsx4(
        "button",
        {
          onClick: onOpenImageOperationModal,
          className: "mindo-toolbar-btn",
          title: "\u56FE\u7247\u64CD\u4F5C",
          children: /* @__PURE__ */ jsx4(ImageIcon, { size: 18 })
        }
      )
    ] }),
    /* @__PURE__ */ jsx4("div", { className: "mindo-toolbar-divider" }),
    /* @__PURE__ */ jsx4(
      "button",
      {
        onClick: onAddGroup,
        className: `mindo-toolbar-btn ${!canGroup ? "disabled" : ""}`,
        title: "\u7F16\u7EC4",
        disabled: !canGroup,
        children: /* @__PURE__ */ jsx4(BoxSelect, { size: 18, style: { strokeDasharray: "4 2", opacity: canGroup ? 1 : 0.5 } })
      }
    ),
    canAlign && onAlign && /* @__PURE__ */ jsxs4(Fragment3, { children: [
      /* @__PURE__ */ jsx4("button", { onClick: () => onAlign("horizontal"), className: "mindo-toolbar-btn", title: "\u6C34\u5E73\u5BF9\u9F50", children: /* @__PURE__ */ jsx4(AlignCenterHorizontal, { size: 18 }) }),
      /* @__PURE__ */ jsx4("button", { onClick: () => onAlign("vertical"), className: "mindo-toolbar-btn", title: "\u5782\u76F4\u5BF9\u9F50", children: /* @__PURE__ */ jsx4(AlignCenterVertical, { size: 18 }) })
    ] }),
    onAutoLayout && /* @__PURE__ */ jsx4("button", { onClick: onAutoLayout, className: "mindo-toolbar-btn", title: "\u81EA\u52A8\u5E03\u5C40", children: /* @__PURE__ */ jsx4(LayoutGrid, { size: 18 }) }),
    onLayoutSettingsChange && /* @__PURE__ */ jsxs4("div", { className: "mindo-select-container", style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx4(
        "button",
        {
          onClick: () => setShowLayoutSettings(!showLayoutSettings),
          className: "mindo-toolbar-btn",
          title: "\u5E03\u5C40\u8BBE\u7F6E",
          children: /* @__PURE__ */ jsx4(Sliders, { size: 18 })
        }
      ),
      showLayoutSettings && /* @__PURE__ */ jsxs4("div", { style: {
        position: "absolute",
        bottom: "100%",
        right: 0,
        marginTop: "8px",
        backgroundColor: "var(--background-primary)",
        border: "1px solid var(--background-modifier-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        padding: "16px",
        minWidth: "300px",
        zIndex: 101
      }, children: [
        /* @__PURE__ */ jsx4("h3", { style: { margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600" }, children: "\u5E03\u5C40\u8BBE\u7F6E" }),
        /* @__PURE__ */ jsxs4("div", { style: { marginBottom: "16px" }, children: [
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }, children: [
            /* @__PURE__ */ jsx4("span", { children: "\u6392\u65A5\u529B" }),
            /* @__PURE__ */ jsx4("span", { children: localLayoutSettings.repulsionForce })
          ] }),
          /* @__PURE__ */ jsx4(
            "input",
            {
              type: "range",
              min: "5000",
              max: "50000",
              step: "1000",
              value: localLayoutSettings.repulsionForce,
              onChange: (e) => {
                const newValue = parseInt(e.target.value);
                setLocalLayoutSettings((prev) => ({
                  ...prev,
                  repulsionForce: newValue
                }));
                onLayoutSettingsChange({
                  ...localLayoutSettings,
                  repulsionForce: newValue
                });
              },
              style: {
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--background-modifier-border)",
                outline: "none",
                WebkitAppearance: "none"
              }
            }
          ),
          /* @__PURE__ */ jsx4("div", { style: { fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }, children: "\u8282\u70B9\u4E4B\u95F4\u7684\u6392\u65A5\u529B\uFF0C\u503C\u8D8A\u5927\u8282\u70B9\u95F4\u8DDD\u8D8A\u5927\u3002" })
        ] }),
        /* @__PURE__ */ jsxs4("div", { style: { marginBottom: "16px" }, children: [
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }, children: [
            /* @__PURE__ */ jsx4("span", { children: "\u5438\u5F15\u529B" }),
            /* @__PURE__ */ jsx4("span", { children: localLayoutSettings.attractionForce.toFixed(2) })
          ] }),
          /* @__PURE__ */ jsx4(
            "input",
            {
              type: "range",
              min: "0.01",
              max: "0.2",
              step: "0.01",
              value: localLayoutSettings.attractionForce,
              onChange: (e) => {
                const newValue = parseFloat(e.target.value);
                setLocalLayoutSettings((prev) => ({
                  ...prev,
                  attractionForce: newValue
                }));
                onLayoutSettingsChange({
                  ...localLayoutSettings,
                  attractionForce: newValue
                });
              },
              style: {
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--background-modifier-border)",
                outline: "none",
                WebkitAppearance: "none"
              }
            }
          ),
          /* @__PURE__ */ jsx4("div", { style: { fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }, children: "\u8FDE\u63A5\u8282\u70B9\u4E4B\u95F4\u7684\u5438\u5F15\u529B\uFF0C\u503C\u8D8A\u5C0F\u8282\u70B9\u95F4\u8DDD\u8D8A\u5927\u3002" })
        ] }),
        /* @__PURE__ */ jsxs4("div", { style: { marginBottom: "16px" }, children: [
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }, children: [
            /* @__PURE__ */ jsx4("span", { children: "\u6700\u5C0F\u95F4\u8DDD" }),
            /* @__PURE__ */ jsx4("span", { children: localLayoutSettings.minDistance })
          ] }),
          /* @__PURE__ */ jsx4(
            "input",
            {
              type: "range",
              min: "50",
              max: "200",
              step: "5",
              value: localLayoutSettings.minDistance,
              onChange: (e) => {
                const newValue = parseInt(e.target.value);
                setLocalLayoutSettings((prev) => ({
                  ...prev,
                  minDistance: newValue
                }));
                onLayoutSettingsChange({
                  ...localLayoutSettings,
                  minDistance: newValue
                });
              },
              style: {
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--background-modifier-border)",
                outline: "none",
                WebkitAppearance: "none"
              }
            }
          ),
          /* @__PURE__ */ jsx4("div", { style: { fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }, children: "\u8282\u70B9\u4E4B\u95F4\u7684\u6700\u5C0F\u95F4\u8DDD\uFF0C\u503C\u8D8A\u5927\u8282\u70B9\u95F4\u8DDD\u8D8A\u5927\u3002" })
        ] }),
        /* @__PURE__ */ jsxs4("div", { style: { marginBottom: "16px" }, children: [
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }, children: [
            /* @__PURE__ */ jsx4("span", { children: "\u8FED\u4EE3\u6B21\u6570" }),
            /* @__PURE__ */ jsx4("span", { children: localLayoutSettings.iterations })
          ] }),
          /* @__PURE__ */ jsx4(
            "input",
            {
              type: "range",
              min: "20",
              max: "150",
              step: "5",
              value: localLayoutSettings.iterations,
              onChange: (e) => {
                const newValue = parseInt(e.target.value);
                setLocalLayoutSettings((prev) => ({
                  ...prev,
                  iterations: newValue
                }));
                onLayoutSettingsChange({
                  ...localLayoutSettings,
                  iterations: newValue
                });
              },
              style: {
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--background-modifier-border)",
                outline: "none",
                WebkitAppearance: "none"
              }
            }
          ),
          /* @__PURE__ */ jsx4("div", { style: { fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }, children: "\u5E03\u5C40\u8BA1\u7B97\u7684\u8FED\u4EE3\u6B21\u6570\uFF0C\u503C\u8D8A\u5927\u5E03\u5C40\u8D8A\u7A33\u5B9A\u3002" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx4("div", { className: "mindo-toolbar-divider" }),
    /* @__PURE__ */ jsx4("button", { onClick: onZoomOut, className: "mindo-toolbar-btn", title: "\u7F29\u5C0F", children: /* @__PURE__ */ jsx4(Minus, { size: 16 }) }),
    /* @__PURE__ */ jsxs4("span", { className: "mindo-zoom-text", children: [
      Math.round(scale * 100),
      "%"
    ] }),
    /* @__PURE__ */ jsx4("button", { onClick: onZoomIn, className: "mindo-toolbar-btn", title: "\u653E\u5927", children: /* @__PURE__ */ jsx4(Plus, { size: 16 }) }),
    /* @__PURE__ */ jsx4("div", { className: "mindo-toolbar-divider" }),
    /* @__PURE__ */ jsx4("button", { onClick: onFitView, className: "mindo-toolbar-btn", title: "\u9002\u5E94\u89C6\u56FE", children: /* @__PURE__ */ jsx4(Maximize, { size: 16 }) }),
    /* @__PURE__ */ jsx4("div", { className: "mindo-toolbar-divider" }),
    onBackgroundChange && /* @__PURE__ */ jsxs4("div", { className: "mindo-select-container", style: { position: "relative" }, children: [
      /* @__PURE__ */ jsx4(
        "button",
        {
          onClick: () => setShowBackgroundMenu(!showBackgroundMenu),
          className: "mindo-toolbar-btn",
          title: "\u80CC\u666F\u8BBE\u7F6E",
          children: /* @__PURE__ */ jsx4(Grid, { size: 18 })
        }
      ),
      showBackgroundMenu && /* @__PURE__ */ jsxs4("div", { style: {
        position: "absolute",
        bottom: "100%",
        right: 0,
        marginTop: "8px",
        backgroundColor: "var(--background-primary)",
        border: "1px solid var(--background-modifier-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        padding: "4px 0",
        minWidth: "120px",
        zIndex: 101
      }, children: [
        /* @__PURE__ */ jsxs4(
          "div",
          {
            onClick: () => {
              onBackgroundChange("none");
              setShowBackgroundMenu(false);
            },
            style: {
              padding: "8px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            },
            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)",
            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "transparent",
            children: [
              /* @__PURE__ */ jsx4(Zap, { size: 14 }),
              /* @__PURE__ */ jsx4("span", { children: "\u65E0\u80CC\u666F" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs4(
          "div",
          {
            onClick: () => {
              onBackgroundChange("dots");
              setShowBackgroundMenu(false);
            },
            style: {
              padding: "8px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            },
            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)",
            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "transparent",
            children: [
              /* @__PURE__ */ jsx4(Grid, { size: 14 }),
              /* @__PURE__ */ jsx4("span", { children: "\u70B9\u9635" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs4(
          "div",
          {
            onClick: () => {
              onBackgroundChange("grid");
              setShowBackgroundMenu(false);
            },
            style: {
              padding: "8px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            },
            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)",
            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "transparent",
            children: [
              /* @__PURE__ */ jsx4(Layers, { size: 14 }),
              /* @__PURE__ */ jsx4("span", { children: "\u7F51\u683C" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs4(
          "div",
          {
            onClick: () => {
              onBackgroundChange("lines");
              setShowBackgroundMenu(false);
            },
            style: {
              padding: "8px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            },
            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)",
            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "transparent",
            children: [
              /* @__PURE__ */ jsx4(AlignCenterHorizontal, { size: 14 }),
              /* @__PURE__ */ jsx4("span", { children: "\u7EBF\u6761" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx4("div", { className: "mindo-toolbar-divider" }),
    /* @__PURE__ */ jsx4("div", { className: "mindo-node-count", title: "\u8282\u70B9\u6570\u91CF", children: nodeCount })
  ] }) });
};

// components/SearchBar.tsx
import React4, { useState as useState4 } from "react";
import { Search } from "lucide-react";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var SearchBar = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSearch,
  onImportFile,
  isVisible = true
}) => {
  const [debounceTimeout, setDebounceTimeout] = useState4(null);
  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    const timeout = setTimeout(() => {
      onSearch(value);
    }, 300);
    setDebounceTimeout(timeout);
  };
  React4.useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);
  if (!isVisible) {
    return null;
  }
  return /* @__PURE__ */ jsxs5("div", { className: "mindo-search-bar-container", children: [
    /* @__PURE__ */ jsxs5("div", { className: "mindo-search-bar", children: [
      /* @__PURE__ */ jsx5(Search, { size: 16, className: "mindo-search-icon" }),
      /* @__PURE__ */ jsx5(
        "input",
        {
          type: "text",
          value: searchQuery,
          onChange: handleSearchInput,
          placeholder: "\u641C\u7D22\u6587\u4EF6...",
          className: "mindo-search-input"
        }
      )
    ] }),
    searchQuery && /* @__PURE__ */ jsx5("div", { className: "mindo-search-results", children: isSearching ? /* @__PURE__ */ jsx5("div", { className: "mindo-search-loading", children: "\u641C\u7D22\u4E2D..." }) : searchResults.length > 0 ? searchResults.map((file, index) => /* @__PURE__ */ jsx5(
      "div",
      {
        className: "mindo-search-result-item",
        onClick: () => onImportFile(file),
        children: /* @__PURE__ */ jsxs5("div", { className: "mindo-search-result-info", children: [
          /* @__PURE__ */ jsx5("div", { className: "mindo-search-result-name", children: file.name }),
          /* @__PURE__ */ jsx5("div", { className: "mindo-search-result-path", children: file.path })
        ] })
      },
      index
    )) : searchQuery ? /* @__PURE__ */ jsx5("div", { className: "mindo-search-no-results", children: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u6587\u4EF6" }) : null })
  ] });
};

// components/ContextMenu.tsx
import { useState as useState5, useRef as useRef2, useEffect as useEffect3 } from "react";
import ReactDOM from "react-dom";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var ContextMenu = ({
  x,
  y,
  isVisible,
  onClose,
  items,
  darkMode = false
}) => {
  const menuRef = useRef2(null);
  const [openSubMenu, setOpenSubMenu] = useState5(null);
  useEffect3(() => {
    if (!isVisible)
      return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
        setOpenSubMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
        setOpenSubMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible, onClose]);
  if (!isVisible)
    return null;
  const renderMenuItem = (item, index) => /* @__PURE__ */ jsxs6("div", { children: [
    /* @__PURE__ */ jsxs6(
      "div",
      {
        className: `mindo-context-menu-item ${item.disabled ? "disabled" : ""}`,
        onClick: () => {
          if (!item.disabled && item.onClick) {
            item.onClick();
            onClose();
            setOpenSubMenu(null);
          }
        },
        style: {
          padding: "8px 16px",
          cursor: item.subItems ? "pointer" : item.disabled ? "not-allowed" : "pointer",
          color: item.disabled ? "var(--text-muted)" : "var(--text-normal)",
          fontSize: "14px",
          userSelect: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        onMouseEnter: (e) => {
          if (!item.disabled) {
            e.currentTarget.style.backgroundColor = "var(--background-secondary)";
            if (item.subItems) {
              setOpenSubMenu(index);
            }
          }
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        },
        children: [
          item.label,
          item.subItems && /* @__PURE__ */ jsx6("span", { style: { marginLeft: "8px" }, children: "\u25B6" })
        ]
      }
    ),
    item.subItems && openSubMenu === index && /* @__PURE__ */ jsx6(
      "div",
      {
        className: `mindo-context-submenu ${darkMode ? "dark" : ""}`,
        style: {
          position: "absolute",
          left: "100%",
          top: `${index * 36}px`,
          zIndex: 10001,
          backgroundColor: "var(--background-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          padding: "4px 0",
          minWidth: "180px",
          pointerEvents: "auto"
        },
        children: item.subItems.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))
      }
    )
  ] }, index);
  const menuElement = /* @__PURE__ */ jsx6(
    "div",
    {
      ref: menuRef,
      className: `mindo-context-menu ${darkMode ? "dark" : ""}`,
      style: {
        position: "fixed",
        left: x,
        top: y,
        zIndex: 1e4,
        backgroundColor: "var(--background-primary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        padding: "4px 0",
        minWidth: "180px",
        pointerEvents: "auto"
      },
      children: items.map((item, index) => renderMenuItem(item, index))
    }
  );
  return ReactDOM.createPortal(menuElement, document.body);
};

// components/IconSelector.tsx
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var ICONS = [
  { type: "none", symbol: "\u25CB" },
  { type: "star", symbol: "\u2B50" },
  { type: "circle", symbol: "\u{1F534}" },
  { type: "check", symbol: "\u2705" },
  { type: "lightning", symbol: "\u26A1" },
  { type: "bulb", symbol: "\u{1F4A1}" },
  { type: "question", symbol: "\u2753" }
];
var IconSelector = ({
  onSelectIcon,
  onClose,
  darkMode = false
}) => {
  return /* @__PURE__ */ jsx7(
    "div",
    {
      className: "mindo-icon-selector-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2e4
      },
      onClick: onClose,
      children: /* @__PURE__ */ jsxs7(
        "div",
        {
          className: "mindo-icon-selector",
          style: {
            backgroundColor: darkMode ? "#1f2937" : "#ffffff",
            border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
            borderRadius: "8px",
            padding: "16px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            minWidth: "240px",
            maxWidth: "320px",
            zIndex: 20001
          },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxs7(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`
                },
                children: [
                  /* @__PURE__ */ jsx7("h3", { style: {
                    margin: 0,
                    color: darkMode ? "#e5e7eb" : "#111827",
                    fontSize: "14px",
                    fontWeight: "600"
                  }, children: "\u9009\u62E9\u56FE\u6807" }),
                  /* @__PURE__ */ jsx7(
                    "button",
                    {
                      onClick: onClose,
                      style: {
                        background: "none",
                        border: "none",
                        fontSize: "18px",
                        cursor: "pointer",
                        color: darkMode ? "#9ca3af" : "#6b7280",
                        padding: "0",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      },
                      children: "\xD7"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx7(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px"
                },
                children: ICONS.map((icon) => /* @__PURE__ */ jsx7(
                  "button",
                  {
                    onClick: () => onSelectIcon(icon.type),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "16px",
                      borderRadius: "6px",
                      border: `2px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      aspectRatio: "1/1"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? "#374151" : "#f3f4f6";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    },
                    children: /* @__PURE__ */ jsx7("span", { style: { fontSize: "28px" }, children: icon.symbol })
                  },
                  icon.type
                ))
              }
            )
          ]
        }
      )
    }
  );
};

// components/NodeMenu.tsx
import { Trash2 as Trash22, Palette, SeparatorHorizontal } from "lucide-react";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var ICONS2 = [
  { type: "none", symbol: "\u25CB" },
  { type: "star", symbol: "\u2B50" },
  { type: "circle", symbol: "\u{1F534}" },
  { type: "check", symbol: "\u2705" },
  { type: "lightning", symbol: "\u26A1" },
  { type: "bulb", symbol: "\u{1F4A1}" },
  { type: "question", symbol: "\u2753" }
];
var NodeMenu = ({
  node,
  onDelete,
  onColorChange,
  onIconChange,
  onIconPositionChange,
  onTitleVisibleChange,
  darkMode = false
}) => {
  return /* @__PURE__ */ jsxs8(
    "div",
    {
      className: "mindo-node-menu",
      style: {
        position: "absolute",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: darkMode ? "var(--background-secondary)" : "var(--background-primary)",
        padding: "8px 12px",
        borderRadius: "9999px",
        boxShadow: darkMode ? "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "12px",
        zIndex: 90,
        width: "auto",
        whiteSpace: "nowrap",
        maxWidth: "95vw",
        overflowX: "auto",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        transition: "all 0.3s ease"
      },
      onMouseDown: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs8("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }, children: [
          /* @__PURE__ */ jsx8(
            "button",
            {
              onClick: () => {
                if (node.icon && node.icon !== "none") {
                  const newPosition = node.iconPosition === "corner" || !node.iconPosition ? "inline" : "corner";
                  onIconPositionChange(node.id, newPosition);
                }
              },
              style: {
                display: "flex",
                alignItems: "center",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "transparent",
                cursor: node.icon && node.icon !== "none" ? "pointer" : "default",
                transition: "all 0.2s ease",
                boxShadow: "none",
                outline: "none",
                appearance: "none",
                fontSize: "14px",
                color: "var(--text-muted)",
                fontWeight: "500"
              },
              title: node.icon && node.icon !== "none" ? `\u5207\u6362\u56FE\u6807\u4F4D\u7F6E: ${node.iconPosition === "corner" || !node.iconPosition ? "\u5DE6\u4E0A\u89D2" : "\u6807\u9898\u524D"}` : "\u8BF7\u5148\u9009\u62E9\u56FE\u6807",
              children: "\u56FE\u6807"
            }
          ),
          /* @__PURE__ */ jsx8("div", { style: { display: "flex", gap: "6px" }, children: ICONS2.map((icon) => {
            const iconTitleMap = {
              none: "\u65E0",
              star: "\u6536\u85CF",
              circle: "\u91CD\u8981",
              check: "\u5B8C\u6210",
              lightning: "\u7D27\u6025",
              bulb: "\u60F3\u6CD5",
              question: "\u5F85\u5B9A"
            };
            return /* @__PURE__ */ jsx8(
              "button",
              {
                onClick: () => onIconChange(node.id, icon.type),
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: node.icon === icon.type ? "rgba(0, 0, 0, 0.05)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "none",
                  outline: "none",
                  appearance: "none",
                  position: "relative"
                },
                title: iconTitleMap[icon.type],
                children: /* @__PURE__ */ jsx8("span", { style: { fontSize: "16px" }, children: icon.symbol })
              },
              icon.type
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxs8("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }, children: [
          /* @__PURE__ */ jsx8(Palette, { size: 16, color: "var(--text-muted)" }),
          /* @__PURE__ */ jsx8("div", { style: { display: "flex", gap: "6px", flexWrap: "nowrap" }, children: COLOR_PALETTE.map((color) => /* @__PURE__ */ jsx8(
            "button",
            {
              onClick: () => onColorChange(node.id, color),
              style: {
                width: "24px",
                height: "24px",
                borderRadius: "9999px",
                border: node.color === color ? "2px solid var(--text-normal)" : "2px solid transparent",
                backgroundColor: NODE_STYLES[color].picker,
                cursor: "pointer",
                transition: "transform 0.2s",
                transform: node.color === color ? "scale(1.1)" : "scale(1)",
                padding: 0,
                flexShrink: 0,
                boxShadow: "none",
                outline: "none",
                appearance: "none"
              },
              title: color
            },
            color
          )) })
        ] }),
        /* @__PURE__ */ jsx8(
          "button",
          {
            onClick: () => onTitleVisibleChange(node.id, !(node.titleVisible !== false)),
            disabled: !(node.content && node.content.trim().length > 0) && node.type !== "image",
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: node.titleVisible !== false ? "rgba(59, 130, 246, 0.1)" : "transparent",
              color: "var(--text-normal)",
              cursor: !(node.content && node.content.trim().length > 0) && node.type !== "image" ? "not-allowed" : "pointer",
              opacity: !(node.content && node.content.trim().length > 0) && node.type !== "image" ? 0.5 : 1,
              fontSize: "14px",
              transition: "all 0.2s ease",
              flexShrink: 0,
              boxShadow: "none",
              outline: "none",
              appearance: "none"
            },
            title: !(node.content && node.content.trim().length > 0) && node.type !== "image" ? "\u9700\u8981\u6709\u5185\u5BB9\u624D\u80FD\u9690\u85CF\u6807\u9898" : node.titleVisible !== false ? "\u9690\u85CF\u6807\u9898" : "\u663E\u793A\u6807\u9898",
            children: /* @__PURE__ */ jsx8(SeparatorHorizontal, { size: 16 })
          }
        ),
        /* @__PURE__ */ jsxs8(
          "button",
          {
            onClick: () => onDelete(node.id),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "var(--text-normal)",
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s ease",
              flexShrink: 0,
              boxShadow: "none",
              outline: "none",
              appearance: "none"
            },
            title: "\u5220\u9664\u8282\u70B9",
            children: [
              /* @__PURE__ */ jsx8(Trash22, { size: 14 }),
              /* @__PURE__ */ jsx8("span", { children: "\u5220\u9664" })
            ]
          }
        )
      ]
    }
  );
};

// components/ImageOperationModal.tsx
import { Modal, Setting } from "obsidian";
var ImageOperationModal = class extends Modal {
  constructor(props) {
    super(props.app);
    this.onExportImage = props.onExportImage;
    this.onCopyImage = props.onCopyImage;
    this.resolution = 1;
    this.margin = 20;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "\u56FE\u7247\u64CD\u4F5C" });
    const resolutionSetting = new Setting(contentEl).setName("\u5206\u8FA8\u7387").setDesc(`\u8BBE\u7F6E\u5BFC\u51FA\u56FE\u7247\u7684\u5206\u8FA8\u7387\uFF0C\u5F53\u524D\uFF1A${this.resolution}x`).addSlider(
      (slider) => slider.setLimits(0.5, 3, 0.1).setValue(this.resolution).onChange((value) => {
        this.resolution = value;
        resolutionSetting.setDesc(`\u8BBE\u7F6E\u5BFC\u51FA\u56FE\u7247\u7684\u5206\u8FA8\u7387\uFF0C\u5F53\u524D\uFF1A${this.resolution}x`);
      })
    );
    new Setting(contentEl).setName("\u8FB9\u8DDD").setDesc("\u8BBE\u7F6E\u5BFC\u51FA\u56FE\u7247\u7684\u8FB9\u8DDD\uFF08\u50CF\u7D20\uFF09").addSlider(
      (slider) => slider.setLimits(0, 100, 5).setValue(this.margin).onChange((value) => {
        this.margin = value;
      })
    );
    const buttonContainer = contentEl.createDiv();
    buttonContainer.addClass("modal-button-container");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "20px";
    buttonContainer.createEl("button", {
      text: "\u5BFC\u51FA\u56FE\u7247",
      cls: "mod-cta"
    }).addEventListener("click", () => {
      this.onExportImage({
        resolution: this.resolution,
        margin: this.margin
      });
      this.close();
    });
    buttonContainer.createEl("button", {
      text: "\u590D\u5236\u5230\u526A\u8D34\u677F",
      cls: "mod-cta"
    }).addEventListener("click", () => {
      this.onCopyImage({
        resolution: this.resolution,
        margin: this.margin
      });
      this.close();
    });
    buttonContainer.createEl("button", {
      text: "\u53D6\u6D88",
      cls: "mod-secondary"
    }).addEventListener("click", () => {
      this.close();
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// App.tsx
import * as htmlToImage from "html-to-image";

// services/aiCacheManager.ts
var AICacheManager = class {
  constructor() {
    this.memoryCache = /* @__PURE__ */ new Map();
    this.DEFAULT_TTL = 24 * 60 * 60 * 1e3;
  }
  // 24 hours
  // Generate cache key from skill id, inputs, and model
  generateKey(skillId, inputs, model) {
    const inputStr = JSON.stringify(inputs);
    return `${skillId}|${inputStr}|${model}`;
  }
  // Get from cache
  get(key) {
    const entry = this.memoryCache.get(key);
    if (!entry)
      return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data;
  }
  // Set to cache
  set(key, data, ttlMs = this.DEFAULT_TTL) {
    const entry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    };
    this.memoryCache.set(key, entry);
  }
  // Clear cache
  clear() {
    this.memoryCache.clear();
  }
  // Get cache size (for debugging)
  size() {
    return this.memoryCache.size;
  }
  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
};
var cacheManager = new AICacheManager();

// services/aiUtils.ts
var DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 1e3,
  maxDelayMs: 3e4,
  backoffMultiplier: 2
};
async function retryWithBackoff(fn, options = DEFAULT_RETRY_OPTIONS) {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError = null;
  let delayMs = opts.initialDelayMs;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.message.includes("(4") && !lastError.message.includes("(429")) {
        throw lastError;
      }
      if (attempt < opts.maxAttempts) {
        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms:`, lastError.message);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }
  }
  throw lastError || new Error("Max retry attempts exceeded");
}
function parseJSON(text, fallback) {
  if (!text || text.trim().length === 0) {
    return fallback ?? null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
  }
  try {
    const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
  }
  try {
    const matches = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (matches && matches[1]) {
      return JSON.parse(matches[1]);
    }
  } catch (e) {
  }
  try {
    if (text.trim().startsWith("[")) {
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      const filtered = lines.filter((l) => !l.trim().startsWith("//"));
      const rejoined = filtered.join("\n");
      return JSON.parse(rejoined);
    }
  } catch (e) {
  }
  console.error("All JSON parse strategies failed. Raw text:", text);
  return fallback ?? null;
}
function formatErrorMessage(error) {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("(429"))
      return "AI \u670D\u52A1\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u5019\u5C1D\u8BD5";
    if (msg.includes("(401") || msg.includes("(403"))
      return "AI API \u5BC6\u94A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u68C0\u67E5\u63D2\u4EF6\u8BBE\u7F6E";
    if (msg.includes("(500"))
      return "AI \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
    if (msg.includes("\u65E0\u6CD5\u89E3\u6790"))
      return "\u65E0\u6CD5\u89E3\u6790 AI \u8FD4\u56DE\u7684\u6570\u636E\u683C\u5F0F\uFF0C\u8BF7\u68C0\u67E5\u6A21\u578B\u548C\u63D0\u793A\u8BCD";
    return msg;
  }
  return String(error);
}

// services/aiService.ts
var brainstorm = async (node, settings) => {
  const cacheKey = cacheManager.generateKey("brainstorm", { nodeId: node.id, title: node.title }, settings.aiModel || "default");
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log("brainstorm: using cached result");
    return cached;
  }
  if (!settings.aiApiKey) {
    throw new Error("\u7F3A\u5C11 API Key\uFF0C\u8BF7\u5728 Mindo \u8BBE\u7F6E\u4E2D\u914D\u7F6E\u3002");
  }
  const prompt = `\u4F5C\u4E3A\u521B\u610F brainstorming \u4E13\u5BB6\uFF0C\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u8282\u70B9\u5185\u5BB9\u751F\u6210\u591A\u7EA7\u521B\u610F\u60F3\u6CD5\uFF0C\u6700\u591A3\u7EA7\uFF0C\u4EE5\u6DF1\u5165\u63A2\u7D22\u95EE\u9898\uFF1A

\u8282\u70B9\u6807\u9898\uFF1A${node.title}
\u8282\u70B9\u5185\u5BB9\uFF1A${node.content || "\u65E0"}

\u8981\u6C42\uFF1A
1. \u751F\u6210 3-5 \u4E2A\u4E00\u7EA7\u521B\u610F\u60F3\u6CD5
2. \u6BCF\u4E2A\u4E00\u7EA7\u60F3\u6CD5\u4E0B\u751F\u6210 2-3 \u4E2A\u4E8C\u7EA7\u5B50\u60F3\u6CD5
3. \u6BCF\u4E2A\u4E8C\u7EA7\u60F3\u6CD5\u4E0B\u53EF\u9009\u62E9\u6027\u751F\u6210 1-2 \u4E2A\u4E09\u7EA7\u5B50\u60F3\u6CD5
4. \u60F3\u6CD5\u8981\u5177\u4F53\u3001\u6709\u521B\u610F\uFF0C\u4E0E\u8282\u70B9\u5185\u5BB9\u76F8\u5173
5. \u8BED\u8A00\u7B80\u6D01\u660E\u4E86\uFF0C\u91CD\u70B9\u7A81\u51FA

\u8BF7\u8FD4\u56DE\u4E00\u4E2A\u4E25\u683C\u7684 JSON \u5BF9\u8C61\uFF0C\u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "ideas": [
    {
      "title": "\u4E00\u7EA7\u60F3\u6CD51",
      "children": [
        {
          "title": "\u4E8C\u7EA7\u60F3\u6CD51",
          "children": [
            {
              "title": "\u4E09\u7EA7\u60F3\u6CD51"
            }
          ]
        }
      ]
    }
  ]
}`;
  try {
    let result = null;
    if (settings.aiProvider === "gemini") {
      const { GoogleGenAI, Type: Type2 } = await import("@google/genai");
      result = await retryWithBackoff(async () => {
        const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
        const response = await ai.models.generateContent({
          model: settings.aiModel || "gemini-2.0-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type2.OBJECT,
              properties: {
                ideas: {
                  type: Type2.ARRAY,
                  items: {
                    type: Type2.OBJECT,
                    properties: {
                      title: { type: Type2.STRING },
                      children: {
                        type: Type2.ARRAY,
                        items: {
                          type: Type2.OBJECT,
                          properties: {
                            title: { type: Type2.STRING },
                            children: {
                              type: Type2.ARRAY,
                              items: {
                                type: Type2.OBJECT,
                                properties: {
                                  title: { type: Type2.STRING }
                                },
                                required: ["title"]
                              }
                            }
                          },
                          required: ["title"]
                        }
                      }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["ideas"]
            }
          }
        });
        if (response.text) {
          const brainstormResult = parseJSON(response.text, null);
          if (brainstormResult && Array.isArray(brainstormResult.ideas)) {
            return brainstormResult;
          }
        }
        throw new Error("Gemini \u672A\u8FD4\u56DE\u6709\u6548\u6570\u636E");
      });
    } else {
      let baseUrl = settings.aiBaseUrl || "https://api.openai.com/v1";
      if (!baseUrl.endsWith("/chat/completions")) {
        if (baseUrl.endsWith("/"))
          baseUrl = baseUrl.slice(0, -1);
        baseUrl = `${baseUrl}/chat/completions`;
      }
      result = await retryWithBackoff(async () => {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.aiApiKey}`
          },
          body: JSON.stringify({
            model: settings.aiModel || "deepseek-chat",
            messages: [
              { role: "system", content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u521B\u610F brainstorming \u4E13\u5BB6\uFF0C\u64C5\u957F\u57FA\u4E8E\u7ED9\u5B9A\u4E3B\u9898\u751F\u6210\u521B\u65B0\u7684\u60F3\u6CD5\u3002\u8BF7\u76F4\u63A5\u8FD4\u56DE JSON \u5BF9\u8C61\u683C\u5F0F\u7684\u6570\u636E\u3002" },
              { role: "user", content: prompt }
            ],
            stream: false,
            temperature: 0.7
          })
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`AI \u670D\u52A1\u63D0\u4F9B\u5546\u9519\u8BEF (${response.status}): ${err}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const brainstormResult = parseJSON(content, null);
          if (brainstormResult && Array.isArray(brainstormResult.ideas)) {
            return brainstormResult;
          }
        }
        throw new Error("OpenAI-compatible \u670D\u52A1\u672A\u8FD4\u56DE\u6709\u6548\u6570\u636E");
      });
    }
    if (result) {
      cacheManager.set(cacheKey, result);
      return result;
    }
    throw new Error("\u65E0\u6548\u7684 AI \u8FD4\u56DE\u7ED3\u679C");
  } catch (error) {
    console.error("AI Brainstorm failed:", error);
    throw new Error(formatErrorMessage(error));
  }
};
var deepenContent = async (node, settings) => {
  const cacheKey = cacheManager.generateKey("deepenContent", { nodeId: node.id, title: node.title }, settings.aiModel || "default");
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log("deepenContent: using cached result");
    return cached;
  }
  if (!settings.aiApiKey) {
    throw new Error("\u7F3A\u5C11 API Key\uFF0C\u8BF7\u5728 Mindo \u8BBE\u7F6E\u4E2D\u914D\u7F6E\u3002");
  }
  const prompt = `\u4F5C\u4E3A\u5185\u5BB9\u6DF1\u5316\u4E13\u5BB6\uFF0C\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u8282\u70B9\u5185\u5BB9\u751F\u6210\u66F4\u8BE6\u7EC6\u3001\u66F4\u6DF1\u5165\u7684\u5185\u5BB9\uFF1A

\u8282\u70B9\u6807\u9898\uFF1A${node.title}
\u8282\u70B9\u5185\u5BB9\uFF1A${node.content || "\u65E0"}

\u8981\u6C42\uFF1A
1. \u4FDD\u6301\u5185\u5BB9\u4E0E\u539F\u4E3B\u9898\u76F8\u5173
2. \u589E\u52A0\u66F4\u591A\u7EC6\u8282\u548C\u6DF1\u5EA6
3. \u63D0\u4F9B\u66F4\u5168\u9762\u7684\u4FE1\u606F
4. \u4FDD\u6301\u5185\u5BB9\u7ED3\u6784\u6E05\u6670
5. \u63D0\u70BC\u4E3B\u8981\u5185\u5BB9\uFF0C\u63A7\u5236\u5728200\u5B57\u4EE5\u5185
6. \u8BED\u8A00\u7B80\u6D01\u660E\u4E86\uFF0C\u91CD\u70B9\u7A81\u51FA

\u8BF7\u76F4\u63A5\u8FD4\u56DE\u6DF1\u5316\u540E\u7684\u5185\u5BB9\u6587\u672C\uFF0C\u4E0D\u9700\u8981\u4EFB\u4F55 JSON \u683C\u5F0F\u3002`;
  try {
    let result = null;
    if (settings.aiProvider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      result = await retryWithBackoff(async () => {
        const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
        const response = await ai.models.generateContent({
          model: settings.aiModel || "gemini-2.0-flash",
          contents: prompt
        });
        if (response.text) {
          return response.text.trim();
        }
        throw new Error("Gemini \u672A\u8FD4\u56DE\u6709\u6548\u6570\u636E");
      });
    } else {
      let baseUrl = settings.aiBaseUrl || "https://api.openai.com/v1";
      if (!baseUrl.endsWith("/chat/completions")) {
        if (baseUrl.endsWith("/"))
          baseUrl = baseUrl.slice(0, -1);
        baseUrl = `${baseUrl}/chat/completions`;
      }
      result = await retryWithBackoff(async () => {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.aiApiKey}`
          },
          body: JSON.stringify({
            model: settings.aiModel || "deepseek-chat",
            messages: [
              { role: "system", content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u5185\u5BB9\u6DF1\u5316\u4E13\u5BB6\uFF0C\u64C5\u957F\u4E3A\u7ED9\u5B9A\u4E3B\u9898\u63D0\u4F9B\u66F4\u8BE6\u7EC6\u3001\u66F4\u6DF1\u5165\u7684\u4FE1\u606F\u3002\u8BF7\u76F4\u63A5\u8FD4\u56DE\u6DF1\u5316\u540E\u7684\u5185\u5BB9\u6587\u672C\u3002" },
              { role: "user", content: prompt }
            ],
            stream: false,
            temperature: 0.5
          })
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`AI \u670D\u52A1\u63D0\u4F9B\u5546\u9519\u8BEF (${response.status}): ${err}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content.trim();
        }
        throw new Error("OpenAI-compatible \u670D\u52A1\u672A\u8FD4\u56DE\u6709\u6548\u6570\u636E");
      });
    }
    if (result) {
      cacheManager.set(cacheKey, result);
      return result;
    }
    throw new Error("\u65E0\u6548\u7684 AI \u8FD4\u56DE\u7ED3\u679C");
  } catch (error) {
    console.error("AI Content Deepening failed:", error);
    throw new Error(formatErrorMessage(error));
  }
};

// App.tsx
import { Fragment as Fragment4, jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var DEFAULT_INITIAL_NODES = [
  { id: "root", title: "Mindo", content: "\u4E2D\u5FC3\u4E3B\u9898", x: 0, y: 0, width: 150, height: 100, color: "yellow" }
];
var App2 = ({
  initialData,
  onSave,
  fileName,
  settings,
  onShowMessage,
  onRenderMarkdown,
  onSaveAsset,
  onRenameAsset,
  onResolveResource,
  onOpenLink,
  app
}) => {
  const [nodes, setNodes] = useState6(initialData?.nodes || DEFAULT_INITIAL_NODES);
  const [edges, setEdges] = useState6(initialData?.edges || []);
  const [transform, setTransform] = useState6(initialData?.transform || { x: 0, y: 0, scale: 1 });
  const [past, setPast] = useState6([]);
  const [future, setFuture] = useState6([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState6(/* @__PURE__ */ new Set());
  const [selectedEdgeId, setSelectedEdgeId] = useState6(null);
  const [draggingNodeId, setDraggingNodeId] = useState6(null);
  const [draggedChildrenIds, setDraggedChildrenIds] = useState6([]);
  const [selectionBox, setSelectionBox] = useState6(null);
  const [lastDraggedNodeIds, setLastDraggedNodeIds] = useState6([]);
  const [connectionStart, setConnectionStart] = useState6(null);
  const [tempConnectionEnd, setTempConnectionEnd] = useState6(null);
  const [snapPreview, setSnapPreview] = useState6(null);
  const [reconnectingEdge, setReconnectingEdge] = useState6(null);
  const [isPanning, setIsPanning] = useState6(false);
  const [darkMode, setDarkMode] = useState6(false);
  const [currentLayout, setCurrentLayout] = useState6("mind_map" /* MIND_MAP */);
  const [currentBackground, setCurrentBackground] = useState6("none");
  const [snapToGrid, setSnapToGrid] = useState6(true);
  const [autoSelectNearestHandle, setAutoSelectNearestHandle] = useState6(true);
  const [layoutSettings, setLayoutSettings] = useState6({
    repulsionForce: 5e5,
    attractionForce: 0.03,
    minDistance: 300,
    iterations: 300
  });
  const [showSearchBox, setShowSearchBox] = useState6(false);
  const [searchQuery, setSearchQuery] = useState6("");
  const [searchResults, setSearchResults] = useState6([]);
  const [isSearching, setIsSearching] = useState6(false);
  const imageOperationModalRef = useRef3(null);
  const [contextMenu, setContextMenu] = useState6({
    visible: false,
    x: 0,
    y: 0,
    type: "canvas",
    nodeId: null
  });
  const [showIconSelector, setShowIconSelector] = useState6(false);
  const [currentIconNodeId, setCurrentIconNodeId] = useState6(null);
  const [selectedNodeForMenu, setSelectedNodeForMenu] = useState6(null);
  const containerRef = useRef3(null);
  const canvasContentRef = useRef3(null);
  const canvasContainerRef = useRef3(null);
  const mindmapContainerRef = useRef3(null);
  const dragStartRef = useRef3({ x: 0, y: 0 });
  const itemStartRef = useRef3({ x: 0, y: 0 });
  const hasCentered = useRef3(false);
  const rafRef = useRef3(null);
  const initialNodesRef = useRef3([]);
  const nodesRef = useRef3(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef3(edges);
  edgesRef.current = edges;
  const transformRef = useRef3(transform);
  transformRef.current = transform;
  const selectedNodeIdsRef = useRef3(selectedNodeIds);
  selectedNodeIdsRef.current = selectedNodeIds;
  const draggingNodeIdRef = useRef3(draggingNodeId);
  draggingNodeIdRef.current = draggingNodeId;
  const connectionStartRef = useRef3(connectionStart);
  connectionStartRef.current = connectionStart;
  const reconnectingEdgeRef = useRef3(reconnectingEdge);
  reconnectingEdgeRef.current = reconnectingEdge;
  const isPanningRef = useRef3(isPanning);
  isPanningRef.current = isPanning;
  const selectionBoxRef = useRef3(selectionBox);
  selectionBoxRef.current = selectionBox;
  const lastSavedData = useRef3("");
  const snapPreviewRef = useRef3(snapPreview);
  snapPreviewRef.current = snapPreview;
  const mouseMoveHandlerRef = useRef3(() => {
  });
  const mouseUpHandlerRef = useRef3(() => {
  });
  useEffect4(() => {
    const checkDarkMode = () => {
      const isDark = document.body.classList.contains("theme-dark");
      setDarkMode(isDark);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  useEffect4(() => {
    if (initialData) {
      let loadedNodes = initialData.nodes || DEFAULT_INITIAL_NODES;
      if (onResolveResource) {
        loadedNodes = loadedNodes.map((node) => {
          if (node.type === "image" && node.assetPath) {
            return { ...node, imageUrl: onResolveResource(node.assetPath) };
          }
          return node;
        });
      }
      const incomingData = {
        nodes: loadedNodes,
        edges: initialData.edges || [],
        transform: initialData.transform || { x: 0, y: 0, scale: 1 },
        snapToGrid: initialData.snapToGrid !== void 0 ? initialData.snapToGrid : true,
        autoSelectNearestHandle: initialData.autoSelectNearestHandle !== void 0 ? initialData.autoSelectNearestHandle : true,
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
  const pendingCenterRef = useRef3(false);
  const performCenter = useCallback(() => {
    if (!containerRef.current)
      return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) {
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
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      current.forEach((n) => {
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
  useEffect4(() => {
    pendingCenterRef.current = false;
    performCenter();
    const observer = new ResizeObserver(() => {
      if (draggingNodeIdRef.current || isPanningRef.current) {
        pendingCenterRef.current = true;
        return;
      }
      if (!hasCentered.current || pendingCenterRef.current) {
        performCenter();
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [performCenter]);
  useEffect4(() => {
    const currentData = {
      nodes,
      edges,
      transform,
      snapToGrid,
      autoSelectNearestHandle,
      version: 1
    };
    const dataString = JSON.stringify(currentData, null, 2);
    if (dataString === lastSavedData.current)
      return;
    lastSavedData.current = dataString;
    onSave?.(dataString);
  }, [nodes, edges, transform, snapToGrid, autoSelectNearestHandle, onSave]);
  const saveHistory = useCallback(() => {
    setPast((prev) => [...prev, { nodes: nodesRef.current, edges: edgesRef.current }]);
    setFuture([]);
  }, []);
  const undo = useCallback(() => {
    if (past.length === 0)
      return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture((prev) => [{ nodes: nodesRef.current, edges: edgesRef.current }, ...prev]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setPast(newPast);
  }, [past]);
  const redo = useCallback(() => {
    if (future.length === 0)
      return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast((prev) => [...prev, { nodes: nodesRef.current, edges: edgesRef.current }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture(newFuture);
  }, [future]);
  const handleWheel = (e) => {
    if (!hasCentered.current)
      hasCentered.current = true;
    const zoomSensitivity = 1e-3;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(transform.scale * (1 + delta), 0.1), 5);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect)
      return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    setTransform({ x: newX, y: newY, scale: newScale });
  };
  const handleMouseDownCanvas = (e) => {
    if (e.button === 1 || e.button === 0 && (e.ctrlKey || e.metaKey)) {
      setIsPanning(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      itemStartRef.current = { x: transform.x, y: transform.y };
      return;
    }
    if (e.button === 0) {
      if (!e.shiftKey) {
        setSelectedNodeIds(/* @__PURE__ */ new Set());
        setSelectedEdgeId(null);
        setSelectedNodeForMenu(null);
      }
      const rect = mindmapContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setSelectionBox({ start: startPos, end: startPos });
      }
    }
  };
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: "canvas",
      nodeId: null
    });
  };
  const handleNodeContextMenu = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNodeIds(/* @__PURE__ */ new Set([nodeId]));
    setSelectedEdgeId(null);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: "node",
      nodeId
    });
  };
  const handleNodeSelect = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNodeForMenu(node);
    }
  };
  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };
  const handleAddIcon = (nodeId) => {
    setCurrentIconNodeId(nodeId);
    setShowIconSelector(true);
    closeContextMenu();
  };
  const handleSelectIcon = (icon) => {
    if (currentIconNodeId) {
      saveHistory();
      setNodes((prev) => prev.map(
        (node) => node.id === currentIconNodeId ? { ...node, icon: icon === "none" ? void 0 : icon } : node
      ));
    }
    setShowIconSelector(false);
    setCurrentIconNodeId(null);
  };
  const handleIconChange = (nodeId, icon) => {
    saveHistory();
    setNodes((prev) => prev.map(
      (node) => node.id === nodeId ? { ...node, icon: icon === "none" ? void 0 : icon } : node
    ));
    setSelectedNodeForMenu((prev) => prev?.id === nodeId ? { ...prev, icon: icon === "none" ? void 0 : icon } : prev);
  };
  const handleIconPositionChange = (nodeId, position) => {
    saveHistory();
    setNodes((prev) => prev.map(
      (node) => node.id === nodeId ? { ...node, iconPosition: position } : node
    ));
    setSelectedNodeForMenu((prev) => prev?.id === nodeId ? { ...prev, iconPosition: position } : prev);
  };
  const handleTitleVisibleChange = (nodeId, visible) => {
    saveHistory();
    setNodes((prev) => prev.map(
      (node) => node.id === nodeId ? { ...node, titleVisible: visible } : node
    ));
    setSelectedNodeForMenu((prev) => prev?.id === nodeId ? { ...prev, titleVisible: visible } : prev);
  };
  const handleBrainstorm = async (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node)
      return;
    try {
      const brainstormResult = await brainstorm(node, settings);
      saveHistory();
      const newNodes = [];
      const newEdges = [];
      const createNodesRecursively = (parentNode, ideas, level, maxLevel) => {
        if (level >= maxLevel)
          return;
        ideas.forEach((idea, index) => {
          const angle = index * 360 / ideas.length;
          const distance = 200 + level * 100;
          const x = parentNode.x + Math.cos(angle * Math.PI / 180) * distance;
          const y = parentNode.y + Math.sin(angle * Math.PI / 180) * distance;
          const newNode = {
            id: generateId(),
            title: idea.title,
            content: "",
            x: x - 80,
            y: y - 40,
            width: 160,
            height: 80,
            color: level === 0 ? "blue" : level === 1 ? "green" : "purple",
            icon: "none"
          };
          newNodes.push(newNode);
          newEdges.push({
            id: generateId(),
            from: parentNode.id,
            to: newNode.id,
            fromHandle: "right",
            toHandle: "left",
            style: "solid",
            arrow: "to",
            color: darkMode ? "#a3a3a3" : "#94a3b8"
          });
          if (idea.children && idea.children.length > 0) {
            createNodesRecursively(newNode, idea.children, level + 1, maxLevel);
          }
        });
      };
      createNodesRecursively(node, brainstormResult.ideas, 0, 3);
      setNodes((prev) => [...prev, ...newNodes]);
      setEdges((prev) => [...prev, ...newEdges]);
      if (onShowMessage)
        onShowMessage(`\u5DF2\u751F\u6210\u591A\u7EA7\u521B\u610F\u60F3\u6CD5`);
    } catch (error) {
      console.error("Brainstorm failed:", error);
      if (onShowMessage)
        onShowMessage(`\u5934\u8111\u98CE\u66B4\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
    }
    closeContextMenu();
  };
  const handleGenerateMindMap = async () => {
    try {
      let centerNode;
      const childNodeIds = new Set(edges.map((edge) => edge.to));
      const existingCenterNodes = nodes.filter((node) => !childNodeIds.has(node.id));
      if (existingCenterNodes.length > 0) {
        centerNode = existingCenterNodes[0];
      } else if (nodes.length > 0) {
        centerNode = nodes[0];
      } else {
        centerNode = {
          id: generateId(),
          title: "\u4E2D\u5FC3\u4E3B\u9898",
          content: "\u601D\u7EF4\u5BFC\u56FE\u4E2D\u5FC3\u4E3B\u9898",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          color: "yellow",
          icon: "none"
        };
      }
      const brainstormResult = await brainstorm(centerNode, settings);
      saveHistory();
      const newNodes = [centerNode];
      const newEdges = [];
      const createNodesRecursively = (parentNode, ideas, level, maxLevel) => {
        if (level >= maxLevel)
          return;
        ideas.forEach((idea, index) => {
          const angle = index * 360 / ideas.length;
          const distance = 200 + level * 100;
          const x = parentNode.x + Math.cos(angle * Math.PI / 180) * distance;
          const y = parentNode.y + Math.sin(angle * Math.PI / 180) * distance;
          const newNode = {
            id: generateId(),
            title: idea.title,
            content: "",
            x: x - 80,
            y: y - 40,
            width: 160,
            height: 80,
            color: level === 0 ? "blue" : level === 1 ? "green" : "purple",
            icon: "none"
          };
          newNodes.push(newNode);
          newEdges.push({
            id: generateId(),
            from: parentNode.id,
            to: newNode.id,
            fromHandle: "right",
            toHandle: "left",
            style: "solid",
            arrow: "to",
            color: darkMode ? "#a3a3a3" : "#94a3b8"
          });
          if (idea.children && idea.children.length > 0) {
            createNodesRecursively(newNode, idea.children, level + 1, maxLevel);
          }
        });
      };
      createNodesRecursively(centerNode, brainstormResult.ideas, 0, 3);
      setNodes(newNodes);
      setEdges(newEdges);
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
      if (onShowMessage)
        onShowMessage(`\u5DF2\u57FA\u4E8E\u4E2D\u5FC3\u4E3B\u9898\u751F\u6210\u601D\u7EF4\u5BFC\u56FE`);
    } catch (error) {
      console.error("Generate mind map failed:", error);
      if (onShowMessage)
        onShowMessage(`\u751F\u6210\u601D\u7EF4\u5BFC\u56FE\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
    }
    closeContextMenu();
  };
  const handleSmartColorScheme = () => {
    try {
      saveHistory();
      const colorPalette = ["yellow", "blue", "green", "purple", "red", "gray"];
      const nodeLevels = /* @__PURE__ */ new Map();
      const parentChildMap = /* @__PURE__ */ new Map();
      const nodePositions = /* @__PURE__ */ new Map();
      edges.forEach((edge) => {
        if (!parentChildMap.has(edge.from)) {
          parentChildMap.set(edge.from, []);
        }
        parentChildMap.get(edge.from).push(edge.to);
      });
      const nodeIds = new Set(nodes.map((node) => node.id));
      const childNodeIds = new Set(edges.map((edge) => edge.to));
      const rootNodes = nodes.filter((node) => !childNodeIds.has(node.id));
      const finalRootNodes = rootNodes.length > 0 ? rootNodes : nodes;
      const calculateLevelAndPosition = (nodeId, level = 0, position = 0) => {
        nodeLevels.set(nodeId, level);
        nodePositions.set(nodeId, position);
        const children = parentChildMap.get(nodeId) || [];
        children.forEach((childId, index) => {
          calculateLevelAndPosition(childId, level + 1, index);
        });
      };
      finalRootNodes.forEach((root2, index) => {
        calculateLevelAndPosition(root2.id, 0, index);
      });
      const updatedNodes = nodes.map((node, nodeIndex) => {
        const level = nodeLevels.get(node.id) || 0;
        const position = nodePositions.get(node.id) || 0;
        const colorIndex = (level * 5 + position * 3 + nodeIndex) % colorPalette.length;
        const color = colorPalette[colorIndex];
        return {
          ...node,
          color
        };
      });
      setNodes(updatedNodes);
      const updatedEdges = edges.map((edge) => {
        const sourceNode = updatedNodes.find((n) => n.id === edge.from);
        if (sourceNode) {
          return {
            ...edge,
            color: NODE_STYLES[sourceNode.color].picker
          };
        }
        return edge;
      });
      setEdges(updatedEdges);
      if (onShowMessage)
        onShowMessage(`\u5DF2\u5E94\u7528\u667A\u80FD\u914D\u8272`);
    } catch (error) {
      console.error("Smart color scheme failed:", error);
      if (onShowMessage)
        onShowMessage(`\u5E94\u7528\u667A\u80FD\u914D\u8272\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
    }
    closeContextMenu();
  };
  const handleDeepenContent = async (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node)
      return;
    try {
      const deepenedContent = await deepenContent(node, settings);
      saveHistory();
      setNodes((prev) => prev.map(
        (n) => n.id === nodeId ? { ...n, content: deepenedContent } : n
      ));
      if (onShowMessage)
        onShowMessage("\u5185\u5BB9\u5DF2\u6DF1\u5316");
    } catch (error) {
      console.error("Deepen content failed:", error);
      if (onShowMessage)
        onShowMessage(`\u5185\u5BB9\u6DF1\u5316\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
    }
    closeContextMenu();
  };
  const handleExportImage = useCallback(async (options) => {
    if (canvasContainerRef.current === null || canvasContentRef.current === null) {
      return;
    }
    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((node) => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      let contentWidth, contentHeight, centerX, centerY;
      if (nodes.length === 0) {
        contentWidth = 800;
        contentHeight = 600;
        centerX = 400;
        centerY = 300;
      } else {
        contentWidth = maxX - minX + 100;
        contentHeight = maxY - minY + 100;
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
      }
      const exportWidth = Math.max(contentWidth, 800);
      const exportHeight = Math.max(contentHeight, 600);
      const exportContainer = document.createElement("div");
      exportContainer.style.position = "absolute";
      exportContainer.style.top = "0";
      exportContainer.style.left = "0";
      exportContainer.style.width = `${exportWidth}px`;
      exportContainer.style.height = `${exportHeight}px`;
      exportContainer.style.overflow = "hidden";
      exportContainer.style.zIndex = "1000";
      exportContainer.style.pointerEvents = "none";
      exportContainer.className = `mindo-canvas-container ${currentBackground !== "none" ? `mindo-bg-pattern-${currentBackground}` : ""}`;
      const actualBackgroundColor = getComputedStyle(canvasContainerRef.current).backgroundColor;
      exportContainer.style.backgroundColor = actualBackgroundColor;
      const contentClone = canvasContentRef.current.cloneNode(true);
      contentClone.style.transform = `translate(${exportWidth / 2 - centerX}px, ${exportHeight / 2 - centerY}px) scale(1)`;
      contentClone.style.position = "absolute";
      contentClone.style.top = "0";
      contentClone.style.left = "0";
      contentClone.style.width = "100%";
      contentClone.style.height = "100%";
      contentClone.style.pointerEvents = "auto";
      contentClone.style.opacity = "1";
      contentClone.style.zIndex = "1";
      const svgElements = contentClone.querySelectorAll("svg");
      svgElements.forEach((svg) => {
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.overflow = "visible";
        svg.style.zIndex = "1";
      });
      const nodeContainers = contentClone.querySelectorAll('div[style*="position: absolute"]');
      nodeContainers.forEach((container) => {
        container.style.zIndex = "2";
      });
      exportContainer.appendChild(contentClone);
      canvasContainerRef.current.appendChild(exportContainer);
      await new Promise((resolve) => setTimeout(resolve, 300));
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
        quality: 1
      });
      canvasContainerRef.current.removeChild(exportContainer);
      const link = document.createElement("a");
      const timestamp = Date.now();
      link.download = `${fileName || "\u601D\u7EF4\u5BFC\u56FE"}_${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  }, [fileName, nodes, currentBackground]);
  const handleCopyImage = useCallback(async (options) => {
    if (nodes.length === 0 || canvasContainerRef.current === null) {
      if (onShowMessage)
        onShowMessage("\u590D\u5236\u56FE\u7247\u5931\u8D25");
      return;
    }
    try {
      const actualBackgroundColor = getComputedStyle(canvasContainerRef.current).backgroundColor;
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "0";
      tempContainer.style.left = "0";
      tempContainer.style.width = "2000px";
      tempContainer.style.height = "1500px";
      tempContainer.style.pointerEvents = "none";
      tempContainer.style.zIndex = "1000";
      tempContainer.className = `mindo-canvas-container ${currentBackground !== "none" ? `mindo-bg-pattern-${currentBackground}` : ""}`;
      tempContainer.style.backgroundColor = actualBackgroundColor;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((node) => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      const centerX = 1e3 - (maxX + minX) / 2;
      const centerY = 750 - (maxY + minY) / 2;
      const svg = document.createElement("svg");
      svg.style.position = "absolute";
      svg.style.top = "0";
      svg.style.left = "0";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.overflow = "visible";
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.from);
        const target = nodes.find((n) => n.id === edge.to);
        if (source && target) {
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const startX = source.x + source.width / 2 + centerX;
          const startY = source.y + source.height / 2 + centerY;
          const endX = target.x + target.width / 2 + centerX;
          const endY = target.y + target.height / 2 + centerY;
          const controlX1 = startX + (endX - startX) / 3;
          const controlY1 = startY;
          const controlX2 = endX - (endX - startX) / 3;
          const controlY2 = endY;
          path.setAttribute("d", `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`);
          path.setAttribute("stroke", edge.color || "#94a3b8");
          path.setAttribute("stroke-width", "2");
          path.setAttribute("fill", "none");
          if (edge.arrow === "to") {
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const arrowSize = 8;
            const angle = Math.atan2(endY - startY, endX - startX);
            const arrowX = endX - arrowSize * Math.cos(angle);
            const arrowY = endY - arrowSize * Math.sin(angle);
            const arrowX1 = arrowX - arrowSize * Math.cos(angle - Math.PI / 6);
            const arrowY1 = arrowY - arrowSize * Math.sin(angle - Math.PI / 6);
            const arrowX2 = arrowX - arrowSize * Math.cos(angle + Math.PI / 6);
            const arrowY2 = arrowY - arrowSize * Math.sin(angle + Math.PI / 6);
            arrow.setAttribute("d", `M ${endX} ${endY} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`);
            arrow.setAttribute("fill", edge.color || "#94a3b8");
            svg.appendChild(arrow);
          }
          svg.appendChild(path);
        }
      });
      tempContainer.appendChild(svg);
      nodes.forEach((node) => {
        const nodeEl = document.createElement("div");
        nodeEl.style.position = "absolute";
        nodeEl.style.left = node.x + centerX + "px";
        nodeEl.style.top = node.y + centerY + "px";
        nodeEl.style.width = node.width + "px";
        nodeEl.style.height = node.height + "px";
        nodeEl.style.backgroundColor = node.color === "yellow" ? "#fef3c7" : node.color === "blue" ? "#dbeafe" : node.color === "green" ? "#d1fae5" : node.color === "purple" ? "#f3e8ff" : node.color === "red" ? "#fee2e2" : "#f3f4f6";
        nodeEl.style.borderRadius = node.shape === "circle" ? "50%" : "8px";
        nodeEl.style.display = "flex";
        nodeEl.style.flexDirection = "column";
        nodeEl.style.justifyContent = "center";
        nodeEl.style.alignItems = "center";
        nodeEl.style.padding = "10px";
        nodeEl.style.boxSizing = "border-box";
        nodeEl.style.fontFamily = "sans-serif";
        nodeEl.style.color = darkMode ? "#ffffff" : "#000000";
        nodeEl.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        const titleEl = document.createElement("div");
        titleEl.style.fontSize = "14px";
        titleEl.style.fontWeight = "bold";
        titleEl.style.marginBottom = "5px";
        titleEl.style.textAlign = "center";
        titleEl.textContent = node.title;
        nodeEl.appendChild(titleEl);
        if (node.content) {
          const contentEl = document.createElement("div");
          contentEl.style.fontSize = "12px";
          contentEl.style.textAlign = "center";
          contentEl.textContent = node.content;
          nodeEl.appendChild(contentEl);
        }
        tempContainer.appendChild(nodeEl);
      });
      document.body.appendChild(tempContainer);
      const dataUrl = await htmlToImage.toPng(tempContainer, {
        backgroundColor: actualBackgroundColor,
        pixelRatio: options.resolution,
        padding: options.margin,
        width: 2e3,
        height: 1500
      });
      document.body.removeChild(tempContainer);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob
        })
      ]);
      if (onShowMessage)
        onShowMessage("\u56FE\u7247\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
    } catch (err) {
      console.error("Copy image failed", err);
      if (onShowMessage)
        onShowMessage("\u590D\u5236\u56FE\u7247\u5931\u8D25");
    }
  }, [onShowMessage, nodes, edges, darkMode, currentBackground, canvasContainerRef]);
  const handleOpenImageOperationModal = useCallback(() => {
    if (app) {
      try {
        if (!imageOperationModalRef.current) {
          imageOperationModalRef.current = new ImageOperationModal({
            app,
            onClose: () => {
            },
            onExportImage: handleExportImage,
            onCopyImage: handleCopyImage
          });
        }
        imageOperationModalRef.current.open();
      } catch (error) {
        console.error("Failed to open image operation modal:", error);
        if (false) {
          handleExportImage({ resolution: 1, margin: 20, theme: "light" });
        }
      }
    } else {
      console.error("App object is not available");
      handleExportImage({ resolution: 1, margin: 20, theme: "light" });
    }
  }, [app, handleExportImage, handleCopyImage]);
  const calculateNodeDepth = (nodeId) => {
    let depth = 0;
    let currentId = nodeId;
    while (true) {
      const parentEdge = edges.find((edge) => edge.to === currentId);
      if (!parentEdge)
        break;
      currentId = parentEdge.from;
      depth++;
    }
    return depth;
  };
  const getNextNodeTitleIndex = (baseTitle, nodes2) => {
    let maxIndex = 0;
    const regex = new RegExp(`^${baseTitle}(\\d+)$`);
    nodes2.forEach((node) => {
      const match = node.title.match(regex);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index > maxIndex) {
          maxIndex = index;
        }
      } else if (node.title === baseTitle) {
        maxIndex = Math.max(maxIndex, 0);
      }
    });
    return maxIndex + 1;
  };
  const generateNodeTitle = (baseTitle, nodes2) => {
    const index = getNextNodeTitleIndex(baseTitle, nodes2);
    return `${baseTitle}${index}`;
  };
  const handleDoubleClickCanvas = (e) => {
    saveHistory();
    const rect = mindmapContainerRef.current?.getBoundingClientRect();
    if (!rect)
      return;
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mousePos, transform);
    const baseTitle = "\u65B0\u8282\u70B9";
    const title = generateNodeTitle(baseTitle, nodes);
    const newNode = {
      id: generateId(),
      // 使用随机ID，确保唯一性
      title,
      content: "",
      x: worldPos.x - 50,
      y: worldPos.y - 40,
      width: 100,
      height: 80,
      color: "blue",
      type: "node"
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds(/* @__PURE__ */ new Set([newNode.id]));
    setSelectedEdgeId(null);
  };
  const processImageFile = async (file, x, y, index) => {
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
          const newNode = {
            id: generateId(),
            type: "image",
            title: file.name,
            content: "",
            imageUrl,
            assetPath,
            x: x + index * 20,
            y: y + index * 20,
            width,
            height,
            color: "gray"
          };
          setNodes((prev) => [...prev, newNode]);
        };
        img.src = imageUrl;
      } catch (e) {
        console.error("Failed to save image asset", e);
        if (onShowMessage)
          onShowMessage("\u56FE\u7247\u4FDD\u5B58\u5931\u8D25");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (result) {
          const img = new Image();
          img.onload = () => {
            const MAX_WIDTH = 300;
            const ratio = img.width / img.height;
            const width = Math.min(img.width, MAX_WIDTH);
            const HEADER_HEIGHT = 44;
            const imageHeight = width / ratio;
            const height = imageHeight + HEADER_HEIGHT;
            const newNode = {
              id: generateId(),
              type: "image",
              title: file.name,
              content: "",
              imageUrl: result,
              x: x + index * 20,
              y: y + index * 20,
              width,
              height,
              color: "gray"
            };
            setNodes((prev) => [...prev, newNode]);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };
  useEffect4(() => {
    const handlePaste2 = async (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true")) {
        return;
      }
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length > 0) {
          e.preventDefault();
          saveHistory();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect)
            return;
          const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
          const worldPos = screenToWorld(centerScreen, transformRef.current);
          imageFiles.forEach((file, index) => {
            processImageFile(file, worldPos.x, worldPos.y, index);
          });
          return;
        }
      }
      if (e.clipboardData && e.clipboardData.items) {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter((item) => item.type === "image/png");
        if (imageItems.length > 0) {
          e.preventDefault();
          saveHistory();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect)
            return;
          const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
          const worldPos = screenToWorld(centerScreen, transformRef.current);
          imageItems.forEach((item, index) => {
            const blob = item.getAsFile();
            if (blob) {
              const file = new File([blob], `screenshot_${Date.now()}.png`, { type: "image/png" });
              processImageFile(file, worldPos.x, worldPos.y, index);
            }
          });
          return;
        }
      }
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text.trim() === "") {
          return;
        }
        const data = JSON.parse(text);
        if (data.nodes && Array.isArray(data.nodes)) {
          e.preventDefault();
          saveHistory();
          const idMap = /* @__PURE__ */ new Map();
          const newNodes = data.nodes.map((node) => {
            const newId = generateId();
            idMap.set(node.id, newId);
            return {
              ...node,
              id: newId,
              x: node.x + 20,
              // 偏移 20px
              y: node.y + 20
            };
          });
          const newEdges = (data.edges || []).map((edge) => {
            return {
              ...edge,
              id: generateId(),
              from: idMap.get(edge.from) || edge.from,
              to: idMap.get(edge.to) || edge.to
            };
          });
          setNodes((prev) => [...prev, ...newNodes]);
          setEdges((prev) => [...prev, ...newEdges]);
          setSelectedNodeIds(new Set(newNodes.map((node) => node.id)));
          setSelectedEdgeId(null);
          onShowMessage && onShowMessage("\u7C98\u8D34\u6210\u529F");
        }
      } catch (err) {
        console.log("\u526A\u8D34\u677F\u4E2D\u4E0D\u662F\u6709\u6548\u7684\u8282\u70B9\u6570\u636E:", err);
      }
    };
    window.addEventListener("paste", handlePaste2);
    return () => window.removeEventListener("paste", handlePaste2);
  }, [saveHistory, onSaveAsset, onResolveResource, onShowMessage]);
  const handleCreateGroup = () => {
    if (selectedNodeIds.size === 0)
      return;
    saveHistory();
    const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
    if (selectedNodes.length === 0)
      return;
    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    selectedNodes.forEach((n) => {
      gMinX = Math.min(gMinX, n.x);
      gMinY = Math.min(gMinY, n.y);
      gMaxX = Math.max(gMaxX, n.x + n.width);
      gMaxY = Math.max(gMaxY, n.y + n.height);
    });
    const newGroupId = generateId();
    const PADDING = 40;
    const TITLE_OFFSET = 40;
    const groupNode = {
      id: newGroupId,
      type: "group",
      title: "\u65B0\u5206\u7EC4",
      content: "",
      x: gMinX - PADDING,
      y: gMinY - PADDING - TITLE_OFFSET,
      width: gMaxX - gMinX + PADDING * 2,
      height: gMaxY - gMinY + PADDING * 2 + TITLE_OFFSET,
      color: "gray"
    };
    const updatedNodes = nodes.map((n) => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, parentId: newGroupId };
      }
      return n;
    });
    setNodes([...updatedNodes, groupNode]);
    setSelectedNodeIds(/* @__PURE__ */ new Set([newGroupId]));
  };
  const handleAlign = (type, alignment) => {
    if (selectedNodeIds.size < 2)
      return;
    saveHistory();
    const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
    if (selectedNodes.length === 0)
      return;
    if (type === "horizontal") {
      let referenceValue;
      switch (alignment) {
        case "left":
          referenceValue = Math.min(...selectedNodes.map((n) => n.x));
          break;
        case "center":
          const totalX = selectedNodes.reduce((sum, n) => sum + (n.x + n.width / 2), 0);
          referenceValue = totalX / selectedNodes.length;
          break;
        case "right":
          referenceValue = Math.max(...selectedNodes.map((n) => n.x + n.width));
          break;
        default:
          return;
      }
      setNodes((prev) => prev.map((n) => {
        if (selectedNodeIds.has(n.id)) {
          switch (alignment) {
            case "left":
              return { ...n, x: referenceValue };
            case "center":
              return { ...n, x: referenceValue - n.width / 2 };
            case "right":
              return { ...n, x: referenceValue - n.width };
            default:
              return n;
          }
        }
        return n;
      }));
    } else {
      let referenceValue;
      switch (alignment) {
        case "top":
          referenceValue = Math.min(...selectedNodes.map((n) => n.y));
          break;
        case "middle":
          const totalY = selectedNodes.reduce((sum, n) => sum + (n.y + n.height / 2), 0);
          referenceValue = totalY / selectedNodes.length;
          break;
        case "bottom":
          referenceValue = Math.max(...selectedNodes.map((n) => n.y + n.height));
          break;
        default:
          return;
      }
      setNodes((prev) => prev.map((n) => {
        if (selectedNodeIds.has(n.id)) {
          switch (alignment) {
            case "top":
              return { ...n, y: referenceValue };
            case "middle":
              return { ...n, y: referenceValue - n.height / 2 };
            case "bottom":
              return { ...n, y: referenceValue - n.height };
            default:
              return n;
          }
        }
        return n;
      }));
    }
  };
  const handleNodeMouseDown = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find((n) => n.id === id);
    if (node) {
      setSelectedNodeForMenu(node);
    }
    setIsPanning(false);
    isPanningRef.current = false;
    if (e.shiftKey) {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id))
          next.delete(id);
        else
          next.add(id);
        return next;
      });
      setSelectedEdgeId(null);
    } else {
      if (!selectedNodeIds.has(id)) {
        setSelectedNodeIds(/* @__PURE__ */ new Set([id]));
      }
      setSelectedEdgeId(null);
    }
    setDraggingNodeId(id);
    draggingNodeIdRef.current = id;
    initialNodesRef.current = nodes;
    if (node) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      if (node.type === "group") {
        const children = nodes.filter((n) => n.parentId === id);
        setDraggedChildrenIds(children.map((c) => c.id));
      } else {
        setDraggedChildrenIds([]);
      }
    }
  };
  const handleEdgeSelect = (e, id) => {
    e.stopPropagation();
    setSelectedEdgeId(id);
    setSelectedNodeIds(/* @__PURE__ */ new Set());
    setSelectedNodeForMenu(null);
  };
  const handleConnectStart = (e, nodeId, handle) => {
    setConnectionStart({ nodeId, handle });
    const rect = mindmapContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPos = screenToWorld(mousePos, transform);
      setTempConnectionEnd(worldPos);
    }
  };
  const handleEdgeReconnectStart = (e, edgeId, which) => {
    e.stopPropagation();
    e.preventDefault();
    const edge = edges.find((ed) => ed.id === edgeId);
    if (!edge)
      return;
    setReconnectingEdge({ edgeId, which });
    const rect = mindmapContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPos = screenToWorld(mousePos, transform);
      setTempConnectionEnd(worldPos);
    }
  };
  const handleConnectEnd = (e, targetId, targetHandle) => {
    createConnection(targetId, targetHandle);
  };
  const createConnection = (targetId, targetHandle) => {
    if (connectionStart && connectionStart.nodeId !== targetId) {
      const exists = edges.some(
        (edge) => edge.from === connectionStart.nodeId && edge.to === targetId || edge.from === targetId && edge.to === connectionStart.nodeId
      );
      if (!exists) {
        saveHistory();
        const newEdge = {
          id: generateId(),
          from: connectionStart.nodeId,
          to: targetId,
          fromHandle: connectionStart.handle,
          toHandle: targetHandle,
          style: "solid",
          arrow: "to",
          color: darkMode ? "#a3a3a3" : "#94a3b8"
        };
        setEdges((prev) => [...prev, newEdge]);
      }
    }
    setConnectionStart(null);
    setTempConnectionEnd(null);
    setSnapPreview(null);
  };
  const handleGlobalMouseMove = useCallback((e) => {
    if (rafRef.current)
      return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafRef.current = requestAnimationFrame(() => {
      try {
        const isPanning2 = isPanningRef.current;
        const selectionBox2 = selectionBoxRef.current;
        const draggingNodeId2 = draggingNodeIdRef.current;
        const connectionStart2 = connectionStartRef.current;
        const reconnectingEdge2 = reconnectingEdgeRef.current;
        const currentTransform = transformRef.current;
        const currentNodes = nodesRef.current;
        if (isPanning2) {
          const dx = clientX - dragStartRef.current.x;
          const dy = clientY - dragStartRef.current.y;
          setTransform((prev) => ({
            ...prev,
            x: itemStartRef.current.x + dx,
            y: itemStartRef.current.y + dy
          }));
        } else if (selectionBox2) {
          const rect = mindmapContainerRef.current?.getBoundingClientRect();
          if (rect) {
            const endPos = { x: clientX - rect.left, y: clientY - rect.top };
            setSelectionBox((prev) => prev ? { ...prev, end: endPos } : null);
          }
        } else if (draggingNodeId2) {
          const dx = (clientX - dragStartRef.current.x) / currentTransform.scale;
          const dy = (clientY - dragStartRef.current.y) / currentTransform.scale;
          const isDraggingSelection = selectedNodeIdsRef.current.has(draggingNodeId2);
          const nodesToMove = isDraggingSelection ? Array.from(selectedNodeIdsRef.current) : [draggingNodeId2];
          setNodes((prev) => prev.map((n) => {
            if (nodesToMove.includes(n.id)) {
              const start = initialNodesRef.current.find((sn) => sn.id === n.id) || n;
              let newX = start.x + dx;
              let newY = start.y + dy;
              if (snapToGrid) {
                const GRID_SIZE = 20;
                newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
              }
              return { ...n, x: newX, y: newY };
            }
            const parentInSelection = n.parentId && nodesToMove.includes(n.parentId);
            if (parentInSelection) {
              const start = initialNodesRef.current.find((sn) => sn.id === n.id) || n;
              let newX = start.x + dx;
              let newY = start.y + dy;
              if (snapToGrid) {
                const GRID_SIZE = 20;
                newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
              }
              return { ...n, x: newX, y: newY };
            }
            return n;
          }));
        } else if (connectionStart2 && mindmapContainerRef.current) {
          const rect = mindmapContainerRef.current.getBoundingClientRect();
          const mousePos = { x: clientX - rect.left, y: clientY - rect.top };
          const worldPos = screenToWorld(mousePos, currentTransform);
          setTempConnectionEnd(worldPos);
          if (autoSelectNearestHandle) {
            const nearest = getNearestHandle(worldPos, currentNodes, connectionStart2.nodeId, 50);
            setSnapPreview(nearest);
          } else {
            setSnapPreview(null);
          }
        } else if (reconnectingEdge2 && mindmapContainerRef.current) {
          const rect = mindmapContainerRef.current.getBoundingClientRect();
          const mousePos = { x: clientX - rect.left, y: clientY - rect.top };
          const worldPos = screenToWorld(mousePos, currentTransform);
          setTempConnectionEnd(worldPos);
          if (autoSelectNearestHandle) {
            const edge = edgesRef.current.find((ed) => ed.id === reconnectingEdge2.edgeId);
            const excludeNodeId = edge ? reconnectingEdge2.which === "from" ? edge.to : edge.from : "";
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
    if (pendingCenterRef.current) {
      performCenter();
    }
    const selectionBox2 = selectionBoxRef.current;
    if (selectionBox2) {
      const x1 = Math.min(selectionBox2.start.x, selectionBox2.end.x);
      const y1 = Math.min(selectionBox2.start.y, selectionBox2.end.y);
      const x2 = Math.max(selectionBox2.start.x, selectionBox2.end.x);
      const y2 = Math.max(selectionBox2.start.y, selectionBox2.end.y);
      const currentTransform = transformRef.current;
      const currentNodes = nodesRef.current;
      const p1 = screenToWorld({ x: x1, y: y1 }, currentTransform);
      const p2 = screenToWorld({ x: x2, y: y2 }, currentTransform);
      const minWX = Math.min(p1.x, p2.x);
      const minWY = Math.min(p1.y, p2.y);
      const maxWX = Math.max(p1.x, p2.x);
      const maxWY = Math.max(p1.y, p2.y);
      const selected = /* @__PURE__ */ new Set();
      currentNodes.forEach((n) => {
        if (n.x >= minWX && n.x + n.width <= maxWX && n.y >= minWY && n.y + n.height <= maxWY) {
          selected.add(n.id);
        }
      });
      if (selected.size > 0)
        setSelectedNodeIds(selected);
      setSelectionBox(null);
    }
    const connectionStart2 = connectionStartRef.current;
    const reconnectingEdge2 = reconnectingEdgeRef.current;
    const snap = snapPreviewRef.current;
    const draggingId = draggingNodeIdRef.current;
    if (autoSelectNearestHandle && connectionStart2 && snap) {
      const exists = edgesRef.current.some(
        (edge) => edge.from === connectionStart2.nodeId && edge.to === snap.nodeId || edge.from === snap.nodeId && edge.to === connectionStart2.nodeId
      );
      if (!exists) {
        const newEdge = {
          id: generateId(),
          from: connectionStart2.nodeId,
          to: snap.nodeId,
          fromHandle: connectionStart2.handle,
          toHandle: snap.handle,
          style: "solid",
          arrow: "to",
          color: darkMode ? "#a3a3a3" : "#94a3b8"
        };
        setEdges((prev) => [...prev, newEdge]);
      }
    }
    if (autoSelectNearestHandle && reconnectingEdge2 && snap) {
      setEdges((prev) => prev.map((e) => {
        if (e.id === reconnectingEdge2.edgeId) {
          if (reconnectingEdge2.which === "from")
            return { ...e, from: snap.nodeId, fromHandle: snap.handle };
          else
            return { ...e, to: snap.nodeId, toHandle: snap.handle };
        }
        return e;
      }));
    }
    if (draggingId) {
      const isDraggingSelection = selectedNodeIdsRef.current.has(draggingId);
      const draggedNodeIds = isDraggingSelection ? Array.from(selectedNodeIdsRef.current) : [draggingId];
      setLastDraggedNodeIds(draggedNodeIds);
      setNodes((prev) => {
        const isDraggingSelection2 = selectedNodeIdsRef.current.has(draggingId);
        const nodesToCheck = isDraggingSelection2 ? Array.from(selectedNodeIdsRef.current) : [draggingId];
        let current = prev;
        if (nodesToCheck.length === 1)
          current = updateParentIds(current, nodesToCheck[0]);
        return recalculateGroupBounds(current);
      });
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
  useEffect4(() => {
    mouseMoveHandlerRef.current = handleGlobalMouseMove;
    mouseUpHandlerRef.current = handleMouseUp;
  }, [handleGlobalMouseMove, handleMouseUp]);
  useEffect4(() => {
    if (lastDraggedNodeIds.length > 0 && autoSelectNearestHandle) {
      setEdges((prevEdges) => {
        return prevEdges.map((edge) => {
          if (lastDraggedNodeIds.includes(edge.from) || lastDraggedNodeIds.includes(edge.to)) {
            const sourceNode = nodesRef.current.find((n) => n.id === edge.from);
            const targetNode = nodesRef.current.find((n) => n.id === edge.to);
            if (sourceNode && targetNode) {
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
      setLastDraggedNodeIds([]);
    }
  }, [lastDraggedNodeIds, autoSelectNearestHandle]);
  useEffect4(() => {
    const onMove = (e) => mouseMoveHandlerRef.current(e);
    const onUp = (e) => mouseUpHandlerRef.current();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);
  const updateParentIds = (currentNodes, specificNodeId) => {
    return currentNodes.map((node) => {
      if (node.type === "group")
        return node;
      if (specificNodeId && node.id !== specificNodeId)
        return node;
      const center = getCenter(node);
      const targetGroup = currentNodes.find(
        (g) => g.type === "group" && g.id !== node.id && center.x >= g.x && center.x <= g.x + g.width && center.y >= g.y && center.y <= g.y + g.height
      );
      if (targetGroup)
        return { ...node, parentId: targetGroup.id };
      else
        return { ...node, parentId: void 0 };
    });
  };
  const recalculateGroupBounds = (currentNodes) => {
    return currentNodes.map((node) => {
      if (node.type === "group") {
        const children = currentNodes.filter((n) => n.parentId === node.id);
        if (children.length === 0)
          return node;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        children.forEach((child) => {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
        });
        const PADDING = 30;
        const TITLE_OFFSET = 40;
        const newX = minX - PADDING;
        const newY = minY - PADDING - TITLE_OFFSET;
        const newWidth = maxX - minX + PADDING * 2;
        const newHeight = maxY - minY + PADDING * 2 + TITLE_OFFSET;
        if (Math.abs(newX - node.x) < 1 && Math.abs(newWidth - node.width) < 1 && Math.abs(newHeight - node.height) < 1)
          return node;
        return { ...node, x: newX, y: newY, width: newWidth, height: newHeight };
      }
      return node;
    });
  };
  const updateNodeData = async (id, title, content) => {
    saveHistory();
    const node = nodes.find((n) => n.id === id);
    if (node && node.type === "image" && node.assetPath && node.title !== title && onRenameAsset) {
      try {
        const newPath = await onRenameAsset(node.assetPath, title);
        setNodes((prev) => prev.map((n) => n.id === id ? { ...n, title, content, assetPath: newPath } : n));
      } catch (e) {
        console.error("Rename failed", e);
        if (onShowMessage)
          onShowMessage("\u91CD\u547D\u540D\u5931\u8D25\uFF0C\u6587\u4EF6\u540D\u53EF\u80FD\u5DF2\u5B58\u5728");
      }
    } else {
      setNodes((prev) => prev.map((n) => n.id === id ? { ...n, title, content } : n));
    }
  };
  const updateNodeResize = (id, width, height) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, width, height } : n));
  };
  const updateNodeColor = (id, color) => {
    saveHistory();
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, color } : n));
  };
  const updateNodeShape = (id, shape) => {
    saveHistory();
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, shape } : n));
  };
  const updateEdge = (id, updates) => {
    setEdges((prev) => prev.map((e) => e.id === id ? { ...e, ...updates } : e));
  };
  const deleteNode = (id) => {
    saveHistory();
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((edge) => edge.from !== id && edge.to !== id));
    if (selectedNodeIds.has(id)) {
      const next = new Set(selectedNodeIds);
      next.delete(id);
      setSelectedNodeIds(next);
    }
    if (selectedNodeForMenu && selectedNodeForMenu.id === id) {
      setSelectedNodeForMenu(null);
    }
  };
  const deleteSelected = () => {
    saveHistory();
    if (selectedNodeIds.size > 0) {
      setNodes((prev) => prev.filter((n) => !selectedNodeIds.has(n.id)));
      setEdges((prev) => prev.filter((e) => !selectedNodeIds.has(e.from) && !selectedNodeIds.has(e.to)));
      if (selectedNodeForMenu && selectedNodeIds.has(selectedNodeForMenu.id)) {
        setSelectedNodeForMenu(null);
      }
      setSelectedNodeIds(/* @__PURE__ */ new Set());
    }
    if (selectedEdgeId) {
      setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };
  const handleCopy = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      const nodesToCopy = nodes.filter((node) => selectedNodeIds.has(node.id));
      const edgesToCopy = edges.filter(
        (edge) => nodesToCopy.some((node) => node.id === edge.from || node.id === edge.to)
      );
      const data = {
        nodes: nodesToCopy,
        edges: edgesToCopy,
        timestamp: Date.now()
      };
      const jsonStr = JSON.stringify(data);
      navigator.clipboard.writeText(jsonStr).then(() => {
        onShowMessage && onShowMessage("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
      }).catch((err) => {
        console.error("\u590D\u5236\u5931\u8D25:", err);
        onShowMessage && onShowMessage("\u590D\u5236\u5931\u8D25");
      });
    }
  }, [selectedNodeIds, nodes, edges, onShowMessage]);
  const handlePaste = useCallback(() => {
    navigator.clipboard.readText().then((text) => {
      if (!text || text.trim() === "") {
        onShowMessage && onShowMessage("\u526A\u8D34\u677F\u4E3A\u7A7A");
        return;
      }
      try {
        const data = JSON.parse(text);
        if (data.nodes && Array.isArray(data.nodes)) {
          saveHistory();
          const idMap = /* @__PURE__ */ new Map();
          const newNodes = data.nodes.map((node) => {
            const newId = generateId();
            idMap.set(node.id, newId);
            return {
              ...node,
              id: newId,
              x: node.x + 20,
              // 偏移 20px
              y: node.y + 20
            };
          });
          const newEdges = (data.edges || []).map((edge) => {
            return {
              ...edge,
              id: generateId(),
              from: idMap.get(edge.from) || edge.from,
              to: idMap.get(edge.to) || edge.to
            };
          });
          setNodes((prev) => [...prev, ...newNodes]);
          setEdges((prev) => [...prev, ...newEdges]);
          setSelectedNodeIds(new Set(newNodes.map((node) => node.id)));
          setSelectedEdgeId(null);
          onShowMessage && onShowMessage("\u7C98\u8D34\u6210\u529F");
        } else {
          onShowMessage && onShowMessage("\u526A\u8D34\u677F\u4E2D\u4E0D\u662F\u6709\u6548\u7684\u8282\u70B9\u6570\u636E");
        }
      } catch (err) {
        console.error("\u7C98\u8D34\u5931\u8D25:", err);
        onShowMessage && onShowMessage("\u526A\u8D34\u677F\u4E2D\u4E0D\u662F\u6709\u6548\u7684\u8282\u70B9\u6570\u636E");
      }
    }).catch((err) => {
      console.error("\u8BFB\u53D6\u526A\u8D34\u677F\u5931\u8D25:", err);
      onShowMessage && onShowMessage("\u8BFB\u53D6\u526A\u8D34\u677F\u5931\u8D25");
    });
  }, [saveHistory, onShowMessage]);
  useEffect4(() => {
    const handleKeyDown = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true")) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        handleCopy();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (selectedNodeIds.size === 1) {
          const selectedNodeId = Array.from(selectedNodeIds)[0];
          const selectedNode = nodes.find((n) => n.id === selectedNodeId);
          if (selectedNode) {
            saveHistory();
            const parentDepth = calculateNodeDepth(selectedNode.id);
            const childDepth = parentDepth + 1;
            const baseTitle = "\u65B0\u5B50\u8282\u70B9";
            const title = generateNodeTitle(baseTitle, nodes);
            const newNode = {
              id: generateId(),
              // 使用随机ID，确保唯一性
              title,
              content: "",
              x: selectedNode.x,
              y: selectedNode.y + selectedNode.height + 40,
              width: 100,
              height: 80,
              color: "green",
              type: "node"
            };
            setNodes((prev) => [...prev, newNode]);
            setSelectedNodeIds(/* @__PURE__ */ new Set([newNode.id]));
            setSelectedEdgeId(null);
            const newEdge = {
              id: generateId(),
              from: selectedNode.id,
              to: newNode.id,
              fromHandle: "bottom",
              toHandle: "top",
              style: "solid",
              arrow: "to",
              color: darkMode ? "#a3a3a3" : "#94a3b8"
            };
            setEdges((prev) => [...prev, newEdge]);
          }
        }
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedNodeIds.size === 1) {
          const selectedNodeId = Array.from(selectedNodeIds)[0];
          const selectedNode = nodes.find((n) => n.id === selectedNodeId);
          if (selectedNode) {
            saveHistory();
            const siblingDepth = calculateNodeDepth(selectedNode.id);
            const baseTitle = "\u65B0\u540C\u7EA7\u8282\u70B9";
            const title = generateNodeTitle(baseTitle, nodes);
            const newNode = {
              id: generateId(),
              // 使用随机ID，确保唯一性
              title,
              content: "",
              x: selectedNode.x + selectedNode.width + 40,
              y: selectedNode.y,
              width: 100,
              height: 80,
              color: "blue",
              type: "node"
            };
            setNodes((prev) => [...prev, newNode]);
            setSelectedNodeIds(/* @__PURE__ */ new Set([newNode.id]));
            setSelectedEdgeId(null);
            const parentEdge = edges.find((edge) => edge.to === selectedNode.id);
            if (parentEdge) {
              const newEdge = {
                id: generateId(),
                from: parentEdge.from,
                to: newNode.id,
                fromHandle: "right",
                toHandle: "left",
                style: "solid",
                arrow: "to",
                color: darkMode ? "#a3a3a3" : "#94a3b8"
              };
              setEdges((prev) => [...prev, newEdge]);
            } else if (selectedNode.id === nodes[0]?.id) {
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, undo, redo, handleCopy, handlePaste, nodes, edges, selectedNodeIds, saveHistory, generateId, generateStableId]);
  const mergeMarkdownWithExistingGraph = useCallback((originalNodes, originalEdges, parsedNodes, parsedEdges) => {
    const calculateDepth = (nodeId, edges2) => {
      let depth = 0;
      let currentId = nodeId;
      while (true) {
        const parentEdge = edges2.find((edge) => edge.to === currentId);
        if (!parentEdge)
          break;
        currentId = parentEdge.from;
        depth++;
      }
      return depth;
    };
    const originalNodesById = /* @__PURE__ */ new Map();
    const originalNodesByTitleAndDepth = /* @__PURE__ */ new Map();
    const originalGroupNodes = /* @__PURE__ */ new Map();
    originalNodes.forEach((node) => {
      originalNodesById.set(node.id, node);
      if (node.type === "group") {
        const key = `group:${node.title}`;
        if (!originalGroupNodes.has(key)) {
          originalGroupNodes.set(key, []);
        }
        originalGroupNodes.get(key).push(node);
      } else if (node.type === "image" && node.assetPath) {
        const key = `image:${node.assetPath}`;
        if (!originalNodesByTitleAndDepth.has(key)) {
          originalNodesByTitleAndDepth.set(key, []);
        }
        originalNodesByTitleAndDepth.get(key).push(node);
      } else {
        const depth = calculateDepth(node.id, originalEdges);
        const key = `node:${node.title}:${depth}`;
        if (!originalNodesByTitleAndDepth.has(key)) {
          originalNodesByTitleAndDepth.set(key, []);
        }
        originalNodesByTitleAndDepth.get(key).push(node);
      }
    });
    const originalEdgesByPair = /* @__PURE__ */ new Map();
    originalEdges.forEach((edge) => {
      originalEdgesByPair.set(`${edge.from}=>${edge.to}`, edge);
    });
    const idMap = /* @__PURE__ */ new Map();
    const matchedOriginalNodeIds = /* @__PURE__ */ new Set();
    const processedNewNodeIds = /* @__PURE__ */ new Set();
    const mergedNodes = parsedNodes.map((newNode) => {
      if (processedNewNodeIds.has(newNode.id)) {
        return newNode;
      }
      processedNewNodeIds.add(newNode.id);
      let originalNode;
      originalNode = originalNodesById.get(newNode.id);
      if (originalNode && !matchedOriginalNodeIds.has(originalNode.id)) {
        idMap.set(newNode.id, originalNode.id);
        matchedOriginalNodeIds.add(originalNode.id);
        return {
          ...newNode,
          id: originalNode.id,
          // 保留原有 ID
          x: originalNode.x,
          y: originalNode.y,
          width: originalNode.width,
          height: originalNode.height,
          color: originalNode.color,
          icon: originalNode.icon,
          iconPosition: originalNode.iconPosition,
          type: originalNode.type,
          // 保留原有类型
          // 对于图片节点，保留原有的 imageUrl
          imageUrl: originalNode.imageUrl || newNode.imageUrl,
          // 对于组节点，保留原有属性
          parentId: originalNode.parentId
        };
      }
      if (newNode.type === "group") {
        const key = `group:${newNode.title}`;
        const groupNodes2 = originalGroupNodes.get(key) || [];
        originalNode = groupNodes2.find((node) => !matchedOriginalNodeIds.has(node.id));
      } else if (newNode.type === "image" && newNode.assetPath) {
        const key = `image:${newNode.assetPath}`;
        const imageNodes = originalNodesByTitleAndDepth.get(key) || [];
        originalNode = imageNodes.find((node) => !matchedOriginalNodeIds.has(node.id));
      } else {
        const depth = calculateDepth(newNode.id, parsedEdges);
        const key = `node:${newNode.title}:${depth}`;
        const nodes2 = originalNodesByTitleAndDepth.get(key) || [];
        originalNode = nodes2.find((node) => !matchedOriginalNodeIds.has(node.id));
      }
      if (originalNode) {
        idMap.set(newNode.id, originalNode.id);
        matchedOriginalNodeIds.add(originalNode.id);
        return {
          ...newNode,
          id: originalNode.id,
          // 保留原有 ID
          x: originalNode.x,
          y: originalNode.y,
          width: originalNode.width,
          height: originalNode.height,
          color: originalNode.color,
          icon: originalNode.icon,
          iconPosition: originalNode.iconPosition,
          type: originalNode.type,
          // 保留原有类型
          // 对于图片节点，保留原有的 imageUrl
          imageUrl: originalNode.imageUrl || newNode.imageUrl,
          // 对于组节点，保留原有属性
          parentId: originalNode.parentId
        };
      }
      idMap.set(newNode.id, newNode.id);
      return newNode;
    });
    originalNodes.forEach((originalNode) => {
      if (!matchedOriginalNodeIds.has(originalNode.id)) {
        mergedNodes.push(originalNode);
        idMap.set(originalNode.id, originalNode.id);
        matchedOriginalNodeIds.add(originalNode.id);
      }
    });
    const uniqueNodes = [];
    const seenNodeIds = /* @__PURE__ */ new Set();
    mergedNodes.forEach((node) => {
      if (!seenNodeIds.has(node.id)) {
        seenNodeIds.add(node.id);
        uniqueNodes.push(node);
      }
    });
    const mergedEdges = parsedEdges.map((newEdge) => {
      const fromNode = parsedNodes.find((n) => n.id === newEdge.from);
      const toNode = parsedNodes.find((n) => n.id === newEdge.to);
      if (fromNode && toNode) {
        const mappedFromId = idMap.get(newEdge.from) || newEdge.from;
        const mappedToId = idMap.get(newEdge.to) || newEdge.to;
        const originalEdge = originalEdgesByPair.get(`${mappedFromId}=>${mappedToId}`);
        if (originalEdge) {
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
        return {
          ...newEdge,
          from: mappedFromId,
          to: mappedToId
        };
      }
      return newEdge;
    });
    originalEdges.forEach((originalEdge) => {
      const edgeKey = `${originalEdge.from}=>${originalEdge.to}`;
      const isEdgeExists = mergedEdges.some(
        (edge) => edge.from === originalEdge.from && edge.to === originalEdge.to
      );
      if (!isEdgeExists) {
        mergedEdges.push(originalEdge);
      }
    });
    const uniqueEdges = [];
    const seenEdgePairs = /* @__PURE__ */ new Set();
    mergedEdges.forEach((edge) => {
      const edgeKey = `${edge.from}=>${edge.to}`;
      if (!seenEdgePairs.has(edgeKey)) {
        seenEdgePairs.add(edgeKey);
        uniqueEdges.push(edge);
      }
    });
    return { nodes: uniqueNodes, edges: uniqueEdges };
  }, []);
  const handleBackgroundChange = useCallback((pattern) => {
    setCurrentBackground(pattern);
  }, []);
  const originalScaleRef = useRef3(transform.scale || 1);
  const centerMindMap = useCallback(() => {
    if (!containerRef.current || !mindmapContainerRef.current || nodes.length === 0)
      return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    if (minX === Infinity)
      return;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const mindmapContainer = mindmapContainerRef.current;
    const mindmapRect = mindmapContainer.getBoundingClientRect();
    const mindmapWidth = mindmapRect.width;
    const mindmapHeight = mindmapRect.height;
    const newScale = transform.scale;
    const newX = mindmapWidth / 2 - centerX * newScale;
    const newY = mindmapHeight / 2 - centerY * newScale;
    setTransform({ x: newX, y: newY, scale: newScale });
  }, [nodes, transform]);
  const saveCurrentState = useCallback((nodes2, edges2, transform2) => {
    const currentData = { nodes: nodes2, edges: edges2, transform: transform2, version: 1 };
    const dataString = JSON.stringify(currentData, null, 2);
    onSave?.(dataString);
  }, [onSave]);
  const handleAutoLayout = useCallback(() => {
    saveHistory();
    const edgesWithWeights = calculateRelationshipWeights(nodes, edges);
    const layoutParams = {
      repulsionForce: layoutSettings.repulsionForce,
      attractionForce: layoutSettings.attractionForce,
      minDistance: layoutSettings.minDistance,
      iterations: layoutSettings.iterations
    };
    const newNodes = calculateAutomaticLayout(nodes, edgesWithWeights, currentLayout, layoutParams);
    const finalNodes = recalculateGroupBounds(newNodes);
    setNodes(finalNodes);
    const updatedEdges = edges.map((edge) => {
      const sourceNode = finalNodes.find((n) => n.id === edge.from);
      const targetNode = finalNodes.find((n) => n.id === edge.to);
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
    setEdges(updatedEdges);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        finalNodes.forEach((node) => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x + node.width);
          maxY = Math.max(maxY, node.y + node.height);
        });
        if (minX !== Infinity) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          setTransform((prev) => ({
            ...prev,
            x: rect.width / 2 - centerX * prev.scale,
            y: rect.height / 2 - centerY * prev.scale
          }));
        }
      }
    }
    if (onShowMessage)
      onShowMessage("\u5DF2\u81EA\u52A8\u8C03\u6574\u5E03\u5C40");
  }, [nodes, edges, saveHistory, onShowMessage, transform, currentLayout, layoutSettings]);
  const handleLayoutSettingsChange = useCallback((settings2) => {
    setLayoutSettings(settings2);
  }, []);
  const handleOpenLink = useCallback((linkPath) => {
    if (app && app.workspace) {
      try {
        app.workspace.openLinkText(linkPath, "", false);
      } catch (error) {
        console.error("Failed to open link:", error);
        if (app.vault) {
          const file = app.vault.getAbstractFileByPath(linkPath);
          if (file) {
            app.workspace.openLeaf().then((leaf) => {
              leaf.openFile(file);
            });
          }
        }
      }
    } else {
      console.log("App object not available, cannot open link:", linkPath);
    }
  }, [app]);
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveHistory();
    const rect = mindmapContainerRef.current?.getBoundingClientRect();
    if (!rect)
      return;
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mousePos, transform);
    const obsidianData = e.dataTransfer.getData("application/x-obsidian-md");
    if (obsidianData) {
      try {
        const data = JSON.parse(obsidianData);
        if (data.files && data.files.length > 0) {
          data.files.forEach((filePath, index) => {
            createFileNode(filePath, worldPos.x, worldPos.y, index);
          });
        }
      } catch (error) {
        console.error("Failed to parse Obsidian drag data:", error);
      }
    }
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file, index) => {
        if (file.type.startsWith("image/")) {
          processImageFile(file, worldPos.x, worldPos.y, index);
        } else {
          createExternalFileNode(file, worldPos.x, worldPos.y, index);
        }
      });
    }
  };
  const createFileNode = (filePath, x, y, index) => {
    const fileName2 = filePath.split("/").pop() || filePath;
    let cleanPath = filePath.trim();
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName2);
    let content;
    if (isImage) {
      content = `![[${cleanPath}]]`;
    } else {
      if (cleanPath.endsWith(".md")) {
        cleanPath = cleanPath.substring(0, cleanPath.length - 3);
      }
      const encodedVault = encodeURIComponent("");
      const encodedFile = encodeURIComponent(cleanPath);
      const obsidianUrl = `obsidian://open?vault=${encodedVault}&file=${encodedFile}&new-tab=true`;
      content = `[${fileName2}](${obsidianUrl})`;
    }
    const newNode = {
      id: generateId(),
      title: fileName2,
      content,
      x: x + index * 20,
      y: y + index * 20,
      width: 150,
      height: 80,
      color: "blue",
      type: "node"
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds(/* @__PURE__ */ new Set([newNode.id]));
  };
  const createExternalFileNode = (file, x, y, index) => {
    const newNode = {
      id: generateId(),
      title: file.name,
      content: `[${file.name}](file:///)`,
      x: x + index * 20,
      y: y + index * 20,
      width: 150,
      height: 80,
      color: "purple",
      type: "node"
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds(/* @__PURE__ */ new Set([newNode.id]));
  };
  const searchFiles = useCallback((query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      if (app && app.vault && app.vault.getFiles) {
        const allFiles = app.vault.getFiles();
        const filteredFiles = allFiles.filter(
          (file) => file.name.toLowerCase().includes(query.toLowerCase()) || file.path.toLowerCase().includes(query.toLowerCase())
        );
        const results = filteredFiles.map((file) => ({
          path: file.path,
          name: file.name
        }));
        setSearchResults(results);
      } else {
        const mockResults = [
          { path: "notes/file1.md", name: "file1.md" },
          { path: "notes/file2.md", name: "file2.md" },
          { path: "images/pic1.png", name: "pic1.png" }
        ].filter(
          (file) => file.name.toLowerCase().includes(query.toLowerCase()) || file.path.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(mockResults);
      }
    } catch (error) {
      console.error("Failed to search files:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [app]);
  const importFile = useCallback((file) => {
    saveHistory();
    let centerX = 0;
    let centerY = 0;
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      currentNodes.forEach((node) => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      const boundsCenterX = (minX + maxX) / 2;
      const boundsCenterY = (minY + maxY) / 2;
      centerX = boundsCenterX - 75;
      centerY = boundsCenterY - 40;
    }
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
    let cleanPath = file.path.trim();
    let content;
    if (isImage) {
      content = `![[${cleanPath}]]`;
    } else {
      if (cleanPath.endsWith(".md")) {
        cleanPath = cleanPath.substring(0, cleanPath.length - 3);
      }
      const encodedVault = encodeURIComponent("");
      const encodedFile = encodeURIComponent(cleanPath);
      const obsidianUrl = `obsidian://open?vault=${encodedVault}&file=${encodedFile}&new-tab=true`;
      content = `[${file.name}](${obsidianUrl})`;
    }
    const newNode = {
      id: generateId(),
      title: file.name,
      content,
      x: centerX,
      y: centerY,
      width: 150,
      height: 80,
      color: isImage ? "green" : "blue",
      type: "node"
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds(/* @__PURE__ */ new Set([newNode.id]));
    setSearchQuery("");
    setSearchResults([]);
  }, [saveHistory]);
  const selectedEdgeObj = edges.find((e) => e.id === selectedEdgeId);
  const groupNodes = nodes.filter((n) => n.type === "group");
  const standardNodes = nodes.filter((n) => n.type !== "group");
  return /* @__PURE__ */ jsxs9(
    "div",
    {
      ref: containerRef,
      className: `mindo-canvas-container ${currentBackground !== "none" ? `mindo-bg-pattern-${currentBackground}` : ""}`,
      onWheel: handleWheel,
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%"
      },
      children: [
        /* @__PURE__ */ jsxs9("div", { style: {
          flex: 1,
          position: "relative",
          overflow: "hidden"
        }, children: [
          /* @__PURE__ */ jsx9(
            "div",
            {
              ref: mindmapContainerRef,
              style: { width: "100%", height: "100%", position: "absolute", top: 0, left: 0, outline: "none", cursor: isPanning ? "grabbing" : "default" },
              onMouseDown: handleMouseDownCanvas,
              onDoubleClick: handleDoubleClickCanvas,
              onContextMenu: handleContextMenu,
              onDragOver: handleDragOver,
              onDrop: handleDrop,
              children: /* @__PURE__ */ jsxs9(
                "div",
                {
                  style: {
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: "0 0",
                    width: "100%",
                    height: "100%",
                    position: "relative"
                  },
                  children: [
                    groupNodes.map((node) => /* @__PURE__ */ jsx9(
                      NodeComponent,
                      {
                        node,
                        scale: transform.scale,
                        isSelected: selectedNodeIds.has(node.id),
                        isDragging: draggingNodeId === node.id || selectedNodeIds.has(node.id) && !!draggingNodeId,
                        onMouseDown: handleNodeMouseDown,
                        onMouseUp: handleMouseUp,
                        onConnectStart: handleConnectStart,
                        onConnectEnd: handleConnectEnd,
                        onUpdate: updateNodeData,
                        onResize: updateNodeResize,
                        onResizeStart: saveHistory,
                        onDelete: deleteNode,
                        onColorChange: updateNodeColor,
                        onShapeChange: updateNodeShape,
                        onContextMenu: handleNodeContextMenu,
                        onRenderMarkdown,
                        onOpenLink: handleOpenLink,
                        useCodeMirror: false,
                        darkMode
                      },
                      node.id
                    )),
                    /* @__PURE__ */ jsx9("svg", { style: { overflow: "visible", position: "absolute", top: 0, left: 0, pointerEvents: "none", width: "100%", height: "100%", zIndex: 25 }, children: edges.map((edge) => {
                      const source = nodes.find((n) => n.id === edge.from);
                      const target = nodes.find((n) => n.id === edge.to);
                      if (!source || !target)
                        return null;
                      return /* @__PURE__ */ jsx9(
                        EdgeComponent,
                        {
                          edge,
                          sourceNode: source,
                          targetNode: target,
                          isSelected: selectedEdgeId === edge.id,
                          onSelect: handleEdgeSelect,
                          onDelete: () => {
                            saveHistory();
                            setEdges((prev) => prev.filter((e) => e.id !== edge.id));
                          },
                          onUpdate: updateEdge,
                          onInteractStart: saveHistory,
                          transform
                        },
                        edge.id
                      );
                    }) }),
                    /* @__PURE__ */ jsx9("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 30 }, children: edges.map((edge) => {
                      const source = nodes.find((n) => n.id === edge.from);
                      const target = nodes.find((n) => n.id === edge.to);
                      if (!source || !target)
                        return null;
                      return /* @__PURE__ */ jsx9(
                        EdgeLabel,
                        {
                          edge,
                          sourceNode: source,
                          targetNode: target,
                          onSelect: handleEdgeSelect,
                          darkMode
                        },
                        edge.id
                      );
                    }) }),
                    standardNodes.map((node) => /* @__PURE__ */ jsx9(
                      NodeComponent,
                      {
                        node,
                        scale: transform.scale,
                        isSelected: selectedNodeIds.has(node.id),
                        isDragging: draggingNodeId === node.id || selectedNodeIds.has(node.id) && !!draggingNodeId,
                        onMouseDown: handleNodeMouseDown,
                        onMouseUp: handleMouseUp,
                        onConnectStart: handleConnectStart,
                        onConnectEnd: handleConnectEnd,
                        onUpdate: updateNodeData,
                        onResize: updateNodeResize,
                        onResizeStart: saveHistory,
                        onDelete: deleteNode,
                        onColorChange: updateNodeColor,
                        onShapeChange: updateNodeShape,
                        onContextMenu: handleNodeContextMenu,
                        onRenderMarkdown,
                        onOpenLink: handleOpenLink,
                        useCodeMirror: false,
                        darkMode
                      },
                      node.id
                    )),
                    /* @__PURE__ */ jsxs9("svg", { style: { overflow: "visible", position: "absolute", top: 0, left: 0, pointerEvents: "none", width: "100%", height: "100%", zIndex: 60 }, children: [
                      selectedEdgeObj && selectedEdgeId && (() => {
                        const source = nodes.find((n) => n.id === selectedEdgeObj.from);
                        const target = nodes.find((n) => n.id === selectedEdgeObj.to);
                        if (!source || !target)
                          return null;
                        const start = getHandlePosition(source, selectedEdgeObj.fromHandle);
                        const end = getHandlePosition(target, selectedEdgeObj.toHandle);
                        const color = selectedEdgeObj.color || "#94a3b8";
                        return /* @__PURE__ */ jsxs9(Fragment4, { children: [
                          /* @__PURE__ */ jsx9(
                            "circle",
                            {
                              cx: start.x,
                              cy: start.y,
                              r: 6,
                              fill: "white",
                              stroke: color,
                              strokeWidth: 2,
                              cursor: "crosshair",
                              pointerEvents: "auto",
                              onMouseDown: (e) => handleEdgeReconnectStart(e, selectedEdgeObj.id, "from")
                            }
                          ),
                          /* @__PURE__ */ jsx9(
                            "circle",
                            {
                              cx: end.x,
                              cy: end.y,
                              r: 6,
                              fill: "white",
                              stroke: color,
                              strokeWidth: 2,
                              cursor: "crosshair",
                              pointerEvents: "auto",
                              onMouseDown: (e) => handleEdgeReconnectStart(e, selectedEdgeObj.id, "to")
                            }
                          )
                        ] });
                      })(),
                      (connectionStart || reconnectingEdge) && tempConnectionEnd && /* @__PURE__ */ jsx9(Fragment4, { children: /* @__PURE__ */ jsx9(
                        "path",
                        {
                          d: (() => {
                            let startPoint;
                            if (reconnectingEdge) {
                              const edge = edges.find((e) => e.id === reconnectingEdge.edgeId);
                              if (!edge)
                                return "";
                              if (reconnectingEdge.which === "to") {
                                const source = nodes.find((n) => n.id === edge.from);
                                if (!source)
                                  return "";
                                startPoint = getHandlePosition(source, edge.fromHandle);
                              } else {
                                const target = nodes.find((n) => n.id === edge.to);
                                if (!target)
                                  return "";
                                startPoint = getHandlePosition(target, edge.toHandle);
                              }
                            } else if (connectionStart) {
                              const source = nodes.find((n) => n.id === connectionStart.nodeId);
                              if (!source)
                                return "";
                              startPoint = getHandlePosition(source, connectionStart.handle);
                            } else {
                              return "";
                            }
                            const endPoint = snapPreview ? getHandlePosition(nodes.find((n) => n.id === snapPreview.nodeId), snapPreview.handle) : tempConnectionEnd;
                            return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
                          })(),
                          className: `mindo-connection-preview ${snapPreview ? "snapping" : ""}`
                        }
                      ) })
                    ] }),
                    selectionBox && /* @__PURE__ */ jsx9(
                      "div",
                      {
                        className: "mindo-selection-box",
                        style: {
                          left: Math.min(selectionBox.start.x, selectionBox.end.x) / transform.scale - transform.x / transform.scale,
                          top: Math.min(selectionBox.start.y, selectionBox.end.y) / transform.scale - transform.y / transform.scale,
                          width: Math.abs(selectionBox.end.x - selectionBox.start.x) / transform.scale,
                          height: Math.abs(selectionBox.end.y - selectionBox.start.y) / transform.scale
                        }
                      }
                    )
                  ]
                }
              )
            }
          ),
          selectedEdgeId && selectedEdgeObj && /* @__PURE__ */ jsx9(
            EdgeMenu,
            {
              edge: selectedEdgeObj,
              onUpdate: (id, updates) => {
                saveHistory();
                updateEdge(id, updates);
              },
              onDelete: (id) => {
                saveHistory();
                setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeObj.id));
              }
            }
          ),
          /* @__PURE__ */ jsx9(
            SearchBar,
            {
              searchQuery,
              setSearchQuery,
              searchResults,
              isSearching,
              onSearch: searchFiles,
              onImportFile: importFile,
              isVisible: !selectedEdgeId && selectedNodeIds.size === 0
            }
          ),
          /* @__PURE__ */ jsx9(
            Toolbar,
            {
              scale: transform.scale,
              onZoomIn: () => setTransform((t) => ({ ...t, scale: Math.min(t.scale + 0.2, 5) })),
              onZoomOut: () => setTransform((t) => ({ ...t, scale: Math.max(t.scale - 0.2, 0.1) })),
              onFitView: () => {
                if (containerRef.current && nodes.length > 0) {
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  nodes.forEach((node) => {
                    minX = Math.min(minX, node.x);
                    minY = Math.min(minY, node.y);
                    maxX = Math.max(maxX, node.x + node.width);
                    maxY = Math.max(maxY, node.y + node.height);
                  });
                  const boundsWidth = maxX - minX;
                  const boundsHeight = maxY - minY;
                  const containerWidth = containerRef.current.clientWidth;
                  const containerHeight = containerRef.current.clientHeight;
                  const scaleX = containerWidth * 0.8 / boundsWidth;
                  const scaleY = containerHeight * 0.8 / boundsHeight;
                  const scale = Math.min(scaleX, scaleY, 1);
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;
                  setTransform({
                    x: containerWidth / 2 - centerX * scale,
                    y: containerHeight / 2 - centerY * scale,
                    scale
                  });
                }
              },
              onAddGroup: handleCreateGroup,
              onOpenImageOperationModal: handleOpenImageOperationModal,
              onAlign: handleAlign,
              onUndo: undo,
              onRedo: redo,
              onAutoLayout: handleAutoLayout,
              onBackgroundChange: handleBackgroundChange,
              currentBackground,
              layoutSettings: {
                repulsionForce: layoutSettings.repulsionForce,
                attractionForce: layoutSettings.attractionForce,
                minDistance: layoutSettings.minDistance,
                iterations: layoutSettings.iterations
              },
              onLayoutSettingsChange: handleLayoutSettingsChange,
              canGroup: selectedNodeIds.size > 1,
              canAlign: selectedNodeIds.size > 1,
              hasSingleSelection: selectedNodeIds.size === 1,
              nodeCount: nodes.length,
              snapToGrid,
              onSnapToGridChange: setSnapToGrid
            }
          ),
          /* @__PURE__ */ jsxs9(
            "div",
            {
              ref: canvasContainerRef,
              className: "mindo-canvas",
              style: {
                flex: 1,
                position: "relative",
                overflow: "hidden",
                backgroundColor: darkMode ? "#111827" : "#f3f4f6",
                transition: "opacity 0.3s ease-in-out"
              },
              onMouseDown: handleMouseDownCanvas,
              onContextMenu: handleContextMenu,
              onDoubleClick: handleDoubleClickCanvas,
              onDragOver: handleDragOver,
              onDrop: handleDrop,
              onWheel: handleWheel,
              children: [
                /* @__PURE__ */ jsxs9(
                  "div",
                  {
                    ref: canvasContentRef,
                    className: "mindo-canvas-content",
                    style: {
                      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                      transformOrigin: "0 0",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "auto",
                      opacity: 1,
                      zIndex: 1
                    },
                    children: [
                      /* @__PURE__ */ jsx9(
                        "svg",
                        {
                          style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
                          children: edges.map((edge) => /* @__PURE__ */ jsx9(
                            EdgeComponent,
                            {
                              edge,
                              nodes,
                              onEdgeSelect: handleEdgeSelect,
                              onEdgeReconnectStart: handleEdgeReconnectStart,
                              selectedEdgeId,
                              darkMode
                            },
                            edge.id
                          ))
                        }
                      ),
                      /* @__PURE__ */ jsx9("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }, children: nodes.map((node) => /* @__PURE__ */ jsx9(
                        NodeComponent,
                        {
                          node,
                          isSelected: selectedNodeIds.has(node.id),
                          isDragging: draggingNodeId === node.id,
                          onMouseDown: (e) => handleNodeMouseDown(e, node.id),
                          onMouseUp: () => setDraggingNodeId(null),
                          onConnectStart: (e, handle) => handleConnectStart(e, node.id, handle),
                          onConnectEnd: (e, handle) => handleConnectEnd(e, node.id, handle),
                          onUpdate: updateNodeData,
                          onResize: updateNodeResize,
                          onResizeStart: () => {
                          },
                          onDelete: () => deleteNode(node.id),
                          onColorChange: (color) => updateNodeColor(node.id, color),
                          onShapeChange: (shape) => updateNodeShape(node.id, shape),
                          onContextMenu: (e) => handleNodeContextMenu(e, node.id),
                          onSelect: () => handleNodeSelect(node.id),
                          scale: transform.scale,
                          onRenderMarkdown,
                          onOpenLink: handleOpenLink,
                          useCodeMirror: true,
                          darkMode
                        },
                        node.id
                      )) })
                    ]
                  }
                ),
                connectionStart && tempConnectionEnd && /* @__PURE__ */ jsx9(
                  "svg",
                  {
                    className: "mindo-temp-connection",
                    style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" },
                    children: /* @__PURE__ */ jsx9(
                      "line",
                      {
                        x1: getHandlePosition(nodes.find((n) => n.id === connectionStart.nodeId), connectionStart.handle).x + transform.x,
                        y1: getHandlePosition(nodes.find((n) => n.id === connectionStart.nodeId), connectionStart.handle).y + transform.y,
                        x2: tempConnectionEnd.x * transform.scale + transform.x,
                        y2: tempConnectionEnd.y * transform.scale + transform.y,
                        stroke: darkMode ? "#a3a3a3" : "#94a3b8",
                        strokeWidth: 2,
                        strokeDasharray: "5,5"
                      }
                    )
                  }
                ),
                selectionBox && /* @__PURE__ */ jsx9(
                  "div",
                  {
                    className: "mindo-selection-box",
                    style: {
                      position: "absolute",
                      left: Math.min(selectionBox.start.x, selectionBox.end.x),
                      top: Math.min(selectionBox.start.y, selectionBox.end.y),
                      width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                      height: Math.abs(selectionBox.end.y - selectionBox.start.y),
                      border: `1px dashed ${darkMode ? "#a3a3a3" : "#94a3b8"}`,
                      backgroundColor: darkMode ? "rgba(163, 163, 163, 0.1)" : "rgba(148, 163, 184, 0.1)",
                      pointerEvents: "none"
                    }
                  }
                ),
                showSearchBox && /* @__PURE__ */ jsx9(
                  SearchBar,
                  {
                    query: searchQuery,
                    onQueryChange: setSearchQuery,
                    results: searchResults,
                    onSelectResult: (nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      if (node) {
                        setTransform((prev) => ({
                          ...prev,
                          x: containerRef.current.clientWidth / 2 - (node.x + node.width / 2) * prev.scale,
                          y: containerRef.current.clientHeight / 2 - (node.y + node.height / 2) * prev.scale
                        }));
                        setSelectedNodeIds(/* @__PURE__ */ new Set([nodeId]));
                        setShowSearchBox(false);
                      }
                    },
                    onClose: () => setShowSearchBox(false),
                    darkMode
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx9(
          ContextMenu,
          {
            x: contextMenu.x,
            y: contextMenu.y,
            isVisible: contextMenu.visible,
            onClose: closeContextMenu,
            darkMode,
            items: contextMenu.type === "node" ? [
              { label: "\u5934\u8111\u98CE\u66B4", onClick: () => contextMenu.nodeId && handleBrainstorm(contextMenu.nodeId) },
              { label: "\u5185\u5BB9\u6DF1\u5316", onClick: () => contextMenu.nodeId && handleDeepenContent(contextMenu.nodeId) },
              { label: "\u5220\u9664\u8282\u70B9", onClick: () => contextMenu.nodeId && deleteNode(contextMenu.nodeId) }
            ] : [
              { label: "\u4E00\u952E\u751F\u6210", onClick: handleGenerateMindMap },
              { label: "\u667A\u80FD\u914D\u8272", onClick: handleSmartColorScheme },
              selectedNodeIds.size >= 2 && {
                label: "\u5BF9\u9F50",
                subItems: [
                  {
                    label: "\u6C34\u5E73\u5BF9\u9F50",
                    subItems: [
                      { label: "\u5DE6\u5BF9\u9F50", onClick: () => handleAlign("horizontal", "left") },
                      { label: "\u6C34\u5E73\u5C45\u4E2D", onClick: () => handleAlign("horizontal", "center") },
                      { label: "\u53F3\u5BF9\u9F50", onClick: () => handleAlign("horizontal", "right") }
                    ]
                  },
                  {
                    label: "\u5782\u76F4\u5BF9\u9F50",
                    subItems: [
                      { label: "\u9876\u90E8\u5BF9\u9F50", onClick: () => handleAlign("vertical", "top") },
                      { label: "\u5782\u76F4\u5C45\u4E2D", onClick: () => handleAlign("vertical", "middle") },
                      { label: "\u5E95\u90E8\u5BF9\u9F50", onClick: () => handleAlign("vertical", "bottom") }
                    ]
                  }
                ]
              },
              {
                label: `\u5BF9\u9F50\u529F\u80FD: ${snapToGrid ? "\u5F00" : "\u5173"}`,
                onClick: () => setSnapToGrid(!snapToGrid)
              },
              {
                label: `\u5207\u6362\u8FDE\u63A5\u70B9: ${autoSelectNearestHandle ? "\u5F00" : "\u5173"}`,
                onClick: () => setAutoSelectNearestHandle(!autoSelectNearestHandle)
              }
            ].filter(Boolean)
          }
        ),
        showIconSelector && /* @__PURE__ */ jsx9(
          IconSelector,
          {
            onSelectIcon: handleSelectIcon,
            onClose: () => setShowIconSelector(false),
            darkMode
          }
        ),
        selectedNodeForMenu && /* @__PURE__ */ jsx9(
          NodeMenu,
          {
            node: selectedNodeForMenu,
            onDelete: deleteNode,
            onColorChange: updateNodeColor,
            onIconChange: handleIconChange,
            onIconPositionChange: handleIconPositionChange,
            onTitleVisibleChange: handleTitleVisibleChange,
            darkMode
          }
        )
      ]
    }
  );
};
var App_default = App2;

// index.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
var rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
var mockApp = {
  vault: {
    adapter: {
      getResourcePath: (path) => path
    }
  }
};
var root = ReactDOM2.createRoot(rootElement);
root.render(
  /* @__PURE__ */ jsx10(React7.StrictMode, { children: /* @__PURE__ */ jsx10(
    App_default,
    {
      onSave: (data) => console.log("Saved", data),
      fileName: "Untitled",
      settings: { aiProvider: "gemini", aiBaseUrl: "", aiApiKey: "", aiModel: "gemini-2.0-flash", imageSaveLocation: "obsidian", imageFolderPath: "" },
      onShowMessage: (msg) => alert(msg),
      app: mockApp
    }
  ) })
);
//# sourceMappingURL=web.js.map
