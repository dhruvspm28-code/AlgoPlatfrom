import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, ArrowRight, ShieldCheck, MailCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authService, type UserProfile } from "@/services/auth-service";
import { maskEmail, maskPhone } from "@/services/otp-provider";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (authService.isAuthenticated()) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Create Account — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Open an account on SmartQuant Edge for algorithmic trading and quantitative research on Indian markets.",
      },
      { property: "og:title", content: "Create a SmartQuant Edge Account" },
      {
        property: "og:description",
        content: "Professional algorithmic trading terminal for Indian markets.",
      },
    ],
  }),
  component: Register,
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email address").max(255),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid 10-digit Indian mobile number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must include at least one uppercase letter")
      .regex(/[0-9]/, "Must include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function Register() {
  const navigate = useNavigate();

  // Registration step: 'FORM' | 'OTP_VERIFY' | 'SUCCESS'
  const [step, setStep] = useState<"FORM" | "OTP_VERIFY" | "SUCCESS">("FORM");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  // Step 1: Submit Details & Request OTP
  async function onSubmitDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = registerSchema.safeParse(data);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }

    setErrors({});
    setLoading(true);

    const res = await authService.registerInitiate({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      confirmPassword: parsed.data.confirmPassword,
    });

    setLoading(false);

    if (!res.success) {
      setErrors({ form: res.message });
      toast.error(res.message);
      return;
    }

    setFormData({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
    });

    setStep("OTP_VERIFY");
    toast.success(res.message);
  }

  // Step 2: Verify OTP and Generate User ID
  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the full 6-digit verification code");
      return;
    }

    setLoading(true);
    const res = await authService.registerComplete({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      otp,
    });
    setLoading(false);

    if (!res.success || !res.user) {
      toast.error(res.message);
      return;
    }

    setCreatedUser(res.user);
    setStep("SUCCESS");
    toast.success("Account created successfully!");
  }

  const handleCopyUserId = () => {
    if (!createdUser) return;
    navigator.clipboard.writeText(createdUser.userId);
    setCopied(true);
    toast.success("SmartQuant User ID copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  // STEP 3: ACCOUNT CREATED SCREEN
  if (step === "SUCCESS" && createdUser) {
    return (
      <AuthShell
        title="Account Created"
        subtitle="Your sovereign trading profile has been created."
        footer={
          <span className="text-muted-foreground text-xs">
            Store your User ID in a safe place. You will need it to sign in.
          </span>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 rounded-xl border border-bull/40 bg-bull/10 p-3 text-xs font-semibold text-bull">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>ACCOUNT CREATED ✓</span>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your SmartQuant User ID
              </p>
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-primary/30 bg-surface px-3 py-2.5">
                <span className="num text-xl font-bold tracking-wider text-primary">
                  {createdUser.userId}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUserId}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-bull" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "COPY USER ID"}
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-xs space-y-1.5 num">
              <div className="flex justify-between text-muted-foreground">
                <span>Registered Email:</span>
                <span className="text-foreground font-medium">{maskEmail(createdUser.email)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Registered Mobile:</span>
                <span className="text-foreground font-medium">{maskPhone(createdUser.phone)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface/30 p-3.5 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" /> Important Notice
            </p>
            <p>
              Save your User ID. You will use your User ID or Mobile number alongside OTP
              verification to access your SmartQuant Edge terminal.
            </p>
          </div>

          <Button
            className="w-full font-semibold"
            size="lg"
            onClick={() => navigate({ to: "/login" })}
          >
            Continue to Login <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </AuthShell>
    );
  }

  // STEP 2: OTP VERIFICATION
  if (step === "OTP_VERIFY") {
    return (
      <AuthShell
        title="Verify Your Contact"
        subtitle={`Enter the 6-digit verification code sent to ${maskEmail(formData.email)}`}
        footer={
          <button
            type="button"
            onClick={() => setStep("FORM")}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            ← Modify contact details
          </button>
        }
      >
        <form onSubmit={onVerifyOtp} className="space-y-6">
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
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full font-semibold"
            size="lg"
          >
            {loading ? "Verifying..." : "Verify & Generate User ID"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={async () => {
                const res = await authService.registerInitiate({
                  name: formData.name,
                  email: formData.email,
                  phone: formData.phone,
                  password: formData.password,
                });
                if (res.success) toast.info("New verification code dispatched");
                else toast.error(res.message);
              }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Didn&apos;t receive code? Resend OTP
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  // STEP 1: INITIAL DETAILS FORM
  return (
    <AuthShell
      title="Create Account"
      subtitle="Register your sovereign SmartQuant Edge profile. First-party credentials only."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmitDetails} className="space-y-4" noValidate>
        {errors.form && (
          <p className="rounded-xl border border-bear/30 bg-bear/10 p-3 text-xs text-bear">
            {errors.form}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium">
            Full Name
          </Label>
          <Input id="name" name="name" placeholder="Ananya Rao" maxLength={100} />
          {errors.name && <p className="text-[11px] text-bear">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Registered Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ananya@meridiancap.in"
            maxLength={255}
          />
          {errors.email && <p className="text-[11px] text-bear">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-medium">
            Mobile Number (+91)
          </Label>
          <Input id="phone" name="phone" placeholder="+91 98765 43210" maxLength={16} />
          {errors.phone && <p className="text-[11px] text-bear">{errors.phone}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              maxLength={128}
            />
            {errors.password && <p className="text-[11px] text-bear">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              maxLength={128}
            />
            {errors.confirmPassword && (
              <p className="text-[11px] text-bear">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Must be at least 8 characters with 1 uppercase letter and 1 number.
        </p>

        <Button type="submit" disabled={loading} className="w-full font-semibold mt-2" size="lg">
          {loading ? "Validating..." : "Verify Contact & Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
