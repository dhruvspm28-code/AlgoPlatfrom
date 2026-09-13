import fs from "node:fs";
import path from "node:path";

export interface SafeEnvStatus {
  growwApiKey: boolean;
  growwApiSecret: boolean;
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
      if (trimmed.startsWith("GROWW_API_KEY=")) {
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
    growwApiKey: !!apiKey && apiKey.length > 10,
    growwApiSecret: !!apiSecret && apiSecret.length > 5,
    emailOtpConfigured: isEmailConfigured,
    emailOtpProvider: emailProvider || "unconfigured",
    smsOtpConfigured: isSmsConfigured,
    smsOtpProvider: smsProvider || "firebase",
  };
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
  process.argv[1]?.includes("check-sms") ||
  import.meta.url === `file://${process.argv[1]}`
) {
  printSafeStatusReport();
}
