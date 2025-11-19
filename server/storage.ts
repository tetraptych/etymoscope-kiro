import { readFileSync } from "fs";
import { resolve } from "path";
import {
  type EtymologyData,
  type WordEntry,
  type GraphNode,
  type GraphEdge,
  validateEtymologyData,
} from "../shared/schema.js";

export interface IStorage {
  loadEtymologyData(filePath: string): Promise<void>;
  getWordEntry(word: string): Promise<WordEntry | undefined>;
  getWordGraph(word: string, depth: number): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  getRandomWord(): Promise<string | undefined>;
}

export class MemStorage implements IStorage {
  private etymologyData: EtymologyData = {};
  private dataLoaded = false;

  async loadEtymologyData(filePath: string): Promise<void> {
    try {
      const absolutePath = resolve(filePath);
      const fileContent = readFileSync(absolutePath, "utf-8");
      const rawData = JSON.parse(fileContent);
      
      // Validate the data structure
      this.etymologyData = validateEtymologyData(rawData);
      this.dataLoaded = true;
      
      console.log(`[storage] Loaded ${Object.keys(this.etymologyData).length} words from ${filePath}`);
    } catch (error) {
      console.error("[storage] Error loading etymology data:", error);
      throw error;
    }
  }

  async getWordEntry(word: string): Promise<WordEntry | undefined> {
    const normalizedWord = word.toLowerCase().trim();
    return this.etymologyData[normalizedWord];
  }

  async getRandomWord(): Promise<string | undefined> {
    const words = Object.keys(this.etymologyData);
    if (words.length === 0) {
      return undefined;
    }

    // Step 1: Pick a random word X with related words
    let wordX: string | undefined;
    let entryX: WordEntry | undefined;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    while (attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * words.length);
      const candidate = words[randomIndex];
      const entry = this.etymologyData[candidate];

      if (entry && entry.relatedWords.length > 0) {
        wordX = candidate;
        entryX = entry;
        break;
      }
      attempts++;
    }

    // If we couldn't find a word with related words, return undefined
    if (!wordX || !entryX) {
      return undefined;
    }

    // Step 2: Pick a random related word Y from X's related words
    let wordY: string | undefined;
    attempts = 0;

    while (attempts < maxAttempts) {
      const randomRelatedIndex = Math.floor(Math.random() * entryX.relatedWords.length);
      const candidateY = entryX.relatedWords[randomRelatedIndex].toLowerCase().trim();
      const entryY = this.etymologyData[candidateY];

      // Step 3: Check that Y has non-empty related words
      if (entryY && entryY.relatedWords.length > 0) {
        wordY = candidateY;
        break;
      }
      attempts++;
    }

    // If we couldn't find a suitable Y, fall back to X
    return wordY || wordX;
  }

  async getWordGraph(
    word: string,
    depth: number
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const normalizedWord = word.toLowerCase().trim();
    const rootEntry = this.etymologyData[normalizedWord];

    if (!rootEntry) {
      return { nodes: [], edges: [] };
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const visited = new Set<string>();
    const nodeDepthMap = new Map<string, number>();
    const queue: Array<{ word: string; depth: number }> = [
      { word: normalizedWord, depth: 0 },
    ];

    visited.add(normalizedWord);
    nodeDepthMap.set(normalizedWord, 0);

    // BFS to build graph
    while (queue.length > 0) {
      const { word: currentWord, depth: currentDepth } = queue.shift()!;

      if (currentDepth > depth) {
        continue;
      }

      const entry = this.etymologyData[currentWord];
      if (!entry) {
        continue;
      }

      // Add node with its related words from the raw data
      nodes.push({
        id: currentWord,
        word: currentWord,
        definition: entry.definition,
        depth: currentDepth,
        relatedWords: entry.relatedWords,
      });

      // Process related words
      for (const relatedWord of entry.relatedWords) {
        const normalizedRelated = relatedWord.toLowerCase().trim();

        // Skip if word doesn't exist in database
        if (!this.etymologyData[normalizedRelated]) {
          continue;
        }

        // Add edge (support non-tree graphs - multiple parents allowed)
        const edgeExists = edges.some(
          (e) =>
            (e.from === currentWord && e.to === normalizedRelated) ||
            (e.from === normalizedRelated && e.to === currentWord)
        );

        if (!edgeExists) {
          edges.push({
            from: currentWord,
            to: normalizedRelated,
          });
        }

        // Add to queue if not visited and within depth limit
        if (!visited.has(normalizedRelated)) {
          const newDepth = currentDepth + 1;
          if (newDepth <= depth) {
            visited.add(normalizedRelated);
            nodeDepthMap.set(normalizedRelated, newDepth);
            queue.push({ word: normalizedRelated, depth: newDepth });
          }
        }
      }
    }

    // Hub node pruning: remove children of nodes with >= 80 children at depth >= 1
    const HUB_THRESHOLD = 80;
    const childrenByParent = new Map<string, Set<string>>();

    // Build parent -> children map (considering both directions of edges)
    for (const edge of edges) {
      const sourceDepth = nodeDepthMap.get(edge.from) || 0;
      const targetDepth = nodeDepthMap.get(edge.to) || 0;
      
      // Determine parent-child relationship based on depth
      if (sourceDepth < targetDepth) {
        // edge.from is parent, edge.to is child
        if (!childrenByParent.has(edge.from)) {
          childrenByParent.set(edge.from, new Set());
        }
        childrenByParent.get(edge.from)!.add(edge.to);
      } else if (targetDepth < sourceDepth) {
        // edge.to is parent, edge.from is child
        if (!childrenByParent.has(edge.to)) {
          childrenByParent.set(edge.to, new Set());
        }
        childrenByParent.get(edge.to)!.add(edge.from);
      }
    }

    // Identify hub nodes and mark their direct children for removal
    const nodesToRemove = new Set<string>();
    for (const [nodeId, children] of childrenByParent.entries()) {
      const nodeDepth = nodeDepthMap.get(nodeId);
      if (nodeDepth !== undefined && nodeDepth >= 1 && children.size >= HUB_THRESHOLD) {
        // Mark all direct children of this hub node for removal
        for (const childId of children) {
          nodesToRemove.add(childId);
        }
      }
    }

    // Recursively remove all descendants of removed nodes
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

    // Filter out pruned nodes and their edges
    const filteredNodes = nodes.filter((node) => !nodesToRemove.has(node.id));
    const filteredEdges = edges.filter(
      (edge) => !nodesToRemove.has(edge.from) && !nodesToRemove.has(edge.to)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }
}

export const storage = new MemStorage();
