import { useEffect, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import { tree, hierarchy } from "d3-hierarchy";
import type { GraphNode, GraphEdge } from "@shared/schema";

interface GraphCanvasRadialProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hubNodeIds: Set<string>;
  onNodeClick: (node: GraphNode) => void;
}

interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  children?: D3Node[];
}

export default function GraphCanvasRadial({ nodes, edges, hubNodeIds, onNodeClick }: GraphCanvasRadialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const treeEdgesRef = useRef<GraphEdge[]>([]);
  const removedEdgesRef = useRef<GraphEdge[]>([]);
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);
  

  
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);
  
  // Hover effects
  useEffect(() => {
    const activeId = hoveredId || selectedId;
    
    if (!svgRef.current || !renderComplete) return;

    const svg = select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, any>("g.node");
    const edgeElements = svg.selectAll<SVGPathElement, any>("path.edge");
    const removedEdgeElements = svg.selectAll<SVGPathElement, any>("path.removed-edge");

    if (nodeElements.empty() || edgeElements.empty()) return;

    if (activeId === null) {
      nodeElements
        .classed("node-highlight", false)
        .classed("node-secondary-highlight", false)
        .classed("node-dim", false);
      edgeElements
        .classed("edge-highlight", false)
        .classed("edge-dim", false);
      removedEdgeElements
        .classed("edge-highlight", false)
        .classed("edge-dim", false);
    } else {
      const focusSet = new Set<string>();
      focusSet.add(activeId);
      
      // Build parent and children maps using only tree edges
      const parentMap = new Map<string, string>();
      const childrenMap = new Map<string, string[]>();
      for (const edge of treeEdgesRef.current) {
        parentMap.set(edge.to, edge.from);
        if (!childrenMap.has(edge.from)) {
          childrenMap.set(edge.from, []);
        }
        childrenMap.get(edge.from)!.push(edge.to);
      }
      
      // Add all ancestors back to root
      let currentId: string | undefined = activeId;
      while (currentId) {
        const parentId = parentMap.get(currentId);
        if (parentId) {
          focusSet.add(parentId);
          currentId = parentId;
        } else {
          break;
        }
      }
      
      // Add all descendants (full subtree) using BFS
      const queue: string[] = [activeId];
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const children = childrenMap.get(nodeId) || [];
        for (const childId of children) {
          if (!focusSet.has(childId)) {
            focusSet.add(childId);
            queue.push(childId);
          }
        }
      }

      // Find nodes connected via removed edges (secondary focus)
      const secondaryFocusSet = new Set<string>();
      for (const edge of removedEdgesRef.current) {
        if (focusSet.has(edge.from) && !focusSet.has(edge.to)) {
          secondaryFocusSet.add(edge.to);
        }
        if (focusSet.has(edge.to) && !focusSet.has(edge.from)) {
          secondaryFocusSet.add(edge.from);
        }
      }

      nodeElements
        .classed("node-highlight", (d: any) => focusSet.has(d.data.id))
        .classed("node-secondary-highlight", (d: any) => secondaryFocusSet.has(d.data.id))
        .classed("node-dim", (d: any) => !focusSet.has(d.data.id) && !secondaryFocusSet.has(d.data.id));
      
      edgeElements
        .classed("edge-highlight", (d: any) => {
          const sourceId = d.source.data.id;
          const targetId = d.target.data.id;
          return focusSet.has(sourceId) && focusSet.has(targetId);
        })
        .classed("edge-dim", (d: any) => {
          const sourceId = d.source.data.id;
          const targetId = d.target.data.id;
          return !(focusSet.has(sourceId) && focusSet.has(targetId));
        });
      
      // Highlight removed edges if either endpoint is in focus
      removedEdgeElements
        .classed("edge-highlight", (d: any) => {
          const sourceId = d.edge.from;
          const targetId = d.edge.to;
          return focusSet.has(sourceId) || focusSet.has(targetId);
        })
        .classed("edge-dim", (d: any) => {
          const sourceId = d.edge.from;
          const targetId = d.edge.to;
          return !(focusSet.has(sourceId) || focusSet.has(targetId));
        });
    }
  }, [hoveredId, selectedId, renderComplete]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Adaptive radius based on node count - continuous scaling with no cap
    // Small graphs: smaller radius for better initial fit
    // Large graphs: larger radius to prevent crowding
    const nodeCount = nodes.length;
    
    // Use square root scaling for better growth with large graphs
    // This ensures even very large graphs get enough space
    const baseRadius = Math.min(width, height) / 2;
    
    // Scale factor based on node count (square root)
    // Small graphs (20 nodes): ~0.55x
    // Medium graphs (100 nodes): ~0.8x
    // Large graphs (400 nodes): ~1.2x
    // Very large graphs (1600 nodes): ~1.8x
    const scaleFactor = 0.4 + Math.sqrt(nodeCount / 100) * 0.5;
    
    // On mobile, use less margin to maximize space
    const isMobile = window.innerWidth < 768;
    const margin = isMobile ? 40 : 80;
    const radius = baseRadius * scaleFactor - margin;
    const cx = width / 2;
    const cy = height / 2;

    svg.selectAll("*").remove();

    // Set viewBox to center on root node
    svg.attr("viewBox", `${-cx} ${-cy} ${width} ${height}`);

    const container = svg.append("g").attr("class", "container");
    const edgesGroup = container.append("g").attr("class", "edges");
    const nodesGroup = container.append("g").attr("class", "nodes");

    // Zoom behavior centered on root
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: any) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    // Build tree structure, ensuring no duplicate nodes
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));
    const childrenByParent = new Map<string, D3Node[]>();
    const seenNodes = new Set<string>();
    const removedEdges: GraphEdge[] = []; // Store edges that create duplicates
    const treeEdges: GraphEdge[] = []; // Store edges that are part of the tree
    
    // Find root first
    const rootNode = nodes.find(n => n.depth === 0);
    if (!rootNode) return;
    
    // Build tree structure using BFS to ensure we only include each node once
    seenNodes.add(rootNode.id);
    
    for (const edge of edges) {
      const parent = nodeMap.get(edge.from);
      const child = nodeMap.get(edge.to);
      
      if (parent && child) {
        // Only add edge if child hasn't been seen yet (ensures tree structure)
        if (!seenNodes.has(child.id)) {
          if (!childrenByParent.has(parent.id)) {
            childrenByParent.set(parent.id, []);
          }
          childrenByParent.get(parent.id)!.push(child);
          seenNodes.add(child.id);
          treeEdges.push(edge); // Store this edge as part of the tree
        } else {
          // Store removed edge for potential future use
          removedEdges.push(edge);
        }
      }
    }
    
    // Store tree edges and removed edges for hover calculations
    treeEdgesRef.current = treeEdges;
    removedEdgesRef.current = removedEdges;

    // Build hierarchy recursively
    const buildHierarchy = (node: D3Node): D3Node => {
      const children = childrenByParent.get(node.id) || [];
      if (children.length > 0) {
        node.children = children.map(buildHierarchy);
      }
      return node;
    };

    const root = hierarchy(buildHierarchy(nodeMap.get(rootNode.id)!));
    
    // Add phantom children to all shallow nodes to ensure consistent spacing
    const phantomNodes: any[] = [];
    root.descendants().forEach((node: any) => {
      // Only add phantoms to nodes at depth 1-2 that have fewer than a threshold of children
      if (node.depth >= 1 && node.depth <= 2) {
        const currentChildCount = node.children?.length || 0;
        const targetChildCount = node.depth === 1 ? 4 : 3;
        
        // Add phantoms to bring all nodes up to the target count
        if (currentChildCount < targetChildCount) {
          if (!node.children) {
            node.children = [];
          }
          const phantomsToAdd = targetChildCount - currentChildCount;
          for (let i = 0; i < phantomsToAdd; i++) {
            const phantom = {
              data: { ...node.data, id: `phantom-${node.data.id}-${i}`, isPhantom: true },
              depth: node.depth + 1,
              parent: node
            };
            node.children.push(phantom);
            phantomNodes.push(phantom);
          }
        }
      }
    });
    
    // Log removed edges for debugging
    if (removedEdges.length > 0) {
      console.log(`Radial tree: removed ${removedEdges.length} duplicate edges to maintain tree structure`);
    }
    console.log(`Added ${phantomNodes.length} phantom nodes to reserve space for early-terminating leaves`);
    
    // Mark render as complete after initial layout
    setRenderComplete(false);
    
    // Create radial tree layout with improved separation
    const treeLayout = tree<D3Node>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => {
        // Check if either node is a leaf (no children)
        const aIsLeaf = !a.children || a.children.length === 0;
        const bIsLeaf = !b.children || b.children.length === 0;
        
        // Base separation - increased for siblings
        let baseSeparation = a.parent === b.parent ? 3 : 6;
        
        // Apply separation logic based on node types:
        // - Leaf next to branch: NEEDS MORE SPACE (branch will fan out)
        // - Leaf next to leaf: Can be closer together
        if (aIsLeaf && !bIsLeaf && a.parent === b.parent) {
          // Leaf next to branch node - needs significant extra space
          const leafDepth = Math.min(a.depth, 2);
          const branchPenalty = leafDepth === 1 ? 20 : 8; // Increased: depth 1 = +20, depth 2 = +8
          baseSeparation += branchPenalty;
        } else if (!aIsLeaf && bIsLeaf && a.parent === b.parent) {
          // Branch next to leaf node - needs significant extra space
          const leafDepth = Math.min(b.depth, 2);
          const branchPenalty = leafDepth === 1 ? 20 : 8; // Increased: depth 1 = +20, depth 2 = +8
          baseSeparation += branchPenalty;
        } else if (aIsLeaf && bIsLeaf && a.parent === b.parent) {
          // Both leaves - can be closer, minimal penalty
          const minDepth = Math.min(a.depth, b.depth);
          if (minDepth === 1) {
            baseSeparation += 10; // Increased: depth 1 leaf pairs
          } else if (minDepth === 2) {
            baseSeparation += 4; // Increased: depth 2 leaf pairs
          } else if (minDepth === 3) {
            baseSeparation += 1.5; // depth 3 leaf pairs - minimal spacing
          }
        }
        
        // Increase separation at deeper levels with stronger multiplier
        const depthFactor = Math.max(a.depth, b.depth);
        const depthMultiplier = 1 + (depthFactor * 0.8); // Increased from 0.7 to 0.8
        
        // Calculate final separation
        const separation = baseSeparation * depthMultiplier;
        
        // Enforce minimum
        return Math.max(3.5, separation);
      });

    treeLayout(root);

    // Remove phantom children after layout (they've served their purpose)
    root.descendants().forEach((node: any) => {
      if (node.children && node.children.some((c: any) => c.data.isPhantom)) {
        node.children = node.children.filter((c: any) => !c.data.isPhantom);
        if (node.children.length === 0) {
          delete node.children;
        }
      }
    });

    // Apply graduated radius scaling to all depths
    // This gives more circumference where needed while maintaining even spacing
    const depth3Nodes = root.descendants().filter((n: any) => n.depth === 3);
    const depth3Count = depth3Nodes.length;
    
    // Calculate depth scaling factor based on depth 3 density
    let depthScaleFactor = 1.0;
    if (depth3Count > 50) {
      depthScaleFactor = 1.3; // High density
    } else if (depth3Count > 30) {
      depthScaleFactor = 1.2; // Medium-high density
    } else if (depth3Count > 15) {
      depthScaleFactor = 1.1; // Medium density
    }
    
    // Apply graduated multipliers to all depths to maintain even spacing
    root.descendants().forEach((node: any) => {
      const depth = node.depth;
      let multiplier = 1.0;
      
      if (depth === 1) {
        multiplier = 1.0 + (0.1 * depthScaleFactor); // Slight boost
      } else if (depth === 2) {
        multiplier = 1.0 + (0.3 * depthScaleFactor); // Moderate boost
      } else if (depth === 3) {
        multiplier = 1.0 + (0.6 * depthScaleFactor); // Largest boost
      }
      
      node.y = node.y * multiplier;
    });

    // Root is already at origin (0,0) due to viewBox

    // Draw edges using d3.linkRadial
    const linkRadial = (d: any) => {
      const sourceAngle = d.source.x;
      const sourceRadius = d.source.y;
      const targetAngle = d.target.x;
      const targetRadius = d.target.y;
      
      // Convert to Cartesian for path
      const sx = sourceRadius * Math.cos(sourceAngle - Math.PI / 2);
      const sy = sourceRadius * Math.sin(sourceAngle - Math.PI / 2);
      const tx = targetRadius * Math.cos(targetAngle - Math.PI / 2);
      const ty = targetRadius * Math.sin(targetAngle - Math.PI / 2);
      
      // Use quadratic curve for smooth radial links
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      
      return `M${sx},${sy}Q${mx},${my},${tx},${ty}`;
    };

    // Draw main tree edges
    edgesGroup
      .selectAll("path.edge")
      .data(root.links())
      .join("path")
      .attr("class", "edge")
      .attr("fill", "none")
      .attr("stroke", (d: any) => {
        const maxDepth = Math.max(d.source.data.depth, d.target.data.depth);
        const opacity = maxDepth === 0 ? 0.6 : maxDepth === 1 ? 0.4 : 0.3;
        return `rgba(156, 163, 175, ${opacity})`;
      })
      .attr("stroke-width", 1)
      .attr("d", linkRadial);

    // Draw removed edges as subtle curved lines
    if (removedEdges.length > 0) {
      // Build a map of node id to position
      const nodePositions = new Map<string, { x: number; y: number }>();
      root.descendants().forEach((d: any) => {
        nodePositions.set(d.data.id, { x: d.x, y: d.y });
      });

      // Create curved path for removed edges
      const removedEdgeData = removedEdges
        .map(edge => {
          const sourcePos = nodePositions.get(edge.from);
          const targetPos = nodePositions.get(edge.to);
          if (sourcePos && targetPos) {
            return { source: sourcePos, target: targetPos, edge };
          }
          return null;
        })
        .filter(d => d !== null);

      edgesGroup
        .selectAll("path.removed-edge")
        .data(removedEdgeData)
        .join("path")
        .attr("class", "removed-edge")
        .attr("fill", "none")
        .attr("stroke", "rgba(156, 163, 175, 0.15)") // Slightly more visible
        .attr("stroke-width", 0.75) // Slightly thicker
        .attr("stroke-dasharray", "2,2") // Dashed
        .attr("d", (d: any) => {
          const sourceAngle = d.source.x;
          const sourceRadius = d.source.y;
          const targetAngle = d.target.x;
          const targetRadius = d.target.y;
          
          // Convert to Cartesian
          const sx = sourceRadius * Math.cos(sourceAngle - Math.PI / 2);
          const sy = sourceRadius * Math.sin(sourceAngle - Math.PI / 2);
          const tx = targetRadius * Math.cos(targetAngle - Math.PI / 2);
          const ty = targetRadius * Math.sin(targetAngle - Math.PI / 2);
          
          // Use curved path with control point pulled toward center
          const cx = (sx + tx) / 2 * 0.7; // Pull toward center
          const cy = (sy + ty) / 2 * 0.7;
          
          return `M${sx},${sy}Q${cx},${cy},${tx},${ty}`;
        });
    }

    // Draw nodes using polar coordinates
    const nodeElements = nodesGroup
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .attr("cursor", "pointer")
      .on("click", (event, d: any) => {
        event.stopPropagation();
        setSelectedId(d.data.id);
        onNodeClickRef.current(d.data);
      })
      .on("mouseenter", function(_event, d: any) {
        setHoveredId(d.data.id);
        const node = select(this);
        node.attr("transform", (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) scale(1.2)`);
        node.select("circle, rect, path").attr("stroke-width", 3);
      })
      .on("mouseleave", function(_event, d: any) {
        setHoveredId(null);
        const node = select(this);
        node.attr("transform", (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) scale(1)`);
        node.select("circle, rect, path").attr("stroke-width", 2);
      });

    // Add node shapes
    nodeElements.each(function(d: any) {
      const node = select(this);
      const nodeData = d.data;
      const isMobile = window.innerWidth < 768;
      const scale = isMobile ? 0.7 : 1;
      const size = (nodeData.depth === 0 ? 10 : nodeData.depth === 1 ? 8 : nodeData.depth === 2 ? 7 : 4) * scale;
      const color = hubNodeIds.has(nodeData.id)
        ? "hsl(30 90% 55%)"
        : nodeData.depth === 0
        ? "hsl(45 100% 55%)"
        : nodeData.depth === 1
        ? "hsl(210 95% 45%)"
        : nodeData.depth === 2
        ? "hsl(210 80% 65%)"
        : "hsl(210 65% 78%)";

      if (hubNodeIds.has(nodeData.id) && nodeData.depth > 0) {
        const hubSize = nodeData.depth === 1 ? 9 : 8;
        const diamondSize = hubSize * 1.2;
        const diamondPath = `M 0,${-diamondSize} L ${diamondSize},0 L 0,${diamondSize} L ${-diamondSize},0 Z`;
        
        node
          .append("path")
          .attr("d", diamondPath)
          .attr("fill", color)
          .attr("stroke", "hsl(var(--background))")
          .attr("stroke-width", 2);
      } else {
        if (nodeData.depth === 3) {
          node
            .append("circle")
            .attr("r", size)
            .attr("fill", "hsl(var(--background))")
            .attr("stroke", color)
            .attr("stroke-width", 2);
        } else {
          node
            .append("circle")
            .attr("r", size)
            .attr("fill", color)
            .attr("stroke", "hsl(var(--background))")
            .attr("stroke-width", 2);
        }
      }
    });

    // Add labels with proper radial rotation
    nodeElements
      .append("text")
      .attr("transform", (d: any) => {
        // Keep root node label horizontal for readability - position below node
        if (d.data.depth === 0) {
          return `rotate(${-d.x * 180 / Math.PI + 90})`;
        }
        // Radial rotation for other nodes
        return `rotate(${d.x >= Math.PI ? 180 : 0})`;
      })
      .attr("dy", (d: any) => {
        // Position root label below the node
        if (d.data.depth === 0) return "1.5em";
        return "0.31em";
      })
      .attr("x", (d: any) => {
        // Center root node label
        if (d.data.depth === 0) return 0;
        return d.x < Math.PI ? 6 : -6;
      })
      .attr("text-anchor", (d: any) => {
        // Center root node label
        if (d.data.depth === 0) return "middle";
        return d.x < Math.PI ? "start" : "end";
      })
      .attr("font-size", (d: any) => {
        const isMobile = window.innerWidth < 768;
        const textScale = isMobile ? 0.75 : 1;
        return (d.data.depth === 0 ? 13 : 11) * textScale;
      })
      .attr("font-weight", (d: any) => {
        if (d.data.depth === 0) return 600;
        if (d.data.depth === 1) return 500;
        if (d.data.depth === 2) return 400;
        return 350;
      })
      .attr("fill", "hsl(var(--foreground))")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.7)")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d: any) => d.data.word);
    
    // Mark render as complete
    setRenderComplete(true);

  }, [nodes, edges, hubNodeIds]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ 
        background: "hsl(var(--background))",
        cursor: "default"
      }}
      onClick={() => setSelectedId(null)}
    />
  );
}
