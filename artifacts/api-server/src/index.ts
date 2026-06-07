import app from "./app";
import { logger } from "./lib/logger";
import { spawn } from "child_process";
import net from "net";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(300);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
    socket.connect(port, "127.0.0.1");
  });
}

// In artifact/deployment mode the dashboard server is NOT started automatically
// (only the api-server artifact runs). We detect this by checking if port 5000
// is already listening. If it is (dev mode — the workflow is running it), we
// skip the spawn. If not (production), we start it ourselves.
isPortListening(5000).then((running) => {
  if (running) {
    logger.info("Dashboard already running on port 5000 — skipping spawn");
    return;
  }

  logger.info("Dashboard not detected on port 5000 — spawning now");

  const dashboard = spawn(
    "pnpm",
    ["--filter", "@workspace/dashboard", "run", "start"],
    {
      env: { ...process.env, PORT: "5000" },
      stdio: "inherit",
    },
  );

  dashboard.on("error", (err) => {
    logger.error({ err }, "Failed to spawn dashboard process");
  });

  dashboard.on("exit", (code) => {
    logger.error({ code }, "Dashboard process exited unexpectedly — shutting down");
    process.exit(code ?? 1);
  });
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
