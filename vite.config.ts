import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { checkEnvConfigured } from "./src/services/safe-env";

// Ensure server-side environment variables are loaded immediately on boot
const envStatus = checkEnvConfigured();
console.log(
  `[Groww API Env Check] GROWW_API_KEY: ${envStatus.growwApiKey ? "CONFIGURED" : "MISSING"}`,
);
console.log(
  `[Groww API Env Check] GROWW_API_SECRET: ${envStatus.growwApiSecret ? "CONFIGURED" : "MISSING"}`,
);

const growwServerPlugin: Plugin = {
  name: "groww-server-market-data",
  configureServer(server) {
    import("./src/services/server-market-data").then(({ serverMarketData }) => {
      serverMarketData.start().catch((err) => {
        console.error("Groww Feed server startup error:", err);
      });

      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (url === "/api/market-data/status" || url.startsWith("/api/market-data/status?")) {
          serverMarketData.handleStatus(res);
          return;
        }
        if (url === "/api/market-data/ticks" || url.startsWith("/api/market-data/ticks?")) {
          serverMarketData.handleTicks(res);
          return;
        }
        if (url === "/api/market-data/stream" || url.startsWith("/api/market-data/stream?")) {
          serverMarketData.handleStream(req, res);
          return;
        }
        next();
      });
    });
  },
};

export default defineConfig({
  vite: {
    plugins: [growwServerPlugin],
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
