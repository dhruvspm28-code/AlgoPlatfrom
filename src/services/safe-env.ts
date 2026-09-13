import fs from "node:fs";
import path from "node:path";

export function checkEnvConfigured(): { growwApiKey: boolean; growwApiSecret: boolean } {
  // 1. Try native process.loadEnvFile if available
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Ignored if file already read or not found
    }
  }

  // 2. Fallback: manual parse of server .env if not in process.env
  let apiKey = process.env.GROWW_API_KEY;
  let apiSecret = process.env.GROWW_API_SECRET;

  if (!apiKey || !apiSecret) {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("GROWW_API_KEY=")) {
          apiKey = trimmed
            .slice("GROWW_API_KEY=".length)
            .replace(/^["']|["']$/g, "")
            .trim();
          process.env.GROWW_API_KEY = apiKey;
        }
        if (trimmed.startsWith("GROWW_API_SECRET=")) {
          apiSecret = trimmed
            .slice("GROWW_API_SECRET=".length)
            .replace(/^["']|["']$/g, "")
            .trim();
          process.env.GROWW_API_SECRET = apiSecret;
        }
      }
    }
  }

  return {
    growwApiKey: !!apiKey && apiKey.length > 10,
    growwApiSecret: !!apiSecret && apiSecret.length > 5,
  };
}

// If executed directly
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes("safe-env-check")
) {
  const status = checkEnvConfigured();
  console.log(`GROWW_API_KEY: ${status.growwApiKey ? "CONFIGURED" : "MISSING"}`);
  console.log(`GROWW_API_SECRET: ${status.growwApiSecret ? "CONFIGURED" : "MISSING"}`);
}
