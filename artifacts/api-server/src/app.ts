import express, { type Express, type Request, type Response } from "express";
import http from "http";
import path from "path";

const app: Express = express();

const DASHBOARD_PORT = 5000;

// Resolve the built React frontend relative to this file's location in dist/
const DIST = path.resolve(__dirname, "../../../artifacts/dashboard/dist");

// Health check — returns 200 immediately without proxying.
// Required for Replit deployment healthchecks to pass.
app.get("/api", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Serve the Vite-built React SPA static assets (JS, CSS, images, etc.)
app.use(express.static(DIST, { index: false }));

// Proxy everything else to the dashboard Express server on port 5000.
// The dashboard handles auth, API routes, and the SPA index.html fallback.
app.use((req: Request, res: Response) => {
  const options = {
    hostname: "localhost",
    port: DASHBOARD_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${DASHBOARD_PORT}`,
    },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    // Dashboard not yet ready — serve the SPA shell so the page still loads
    res.sendFile(path.join(DIST, "index.html"));
  });

  req.pipe(proxy, { end: true });
});

export default app;
