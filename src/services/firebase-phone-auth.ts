/**
 * Firebase Phone Authentication Service for SmartQuant Edge.
 *
 * Provides real-time SMS OTP delivery and verification using the official Firebase Web SDK:
 * - Firebase Authentication & Identity Platform
 * - RecaptchaVerifier (invisible application verification)
 * - signInWithPhoneNumber()
 * - confirmationResult.confirm(verificationCode)
 *
 * Security & Integrity:
 * - Strict adherence to the Honest Delivery Rule: never claims "OTP sent" unless Firebase accepts the request.
 * - Zero fake/mock OTP generation for real users.
 * - Supports India (+91) phone numbers in E.164 format (+91XXXXXXXXXX).
 * - Safe environment variable loading: supports both Vite (import.meta.env) and Node (process.env).
 * - Zero credential or OTP logging.
 * - Single-use confirmation result consumption.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

export interface FirebaseAuthConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FirebasePhoneOtpResult {
  success: boolean;
  message: string;
  formattedPhone?: string;
  errorCategory?:
    | "CONFIG_MISSING"
    | "BILLING_REQUIRED"
    | "QUOTA_EXCEEDED"
    | "RECAPTCHA_FAILED"
    | "INVALID_PHONE"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
}

export interface FirebaseConfirmResult {
  success: boolean;
  message: string;
  errorCategory?: "INVALID_CODE" | "CODE_EXPIRED" | "SESSION_EXPIRED" | "INTERNAL_ERROR";
}

class FirebasePhoneAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private pendingConfirmations = new Map<string, ConfirmationResult>();

  /**
   * Safely reads Firebase configuration from environment variables.
   * Checks import.meta.env (Vite client) first, falling back to process.env (Node/server).
   */
  public getConfig(): FirebaseAuthConfig | null {
    let apiKey = "";
    let authDomain = "";
    let projectId = "";
    let storageBucket = "";
    let messagingSenderId = "";
    let appId = "";

    // 1. Check Vite client environment
    try {
      if (typeof import.meta !== "undefined" && import.meta.env) {
        apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string) || "";
        authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "";
        projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "";
        storageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "";
        messagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "";
        appId = (import.meta.env.VITE_FIREBASE_APP_ID as string) || "";
      }
    } catch {
      // Ignore if import.meta.env is unavailable
    }

    // 2. Fallback to process.env (SSR or Node context)
    if (!apiKey && typeof process !== "undefined" && process.env) {
      apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "";
      authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "";
      projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";
      storageBucket =
        process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "";
      messagingSenderId =
        process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
        process.env.FIREBASE_MESSAGING_SENDER_ID ||
        "";
      appId = process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "";
    }

    apiKey = apiKey.trim();
    projectId = projectId.trim();

    if (!apiKey || apiKey.length < 10 || !projectId) {
      return null;
    }

    return {
      apiKey,
      authDomain: authDomain.trim() || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: storageBucket.trim() || `${projectId}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };
  }

  /**
   * Returns true if valid Firebase configuration is present.
   */
  public isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  /**
   * Initializes or returns the existing Firebase Auth instance.
   */
  public getFirebaseAuth(): Auth | null {
    if (this.auth) return this.auth;

    const config = this.getConfig();
    if (!config) return null;

    try {
      if (getApps().length === 0) {
        this.app = initializeApp(config);
      } else {
        this.app = getApp();
      }
      this.auth = getAuth(this.app);
      return this.auth;
    } catch {
      return null;
    }
  }

  /**
   * Formats Indian and international mobile numbers into standard E.164 (+91XXXXXXXXXX).
   */
  public formatE164(phone: string): string {
    const raw = phone.trim();
    const digitsOnly = raw.replace(/[^0-9]/g, "");

    // 10 digit Indian number (e.g. 9876543210 -> +919876543210)
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }

    // 12 digit with India 91 prefix without plus (e.g. 919876543210 -> +919876543210)
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      return `+${digitsOnly}`;
    }

    // Already has +
    if (raw.startsWith("+")) {
      return `+${digitsOnly}`;
    }

    return `+${digitsOnly}`;
  }

  /**
   * Ensures an invisible reCAPTCHA verifier is ready in the DOM.
   */
  public getOrCreateRecaptchaVerifier(
    containerId = "recaptcha-container",
  ): RecaptchaVerifier | null {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    const auth = this.getFirebaseAuth();
    if (!auth) return null;

    // Check if designated container exists; if not, create one transparently
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.display = "none";
      document.body.appendChild(container);
    }

    try {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: "invisible",
          callback: () => {
            // reCAPTCHA solved - allow signInWithPhoneNumber to proceed
          },
          "expired-callback": () => {
            this.clearRecaptcha();
          },
        });
      }
      return this.recaptchaVerifier;
    } catch {
      return null;
    }
  }

  /**
   * Clears the current reCAPTCHA verifier instance to force fresh token generation.
   */
  public clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch {
        // Ignore cleanup errors
      }
      this.recaptchaVerifier = null;
    }
  }

  /**
   * Dispatches real SMS OTP via Firebase Authentication signInWithPhoneNumber().
   */
  public async sendPhoneOtp(
    phone: string,
    containerId = "recaptcha-container",
  ): Promise<FirebasePhoneOtpResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Unable to send verification code. OTP provider not configured.",
        errorCategory: "CONFIG_MISSING",
      };
    }

    const formattedPhone = this.formatE164(phone);
    if (formattedPhone.replace(/[^0-9]/g, "").length < 10) {
      return {
        success: false,
        message: "Invalid mobile number. Please enter a valid 10-digit Indian phone number.",
        errorCategory: "INVALID_PHONE",
      };
    }

    const auth = this.getFirebaseAuth();
    if (!auth) {
      return {
        success: false,
        message: "Unable to initialize Firebase Authentication client.",
        errorCategory: "CONFIG_MISSING",
      };
    }

    const verifier = this.getOrCreateRecaptchaVerifier(containerId);
    if (!verifier) {
      return {
        success: false,
        message:
          "Security verification (reCAPTCHA) initialization failed. Please refresh the page.",
        errorCategory: "RECAPTCHA_FAILED",
      };
    }

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      // Store pending confirmation indexed by formatted phone
      this.pendingConfirmations.set(formattedPhone, confirmationResult);

      return {
        success: true,
        message: "Verification code dispatched via SMS. Valid for 5 minutes.",
        formattedPhone,
      };
    } catch (err: unknown) {
      this.clearRecaptcha();
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || "";

      if (code === "auth/billing-not-enabled") {
        return {
          success: false,
          message:
            "SMS delivery unavailable: Google Cloud / Firebase Blaze plan is required for real SMS OTP in India.",
          errorCategory: "BILLING_REQUIRED",
        };
      }

      if (code === "auth/quota-exceeded") {
        return {
          success: false,
          message:
            "SMS verification quota exceeded for this Firebase project. Please try again later.",
          errorCategory: "QUOTA_EXCEEDED",
        };
      }

      if (code === "auth/invalid-phone-number") {
        return {
          success: false,
          message:
            "The mobile phone number format is invalid. Please verify the country code (+91).",
          errorCategory: "INVALID_PHONE",
        };
      }

      if (code === "auth/captcha-check-failed") {
        return {
          success: false,
          message: "Security verification check failed. Please refresh the page and try again.",
          errorCategory: "RECAPTCHA_FAILED",
        };
      }

      if (code === "auth/too-many-requests") {
        return {
          success: false,
          message: "Too many verification requests. Please wait a few minutes before trying again.",
          errorCategory: "RATE_LIMITED",
        };
      }

      return {
        success: false,
        message:
          errorObj?.message?.includes("sms") || errorObj?.message?.includes("Firebase")
            ? errorObj.message
            : "Unable to send verification code. Please check your connection and try again.",
        errorCategory: "INTERNAL_ERROR",
      };
    }
  }

  /**
   * Verifies the SMS OTP entered by the user via confirmationResult.confirm().
   */
  public async confirmPhoneOtp(
    phone: string,
    verificationCode: string,
  ): Promise<FirebaseConfirmResult> {
    const formattedPhone = this.formatE164(phone);
    const confirmation = this.pendingConfirmations.get(formattedPhone);

    if (!confirmation) {
      return {
        success: false,
        message:
          "No verification in progress or code expired. Please request a new verification code.",
        errorCategory: "SESSION_EXPIRED",
      };
    }

    try {
      await confirmation.confirm(verificationCode.trim());
      // Successful verification: consume pending confirmation immediately (single-use guarantee)
      this.pendingConfirmations.delete(formattedPhone);

      return {
        success: true,
        message: "✓ Identity verified",
      };
    } catch (err: unknown) {
      const errorObj = err as { code?: string };
      const code = errorObj?.code || "";

      if (code === "auth/invalid-verification-code") {
        return {
          success: false,
          message: "Incorrect verification code. Please try again.",
          errorCategory: "INVALID_CODE",
        };
      }

      if (code === "auth/code-expired") {
        this.pendingConfirmations.delete(formattedPhone);
        return {
          success: false,
          message: "Verification code expired. Request a new code.",
          errorCategory: "CODE_EXPIRED",
        };
      }

      return {
        success: false,
        message: "Unable to verify code. Please check the digits and try again.",
        errorCategory: "INTERNAL_ERROR",
      };
    }
  }

  /**
   * Invalidate any pending confirmation for a given phone (used on resend/timeout).
   */
  public invalidatePending(phone: string): void {
    const formattedPhone = this.formatE164(phone);
    this.pendingConfirmations.delete(formattedPhone);
    this.clearRecaptcha();
  }

  /**
   * Reset internal state (used during test teardown).
   */
  public _resetForTesting(): void {
    this.pendingConfirmations.clear();
    this.clearRecaptcha();
  }
}

export const firebasePhoneAuth = new FirebasePhoneAuthService();
