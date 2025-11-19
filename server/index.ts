import express from "express";
import { registerRoutes } from "./routes.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve public folder in both dev and production
const publicPath = process.env.NODE_ENV === "production" 
  ? join(__dirname, "../client/public")
  : join(__dirname, "../client/public");
app.use(express.static(publicPath));

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = join(__dirname, "../client");
  app.use(express.static(clientPath));
}

// Register API routes
const server = await registerRoutes(app);

// Serve index.html for all non-API routes in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../client/index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`[server] Server running on port ${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV || "development"}`);
});
