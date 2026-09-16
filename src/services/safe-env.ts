import fs from "node:fs";
import path from "node:path";

export interface SafeEnvStatus {
  growwAuthMode: "ACCESS_TOKEN" | "API_KEY_SECRET";
  growwApiKey: boolean;
  growwApiSecret: boolean;
  growwAccessToken: boolean;
  growwConfigured: boolean;
  emailOtpConfigured: boolean;
  emailOtpProvider: string;
  smsOtpConfigured: boolean;
  smsOtpProvider: string;
}

export function checkEnvConfigured(): SafeEnvStatus {
  // 1. Try native process.loadEnvFile if available
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Ignored if file already read or not found
    }
  }

  // 2. Fallback: manual parse of server .env if not in process.env
  let authModeRaw = (process.env.GROWW_AUTH_MODE || "").trim().toLowerCase();
  let accessToken = process.env.GROWW_ACCESS_TOKEN;
  let apiKey = process.env.GROWW_API_KEY;
  let apiSecret = process.env.GROWW_API_SECRET;
  let emailProvider = process.env.EMAIL_OTP_PROVIDER || process.env.OTP_PROVIDER || "";
  let emailApiKey =
    process.env.EMAIL_OTP_API_KEY ||
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    "";
  let smsProvider = process.env.SMS_OTP_PROVIDER || process.env.OTP_PROVIDER || "";
  let smsApiKey =
    process.env.SMS_OTP_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.TWILIO_AUTH_TOKEN ||
    "";
  let firebaseProjectId =
    process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";

  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("GROWW_AUTH_MODE=")) {
        authModeRaw = trimmed
          .slice("GROWW_AUTH_MODE=".length)
          .replace(/^["']|["']$/g, "")
          .trim()
          .toLowerCase();
        process.env.GROWW_AUTH_MODE = authModeRaw;
      } else if (trimmed.startsWith("GROWW_ACCESS_TOKEN=")) {
        accessToken = trimmed
          .slice("GROWW_ACCESS_TOKEN=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.GROWW_ACCESS_TOKEN = accessToken;
      } else if (trimmed.startsWith("GROWW_API_KEY=")) {
        apiKey = trimmed
          .slice("GROWW_API_KEY=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.GROWW_API_KEY = apiKey;
      } else if (trimmed.startsWith("GROWW_API_SECRET=")) {
        apiSecret = trimmed
          .slice("GROWW_API_SECRET=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.GROWW_API_SECRET = apiSecret;
      } else if (trimmed.startsWith("EMAIL_OTP_PROVIDER=")) {
        emailProvider = trimmed
          .slice("EMAIL_OTP_PROVIDER=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.EMAIL_OTP_PROVIDER = emailProvider;
      } else if (trimmed.startsWith("EMAIL_OTP_API_KEY=")) {
        emailApiKey = trimmed
          .slice("EMAIL_OTP_API_KEY=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.EMAIL_OTP_API_KEY = emailApiKey;
      } else if (trimmed.startsWith("EMAIL_OTP_FROM=")) {
        process.env.EMAIL_OTP_FROM = trimmed
          .slice("EMAIL_OTP_FROM=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      } else if (trimmed.startsWith("SMS_OTP_PROVIDER=")) {
        smsProvider = trimmed
          .slice("SMS_OTP_PROVIDER=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.SMS_OTP_PROVIDER = smsProvider;
      } else if (trimmed.startsWith("SMS_OTP_API_KEY=")) {
        smsApiKey = trimmed
          .slice("SMS_OTP_API_KEY=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.SMS_OTP_API_KEY = smsApiKey;
      } else if (trimmed.startsWith("VITE_FIREBASE_API_KEY=")) {
        const val = trimmed
          .slice("VITE_FIREBASE_API_KEY=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.VITE_FIREBASE_API_KEY = val;
        smsApiKey = smsApiKey || val;
      } else if (trimmed.startsWith("FIREBASE_API_KEY=")) {
        const val = trimmed
          .slice("FIREBASE_API_KEY=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.FIREBASE_API_KEY = val;
        smsApiKey = smsApiKey || val;
      } else if (trimmed.startsWith("VITE_FIREBASE_PROJECT_ID=")) {
        const val = trimmed
          .slice("VITE_FIREBASE_PROJECT_ID=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.VITE_FIREBASE_PROJECT_ID = val;
        firebaseProjectId = firebaseProjectId || val;
      } else if (trimmed.startsWith("FIREBASE_PROJECT_ID=")) {
        const val = trimmed
          .slice("FIREBASE_PROJECT_ID=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
        process.env.FIREBASE_PROJECT_ID = val;
        firebaseProjectId = firebaseProjectId || val;
      } else if (trimmed.startsWith("VITE_FIREBASE_AUTH_DOMAIN=")) {
        process.env.VITE_FIREBASE_AUTH_DOMAIN = trimmed
          .slice("VITE_FIREBASE_AUTH_DOMAIN=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      } else if (trimmed.startsWith("TWILIO_ACCOUNT_SID=")) {
        process.env.TWILIO_ACCOUNT_SID = trimmed
          .slice("TWILIO_ACCOUNT_SID=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      } else if (trimmed.startsWith("TWILIO_AUTH_TOKEN=")) {
        process.env.TWILIO_AUTH_TOKEN = trimmed
          .slice("TWILIO_AUTH_TOKEN=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      } else if (trimmed.startsWith("TWILIO_FROM=")) {
        process.env.TWILIO_FROM = trimmed
          .slice("TWILIO_FROM=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      }
    }
  }

  const isAccessTokenMode =
    authModeRaw === "access_token" ||
    (!authModeRaw && !apiKey && !!accessToken && accessToken.length > 20);

  const hasAccessToken = !!accessToken && accessToken.length > 20;
  const hasApiKey = !!apiKey && apiKey.length > 10;
  const hasApiSecret = !!apiSecret && apiSecret.length > 5;

  const isGrowwConfigured = isAccessTokenMode ? hasAccessToken : hasApiKey && hasApiSecret;

  const isEmailConfigured =
    emailProvider.toLowerCase() === "mock" || (!!emailApiKey && emailApiKey.length > 10);

  const isFirebase =
    smsProvider.toLowerCase() === "firebase" ||
    !smsProvider ||
    smsProvider.toLowerCase() === "mock";

  const isSmsConfigured =
    smsProvider.toLowerCase() === "mock" ||
    (isFirebase
      ? !!smsApiKey && smsApiKey.length > 10 && !!firebaseProjectId
      : !!smsApiKey && smsApiKey.length > 8);

  return {
    growwAuthMode: isAccessTokenMode ? "ACCESS_TOKEN" : "API_KEY_SECRET",
    growwApiKey: hasApiKey,
    growwApiSecret: hasApiSecret,
    growwAccessToken: hasAccessToken,
    growwConfigured: isGrowwConfigured,
    emailOtpConfigured: isEmailConfigured,
    emailOtpProvider: emailProvider || "unconfigured",
    smsOtpConfigured: isSmsConfigured,
    smsOtpProvider: smsProvider || "firebase",
  };
}

export interface GrowwSafeStatus {
  provider: string;
  authMode: "ACCESS_TOKEN" | "API_KEY_SECRET";
  configuration: "CONFIGURED" | "MISSING";
  authentication: "READY" | "SESSION_APPROVAL_REQUIRED" | "INVALID" | "UNAUTHENTICATED";
  marketSession: "OPEN" | "CLOSED";
  liveData: "READY" | "WAITING_FOR_DATA" | "LIVE" | "BLOCKED" | "UNAVAILABLE";
  reason: string;
}

export function calculateMarketSessionInIST(): "OPEN" | "CLOSED" {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  const day = istTime.getUTCDay();
  const hours = istTime.getUTCHours();
  const mins = istTime.getUTCMinutes();
  const timeInMins = hours * 60 + mins;

  if (day === 0 || day === 6) return "CLOSED";
  if (timeInMins >= 555 && timeInMins <= 930) return "OPEN";
  return "CLOSED";
}

export function getGrowwSafeStatus(): GrowwSafeStatus {
  const env = checkEnvConfigured();
  const marketSession = calculateMarketSessionInIST();

  if (!env.growwConfigured) {
    return {
      provider: "Groww Trade Gateway",
      authMode: env.growwAuthMode,
      configuration: "MISSING",
      authentication: "UNAUTHENTICATED",
      marketSession,
      liveData: "UNAVAILABLE",
      reason:
        env.growwAuthMode === "ACCESS_TOKEN"
          ? "GROWW_ACCESS_TOKEN missing in server .env"
          : "GROWW_API_KEY or GROWW_API_SECRET missing in server .env",
    };
  }

  return {
    provider: "Groww Trade Gateway",
    authMode: env.growwAuthMode,
    configuration: "CONFIGURED",
    authentication: "READY",
    marketSession,
    liveData: "READY",
    reason:
      env.growwAuthMode === "ACCESS_TOKEN"
        ? "Direct Groww Access Token configured"
        : "Groww API credentials configured for token exchange",
  };
}

export function printGrowwDiagnostics(): void {
  const status = getGrowwSafeStatus();
  console.log("SmartQuant Edge — Groww Diagnostics\n");
  console.log(`Provider: ${status.provider}`);
  console.log(`Auth Mode: ${status.authMode}`);
  console.log(`Credentials: ${status.configuration}`);
  console.log(`Authentication: ${status.authentication}`);
  console.log(`Market Session: ${status.marketSession}`);
  console.log(`Live Data: ${status.liveData}`);
  console.log(`Reason: ${status.reason}`);
}

export interface SmsSafeStatus {
  provider: string;
  configuration: "CONFIGURED" | "MISSING";
  delivery: "READY" | "UNAVAILABLE";
}

export function getSmsProviderSafeStatus(): SmsSafeStatus {
  checkEnvConfigured();
  const providerRaw = (process.env.SMS_OTP_PROVIDER || "").toLowerCase();
  const apiKey =
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.SMS_OTP_API_KEY ||
    "";
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";

  const isFirebase = providerRaw === "firebase" || !providerRaw || providerRaw === "mock";
  const providerName = isFirebase ? "Firebase Phone Auth" : providerRaw.toUpperCase();
  const isConfigured = !!apiKey && apiKey.length > 10 && !!projectId;

  return {
    provider: providerName,
    configuration: isConfigured ? "CONFIGURED" : "MISSING",
    delivery: isConfigured ? "READY" : "UNAVAILABLE",
  };
}

export function printSafeStatusReport(): void {
  const status = getSmsProviderSafeStatus();
  console.log(`SMS Provider: ${status.provider}`);
  console.log(`Configuration: ${status.configuration}`);
  console.log(`Delivery: ${status.delivery}`);
}

// If executed directly
if (
  process.argv[1]?.includes("safe-env") ||
  process.argv[1]?.includes("check-groww") ||
  import.meta.url === `file://${process.argv[1]}`
) {
  if (process.argv[1]?.includes("check-sms")) {
    printSafeStatusReport();
  } else {
    printGrowwDiagnostics();
  }
}
