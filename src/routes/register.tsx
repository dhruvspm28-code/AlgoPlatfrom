import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useId, useEffect } from "react";
import {
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MailCheck,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Building2,
  Lock,
  BadgeCheck,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  authService,
  type UserProfile,
  type SupportedBroker,
  type TradingAccountStatus,
} from "@/services/auth-service";
import { maskEmail, maskPhone } from "@/services/otp-provider";
import { cn } from "@/lib/utils";

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

type RegistrationStep = "PERSONAL" | "SECURITY" | "TRADING_ACCOUNT" | "OTP_VERIFY" | "SUCCESS";

const personalSchema = z.object({
  name: z.string().trim().min(2, "Enter your full legal name").max(100),
  email: z.string().trim().email("Enter a valid institutional or personal email address").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid 10-digit Indian mobile number"),
});

const securitySchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter (A-Z)")
      .regex(/[0-9]/, "Include at least one number (0-9)"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function Register() {
  const navigate = useNavigate();

  // Multi-step state: 1. Personal -> 2. Security -> 3. Trading Account -> 4. OTP -> 5. Success
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("PERSONAL");

  // Form states preserved across steps
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Trading Account / Demat Eligibility State
  const [hasDematDeclared, setHasDematDeclared] = useState(true);
  const [selectedBroker, setSelectedBroker] = useState<SupportedBroker>("GROWW");
  const [brokerClientId, setBrokerClientId] = useState("");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(45);

  // Active countdown timer for OTP resend cooldown
  useEffect(() => {
    if (currentStep !== "OTP_VERIFY" || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, resendSeconds]);

  // Dynamic verification preview based on real backend support
  const verificationPreview = authService.verifyTradingAccount({
    hasDematDeclared,
    selectedBroker,
    brokerClientId,
  });

  // Step 1 Validation & Proceed to Step 2
  function handleNextFromPersonal(e: React.FormEvent) {
    e.preventDefault();
    const result = personalSchema.safeParse({ name, email, phone });
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    // Check duplicate email or phone locally
    if (authService.findUserByIdentifier(email)) {
      setErrors({ email: "An account with this email address already exists." });
      return;
    }
    const cleanDigits = phone.replace(/[^0-9]/g, "");
    if (cleanDigits.length >= 10 && authService.findUserByIdentifier(cleanDigits.slice(-10))) {
      setErrors({ phone: "An account with this mobile number already exists." });
      return;
    }

    setErrors({});
    setCurrentStep("SECURITY");
  }

  // Step 2 Validation & Proceed to Step 3
  function handleNextFromSecurity(e: React.FormEvent) {
    e.preventDefault();
    const result = securitySchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setCurrentStep("TRADING_ACCOUNT");
  }

  // Step 3: Initiate Registration & Request OTP
  async function handleInitiateOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const res = await authService.registerInitiate({
      name,
      email,
      phone,
      password,
      confirmPassword,
      hasDematDeclared,
      selectedBroker,
      brokerClientId: brokerClientId.trim() || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setErrors({ form: res.message });
      toast.error(res.message);
      return;
    }

    setResendSeconds(45);
    toast.success(res.message);
    setCurrentStep("OTP_VERIFY");
  }

  // Resend OTP for Registration
  async function handleResendOtp() {
    if (resendSeconds > 0) return;
    setLoading(true);

    const res = await authService.registerInitiate({
      name,
      email,
      phone,
      password,
      confirmPassword,
      hasDematDeclared,
      selectedBroker,
      brokerClientId: brokerClientId.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      setResendSeconds(45);
      toast.info(`New verification code dispatched to ${maskEmail(email)}`);
    } else {
      toast.error(res.message || "Unable to send verification code. Please try again.");
    }
  }

  // Step 4: Verify OTP and Create Account
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the full 6-digit verification code");
      return;
    }

    setLoading(true);
    const res = await authService.registerComplete({
      name,
      email,
      phone,
      password,
      otp,
      hasDematDeclared,
      selectedBroker,
      brokerClientId: brokerClientId.trim() || undefined,
    });
    setLoading(false);

    if (!res.success || !res.user) {
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
    setCreatedUser(res.user);
    setCurrentStep("SUCCESS");
    toast.success("SmartQuant Edge account created successfully!");
  }

  const handleCopyUserId = () => {
    if (!createdUser) return;
    navigator.clipboard.writeText(createdUser.userId);
    setCopied(true);
    toast.success("SmartQuant User ID copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  // Stepper Header Progress Indicator
  const renderProgress = () => {
    const steps = [
      { id: "PERSONAL", label: "1 Personal" },
      { id: "SECURITY", label: "2 Security" },
      { id: "TRADING_ACCOUNT", label: "3 Trading Account" },
      { id: "OTP_VERIFY", label: "4 Verification" },
    ];

    if (currentStep === "SUCCESS") return null;

    return (
      <div className="flex items-center justify-between gap-1 mb-6 border-b border-border/70 pb-3">
        {steps.map((s, idx) => {
          const stepOrder = ["PERSONAL", "SECURITY", "TRADING_ACCOUNT", "OTP_VERIFY"];
          const currentIdx = stepOrder.indexOf(currentStep);
          const itemIdx = stepOrder.indexOf(s.id);
          const isDone = itemIdx < currentIdx;
          const isCurrent = currentStep === s.id;

          return (
            <div key={s.id} className="flex items-center gap-1.5 text-xs font-mono">
              <span
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors",
                  isDone
                    ? "bg-primary text-primary-foreground border-primary"
                    : isCurrent
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground bg-surface-2",
                )}
              >
                {isDone ? "✓" : idx + 1}
              </span>
              <span
                className={cn(
                  "hidden sm:inline text-[11px] font-medium transition-colors",
                  isCurrent ? "text-foreground font-semibold" : "text-muted-foreground",
                )}
              >
                {s.label.split(" ")[1]}
              </span>
              {idx < steps.length - 1 && (
                <span className="text-border mx-1 hidden sm:inline">·</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // STEP 5: SUCCESS & SMARTQUANT USER ID GENERATED
  if (currentStep === "SUCCESS" && createdUser) {
    const ta = createdUser.tradingAccount;
    return (
      <AuthShell
        title="Trading Profile Created"
        subtitle="Your sovereign algorithmic trading identity is provisioned."
        cardWidth="max-w-md"
        footer={
          <span className="text-muted-foreground text-xs font-mono">
            SmartQuant Edge Security Engine · NIST SP 800-63B Compliant
          </span>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
            <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>ACCOUNT CREATED ✓ · SOVEREIGN ID GENERATED</span>
          </div>

          <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Your SmartQuant User ID
              </p>
              <div className="mt-1.5 flex items-center justify-between rounded-md border border-primary/30 bg-surface px-3 py-2">
                <span className="font-mono text-xl font-bold tracking-wider text-primary">
                  {createdUser.userId}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUserId}
                  className="h-7 gap-1 text-xs font-semibold"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "COPIED" : "COPY"}
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Contact Email:</span>
                <span className="text-foreground">{maskEmail(createdUser.email)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Mobile Number:</span>
                <span className="text-foreground">{maskPhone(createdUser.phone)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                <span>Demat Account Status:</span>
                <span
                  className={cn(
                    "font-bold text-[11px]",
                    ta?.status === "VERIFIED"
                      ? "text-emerald-400"
                      : ta?.status === "VERIFICATION_PENDING"
                        ? "text-amber-400"
                        : "text-muted-foreground",
                  )}
                >
                  {ta?.status === "VERIFIED"
                    ? "✓ VERIFIED"
                    : ta?.status === "VERIFICATION_PENDING"
                      ? "VERIFICATION PENDING"
                      : "NOT VERIFIED"}
                </span>
              </div>
              {ta?.selectedBroker && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Selected Broker:</span>
                  <span className="text-foreground font-sans font-semibold">
                    {ta.selectedBroker}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-surface/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" /> Important Next Step
            </p>
            <p className="leading-snug">
              Save your User ID. You will use your User ID (
              <strong className="font-mono text-foreground">{createdUser.userId}</strong>) or
              registered mobile alongside your password to log in.
            </p>
          </div>

          <Button
            onClick={() => navigate({ to: "/login" })}
            className="w-full font-semibold h-10"
            size="lg"
          >
            Proceed to Workstation Login
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={
        currentStep === "PERSONAL"
          ? "Create SmartQuant Account"
          : currentStep === "SECURITY"
            ? "Configure Access Security"
            : currentStep === "TRADING_ACCOUNT"
              ? "Trading Account Eligibility"
              : "Verify Contact Details"
      }
      subtitle={
        currentStep === "PERSONAL"
          ? "Step 1: Enter your trader details for sovereign terminal onboarding."
          : currentStep === "SECURITY"
            ? "Step 2: Create a secure cryptographic password for your account."
            : currentStep === "TRADING_ACCOUNT"
              ? "Step 3: Connect or declare your Indian Demat trading account."
              : "Step 4: Enter the 6-digit verification code sent to your email."
      }
      cardWidth={currentStep === "TRADING_ACCOUNT" ? "max-w-lg" : "max-w-md"}
      footer={
        <div className="space-y-1">
          <p>
            Already hold a SmartQuant User ID?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Indian Capital Markets quantitative execution environment
          </p>
        </div>
      }
    >
      {renderProgress()}

      {/* STEP 1: PERSONAL DETAILS */}
      {currentStep === "PERSONAL" && (
        <form onSubmit={handleNextFromPersonal} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Full Legal Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Vikram Malhotra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Work or Personal Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="trader@quantdesk.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-xs"
            />
            {errors.email && <p className="text-[11px] text-rose-500">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold">
              Mobile Number (India)
            </Label>
            <div className="flex gap-2">
              <span className="flex items-center px-2.5 rounded-md border border-border bg-surface-2 text-xs font-mono text-muted-foreground select-none">
                +91
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            {errors.phone && <p className="text-[11px] text-rose-500">{errors.phone}</p>}
          </div>

          <Button type="submit" className="w-full font-semibold h-9 mt-4">
            Continue to Security
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </form>
      )}

      {/* STEP 2: SECURITY & PASSWORD */}
      {currentStep === "SECURITY" && (
        <form onSubmit={handleNextFromSecurity} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Terminal Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs pr-9"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-rose-500">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 text-xs"
            />
            {errors.confirmPassword && (
              <p className="text-[11px] text-rose-500">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Password complexity checklist */}
          <div className="rounded-md border border-border/70 bg-surface-2/40 p-2.5 text-[11px] space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground text-[10px] uppercase tracking-wider">
              Password Requirements
            </p>
            <div className="flex items-center gap-1.5">
              <span className={password.length >= 8 ? "text-emerald-400" : "text-muted-foreground"}>
                {password.length >= 8 ? "✓" : "○"}
              </span>
              <span>Minimum 8 characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={/[A-Z]/.test(password) ? "text-emerald-400" : "text-muted-foreground"}
              >
                {/[A-Z]/.test(password) ? "✓" : "○"}
              </span>
              <span>At least one uppercase letter (A-Z)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={/[0-9]/.test(password) ? "text-emerald-400" : "text-muted-foreground"}
              >
                {/[0-9]/.test(password) ? "✓" : "○"}
              </span>
              <span>At least one numeric character (0-9)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep("PERSONAL")}
              className="h-9 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button type="submit" className="flex-1 font-semibold h-9">
              Continue to Trading Account
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: TRADING ACCOUNT & DEMAT ELIGIBILITY */}
      {currentStep === "TRADING_ACCOUNT" && (
        <form onSubmit={handleInitiateOtp} className="space-y-4">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Trading Account Eligibility
            </p>
            <p className="leading-relaxed">
              SmartQuant Edge is designed for users with an active Demat/trading account.
            </p>
          </div>

          {/* Demat Declaration Toggle */}
          <div className="rounded-lg border border-border/80 bg-surface-2/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="demat-toggle" className="text-xs font-semibold cursor-pointer">
                Do you hold an active Demat / Trading account?
              </Label>
              <input
                id="demat-toggle"
                type="checkbox"
                checked={hasDematDeclared}
                onChange={(e) => setHasDematDeclared(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {hasDematDeclared
                ? "Declared: Active Indian Demat/trading account held with a SEBI-registered broker."
                : "Declaration: No Demat account currently. Account will be created in Simulated Paper Sandbox mode."}
            </p>
          </div>

          {hasDematDeclared ? (
            <div className="space-y-3.5">
              {/* Broker Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Primary Broker / Trading Platform</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "GROWW", name: "Groww", badge: "Direct Gateway" },
                    { id: "DHAN", name: "Dhan", badge: "Direct Gateway" },
                    { id: "FYERS", name: "FYERS", badge: "Manual Check" },
                    { id: "UPSTOX", name: "Upstox", badge: "Manual Check" },
                    { id: "ANGEL_ONE", name: "Angel One", badge: "Manual Check" },
                    { id: "OTHER", name: "Other Broker", badge: "Declaration" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBroker(b.id as SupportedBroker)}
                      className={cn(
                        "p-2 rounded-md border text-left transition-all",
                        selectedBroker === b.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/70 hover:border-border bg-surface-2/30 text-muted-foreground",
                      )}
                    >
                      <div className="text-xs font-bold font-sans text-foreground">{b.name}</div>
                      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                        {b.badge}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Broker Client ID / UCC */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brokerUcc" className="text-xs font-semibold">
                    Broker Client ID / UCC (Unique Client Code)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Public Identifier Only</span>
                </div>
                <Input
                  id="brokerUcc"
                  type="text"
                  placeholder={
                    selectedBroker === "GROWW"
                      ? "e.g. GRW-8499B"
                      : selectedBroker === "DHAN"
                        ? "e.g. 10002891"
                        : "Enter Client ID / UCC"
                  }
                  value={brokerClientId}
                  onChange={(e) => setBrokerClientId(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono uppercase tracking-wider"
                />

                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300 flex items-start gap-1.5 leading-snug">
                  <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Security Notice:</strong> NEVER enter your trading PIN, broker password,
                    or broker OTP. SmartQuant Edge only requests your public Client Code / UCC.
                  </span>
                </div>
              </div>

              {/* Real-time Verification State Evaluation Preview */}
              <div
                className={cn(
                  "rounded-md border p-2.5 text-xs space-y-1",
                  verificationPreview.status === "VERIFICATION_UNAVAILABLE"
                    ? "border-border bg-surface-2/40 text-muted-foreground"
                    : verificationPreview.status === "VERIFICATION_FAILED"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      : "border-primary/30 bg-primary/5 text-foreground",
                )}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                  <span>Verification Status Preview</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded font-mono",
                      verificationPreview.status === "VERIFICATION_UNAVAILABLE"
                        ? "bg-surface-2 text-muted-foreground border border-border"
                        : verificationPreview.status === "VERIFICATION_PENDING"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-primary/20 text-primary border border-primary/30",
                    )}
                  >
                    {verificationPreview.status}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {verificationPreview.verificationMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-surface-2/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Simulated Trading Account Mode</p>
              <p className="mt-0.5 text-[11px] leading-snug">
                You can proceed with registration. SmartQuant Edge will grant full access to
                algorithmic backtesting, paper trade order execution, and technical indicators. You
                can link and verify an active broker account at any time in your profile settings.
              </p>
            </div>
          )}

          {errors.form && <p className="text-xs text-rose-500">{errors.form}</p>}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep("SECURITY")}
              className="h-9 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 font-semibold h-9">
              {loading ? "Sending Verification OTP..." : "Send Verification Code"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      )}

      {/* STEP 4: OTP VERIFICATION */}
      {currentStep === "OTP_VERIFY" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1 text-center">
            <p className="font-semibold text-foreground flex items-center justify-center gap-1.5">
              <MailCheck className="h-3.5 w-3.5 text-primary" /> Enter verification code
            </p>
            <p className="text-xs">
              Code sent to:{" "}
              <strong className="text-foreground font-mono">{maskEmail(email)}</strong>
            </p>
          </div>

          <div className="space-y-2 flex flex-col items-center py-2">
            <div className="w-full flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)}>
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
            <p className="text-[11px] text-muted-foreground text-center">
              Single-use security token. Valid for 5 minutes.
            </p>
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

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep("TRADING_ACCOUNT")}
              className="h-9 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex-1 font-semibold h-9"
            >
              {loading ? "Verifying..." : "Verify & Complete Registration"}
              <Check className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
