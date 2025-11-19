import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface WordEntry {
  relatedWords: string[];
  definition: string;
}

interface EtymologyData {
  [word: string]: WordEntry;
}

interface WordStats {
  word: string;
  numConnections: number;
  graphSize: number;
}

// Compute graph size for a word at depth 3
function computeGraphSize(
  word: string,
  depth: number,
  data: EtymologyData
): number {
  const normalizedWord = word.toLowerCase().trim();
  
  if (!data[normalizedWord]) {
    return 0;
  }

  const visited = new Set<string>();
  const queue: Array<{ word: string; depth: number }> = [
    { word: normalizedWord, depth: 0 }
  ];

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

async function main() {
  console.log('Loading etymology data...');
  const dataPath = resolve('./data/full-data.json');
  const fileContent = readFileSync(dataPath, 'utf-8');
  const data: EtymologyData = JSON.parse(fileContent);
  
  const words = Object.keys(data);
  console.log(`Loaded ${words.length} words`);
  
  console.log('Computing statistics for each word...');
  const stats: WordStats[] = [];
  
  let processed = 0;
  for (const word of words) {
    const entry = data[word];
    if (!entry) continue;
    
    const numConnections = entry.relatedWords.length;
    const graphSize = computeGraphSize(word, 3, data);
    
    stats.push({
      word,
      numConnections,
      graphSize
    });
    
    processed++;
    if (processed % 1000 === 0) {
      console.log(`Processed ${processed}/${words.length} words...`);
    }
  }
  
  console.log('Filtering and computing cumulative weights...');
  // Filter: graphSize > 1, has connections, and manageable (≤850 nodes)
  const MAX_NODES = 850;
  const filtered = stats.filter(
    s => s.graphSize > 1 && s.numConnections > 0 && s.graphSize <= MAX_NODES
  );
  filtered.sort((a, b) => a.graphSize - b.graphSize);
  
  // Add cumulative weights for O(log n) binary search selection
  let cumulative = 0;
  const wordsWithCumulative = filtered.map(s => {
    cumulative += s.numConnections;
    return {
      word: s.word,
      numConnections: s.numConnections,
      graphSize: s.graphSize,
      cumulativeWeight: cumulative
    };
  });
  
  // Save to file with metadata
  const output = {
    totalWeight: cumulative,
    words: wordsWithCumulative
  };
  
  const outputPath = resolve('./data/word-stats.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Saved statistics to ${outputPath}`);
  
  // Print some interesting stats
  const withConnections = stats.filter(s => s.numConnections > 0);
  
  console.log('\n=== Statistics ===');
  console.log(`Total words: ${stats.length}`);
  console.log(`Words with connections: ${withConnections.length}`);
  console.log(`Manageable words (saved to file): ${filtered.length}`);
  console.log(`Total weight (sum of connections): ${cumulative}`);
  console.log(`\nSmallest graphs:`);
  filtered.slice(0, 10).forEach(s => {
    console.log(`  ${s.word}: ${s.graphSize} nodes, ${s.numConnections} connections`);
  });
  console.log(`\nLargest graphs:`);
  filtered.slice(-10).forEach(s => {
    console.log(`  ${s.word}: ${s.graphSize} nodes, ${s.numConnections} connections`);
  });
}

main().catch(console.error);
