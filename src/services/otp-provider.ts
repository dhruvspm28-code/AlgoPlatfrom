/**
 * First-Party OTP Delivery and Verification Engine for SmartQuant Edge.
 *
 * Provides unified abstraction across client and server:
 * - Real-time email and SMS delivery via official provider adapters (Resend, SendGrid, Twilio, MSG91).
 * - Cryptographically random 6-digit tokens.
 * - Strict 5-minute expiration windows.
 * - Single-use token enforcement.
 * - Attempt tracking & lock protection (max 3 attempts).
 * - Active resend cooldown windows with countdown metadata.
 * - Storage security: tokens are SHA-256 hashed before persistence; plaintext never permanently saved.
 * - Zero plaintext token logging.
 * - Clear isolation: Demo / Examiner profiles retain test tokens; real users use real delivery.
 * - If providers are unconfigured: honestly returns "OTP provider not configured" rather than pretending delivery succeeded.
 */

import {
  serverOtpEngine,
  type OtpChannel,
  type OtpDeliveryResponse,
  type OtpVerificationResponse,
  type OtpLifecycleState,
} from "./otp-engine-server";

export interface OtpDeliveryResult {
  success: boolean;
  destinationMasked: string;
  channel: OtpChannel;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  message: string;
  providerName?: string;
  state?: OtpLifecycleState;
  isDemo?: boolean;
}

export interface OtpVerificationResult {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
  state?: OtpLifecycleState;
}

export interface OtpProvider {
  sendOtp(
    target: string,
    channel: OtpChannel,
    options?: { purpose?: string; isDemo?: boolean },
  ): Promise<OtpDeliveryResult>;
  verifyOtp(target: string, code: string): Promise<OtpVerificationResult>;
}

/** Generates a cryptographically secure 6-digit OTP */
export function generateSecureOtp(): string {
  return serverOtpEngine.generateSecureOtp();
}

/** Masks email for safe display (e.g., a••••@meridiancap.in) */
export function maskEmail(email: string): string {
  return serverOtpEngine.maskEmail(email);
}

/** Masks phone for safe display (e.g., +91 ••••• ••1234) */
export function maskPhone(phone: string): string {
  return serverOtpEngine.maskPhone(phone);
}

/**
 * Checks if target belongs to a designated DEMO / EXAMINER account.
 */
export function isDemoAccount(target: string): boolean {
  return serverOtpEngine.isDemoAccount(target);
}

class SmartQuantOtpEngine implements OtpProvider {
  /**
   * Dispatches an OTP to user target (Email or SMS).
   * In browser context: calls server endpoint POST /api/auth/otp/send.
   * In server context: calls serverOtpEngine directly.
   */
  public async sendOtp(
    target: string,
    channel: OtpChannel,
    options?: { purpose?: string; isDemo?: boolean },
  ): Promise<OtpDeliveryResult> {
    const isDemo = options?.isDemo ?? isDemoAccount(target);
    const purpose = options?.purpose ?? "AUTHENTICATION";

    // Client-side execution in browser: dispatch via server API endpoint
    if (typeof window !== "undefined" && typeof fetch === "function") {
      try {
        const res = await fetch("/api/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, channel, purpose, isDemo }),
        });

        const data = (await res.json()) as OtpDeliveryResponse;
        return {
          success: data.success,
          destinationMasked:
            data.destinationMasked || (channel === "EMAIL" ? maskEmail(target) : maskPhone(target)),
          channel: data.channel || channel,
          expiresInSeconds: data.expiresInSeconds || (data.success ? 300 : 0),
          resendCooldownSeconds: data.resendCooldownSeconds || (data.success ? 45 : 0),
          message:
            data.message ||
            (data.success ? "Verification code dispatched." : "Unable to send verification code."),
          providerName: data.providerName,
          state: data.state,
          isDemo: data.isDemo ?? isDemo,
        };
      } catch {
        // If HTTP endpoint fails, fallback to in-process engine
      }
    }

    // Server-side execution or in-process fallback
    const result = await serverOtpEngine.dispatchOtp({
      target,
      channel,
      purpose,
      isDemo,
    });

    return {
      success: result.success,
      destinationMasked: result.destinationMasked,
      channel: result.channel,
      expiresInSeconds: result.expiresInSeconds,
      resendCooldownSeconds: result.resendCooldownSeconds,
      message: result.message,
      providerName: result.providerName,
      state: result.state,
      isDemo: result.isDemo,
    };
  }

  /**
   * Verifies an OTP entered by the user.
   * In browser context: calls server endpoint POST /api/auth/otp/verify.
   * In server context: calls serverOtpEngine directly.
   */
  public async verifyOtp(target: string, code: string): Promise<OtpVerificationResult> {
    if (typeof window !== "undefined" && typeof fetch === "function") {
      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, code }),
        });

        const data = (await res.json()) as OtpVerificationResponse;
        return {
          success: data.success,
          message: data.message,
          attemptsRemaining: data.attemptsRemaining,
          state: data.state,
        };
      } catch {
        // Fallback to in-process engine
      }
    }

    const result = serverOtpEngine.verifyOtp(target, code);
    return {
      success: result.success,
      message: result.message,
      attemptsRemaining: result.attemptsRemaining,
      state: result.state,
    };
  }

  /**
   * Safe check to query provider configuration status without revealing any credentials.
   */
  public async getProviderStatus(): Promise<{
    emailProvider: string;
    emailConfigured: boolean;
    smsProvider: string;
    smsConfigured: boolean;
  }> {
    if (typeof window !== "undefined" && typeof fetch === "function") {
      try {
        const res = await fetch("/api/auth/otp/status");
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return serverOtpEngine.getProviderStatus();
  }

  /**
   * Retrieve test token solely for automated tests and designated DEMO / EXAMINER profiles.
   * Returns undefined for any real user.
   */
  public _getTestToken(target: string): string | undefined {
    return serverOtpEngine.getDemoToken(target);
  }

  /** Reset internal cache (used in test teardown) */
  public _resetForTesting(): void {
    serverOtpEngine._resetForTesting();
  }

  /** Set test mode active/inactive */
  public _setTestMode(active: boolean): void {
    serverOtpEngine.setTestMode(active);
  }
}

export const otpProvider = new SmartQuantOtpEngine();
