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

  return { nodes, edges };
}
