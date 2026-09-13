import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  MailCheck,
  ShieldCheck,
  Smartphone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authService, DEMO_ACCOUNTS } from "@/services/auth-service";
import { usePlatform } from "@/context/PlatformContext";
import type { OtpDeliveryResult } from "@/services/otp-provider";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (authService.isAuthenticated()) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign In — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Sign in to your SmartQuant Edge sovereign terminal using your User ID or Mobile number with OTP authentication.",
      },
      { property: "og:title", content: "Sign in to SmartQuant Edge" },
      { property: "og:description", content: "Access your algorithmic trading workstation." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { refreshUser } = usePlatform();

  // Mode: 'PASSWORD' (primary) | 'OTP_ONLY' (passwordless)
  const [loginMode, setLoginMode] = useState<"PASSWORD" | "OTP_ONLY">("PASSWORD");

  // Step: 'CREDENTIALS' | 'OTP_CHALLENGE'
  const [step, setStep] = useState<"CREDENTIALS" | "OTP_CHALLENGE">("CREDENTIALS");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpDetails, setOtpDetails] = useState<OtpDeliveryResult | null>(null);
  const [resendSeconds, setResendSeconds] = useState(45);

  // Active countdown timer for OTP resend cooldown
  useEffect(() => {
    if (step !== "OTP_CHALLENGE" || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendSeconds]);

  // Step 1: Submit Primary Credentials
  async function handlePrimarySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Enter your SmartQuant User ID or registered mobile number");
      return;
    }

    setError("");
    setLoading(true);

    if (loginMode === "PASSWORD") {
      if (!password) {
        setError("Enter your account password");
        setLoading(false);
        return;
      }

      const res = await authService.loginWithPassword(identifier, password);
      setLoading(false);

      if (!res.success) {
        setError(res.message || "Invalid credentials.");
        toast.error(res.message || "Invalid credentials.");
        return;
      }

      if (res.requiresOtp && res.otpDetails) {
        setOtpDetails(res.otpDetails);
        setResendSeconds(45);
        setStep("OTP_CHALLENGE");
        toast.success(res.message);
      }
    } else {
      // Direct Passwordless OTP Login
      const res = await authService.requestOtpLogin(identifier);
      setLoading(false);

      if (!res.success) {
        setError(res.message);
        toast.error(res.message);
        return;
      }

      if (res.otpDetails) {
        setOtpDetails(res.otpDetails);
      }
      setResendSeconds(45);
      setStep("OTP_CHALLENGE");
      toast.info(res.message);
    }
  }

  // Step 2: Verify OTP Challenge
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit verification code");
      return;
    }

    setLoading(true);

    const res =
      loginMode === "PASSWORD"
        ? await authService.verifyLoginOtp(identifier, otp, trustDevice)
        : await authService.verifyOtpLogin(identifier, otp, trustDevice);

    setLoading(false);

    if (!res.success) {
      let friendlyError = res.message || "Unable to verify code.";
      const lower = friendlyError.toLowerCase();
      if (lower.includes("expired")) {
        friendlyError = "Verification code expired. Request a new code.";
      } else if (lower.includes("incorrect") || lower.includes("invalid")) {
        friendlyError = "Incorrect verification code. Please try again.";
      } else if (lower.includes("too many") || lower.includes("locked") || lower.includes("max")) {
        friendlyError = "Too many attempts. Request a new verification code.";
      }
      toast.error(friendlyError);
      return;
    }

    toast.success("✓ Identity verified");
    refreshUser();
    toast.success(`Welcome to SmartQuant Edge terminal, ${res.user?.name || "Trader"}`);
    navigate({ to: "/app" });
  }

  // Resend OTP
  async function handleResendOtp() {
    if (resendSeconds > 0) return;
    setLoading(true);
    const res =
      loginMode === "PASSWORD"
        ? await authService.loginWithPassword(identifier, password)
        : await authService.requestOtpLogin(identifier);
    setLoading(false);

    if (res.success && res.otpDetails) {
      setOtpDetails(res.otpDetails);
      setResendSeconds(45);
      toast.info(`New verification code sent to ${res.otpDetails.destinationMasked}`);
    } else {
      toast.error(res.message || "Unable to send verification code. Please try again.");
    }
  }

  // STEP 2: MANDATORY OTP CHALLENGE
  if (step === "OTP_CHALLENGE") {
    const isDemo = authService.isDemoAccount(identifier);

    return (
      <AuthShell
        title="Enter verification code"
        subtitle={
          <div className="space-y-1 mt-1 text-center">
            <span className="text-xs text-muted-foreground block">Code sent to:</span>
            <span className="font-mono font-semibold text-foreground text-xs block">
              {otpDetails?.destinationMasked || identifier}
            </span>
          </div>
        }
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("CREDENTIALS");
              setOtp("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
          >
            ← Back to credentials
          </button>
        }
      >
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div className="flex flex-col items-center gap-4 py-1">
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <MailCheck className="h-5 w-5" />
            </span>

            <div className="w-full flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-11 w-10 sm:w-11 text-base font-mono font-bold rounded-md border-border/80 bg-surface-2"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Quick-Fill Demo OTP Helper ONLY for DEMO / EXAMINER accounts */}
            {isDemo && (
              <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  <span>DEMO / EXAMINER ONLY</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Active test code available for examiner evaluation:
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const testOtp = authService.getTestOtp(identifier);
                    if (testOtp) {
                      setOtp(testOtp);
                      toast.success(`Populated demo OTP`);
                    } else {
                      toast.info("Check server console for OTP dispatch.");
                    }
                  }}
                  className="text-xs h-7 border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-semibold cursor-pointer"
                >
                  Auto-Fill Test OTP
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trustDevice"
              checked={trustDevice}
              onCheckedChange={(c) => setTrustDevice(Boolean(c))}
            />
            <Label
              htmlFor="trustDevice"
              className="text-xs text-muted-foreground font-normal cursor-pointer"
            >
              Trust this device for 30 days (bypasses repeated OTP on this browser)
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full font-semibold h-10 cursor-pointer"
          >
            {loading ? "Verifying Token..." : "Authorize Terminal Session"}
          </Button>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <span>Didn&apos;t receive the code?</span>
              {resendSeconds > 0 ? (
                <span className="font-mono text-primary font-medium">
                  Resend available in 00:{resendSeconds < 10 ? `0${resendSeconds}` : resendSeconds}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-medium text-primary hover:underline cursor-pointer"
                >
                  Resend OTP
                </button>
              )}
            </div>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">
              Forgot Password?
            </Link>
          </div>
        </form>
      </AuthShell>
    );
  }

  // STEP 1: CREDENTIALS ENTRY (PASSWORD OR OTP ONLY)
  return (
    <AuthShell
      title="Terminal Access"
      subtitle="Sign in to your sovereign SmartQuant workstation."
      footer={
        <>
          New to SmartQuant Edge?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register for access
          </Link>
        </>
      }
    >
      <form onSubmit={handlePrimarySubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-md border border-bear/30 bg-bear/10 p-2.5 text-xs text-bear flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Identifier Input */}
        <div className="space-y-1.5">
          <Label
            htmlFor="identifier"
            className="text-xs font-medium flex items-center justify-between"
          >
            <span>SmartQuant User ID or Mobile</span>
            <span className="text-[10px] text-muted-foreground font-mono">e.g. SQE-7F42K9</span>
          </Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="SQE-7F42K9 or +91 9876543210"
            className="text-xs font-mono h-9 bg-surface-2/60 border-border/80 focus-visible:border-primary"
            autoComplete="username"
            required
          />
        </div>

        {/* Password / OTP Mode */}
        {loginMode === "PASSWORD" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <button
                type="button"
                onClick={() => setLoginMode("OTP_ONLY")}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                Sign in with OTP instead
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="text-xs pr-9 h-9 bg-surface-2/60 border-border/80 focus-visible:border-primary"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Passwordless OTP Sign In
            </p>
            <p className="text-[11px]">
              We will transmit a 6-digit cryptographic code to the verified mobile contact
              associated with your User ID.
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full font-semibold h-10 cursor-pointer"
          size="default"
        >
          {loading
            ? "Authenticating..."
            : loginMode === "PASSWORD"
              ? "Continue with Password"
              : "Dispatch Verification Code"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>

        {/* Alternate login mode toggle & Forgot Password */}
        <div className="flex items-center justify-between pt-1 text-xs">
          {loginMode === "PASSWORD" ? (
            <button
              type="button"
              onClick={() => setLoginMode("OTP_ONLY")}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[11px]"
            >
              Use OTP Sign-in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLoginMode("PASSWORD")}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[11px]"
            >
              Use Password Sign-in
            </button>
          )}

          <Link
            to="/forgot-password"
            className="text-muted-foreground hover:text-primary transition-colors text-[11px]"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Institutional Demo Accounts (Examiner Quick-Fill) */}
        <div className="pt-3.5 border-t border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                DEMO / EXAMINER ONLY
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Quick-Fill Profiles
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Password@123</span>
          </div>

          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.userId}
                type="button"
                onClick={() => {
                  setIdentifier(acc.userId);
                  setPassword("Password@123");
                  setLoginMode("PASSWORD");
                  setError("");
                  toast.info(`Populated ${acc.name} (${acc.userId}) credentials`);
                }}
                className="w-full text-left p-2 rounded-md border border-border/60 hover:border-primary/50 bg-surface-2/40 hover:bg-surface-2/80 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {acc.name}
                    </span>
                    <span className="rounded bg-primary/10 border border-primary/20 px-1 py-0.2 text-[10px] font-mono text-primary font-bold">
                      {acc.userId}
                    </span>
                    {acc.brokerLabel && (
                      <span className="rounded bg-surface px-1 py-0.2 text-[9px] font-medium text-muted-foreground border border-border/50">
                        {acc.brokerLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {acc.description}
                  </p>
                </div>
                <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold shrink-0">
                  Select →
                </span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/80 leading-relaxed text-center pt-1">
            Preserves test evaluation state. No live broker trading keys are exposed.
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
