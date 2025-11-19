import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface GraphNode {
  id: string;
  word: string;
  definition: string;
  depth: number;
  relatedWords: string[];
}

interface GraphEdge {
  from: string;
  to: string;
}

interface WordEntry {
  relatedWords: string[];
  definition: string;
}

interface EtymologyData {
  [word: string]: WordEntry;
}

let cachedData: EtymologyData | null = null;

export async function loadData(): Promise<EtymologyData> {
  if (cachedData) {
    console.log('Using cached data');
    return cachedData;
  }

  console.log('Loading data from S3...');
  const s3 = new S3Client({ region: 'us-west-2' });
  
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.DATA_BUCKET!,
    Key: process.env.DATA_KEY!
  }));

  const body = await response.Body!.transformToString();
  cachedData = JSON.parse(body);
  console.log(`Loaded ${Object.keys(cachedData).length} words`);
  
  return cachedData;
}

export async function getWordGraph(
  word: string,
  depth: number
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const data = await loadData();
  const normalizedWord = word.toLowerCase().trim();
  
  if (!data[normalizedWord]) {
    return { nodes: [], edges: [] };
  }

  const visited = new Set<string>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const queue: Array<{ word: string; depth: number }> = [{ word: normalizedWord, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.word) || current.depth > depth) {
      continue;
    }

    visited.add(current.word);
    
    const entry = data[current.word];
    if (!entry) continue;
    
    nodes.push({
      id: current.word,
      word: current.word,
      definition: entry.definition,
      depth: current.depth,
      relatedWords: entry.relatedWords
    });
    
    const related = entry.relatedWords || [];
    for (const relatedWord of related) {
      const normalizedRelated = relatedWord.toLowerCase().trim();
      if (!visited.has(normalizedRelated) && data[normalizedRelated]) {
        edges.push({ from: current.word, to: normalizedRelated });
        if (current.depth < depth) {
          queue.push({ word: normalizedRelated, depth: current.depth + 1 });
        }
      }
    }
  }

  // Hub node pruning: remove children of nodes with >= 80 children at depth >= 1
  // Feature flag: set to false to disable hub pruning
  const ENABLE_HUB_PRUNING = true;
  const HUB_THRESHOLD = 80;
  
  if (!ENABLE_HUB_PRUNING) {
    return { nodes, edges };
  }
  
  // Build depth map
  const nodeDepthMap = new Map<string, number>();
  for (const node of nodes) {
    nodeDepthMap.set(node.id, node.depth);
  }
  
  // Build parent -> children map
  const childrenByParent = new Map<string, Set<string>>();
  for (const edge of edges) {
    const sourceDepth = nodeDepthMap.get(edge.from) || 0;
    const targetDepth = nodeDepthMap.get(edge.to) || 0;
    
    if (sourceDepth < targetDepth) {
      if (!childrenByParent.has(edge.from)) {
        childrenByParent.set(edge.from, new Set());
      }
      childrenByParent.get(edge.from)!.add(edge.to);
    } else if (targetDepth < sourceDepth) {
      if (!childrenByParent.has(edge.to)) {
        childrenByParent.set(edge.to, new Set());
      }
      childrenByParent.get(edge.to)!.add(edge.from);
    }
  }
  
  // Identify hub nodes and mark their children for removal
  const nodesToRemove = new Set<string>();
  for (const [nodeId, children] of childrenByParent.entries()) {
    const nodeDepth = nodeDepthMap.get(nodeId);
    if (nodeDepth !== undefined && nodeDepth >= 1 && children.size >= HUB_THRESHOLD) {
      for (const childId of children) {
        nodesToRemove.add(childId);
      }
    }
  }
  
  // Recursively remove all descendants
  let changed = true;
  while (changed) {
    changed = false;
    for (const [parentId, children] of childrenByParent.entries()) {
      if (nodesToRemove.has(parentId)) {
        for (const childId of children) {
          if (!nodesToRemove.has(childId)) {
            nodesToRemove.add(childId);
            changed = true;
          }
        }
      }
    }
  }
  
  // Filter out pruned nodes and edges
  const filteredNodes = nodes.filter((node) => !nodesToRemove.has(node.id));
  const filteredEdges = edges.filter(
    (edge) => !nodesToRemove.has(edge.from) && !nodesToRemove.has(edge.to)
  );
  
  return { nodes: filteredNodes, edges: filteredEdges };
}
