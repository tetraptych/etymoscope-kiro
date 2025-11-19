import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface GraphNode {
  word: string;
  depth: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface EtymologyData {
  [word: string]: string[];
}

let cachedData: EtymologyData | null = null;

export async function loadData(): Promise<EtymologyData> {
  if (cachedData) {
    console.log('Using cached data');
    return cachedData;
  }

  console.log('Loading data from S3...');
  const s3 = new S3Client({});
  
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
  
  if (!data[word]) {
    return { nodes: [], edges: [] };
  }

  const visited = new Set<string>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const queue: Array<{ word: string; depth: number }> = [{ word, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.word) || current.depth > depth) {
      continue;
    }

    visited.add(current.word);
    nodes.push({ word: current.word, depth: current.depth });

    const related = data[current.word] || [];
    for (const relatedWord of related) {
      if (!visited.has(relatedWord)) {
        edges.push({ from: current.word, to: relatedWord });
        if (current.depth < depth) {
          queue.push({ word: relatedWord, depth: current.depth + 1 });
        }
      }
    }
  }

  return { nodes, edges };
}

export async function getRandomWord(): Promise<string> {
  const data = await loadData();
  const words = Object.keys(data);
  return words[Math.floor(Math.random() * words.length)];
}
