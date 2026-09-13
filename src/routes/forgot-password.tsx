import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authService } from "@/services/auth-service";
import type { OtpDeliveryResult } from "@/services/otp-provider";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Reset your SmartQuant Edge terminal password using your User ID or Mobile number with OTP verification.",
      },
      { property: "og:title", content: "Reset Password — SmartQuant Edge" },
      {
        property: "og:description",
        content: "Recover access to your algorithmic trading account.",
      },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();

  // Step: 'REQUEST_OTP' | 'VERIFY_AND_SET' | 'SUCCESS'
  const [step, setStep] = useState<"REQUEST_OTP" | "VERIFY_AND_SET" | "SUCCESS">("REQUEST_OTP");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [otpDetails, setOtpDetails] = useState<OtpDeliveryResult | null>(null);
  const [resendSeconds, setResendSeconds] = useState(45);

  // Active countdown timer for OTP resend cooldown
  useEffect(() => {
    if (step !== "VERIFY_AND_SET" || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendSeconds]);

  // Step 1: Request Password Reset OTP
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Enter your SmartQuant User ID or registered mobile number");
      return;
    }

    setError("");
    setLoading(true);

    const res = await authService.requestPasswordReset(identifier);
    setLoading(false);

    if (!res.success) {
      setError(res.message || "Unable to send verification code. Please try again.");
      toast.error(res.message || "Unable to send verification code. Please try again.");
      return;
    }

    if (res.otpDetails) {
      setOtpDetails(res.otpDetails);
    }
    setResendSeconds(45);
    setInfoMessage(res.message);
    setStep("VERIFY_AND_SET");
    toast.info(res.message);
  }

  // Resend OTP for Password Reset
  async function handleResendOtp() {
    if (resendSeconds > 0) return;
    setLoading(true);
    const res = await authService.requestPasswordReset(identifier);
    setLoading(false);

    if (res.success) {
      if (res.otpDetails) setOtpDetails(res.otpDetails);
      setResendSeconds(45);
      toast.info(
        `New verification code sent to ${res.otpDetails?.destinationMasked || "your registered contact"}`,
      );
    } else {
      toast.error(res.message || "Unable to send verification code. Please try again.");
    }
  }

  // Step 2: Verify OTP and Set New Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit verification code");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    const res = await authService.completePasswordReset(
      identifier,
      otp,
      newPassword,
      confirmPassword,
    );
    setLoading(false);

    if (!res.success) {
      let friendlyError = res.message || "Unable to update password.";
      const lower = friendlyError.toLowerCase();
      if (lower.includes("expired")) {
        friendlyError = "Verification code expired. Request a new code.";
      } else if (lower.includes("incorrect") || lower.includes("invalid")) {
        friendlyError = "Incorrect verification code. Please try again.";
      } else if (lower.includes("too many") || lower.includes("locked") || lower.includes("max")) {
        friendlyError = "Too many attempts. Request a new verification code.";
      }
      setError(friendlyError);
      toast.error(friendlyError);
      return;
    }

    toast.success("✓ Identity verified");
    setStep("SUCCESS");
    toast.success("Password reset successfully. Active sessions revoked.");
  }

  // Step 3: SUCCESS
  if (step === "SUCCESS") {
    return (
      <AuthShell
        title="Password Reset Complete"
        subtitle="Your password has been securely updated."
        footer={
          <span className="text-xs text-muted-foreground">
            All other active sessions on previous devices have been invalidated.
          </span>
        }
      >
        <div className="space-y-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-bull/40 bg-bull/10 text-bull">
            <CheckCircle2 className="h-6 w-6" />
          </span>

          <p className="text-xs text-muted-foreground">
            Your credentials have been updated and previous sessions revoked. You may now log in
            with your new password.
          </p>

          <Button
            className="w-full font-semibold"
            size="lg"
            onClick={() => navigate({ to: "/login" })}
          >
            Sign in to Terminal <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </AuthShell>
    );
  }

  // Step 2: OTP + NEW PASSWORD
  if (step === "VERIFY_AND_SET") {
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
            onClick={() => setStep("REQUEST_OTP")}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
          >
            ← Change User ID or Mobile
          </button>
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <p className="rounded-md border border-bear/30 bg-bear/10 p-2.5 text-xs text-bear">
              {error}
            </p>
          )}

          <div className="flex flex-col items-center gap-3 py-1">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <MailCheck className="h-5 w-5" />
            </span>

            <div className="w-full flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-10 w-9 sm:w-10 text-sm font-mono font-bold rounded-md border-border/80 bg-surface-2"
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

          <div className="flex items-center justify-between text-xs px-1 border-t border-border/50 pt-2">
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
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="newPass" className="text-xs font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPass"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs pr-9 h-9 bg-surface-2/60 border-border/80"
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

          <div className="space-y-1.5">
            <Label htmlFor="confirmPass" className="text-xs font-medium">
              Confirm New Password
            </Label>
            <Input
              id="confirmPass"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-xs h-9 bg-surface-2/60 border-border/80"
              required
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Must contain at least 8 characters with 1 uppercase letter and 1 number.
          </p>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full font-semibold mt-2 h-10 cursor-pointer"
          >
            {loading ? "Updating Password..." : "Update Password & Invalidate Sessions"}
          </Button>
        </form>
      </AuthShell>
    );
  }

  // Step 1: REQUEST OTP
  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your SmartQuant User ID or registered mobile number to receive a verification code."
      footer={
        <>
          Remembered your password?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleRequestOtp} className="space-y-4">
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

        <Button type="submit" disabled={loading} className="w-full font-semibold mt-2" size="lg">
          {loading ? "Sending Code..." : "Send Verification Code"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>
      {/* Invisible reCAPTCHA container for Firebase Phone Authentication */}
      <div id="recaptcha-container" className="invisible" />
    </AuthShell>
  );
}
