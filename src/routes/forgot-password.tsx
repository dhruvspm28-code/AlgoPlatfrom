import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authService } from "@/services/auth-service";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

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

    setInfoMessage(res.message);
    setStep("VERIFY_AND_SET");
    toast.info(res.message);
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
      setError(res.message);
      toast.error(res.message);
      return;
    }

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
    return (
      <AuthShell
        title="Set New Password"
        subtitle={infoMessage || "Enter the verification code and your new password."}
        footer={
          <button
            type="button"
            onClick={() => setStep("REQUEST_OTP")}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            ← Change User ID or Mobile
          </button>
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <p className="rounded-xl border border-bear/30 bg-bear/10 p-3 text-xs text-bear">
              {error}
            </p>
          )}

          <div className="flex flex-col items-center gap-3 py-2">
            <Label className="text-xs font-medium">6-Digit Verification Code</Label>
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPass" className="text-xs font-medium">
              New Password
            </Label>
            <Input
              id="newPass"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPass" className="text-xs font-medium">
              Confirm New Password
            </Label>
            <Input
              id="confirmPass"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Must contain at least 8 characters with 1 uppercase letter and 1 number.
          </p>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full font-semibold mt-2"
            size="lg"
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
    </AuthShell>
  );
}
