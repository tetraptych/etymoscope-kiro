import type { GraphNode, GraphEdge } from "@shared/schema";

export interface FilteredGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function filterGraphByDepth(
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxDepth: number
): FilteredGraph {
  // Filter nodes by depth
  const filteredNodes = nodes.filter((node) => node.depth <= maxDepth);
  
  // Create a set of valid node IDs for quick lookup
  const validNodeIds = new Set(filteredNodes.map((node) => node.id));
  
  // Filter edges to only include those where both endpoints are in the filtered nodes
  const filteredEdges = edges.filter(
    (edge) => validNodeIds.has(edge.from) && validNodeIds.has(edge.to)
  );
  
  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}
