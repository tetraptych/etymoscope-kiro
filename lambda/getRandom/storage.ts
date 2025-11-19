import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface WordEntry {
  relatedWords: string[];
  definition: string;
}

interface EtymologyData {
  [word: string]: WordEntry;
}

let cachedData: EtymologyData | null = null;
let cachedStats: { totalWeight: number; words: Array<{ word: string; numConnections: number; graphSize: number; cumulativeWeight: number }> } | null = null;

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

async function loadWordStats(): Promise<{ totalWeight: number; words: Array<{ word: string; numConnections: number; graphSize: number }> } | null> {
  if (cachedStats) {
    // Validate cached stats has correct format
    if (cachedStats.words && cachedStats.totalWeight) {
      console.log('Using cached stats');
      return cachedStats;
    }
    // Invalid format, clear cache and reload
    console.log('Cached stats in wrong format, reloading...');
    cachedStats = null;
  }

  try {
    console.log('Loading word stats from S3...');
    const s3 = new S3Client({ region: 'us-west-2' });
    
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.DATA_BUCKET!,
      Key: 'data/word-stats.json'
    }));

    const body = await response.Body!.transformToString();
    const parsed = JSON.parse(body);
    
    // Validate format
    if (!parsed.words || !parsed.totalWeight) {
      console.error('Invalid word-stats.json format');
      return null;
    }
    
    cachedStats = parsed;
    console.log(`Loaded stats for ${cachedStats!.words.length} words (total weight: ${cachedStats!.totalWeight})`);
    
    return cachedStats;
  } catch (error) {
    console.warn('Could not load word-stats.json, falling back to slower method');
    return null;
  }
}

// Helper function to compute graph size (simplified version without full node data)
async function getGraphSize(word: string, depth: number, data: EtymologyData): Promise<number> {
  const normalizedWord = word.toLowerCase().trim();
  
  if (!data[normalizedWord]) {
    return 0;
  }

  const visited = new Set<string>();
  const queue: Array<{ word: string; depth: number }> = [{ word: normalizedWord, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.word) || current.depth > depth) {
      continue;
    }

    visited.add(current.word);
    
    const entry = data[current.word];
    if (!entry) continue;
    
    const related = entry.relatedWords || [];
    for (const relatedWord of related) {
      const normalizedRelated = relatedWord.toLowerCase().trim();
      if (!visited.has(normalizedRelated) && data[normalizedRelated] && current.depth < depth) {
        queue.push({ word: normalizedRelated, depth: current.depth + 1 });
      }
    }
  }

  return visited.size;
}

export async function getRandomWord(): Promise<string> {
  // Fast path: use precomputed cumulative weights with binary search
  const stats = await loadWordStats();
  if (stats && stats.words.length > 0) {
    const { totalWeight, words } = stats;
    const random = Math.random() * totalWeight;
    
    // Binary search for the word
    let left = 0;
    let right = words.length - 1;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (words[mid].cumulativeWeight < random) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return words[left].word;
  }
  
  // Fallback: return any word with connections
  const data = await loadData();
  const words = Object.keys(data);
  
  for (const word of words) {
    const entry = data[word];
    if (entry && entry.relatedWords.length > 0) {
      return word;
    }
  }

  // Last resort: return any word
  if (words.length > 0) {
    return words[Math.floor(Math.random() * words.length)];
  }
  
  throw new Error('No words in database');
}
