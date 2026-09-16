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
import { firebasePhoneAuth } from "./firebase-phone-auth";

export { firebasePhoneAuth };
export type { OtpChannel };

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
  testOtp?: string;
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
  private clientTestTokens = new Map<string, string>();

  public setClientTestToken(target: string, token: string): void {
    const norm = target.trim().toLowerCase();
    this.clientTestTokens.set(norm, token);
    const digits = target.replace(/[^0-9]/g, "");
    if (digits) this.clientTestTokens.set(digits, token);
    serverOtpEngine.recordDemoToken(target, token);
  }

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

    // Client-side execution in browser: route real SMS via Firebase Phone Auth
    if (typeof window !== "undefined") {
      if (channel === "SMS" && !isDemo) {
        if (firebasePhoneAuth.isConfigured()) {
          const fbRes = await firebasePhoneAuth.sendPhoneOtp(target);
          if (fbRes.success) {
            if (typeof fetch === "function") {
              fetch("/api/auth/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target, channel, purpose, isDemo }),
              }).catch(() => {});
            }
            return {
              success: true,
              destinationMasked: maskPhone(target),
              channel: "SMS",
              expiresInSeconds: 300,
              resendCooldownSeconds: 45,
              message: fbRes.message,
              providerName: "Firebase Phone Auth",
              state: "OTP_SENT",
              isDemo: false,
            };
          }
          return {
            success: false,
            destinationMasked: maskPhone(target),
            channel: "SMS",
            expiresInSeconds: 0,
            resendCooldownSeconds: 0,
            message: fbRes.message,
            providerName: "Firebase Phone Auth",
            state: "OTP_DELIVERY_FAILED",
            isDemo: false,
          };
        } else {
          // Firebase not configured - Honest Delivery Rule
          return {
            success: false,
            destinationMasked: maskPhone(target),
            channel: "SMS",
            expiresInSeconds: 0,
            resendCooldownSeconds: 0,
            message: "Unable to send verification code. OTP provider not configured.",
            providerName: "Firebase Phone Auth",
            state: "OTP_DELIVERY_FAILED",
            isDemo: false,
          };
        }
      }

      // Email channel or demo user via server endpoint
      if (typeof fetch === "function") {
        try {
          const res = await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, channel, purpose, isDemo }),
          });

          const data = (await res.json()) as OtpDeliveryResponse;
          if (data.testOtp) {
            this.setClientTestToken(target, data.testOtp);
          }
          return {
            success: data.success,
            destinationMasked:
              data.destinationMasked ||
              (channel === "EMAIL" ? maskEmail(target) : maskPhone(target)),
            channel: data.channel || channel,
            expiresInSeconds: data.expiresInSeconds || (data.success ? 300 : 0),
            resendCooldownSeconds: data.resendCooldownSeconds || (data.success ? 45 : 0),
            message:
              data.message ||
              (data.success
                ? "Verification code dispatched."
                : "Unable to send verification code."),
            providerName: data.providerName,
            state: data.state,
            isDemo: data.isDemo ?? isDemo,
            testOtp: data.testOtp,
          };
        } catch {
          // Fallback to in-process engine
        }
      }
    }

    // Server-side execution or in-process fallback
    const result = await serverOtpEngine.dispatchOtp({
      target,
      channel,
      purpose,
      isDemo,
    });
    if (result.testOtp) {
      this.setClientTestToken(target, result.testOtp);
    }

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
      testOtp: result.testOtp,
    };
  }

  /**
   * Verifies an OTP entered by the user.
   * In browser context: verifies with Firebase Phone Auth for real SMS, or server endpoint for Email/Demo.
   * In server context: calls serverOtpEngine directly.
   */
  public async verifyOtp(target: string, code: string): Promise<OtpVerificationResult> {
    if (typeof window !== "undefined") {
      const isPhone = !target.includes("@") && target.replace(/[^0-9]/g, "").length >= 10;
      if (isPhone && !isDemoAccount(target) && firebasePhoneAuth.isConfigured()) {
        const confirmRes = await firebasePhoneAuth.confirmPhoneOtp(target, code);
        if (!confirmRes.success) {
          return {
            success: false,
            message: confirmRes.message,
            state: confirmRes.errorCategory === "CODE_EXPIRED" ? "OTP_EXPIRED" : "OTP_INVALID",
          };
        }
        if (typeof fetch === "function") {
          fetch("/api/auth/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, code }),
          }).catch(() => {});
        }
        return {
          success: true,
          message: "✓ Identity verified",
          state: "OTP_VERIFIED",
        };
      }

      if (typeof fetch === "function") {
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
          const data = await res.json();
          return {
            ...data,
            smsProvider: "Firebase Phone Auth",
            smsConfigured: firebasePhoneAuth.isConfigured() || data.smsConfigured,
          };
        }
      } catch {
        // Fallback
      }
    }
    const status = serverOtpEngine.getProviderStatus();
    return {
      ...status,
      smsProvider: "Firebase Phone Auth",
      smsConfigured: firebasePhoneAuth.isConfigured() || status.smsConfigured,
    };
  }

  /**
   * Retrieve test token solely for automated tests and designated DEMO / EXAMINER profiles.
   * Returns undefined for any real user.
   */
  public _getTestToken(target: string): string | undefined {
    const norm = target.trim().toLowerCase();
    const digits = target.replace(/[^0-9]/g, "");
    if (this.clientTestTokens.has(norm)) {
      return this.clientTestTokens.get(norm);
    }
    if (digits && this.clientTestTokens.has(digits)) {
      return this.clientTestTokens.get(digits);
    }
    return serverOtpEngine.getDemoToken(target);
  }

  /** Reset internal cache (used in test teardown) */
  public _resetForTesting(): void {
    this.clientTestTokens.clear();
    serverOtpEngine._resetForTesting();
  }

  /** Set test mode active/inactive */
  public _setTestMode(active: boolean): void {
    serverOtpEngine.setTestMode(active);
  }
}

export const otpProvider = new SmartQuantOtpEngine();
