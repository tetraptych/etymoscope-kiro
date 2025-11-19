import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { resolve } from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  const dataPath = resolve(process.cwd(), "data/full-data.json");
  const maxDepth = 3;

  try {
    await storage.loadEtymologyData(dataPath);
  } catch (error) {
    console.warn(
      "[routes] Could not load etymology data file. API will return empty results until data is loaded."
    );
  }

  app.get("/api/random", async (req, res) => {
    try {
      const randomWord = await storage.getRandomWord();
      
      if (!randomWord) {
        return res.status(404).json({
          error: "No words available in the database.",
        });
      }

      return res.json({ word: randomWord });
    } catch (error) {
      console.error("[API] Error fetching random word:", error);
      return res.status(500).json({
        error: "Internal server error while fetching random word.",
      });
    }
  });

  app.get("/api/words/:word", async (req, res) => {
    try {
      const { word } = req.params;
      const depthParam = req.query.depth;

      // Validate word parameter
      if (!word || word.trim().length === 0) {
        return res.status(400).json({
          error: "Word parameter is required.",
        });
      }

      // Validate and parse depth parameter
      const depth = depthParam ? parseInt(depthParam as string, 10) : maxDepth;

      if (isNaN(depth) || depth < 1 || depth > maxDepth) {
        return res.status(400).json({
          error: `Invalid depth parameter. Must be a number between 1 and ${maxDepth}.`,
        });
      }

      // Fetch word graph
      const result = await storage.getWordGraph(word, depth);

      if (result.nodes.length === 0) {
        return res.status(404).json({
          error: `Word '${word}' not found in the etymology database.`,
        });
      }

      return res.json(result);
    } catch (error) {
      console.error("[API] Error fetching word graph:", error);
      return res.status(500).json({
        error: "Internal server error while fetching word graph.",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
