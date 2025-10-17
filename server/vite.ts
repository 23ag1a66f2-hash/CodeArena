import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Create a custom logger
const logger = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string, options?: { error?: Error }) => console.error(msg, options?.error || ''),
  clearScreen: () => {},
};

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
  const serverOptions = {
    middlewareMode: true as const,
    hmr: { server },
    allowedHosts: true,
  };

  // Dynamic import via variable to avoid TS resolving local './vite'
  const viteSpecifier = 'vite';
  const viteModule: any = await import(viteSpecifier as any);
  const createViteServer: any = viteModule.createServer || (viteModule.default && viteModule.default.createServer);

  // Load React plugin dynamically (optional)
  let reactPlugin: any = undefined;
  try {
    const reactModule: any = await import('@vitejs/plugin-react');
    reactPlugin = reactModule.default ? reactModule.default() : undefined;
  } catch {
    // proceed without plugin
  }

  const viteServer = await createViteServer({
    // Prevent loading the root vite.config.js to avoid ESM/CJS ambiguity
    configFile: false,
    envFile: false,
    // Serve from the client directory
    root: path.resolve(process.cwd(), 'client'),
    server: serverOptions,
    appType: "custom",
    logLevel: 'info',
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'client', 'src'),
      },
    },
    plugins: reactPlugin ? [reactPlugin] : [],
  } as any);

  app.use(viteServer.middlewares);

  // Handle all routes for client-side routing
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes
    if (url.startsWith('/api')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      (viteServer as any).ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Handle all routes for client-side routing in production
  // app.get("*", (req, res, next) => {
  //   // Skip API routes
  //   if (req.path.startsWith('/api')) {
  //     return next();
  //   }
  //   res.sendFile(path.resolve(distPath, "index.html"));
  // });
}
