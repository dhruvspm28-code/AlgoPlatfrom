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

      server.middlewares.use(async (req, res, next) => {
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
        if (url === "/api/market-data/reconnect" || url.startsWith("/api/market-data/reconnect?")) {
          await serverMarketData.handleReconnect(res);
          return;
        }
        if (url === "/api/market-data/historical" || url.startsWith("/api/market-data/historical?")) {
          await serverMarketData.handleHistorical(req, res);
          return;
        }
        if (url === "/api/market-data/candles" || url.startsWith("/api/market-data/candles?")) {
          serverMarketData.handleCandles(req, res);
          return;
        }

        if (url === "/api/auth/otp/status") {
          const { serverOtpEngine } = await import("./src/services/otp-engine-server");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(serverOtpEngine.getProviderStatus()));
          return;
        }

        if (url.startsWith("/api/auth/otp/test-token") || url.startsWith("/api/auth/otp/test-otp")) {
          const { serverOtpEngine } = await import("./src/services/otp-engine-server");
          const urlObj = new URL(url, "http://localhost");
          const target = urlObj.searchParams.get("target") || "";
          const token = serverOtpEngine.getDemoToken(target);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, testOtp: token }));
          return;
        }

        if (url === "/api/auth/otp/send" && req.method === "POST") {
          const { serverOtpEngine } = await import("./src/services/otp-engine-server");
          let data = "";
          req.on("data", (c) => (data += c));
          req.on("end", async () => {
            try {
              const body = JSON.parse(data || "{}");
              const result = await serverOtpEngine.dispatchOtp({
                target: body.target,
                channel: body.channel,
                purpose: body.purpose,
                isDemo: body.isDemo,
              });
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, message: "Invalid JSON payload" }));
            }
          });
          return;
        }

        if (url === "/api/auth/otp/verify" && req.method === "POST") {
          const { serverOtpEngine } = await import("./src/services/otp-engine-server");
          let data = "";
          req.on("data", (c) => (data += c));
          req.on("end", async () => {
            try {
              const body = JSON.parse(data || "{}");
              const result = serverOtpEngine.verifyOtp(body.target, body.code);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, message: "Invalid JSON payload" }));
            }
          });
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
