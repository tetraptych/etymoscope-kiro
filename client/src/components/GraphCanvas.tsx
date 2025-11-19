import { useEffect, useRef, useState } from "react";
import * as d3 from "d3-force";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import type { GraphNode, GraphEdge } from "@shared/schema";

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hubNodeIds: Set<string>;
  onNodeClick: (node: GraphNode) => void;
}

interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  isHub?: boolean;
  highlight?: boolean;
  dim?: boolean;
}

interface D3Link {
  source: D3Node;
  target: D3Node;
  highlight?: boolean;
  dim?: boolean;
}

// Performance configuration
const SKIP_SIMULATION_THRESHOLD = 200; // Skip animation above this many nodes

export default function GraphCanvas({ nodes, edges, hubNodeIds, onNodeClick }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const edgesRef = useRef(edges);
  
  // Hover and selection state management
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);
  
  // Keep edges ref up to date
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  
  // Determine performance mode based on node count
  const nodeCount = nodes.length;
  const skipSimulation = nodeCount > SKIP_SIMULATION_THRESHOLD;
  const disableHoverEffects = nodeCount > 400; // Disable hover for large graphs to prevent rendering issues
  


  // Build adjacency map to track which nodes are connected to each other
  const adjacencyMapRef = useRef(new Map<string, Set<string>>());
  
  useEffect(() => {
    const map = new Map<string, Set<string>>();
    
    // Initialize sets for all nodes
    for (const node of nodes) {
      map.set(node.id, new Set<string>());
    }
    
    // Populate with bidirectional connections
    for (const edge of edges) {
      const fromSet = map.get(edge.from);
      const toSet = map.get(edge.to);
      
      if (fromSet) {
        fromSet.add(edge.to);
      }
      if (toSet) {
        toSet.add(edge.from);
      }
    }
    
    adjacencyMapRef.current = map;
  }, [nodes, edges]);

  // Keep the callback ref up to date
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // Update node and edge highlight and dim states when hoveredId or selectedId changes
  useEffect(() => {
    // Disable all visual effects for very large graphs to prevent rendering issues
    if (disableHoverEffects) return;
    
    // For smaller graphs, use hover or selection
    const activeId = hoveredId || selectedId;
    
    if (!svgRef.current || !renderComplete) return;

    const svg = select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, D3Node>("g.node");
    const edgeElements = svg.selectAll<SVGPathElement, D3Link>("path.edge");

    // Guard: if elements don't exist yet, skip this update
    if (nodeElements.empty() || edgeElements.empty()) return;

    if (activeId === null) {
      // No hover: set all nodes and edges to normal state
      nodeElements.each(function(d) {
        d.highlight = false;
        d.dim = false;
      });
      
      edgeElements.each(function(d) {
        d.highlight = false;
        d.dim = false;
      });
    } else {
      // Active node (hovered or selected): create focus set with node, its neighbors, and all ancestors back to root
      const focusSet = new Set<string>();
      focusSet.add(activeId);
      
      // Add direct neighbors (children and siblings)
      const neighbors = adjacencyMapRef.current.get(activeId);
      if (neighbors) {
        neighbors.forEach(neighborId => focusSet.add(neighborId));
      }
      
      // Add all ancestors back to root by traversing parent relationships
      // We need to build this from the edges since parentMap is created in the main useEffect
      const parentMap = new Map<string, string>();
      for (const edge of edgesRef.current) {
        parentMap.set(edge.to, edge.from);
      }
      
      // Walk up the tree from active node to root
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

      // Update all nodes based on whether they're in the focus set
      nodeElements.each(function(d) {
        if (focusSet.has(d.id)) {
          d.highlight = true;
          d.dim = false;
        } else {
          d.highlight = false;
          d.dim = true;
        }
      });
      
      // Update all edges based on active state
      edgeElements.each(function(d) {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        // Highlight if edge is connected to active node
        const connectedToActive = sourceId === activeId || targetId === activeId;
        
        // Also highlight if both source and target are in focusSet
        const bothInFocusSet = focusSet.has(sourceId) && focusSet.has(targetId);
        
        if (connectedToActive || bothInFocusSet) {
          d.highlight = true;
          d.dim = false;
        } else {
          d.highlight = false;
          d.dim = true;
        }
      });
    }

    // Apply visual styling based on highlight/dim state for nodes using CSS classes
    nodeElements
      .classed("node-highlight", d => d.highlight === true)
      .classed("node-dim", d => d.dim === true);

    // Apply visual styling based on highlight/dim state for edges using CSS classes
    edgeElements
      .classed("edge-highlight", d => d.highlight === true)
      .classed("edge-dim", d => d.dim === true);
  }, [hoveredId, selectedId, disableHoverEffects]);

  useEffect(() => {
    console.log('[CRITICAL] Main render triggered - this should NOT happen during hover');
    if (!svgRef.current || nodes.length === 0) return;

    // Reset render complete flag
    setRenderComplete(false);

    // Clean up previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create a container group for zoom/pan
    const container = svg.append("g").attr("class", "container");

    // Create groups for edges and nodes within the container
    const edgesGroup = container.append("g").attr("class", "edges");
    const nodesGroup = container.append("g").attr("class", "nodes");

    // Add zoom and pan behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4]) // Allow zoom from 10% to 400%
      .on("start", () => {
        svg.style("cursor", "grabbing");
      })
      .on("zoom", (event: any) => {
        container.attr("transform", event.transform);
      })
      .on("end", () => {
        svg.style("cursor", "default");
      });

    svg.call(zoomBehavior);

    // Prepare data
    const d3Nodes: D3Node[] = nodes.map((node) => ({ ...node }));
    const nodeMap = new Map(d3Nodes.map((n) => [n.id, n]));

    const d3Links: D3Link[] = edges
      .map((edge) => {
        const source = nodeMap.get(edge.from);
        const target = nodeMap.get(edge.to);
        return source && target ? { source, target } : null;
      })
      .filter((link): link is D3Link => link !== null);

    // Mark nodes as hubs based on the hubNodeIds passed from parent
    for (const node of d3Nodes) {
      node.isHub = hubNodeIds.has(node.id);
    }

    // Root node will be positioned by the tree layout below

    // This will be continued in the next tasks
    // For now, just render static nodes and edges

    // Render edges
    const edgeElements = edgesGroup
      .selectAll("path")
      .data(d3Links)
      .join("path")
      .attr("class", "edge")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const maxDepth = Math.max(d.source.depth, d.target.depth);
        const opacity = maxDepth === 0 ? 0.68 : maxDepth === 1 ? 0.5 : 0.4;
        return `rgba(156, 163, 175, ${opacity})`;
      })
      .attr("stroke-width", (d) => {
        const maxDepth = Math.max(d.source.depth, d.target.depth);
        return maxDepth <= 1 ? 2 : 1.5;
      });

    // Render nodes
    const nodeElements = nodesGroup
      .selectAll("g")
      .data(d3Nodes)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedId(d.id);
        onNodeClickRef.current(d);
      })
      .on("mouseenter", function(_event, d) {
        setHoveredId(d.id);
        const node = select(this);
        node.attr("transform", `translate(${d.x},${d.y}) scale(1.2)`);
        node.select("circle, rect, path").attr("stroke-width", 3);
      })
      .on("mouseleave", function(_event, d) {
        setHoveredId(null);
        const node = select(this);
        node.attr("transform", `translate(${d.x},${d.y}) scale(1)`);
        node.select("circle, rect, path").attr("stroke-width", 2);
      });

    // Add shapes (circles for normal nodes, diamonds for hub nodes)
    nodeElements.each(function(d) {
      const node = select(this);
      const size = d.depth === 0 ? 10 : d.depth === 1 ? 8 : d.depth === 2 ? 7 : 4;
      const color = d.isHub
        ? "hsl(30 90% 55%)" // Amber for hub nodes
        : d.depth === 0
        ? "hsl(45 100% 55%)" // Yellow for root
        : d.depth === 1
        ? "hsl(210 95% 45%)" // Darker, more saturated blue for depth 1
        : d.depth === 2
        ? "hsl(210 80% 65%)" // Lighter blue for depth 2
        : "hsl(210 65% 78%)"; // Even lighter blue for depth 3

      if (d.isHub && d.depth > 0) {
        // Diamond for hub nodes (not root) - rotated square
        // Use a larger base size so hubs don't shrink as much with depth
        const hubSize = d.depth === 1 ? 9 : 8; // Hubs stay larger at deeper depths
        const diamondSize = hubSize * 1.2; // Slightly larger to match visual weight of circles
        const diamondPath = `M 0,${-diamondSize} L ${diamondSize},0 L 0,${diamondSize} L ${-diamondSize},0 Z`;
        
        node
          .append("path")
          .attr("d", diamondPath)
          .attr("fill", color)
          .attr("stroke", "hsl(var(--background))")
          .attr("stroke-width", 2);
      } else {
        // Circle for normal nodes and root
        if (d.depth === 3) {
          // Depth 3: rings with background fill to hide edges
          node
            .append("circle")
            .attr("r", size)
            .attr("fill", "hsl(var(--background))")
            .attr("stroke", color)
            .attr("stroke-width", 2);
        } else {
          // Other depths: filled circles
          node
            .append("circle")
            .attr("r", size)
            .attr("fill", color)
            .attr("stroke", "hsl(var(--background))")
            .attr("stroke-width", 2);
        }
      }
    });

    // Add labels
    nodeElements
      .append("text")
      .attr("x", (d) => (d.depth === 0 ? 12 : 8))
      .attr("y", 4)
      .attr("font-size", (d) => (d.depth === 0 ? 13 : 11))
      .attr("font-weight", (d) => {
        // Gradually decrease font weight with depth
        if (d.depth === 0) return 600;
        if (d.depth === 1) return 500;
        if (d.depth === 2) return 400;
        return 350; // depth 3
      })
      .attr("fill", "hsl(var(--foreground))")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.7)")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d) => d.word);

    // Build tree structure from edges
    const childrenByParent = new Map<string, D3Node[]>();
    const parentMap = new Map<string, D3Node>();
    
    for (const edge of edges) {
      const parent = nodeMap.get(edge.from);
      const child = nodeMap.get(edge.to);
      
      if (parent && child) {
        if (!childrenByParent.has(parent.id)) {
          childrenByParent.set(parent.id, []);
        }
        childrenByParent.get(parent.id)!.push(child);
        parentMap.set(child.id, parent);
      }
    }

    // Calculate radial tree layout
    const maxDepth = Math.max(...d3Nodes.map((n) => n.depth));
    const availableRadius = Math.min(width, height) / 2 - 100;
    const radiusPerDepth = maxDepth > 0 ? availableRadius / maxDepth : 150;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate subtree sizes (number of descendants)
    const subtreeSizes = new Map<string, number>();
    const calculateSubtreeSize = (nodeId: string): number => {
      if (subtreeSizes.has(nodeId)) {
        return subtreeSizes.get(nodeId)!;
      }
      
      const children = childrenByParent.get(nodeId) || [];
      let size = 1; // Count self
      
      for (const child of children) {
        size += calculateSubtreeSize(child.id);
      }
      
      subtreeSizes.set(nodeId, size);
      return size;
    };
    
    // Calculate sizes for all nodes
    for (const node of d3Nodes) {
      calculateSubtreeSize(node.id);
    }

    // Assign angular positions using tree layout
    // Each node gets angular space proportional to its subtree size
    const assignAngularPositions = (node: D3Node, startAngle: number, endAngle: number) => {
      const children = childrenByParent.get(node.id) || [];
      const angleRange = endAngle - startAngle;
      
      // Position this node at the center of its angular range
      const nodeAngle = startAngle + angleRange / 2;
      
      // Better radius: nodes with large subtrees get pushed further out
      const baseRadius = Math.min(radiusPerDepth, 120);
      const subtreeSize = subtreeSizes.get(node.id) || 1;
      
      // Add extra distance for nodes with many descendants
      // This gives their subtree more room to spread
      // Reduced multiplier to avoid pushing nodes too far
      const extraDistance = subtreeSize > 10 ? Math.log(subtreeSize) * 10 : 0;
      const radius = node.depth * baseRadius + extraDistance;
      
      node.x = centerX + radius * Math.cos(nodeAngle);
      node.y = centerY + radius * Math.sin(nodeAngle);
      
      // Recursively assign positions to children
      if (children.length > 0) {
        // Sort children by id for consistency
        children.sort((a, b) => a.id.localeCompare(b.id));
        
        // Calculate total subtree size of all children
        const totalSize = children.reduce((sum, child) => sum + (subtreeSizes.get(child.id) || 1), 0);
        
        // Allocate angular space proportional to subtree size
        let currentAngle = startAngle;
        children.forEach((child) => {
          const childSize = subtreeSizes.get(child.id) || 1;
          const childAngleRange = angleRange * (childSize / totalSize);
          const childEndAngle = currentAngle + childAngleRange;
          
          assignAngularPositions(child, currentAngle, childEndAngle);
          currentAngle = childEndAngle;
        });
      }
    };

    // Find root and start layout
    const rootNode = d3Nodes.find((n) => n.depth === 0);
    if (rootNode) {
      rootNode.x = centerX;
      rootNode.y = centerY;
      
      const children = childrenByParent.get(rootNode.id) || [];
      if (children.length > 0) {
        children.sort((a, b) => a.id.localeCompare(b.id));
        const anglePerChild = (2 * Math.PI) / children.length;
        
        children.forEach((child, i) => {
          const startAngle = i * anglePerChild;
          const endAngle = startAngle + anglePerChild;
          assignAngularPositions(child, startAngle, endAngle);
        });
      }
    }

    // Custom force to reduce edge crossings by keeping siblings in angular order
    const edgeCrossingForce = () => {
      for (const [parentId, children] of childrenByParent) {
        if (children.length < 2) continue;
        
        const parent = nodeMap.get(parentId);
        if (!parent || parent.x === undefined || parent.y === undefined) continue;
        
        // Sort children by their current angle from parent
        const childrenWithAngles = children
          .filter(c => c.x !== undefined && c.y !== undefined)
          .map(child => ({
            node: child,
            angle: Math.atan2(child.y! - parent.y!, child.x! - parent.x!)
          }))
          .sort((a, b) => a.angle - b.angle);
        
        // Push siblings apart if they're too close angularly
        for (let i = 0; i < childrenWithAngles.length - 1; i++) {
          const curr = childrenWithAngles[i];
          const next = childrenWithAngles[i + 1];
          
          let angleDiff = next.angle - curr.angle;
          // Normalize to [0, 2π]
          if (angleDiff < 0) angleDiff += 2 * Math.PI;
          
          // Minimum angular separation (in radians)
          const minAngle = 0.15; // About 8.6 degrees
          
          if (angleDiff < minAngle) {
            // Push them apart angularly
            const pushStrength = 0.5;
            const targetAngleDiff = minAngle - angleDiff;
            
            // Calculate perpendicular push direction
            const currRadius = Math.sqrt(
              Math.pow(curr.node.x! - parent.x!, 2) + 
              Math.pow(curr.node.y! - parent.y!, 2)
            );
            const nextRadius = Math.sqrt(
              Math.pow(next.node.x! - parent.x!, 2) + 
              Math.pow(next.node.y! - parent.y!, 2)
            );
            
            // Push curr counter-clockwise
            const currPerpAngle = curr.angle - Math.PI / 2;
            curr.node.vx = (curr.node.vx || 0) + Math.cos(currPerpAngle) * pushStrength * currRadius * targetAngleDiff;
            curr.node.vy = (curr.node.vy || 0) + Math.sin(currPerpAngle) * pushStrength * currRadius * targetAngleDiff;
            
            // Push next clockwise
            const nextPerpAngle = next.angle + Math.PI / 2;
            next.node.vx = (next.node.vx || 0) + Math.cos(nextPerpAngle) * pushStrength * nextRadius * targetAngleDiff;
            next.node.vy = (next.node.vy || 0) + Math.sin(nextPerpAngle) * pushStrength * nextRadius * targetAngleDiff;
          }
        }
      }
    };

    // Store initial angular positions to constrain drift
    const initialAngles = new Map<string, number>();
    for (const node of d3Nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        const angle = Math.atan2(node.y - centerY, node.x - centerX);
        initialAngles.set(node.id, angle);
      }
    }

    // Custom force to keep nodes in their angular wedge
    const angularConstraintForce = () => {
      for (const node of d3Nodes) {
        if (node.depth === 0) continue;
        
        const initialAngle = initialAngles.get(node.id);
        if (initialAngle === undefined || node.x === undefined || node.y === undefined) continue;
        
        const currentAngle = Math.atan2(node.y - centerY, node.x - centerX);
        let angleDiff = currentAngle - initialAngle;
        
        // Normalize to [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // If drifted too far from initial angle, pull back
        const maxDrift = 0.3; // About 17 degrees
        if (Math.abs(angleDiff) > maxDrift) {
          const radius = Math.sqrt(
            Math.pow(node.x - centerX, 2) + 
            Math.pow(node.y - centerY, 2)
          );
          
          const targetAngle = initialAngle + Math.sign(angleDiff) * maxDrift;
          const targetX = centerX + radius * Math.cos(targetAngle);
          const targetY = centerY + radius * Math.sin(targetAngle);
          
          const strength = 0.3;
          node.vx = (node.vx || 0) + (targetX - node.x) * strength;
          node.vy = (node.vy || 0) + (targetY - node.y) * strength;
        }
      }
    };

    // Custom force to keep nodes away from the root (center)
    const centerRepulsionForce = () => {
      const minDistance = 80; // Minimum distance from center
      
      for (const node of d3Nodes) {
        if (node.depth === 0) continue;
        if (node.x === undefined || node.y === undefined) continue;
        
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If too close to center, push away strongly
        if (distance < minDistance) {
          const strength = 2.0; // Strong repulsion
          const pushDistance = minDistance - distance;
          const angle = Math.atan2(dy, dx);
          
          node.vx = (node.vx || 0) + Math.cos(angle) * pushDistance * strength;
          node.vy = (node.vy || 0) + Math.sin(angle) * pushDistance * strength;
        }
      }
    };

    // Custom force to ensure children are always further from root than their parent
    const parentDistanceConstraint = () => {
      for (const node of d3Nodes) {
        if (node.depth <= 1) continue; // Skip root and depth 1
        if (node.x === undefined || node.y === undefined) continue;
        
        const parent = parentMap.get(node.id);
        if (!parent || parent.x === undefined || parent.y === undefined) continue;
        
        // Calculate distances from center
        const nodeDistance = Math.sqrt(
          Math.pow(node.x - centerX, 2) + 
          Math.pow(node.y - centerY, 2)
        );
        const parentDistance = Math.sqrt(
          Math.pow(parent.x - centerX, 2) + 
          Math.pow(parent.y - centerY, 2)
        );
        
        // Child must be at least 30px further from center than parent
        const minExtraDistance = 30;
        const requiredDistance = parentDistance + minExtraDistance;
        
        if (nodeDistance < requiredDistance) {
          // Push child further out radially
          const angle = Math.atan2(node.y - centerY, node.x - centerX);
          const targetX = centerX + requiredDistance * Math.cos(angle);
          const targetY = centerY + requiredDistance * Math.sin(angle);
          
          const strength = 0.5;
          node.vx = (node.vx || 0) + (targetX - node.x) * strength;
          node.vy = (node.vy || 0) + (targetY - node.y) * strength;
        }
      }
    };

    // Now apply a gentle force simulation to spread out overlapping nodes
    // while maintaining the tree structure
    // Adjust simulation parameters based on performance mode
    const simulation = d3
      .forceSimulation(d3Nodes)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(d3Links)
          .id((d) => d.id)
          .distance(45)
          .strength(2.0)
      )
      .force(
        "collide",
        d3.forceCollide<D3Node>()
          .radius(32)
          .strength(0.9)
          .iterations(3)
      )
      .force(
        "radial",
        d3.forceRadial<D3Node>(
          (d) => {
            const radius = d.depth * Math.min(radiusPerDepth, 120);
            return radius;
          },
          centerX,
          centerY
        ).strength(0.7)
      )
      .force(
        "charge",
        d3.forceManyBody<D3Node>()
          .strength(() => -25)
          .distanceMax(100)
      );

    // Add custom forces for better layout
    simulation
      .force("edgeCrossing", edgeCrossingForce)
      .force("angularConstraint", angularConstraintForce)
      .force("centerRepulsion", centerRepulsionForce)
      .force("parentDistance", parentDistanceConstraint)
      .alpha(0.2)
      .alphaDecay(0.03);

    // For large graphs, run simulation to completion without animating
    if (skipSimulation) {
      
      // Stop the simulation from auto-starting
      simulation.stop();
      
      // Run simulation synchronously to completion
      const targetIterations = 500; // More iterations for better node spreading
      for (let i = 0; i < targetIterations; i++) {
        simulation.tick();
      }
      
      // Render final positions once
      nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);
      edgeElements.attr("d", (d) => {
        const sx = d.source.x || 0;
        const sy = d.source.y || 0;
        const tx = d.target.x || 0;
        const ty = d.target.y || 0;
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} Q${mx},${my} ${tx},${ty}`;
      });
      
      // Mark rendering as complete
      setRenderComplete(true);
    } else {
      // Normal animated simulation for smaller graphs
      simulation.on("tick", () => {
        nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);

        edgeElements.attr("d", (d) => {
          const sx = d.source.x || 0;
          const sy = d.source.y || 0;
          const tx = d.target.x || 0;
          const ty = d.target.y || 0;
          const mx = (sx + tx) / 2;
          const my = (sy + ty) / 2;
          return `M${sx},${sy} Q${mx},${my} ${tx},${ty}`;
        });
      });
      
      // Mark rendering as complete after first tick
      simulation.on("tick.renderComplete", () => {
        setRenderComplete(true);
        simulation.on("tick.renderComplete", null); // Remove this listener after first call
      });
    }

    simulationRef.current = simulation;

    // Cleanup
    return () => {
      if (simulation) simulation.stop();
    };

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
