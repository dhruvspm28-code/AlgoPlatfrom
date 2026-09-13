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
    process.env.TWILIO_AUTH_TOKEN ||
    process.env.MSG91_AUTH_KEY ||
    "";

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
      } else if (trimmed.startsWith("MSG91_AUTH_KEY=")) {
        process.env.MSG91_AUTH_KEY = trimmed
          .slice("MSG91_AUTH_KEY=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      } else if (trimmed.startsWith("MSG91_TEMPLATE_ID=")) {
        process.env.MSG91_TEMPLATE_ID = trimmed
          .slice("MSG91_TEMPLATE_ID=".length)
          .replace(/^["']|["']$/g, "")
          .trim();
      }
    }
  }

  const isEmailConfigured =
    emailProvider.toLowerCase() === "mock" || (!!emailApiKey && emailApiKey.length > 10);

  const isSmsConfigured =
    smsProvider.toLowerCase() === "mock" ||
    (smsProvider.toLowerCase() === "msg91"
      ? !!process.env.MSG91_AUTH_KEY &&
        process.env.MSG91_AUTH_KEY.length > 10 &&
        !!process.env.MSG91_TEMPLATE_ID
      : !!smsApiKey && smsApiKey.length > 8);

  return {
    growwApiKey: !!apiKey && apiKey.length > 10,
    growwApiSecret: !!apiSecret && apiSecret.length > 5,
    emailOtpConfigured: isEmailConfigured,
    emailOtpProvider: emailProvider || "unconfigured",
    smsOtpConfigured: isSmsConfigured,
    smsOtpProvider: smsProvider || "unconfigured",
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
  const authKey = process.env.MSG91_AUTH_KEY || process.env.SMS_OTP_API_KEY || "";
  const templateId = process.env.MSG91_TEMPLATE_ID || process.env.SMS_OTP_SENDER_ID || "";

  const isMsg91 = providerRaw === "msg91" || !providerRaw || providerRaw === "mock";
  const providerName = isMsg91 ? "MSG91" : providerRaw.toUpperCase();
  const isConfigured = !!authKey && authKey.length > 10 && !!templateId;

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
