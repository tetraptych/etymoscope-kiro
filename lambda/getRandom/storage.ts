import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
  const data = await loadData();
  const words = Object.keys(data);
  
  if (words.length === 0) {
    throw new Error('No words in database');
  }

  // Build list of all connections (edges)
  const connections: Array<[string, string]> = [];
  for (const word of words) {
    const entry = data[word];
    if (entry && entry.relatedWords.length > 0) {
      for (const relatedWord of entry.relatedWords) {
        const normalized = relatedWord.toLowerCase().trim();
        if (data[normalized]) {
          connections.push([word, normalized]);
        }
      }
    }
  }

  if (connections.length === 0) {
    // Fallback: return any word
    return words[Math.floor(Math.random() * words.length)];
  }

  // Constants for filtering
  const MIN_CONNECTIONS = 1;
  const MAX_NODES = 850; // Same threshold as frontend
  const MAX_ATTEMPTS = 100;

  // Try to find a good word by picking random connections
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const randomIndex = Math.floor(Math.random() * connections.length);
    const [word1, word2] = connections[randomIndex];
    
    const entry1 = data[word1];
    const entry2 = data[word2];
    
    // Check word1: has connections and creates manageable graph
    if (entry1 && entry1.relatedWords.length >= MIN_CONNECTIONS) {
      const size1 = await getGraphSize(word1, 3, data);
      if (size1 <= MAX_NODES) {
        return word1;
      }
    }
    
    // Check word2: has connections and creates manageable graph
    if (entry2 && entry2.relatedWords.length >= MIN_CONNECTIONS) {
      const size2 = await getGraphSize(word2, 3, data);
      if (size2 <= MAX_NODES) {
        return word2;
      }
    }
  }

  // Fallback: return any word with at least one connection
  for (const word of words) {
    const entry = data[word];
    if (entry && entry.relatedWords.length > 0) {
      return word;
    }
  }

  // Last resort: return any word
  return words[Math.floor(Math.random() * words.length)];
}
