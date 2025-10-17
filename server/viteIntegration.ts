// viteIntegration.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.warn('[WARN] Vite dev server is disabled in the server package. Start the client separately with: npm run dev (repo root)');
  return; // Run API-only in development
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Only serve static assets (CSS, JS, images, etc.) - NOT the client application
  app.use(express.static(distPath, {
    // Only serve files that exist, don't fall back to index.html
    fallthrough: false
  }));

  // Remove the catch-all route that was serving index.html
  // The server should only handle API routes, not client routes
} 