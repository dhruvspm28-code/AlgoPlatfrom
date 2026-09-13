import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  KeyRound,
  Shield,
  Smartphone,
  ArrowRight,
  Lock,
  MailCheck,
  ShieldCheck,
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
  const [otp, setOtp] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpDetails, setOtpDetails] = useState<OtpDeliveryResult | null>(null);

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
      toast.error(res.message);
      return;
    }

    refreshUser();
    toast.success(`Welcome to SmartQuant Edge terminal, ${res.user?.name || "Trader"}`);
    navigate({ to: "/app" });
  }

  // Resend OTP
  async function handleResendOtp() {
    setLoading(true);
    const res =
      loginMode === "PASSWORD"
        ? await authService.loginWithPassword(identifier, password)
        : await authService.requestOtpLogin(identifier);
    setLoading(false);

    if (res.success && res.otpDetails) {
      setOtpDetails(res.otpDetails);
      toast.info(`New verification code sent to ${res.otpDetails.destinationMasked}`);
    } else {
      toast.error(res.message || "Failed to resend verification code");
    }
  }

  // STEP 2: MANDATORY OTP CHALLENGE
  if (step === "OTP_CHALLENGE") {
    return (
      <AuthShell
        title="Verify Your Identity"
        subtitle={`Enter the 6-digit verification code sent to ${otpDetails?.destinationMasked || "your registered contact"}`}
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("CREDENTIALS");
              setOtp("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            ← Back to credentials
          </button>
        }
      >
        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-2">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </span>

            <div className="w-full flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Quick-Fill Demo OTP Helper for localhost testing */}
            <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-center">
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Testing on localhost? Auto-populate the dispatched verification code.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const testOtp = authService.getTestOtp(identifier);
                  if (testOtp) {
                    setOtp(testOtp);
                    toast.success(`Populated demo OTP: ${testOtp}`);
                  } else {
                    toast.info("Check browser console for OTP log.");
                  }
                }}
                className="text-xs h-7 border-primary/30 hover:bg-primary/10 text-primary font-semibold"
              >
                Auto-Fill Demo OTP
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trustDevice"
              checked={trustDevice}
              onCheckedChange={(c) => setTrustDevice(Boolean(c))}
            />
            <Label htmlFor="trustDevice" className="text-xs text-muted-foreground font-normal">
              Trust this device for 30 days
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full font-semibold"
            size="lg"
          >
            {loading ? "Verifying..." : "Verify & Enter Terminal"}
          </Button>

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Didn&apos;t get code? Resend OTP
            </button>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">
              Reset Password
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
      subtitle="Authenticate with your sovereign SmartQuant User ID or registered mobile."
      footer={
        <>
          New to SmartQuant Edge?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handlePrimarySubmit} className="space-y-4" noValidate>
        {error && (
          <p className="rounded-xl border border-bear/30 bg-bear/10 p-3 text-xs text-bear">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="identifier"
            className="text-xs font-medium flex items-center justify-between"
          >
            <span>User ID or Mobile Number</span>
            <span className="text-[10px] text-muted-foreground">e.g. SQE-7F42K9</span>
          </Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="SQE-7F42K9 or +91 9876543210"
            className="num"
          />
        </div>

        {loginMode === "PASSWORD" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <button
                type="button"
                onClick={() => setLoginMode("OTP_ONLY")}
                className="text-xs text-primary hover:underline"
              >
                Don&apos;t know your password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Passwordless OTP Login
            </p>
            <p>We will send a 6-digit one-time code to the verified contact on your account.</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full font-semibold mt-2" size="lg">
          {loading
            ? "Authenticating..."
            : loginMode === "PASSWORD"
              ? "Login Securely"
              : "Send Verification Code"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>

        {/* Alternate login mode toggle */}
        <div className="pt-2 text-center border-t border-border/50">
          {loginMode === "PASSWORD" ? (
            <button
              type="button"
              onClick={() => setLoginMode("OTP_ONLY")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in with one-time OTP instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLoginMode("PASSWORD")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in with User ID and Password
            </button>
          )}
        </div>

        {/* Institutional Demo Accounts (Examiner Quick-Fill) */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Demo Accounts
            </span>
            <span className="text-[10px] text-muted-foreground">Examiner Quick-Fill</span>
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
                  toast.info(`Loaded ${acc.name} (${acc.userId})`);
                }}
                className="w-full text-left p-2 rounded-lg border border-border/70 hover:border-primary/50 bg-surface-2/40 hover:bg-surface-2 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {acc.name}
                    </span>
                    <span className="rounded bg-primary/10 border border-primary/20 px-1 py-0.2 text-[10px] font-mono text-primary font-bold">
                      {acc.userId}
                    </span>
                    <span className="rounded bg-surface px-1 py-0.2 text-[9px] text-muted-foreground">
                      {acc.role} · {acc.plan}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{acc.description}</p>
                </div>
                <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium ml-2 shrink-0">
                  Select →
                </span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
