import { z } from "zod";

// Word entry schema - represents a single word in the etymology database
export const wordEntrySchema = z.object({
  definition: z.string(),
  relatedWords: z.array(z.string()),
});

// Etymology data schema - the entire database structure
export const etymologyDataSchema = z.record(z.string(), wordEntrySchema);

// Graph node schema - represents a word node in the visualization
export const graphNodeSchema = z.object({
  id: z.string(),
  word: z.string(),
  definition: z.string(),
  depth: z.number().int().min(0),
  relatedWords: z.array(z.string()),
});

// Graph edge schema - represents a connection between two words
export const graphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

// Word graph response schema - API response for word graph queries
export const wordGraphResponseSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

// Export TypeScript types derived from schemas
export type WordEntry = z.infer<typeof wordEntrySchema>;
export type EtymologyData = z.infer<typeof etymologyDataSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type WordGraphResponse = z.infer<typeof wordGraphResponseSchema>;

// Validation helper for API responses
export function validateWordGraphResponse(data: unknown): WordGraphResponse {
  return wordGraphResponseSchema.parse(data);
}

// Validation helper for etymology data
export function validateEtymologyData(data: unknown): EtymologyData {
  return etymologyDataSchema.parse(data);
}
