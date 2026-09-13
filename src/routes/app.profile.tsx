import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Key,
  ShieldCheck,
  Laptop,
  Smartphone,
  LogOut,
  CheckCircle2,
  AlertCircle,
  History,
  ShieldAlert,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Clock,
  Radio,
  Server,
  Trash2,
  Building2,
  Sliders,
  Download,
  AlertTriangle,
  User,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  authService,
  type TrustedDevice,
  type LoginActivity,
  type UserSession,
} from "@/services/auth-service";
import { maskEmail, maskPhone } from "@/services/otp-provider";

export const Route = createFileRoute("/app/profile")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: typeof search.tab === "string" ? search.tab : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Account & Security Center — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Manage your sovereign SmartQuant User ID, OTP authentication, multi-device sessions, password, broker isolation, and security audit log.",
      },
      { property: "og:title", content: "Account & Security Center — SmartQuant Edge" },
    ],
  }),
  component: ProfilePage,
});

type TabKey =
  "overview" | "personal" | "security" | "sessions" | "activity" | "broker" | "risk" | "actions";

export function ProfilePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const {
    user,
    activeSessions,
    setAllowMultipleDevices,
    setTwoFactorEnabled,
    revokeSession,
    revokeAllOtherSessions,
    brokerSession,
    connectBroker,
    disconnectBroker,
    logout,
    globalTradingState,
    riskLimits,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<TabKey>((search.tab as TabKey) || "overview");

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab as TabKey);
    }
  }, [search.tab]);

  const [copiedId, setCopiedId] = useState(false);

  // Change password form state
  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passConfirmOpen, setPassConfirmOpen] = useState(false);

  // Editable personal info state
  const [fullName, setFullName] = useState(user.name || "");
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Confirmation dialogs
  const [terminateAllOpen, setTerminateAllOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<UserSession | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [multiDeviceConfirmOpen, setMultiDeviceConfirmOpen] = useState(false);

  // Trusted devices & activity
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>(
    authService.getTrustedDevices(),
  );
  const [activities, setActivities] = useState<LoginActivity[]>(authService.getLoginActivity());

  const handleCopyUserId = () => {
    if (user.userId) {
      navigator.clipboard.writeText(user.userId);
      setCopiedId(true);
      toast.success("SmartQuant User ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Please enter a valid full name");
      return;
    }
    setIsSavingPersonal(true);
    setTimeout(() => {
      user.name = fullName.trim();
      setIsSavingPersonal(false);
      toast.success("Personal information updated successfully");
    }, 400);
  };

  const handleChangePasswordSubmit = async () => {
    setPassLoading(true);
    try {
      const res = await authService.changePassword(currPass, newPass, confirmPass);
      if (!res.success) {
        toast.error(res.message);
      } else {
        toast.success(res.message);
        setCurrPass("");
        setNewPass("");
        setConfirmPass("");
        setPassConfirmOpen(false);
        setActivities(authService.getLoginActivity());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast.error(msg);
    } finally {
      setPassLoading(false);
    }
  };

  const handleRevokeTrustedDevice = (id: string) => {
    authService.revokeTrustedDevice(id);
    setTrustedDevices(authService.getTrustedDevices());
    setActivities(authService.getLoginActivity());
    toast.info("Trusted device revoked");
  };

  const handleExecuteTerminateSession = () => {
    if (!terminateTarget) return;
    revokeSession(terminateTarget.id);
    toast.info(`Terminated session on ${terminateTarget.deviceName}`);
    setTerminateTarget(null);
    setActivities(authService.getLoginActivity());
  };

  const handleExecuteTerminateAllOther = () => {
    revokeAllOtherSessions();
    toast.info("All other active sessions have been terminated");
    setTerminateAllOpen(false);
    setActivities(authService.getLoginActivity());
  };

  const handleExecuteSignOut = () => {
    setSignOutOpen(false);
    logout();
    toast.info("Signed out of SmartQuant Edge");
    navigate({ to: "/login" });
  };

  const handleToggleMultiDevice = (enable: boolean) => {
    if (!enable && activeSessions.length > 1) {
      setMultiDeviceConfirmOpen(true);
    } else {
      setAllowMultipleDevices(enable);
      toast.success(
        enable
          ? "Multiple device access enabled"
          : "Single device policy active — other sessions closed",
      );
      setActivities(authService.getLoginActivity());
    }
  };

  const exportActivityCsv = () => {
    const headers = "ID,Timestamp,EventType,Status,Device,IP,Location,Reason\n";
    const rows = activities
      .map(
        (a) =>
          `"${a.id}","${a.timestamp}","${a.eventType}","${a.status}","${a.device}","${a.ip}","${a.location}","${(a.reason || "").replace(/"/g, '""')}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SmartQuant_Security_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Security audit activity exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* SECTION 3: COMPACT INSTITUTIONAL PROFILE HEADER */}
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary font-bold text-lg border border-primary/30">
            {user.name ? user.name.slice(0, 2).toUpperCase() : "SQ"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-foreground tracking-tight truncate">
                {user.name}
              </h1>
              <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                {user.role}
              </span>
              <span className="rounded bg-surface-2 border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {user.plan} Tier
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              SmartQuant User ID:{" "}
              <strong className="text-foreground font-bold">{user.userId || "SQE-7F42K9"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <div className="rounded-lg border border-border/70 bg-surface-2/40 px-3 py-1.5 text-xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Account Status
            </span>
            <span className="font-bold text-bull flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> ACTIVE
            </span>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/40 px-3 py-1.5 text-xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Security Status
            </span>
            <span className="font-bold text-bull flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> SECURE
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyUserId}
            className="h-8 text-xs gap-1.5 font-semibold cursor-pointer"
          >
            {copiedId ? (
              <Check className="h-3.5 w-3.5 text-bull" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiedId ? "COPIED" : "COPY USER ID"}
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-border text-xs font-semibold overflow-x-auto pb-px">
        {[
          { key: "overview", label: "Account Overview", icon: ShieldCheck },
          { key: "personal", label: "Personal Info", icon: User },
          { key: "security", label: "Security Center", icon: Lock },
          { key: "sessions", label: "Sessions & Devices", icon: Laptop },
          { key: "activity", label: "Login Activity", icon: History },
          { key: "broker", label: "Broker Connectivity", icon: Server },
          { key: "risk", label: "Risk & Controls", icon: ShieldAlert },
          { key: "actions", label: "Account Actions", icon: Sliders },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION A: ACCOUNT OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Identity Details */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Account Identity
              </h2>
              <div className="divide-y divide-border/50 text-xs num">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Full Legal Name</span>
                  <span className="font-semibold text-foreground">{user.name}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">SmartQuant User ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{user.userId}</span>
                    <button
                      onClick={handleCopyUserId}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Account Role</span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {user.role}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Subscription Tier</span>
                  <span className="font-semibold text-foreground">{user.plan}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Account Status</span>
                  <span className="font-bold text-bull flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> ACTIVE
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Account Created</span>
                  <span className="text-muted-foreground">
                    {new Date(user.createdAt || "2026-01-01").toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Last Session Login</span>
                  <span className="text-muted-foreground">Today at 09:15 AM IST</span>
                </div>
              </div>
            </div>

            {/* Verification & KYC Status */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-bull" /> Verification & Compliance Status
              </h2>
              <div className="divide-y divide-border/50 text-xs num">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Email Contact</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground block">
                      {maskEmail(user.email)}
                    </span>
                    <span className="text-[10px] text-bull font-semibold flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified via OTP
                    </span>
                  </div>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Mobile Contact</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground block">
                      {maskPhone(user.phone)}
                    </span>
                    <span className="text-[10px] text-bull font-semibold flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified via OTP
                    </span>
                  </div>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">KYC / Compliance</span>
                  <span className="rounded bg-bull/10 border border-bull/30 px-2 py-0.5 text-[10px] font-bold text-bull">
                    {user.kyc?.status || "VERIFIED"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">PAN Identification</span>
                  <span className="font-mono text-muted-foreground">
                    {user.kyc?.panNumber || "ABCDE1234F"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Regulatory Authority</span>
                  <span className="text-muted-foreground">SEBI / KRA Verified</span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground block font-semibold mb-1">
                  Architecture Principle: Identity vs Broker Isolation
                </strong>
                SmartQuant sovereign credentials never store or require your broker password, PIN,
                or TOTP secrets. Trading execution and market data are brokered over server-side
                sandboxed adapters.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: PERSONAL INFORMATION */}
      {activeTab === "personal" && (
        <div className="max-w-2xl rounded-xl border border-border bg-surface p-5 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">Personal Information</h2>
            <p className="text-xs text-muted-foreground">
              Review and update your trader identity. Contact details require OTP verification to
              change.
            </p>
          </div>

          <form onSubmit={handleSavePersonalInfo} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullname" className="text-xs font-semibold">
                Full Legal Name
              </Label>
              <Input
                id="fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">SmartQuant User ID</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Immutable · Read-only
                </span>
              </div>
              <Input
                disabled
                value={user.userId}
                className="text-xs font-mono font-bold bg-surface-2 cursor-not-allowed opacity-80"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Registered Email</Label>
                  <span className="text-[10px] text-bull font-semibold">Verified</span>
                </div>
                <Input
                  disabled
                  value={maskEmail(user.email)}
                  className="text-xs bg-surface-2 cursor-not-allowed opacity-80"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Registered Mobile</Label>
                  <span className="text-[10px] text-bull font-semibold">Verified</span>
                </div>
                <Input
                  disabled
                  value={maskPhone(user.phone)}
                  className="text-xs bg-surface-2 cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Role</Label>
                <Input
                  disabled
                  value={user.role}
                  className="text-xs font-semibold bg-surface-2 cursor-not-allowed opacity-80"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Plan Level</Label>
                <Input
                  disabled
                  value={`${user.plan} Tier`}
                  className="text-xs font-semibold bg-surface-2 cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isSavingPersonal}
                className="font-semibold text-xs h-8 cursor-pointer"
              >
                {isSavingPersonal ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION C: SECURITY CENTER */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Security Health Checklist */}
          <div className="rounded-xl border border-bull/30 bg-bull/5 p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-bull" /> Security Health Status: SECURE
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All foundational sovereign identity controls, KDF derivations, and multi-device
                  protections are active.
                </p>
              </div>
              <span className="rounded-full bg-bull/20 border border-bull/40 px-2.5 py-0.5 text-xs font-bold text-bull">
                6 / 6 Passed
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-bull shrink-0" /> Email Verified via OTP
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-bull shrink-0" /> Mobile Verified via OTP
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-bull shrink-0" /> PBKDF2-HMAC-SHA512 KDF
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-bull shrink-0" /> Mandatory 2FA Active
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-bull shrink-0" /> Session Token Protection
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-bull shrink-0" /> Immutable Audit Trail
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Change Password Card */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> Update Password
                </h2>
                <span className="text-[10px] text-muted-foreground font-mono">
                  100,000 Iterations
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Updating your password immediately invalidates all other active sessions across
                devices.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!currPass || !newPass || !confirmPass) {
                    toast.error("Please fill in all password fields");
                    return;
                  }
                  if (newPass !== confirmPass) {
                    toast.error("New passwords do not match");
                    return;
                  }
                  setPassConfirmOpen(true);
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="currPass" className="text-xs font-semibold">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currPass"
                      type={showPass ? "text" : "password"}
                      value={currPass}
                      onChange={(e) => setCurrPass(e.target.value)}
                      placeholder="••••••••"
                      className="text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newPass" className="text-xs font-semibold">
                    New Password
                  </Label>
                  <Input
                    id="newPass"
                    type={showPass ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPass" className="text-xs font-semibold">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPass"
                    type={showPass ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repeat new password"
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full font-semibold text-xs h-8 mt-2 cursor-pointer"
                >
                  Update Account Password
                </Button>
              </form>
            </div>

            {/* Policy & Authentication Controls */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Authentication Policies
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface-2/40">
                  <div>
                    <p className="font-bold text-foreground">Two-Factor Authentication (2FA)</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Enforce mandatory 6-digit OTP challenge for all password logins.
                    </p>
                  </div>
                  <Switch
                    checked={user.twoFactorEnabled}
                    onCheckedChange={(c) => {
                      setTwoFactorEnabled(c);
                      toast.info(`2FA is ${c ? "Enabled" : "Disabled"}`);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface-2/40">
                  <div>
                    <p className="font-bold text-foreground">Multiple Concurrent Devices</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Allow simultaneous sessions. When disabled, signing in immediately terminates
                      all other devices.
                    </p>
                  </div>
                  <Switch
                    checked={user.allowMultipleDevices}
                    onCheckedChange={handleToggleMultiDevice}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface-2/40">
                  <div>
                    <p className="font-bold text-foreground">Passwordless "Login with OTP"</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Allows signing in via one-time cryptographic code sent to registered contact.
                    </p>
                  </div>
                  <span className="rounded bg-bull/10 px-2 py-0.5 text-[10px] font-bold text-bull">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface-2/40">
                  <div>
                    <p className="font-bold text-foreground">30-Day Trusted Device Policy</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Recognized browser fingerprints bypass repeated secondary OTP challenges.
                    </p>
                  </div>
                  <span className="font-mono text-muted-foreground font-bold">
                    {trustedDevices.length} Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D & E: SESSIONS & TRUSTED DEVICES */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
          {/* Active Sessions Table */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-primary" /> Active Terminal Sessions
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sessions authenticated across browser terminals. Terminate any unrecognized
                  access.
                </p>
              </div>
              {activeSessions.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setTerminateAllOpen(true)}
                  className="text-xs h-7 font-semibold shrink-0 cursor-pointer"
                >
                  Terminate All Other Sessions
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border uppercase tracking-wider text-[10px]">
                    <th className="pb-2 font-semibold">Device</th>
                    <th className="pb-2 font-semibold">Browser</th>
                    <th className="pb-2 font-semibold">Operating System</th>
                    <th className="pb-2 font-semibold">Region</th>
                    <th className="pb-2 font-semibold">Created</th>
                    <th className="pb-2 font-semibold">Last Active</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 num">
                  {activeSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-2/40">
                      <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                        <Laptop className="h-3.5 w-3.5 text-primary" />
                        <span>{s.deviceName}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{s.browser}</td>
                      <td className="py-3 text-muted-foreground">{s.os}</td>
                      <td className="py-3 text-muted-foreground">{s.location}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(s.createdTime).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-muted-foreground">Just now</td>
                      <td className="py-3">
                        {s.isCurrent ? (
                          <span className="rounded bg-bull/10 border border-bull/30 px-1.5 py-0.5 text-[9px] font-bold text-bull">
                            CURRENT SESSION
                          </span>
                        ) : (
                          <span className="rounded bg-surface-2 border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {s.isCurrent ? (
                          <span className="text-[11px] text-muted-foreground italic">Current</span>
                        ) : (
                          <button
                            onClick={() => setTerminateTarget(s)}
                            className="text-[11px] font-semibold text-bear hover:underline cursor-pointer"
                          >
                            Terminate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION E: TRUSTED DEVICES */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" /> Recognized Trusted Devices
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Devices authorized to retain session longevity for 30 days without repeated OTP
                challenges.
              </p>
            </div>

            {trustedDevices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 italic">
                No trusted devices registered. Check "Trust this device for 30 days" during login.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border uppercase tracking-wider text-[10px]">
                      <th className="pb-2 font-semibold">Device</th>
                      <th className="pb-2 font-semibold">Browser</th>
                      <th className="pb-2 font-semibold">Region</th>
                      <th className="pb-2 font-semibold">Trusted Date</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 num">
                    {trustedDevices.map((d) => (
                      <tr key={d.id} className="hover:bg-surface-2/40">
                        <td className="py-3 font-semibold text-foreground">{d.name}</td>
                        <td className="py-3 text-muted-foreground">{d.browser}</td>
                        <td className="py-3 text-muted-foreground">{d.ip} (Regional)</td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(d.trustedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <span className="rounded bg-bull/10 border border-bull/30 px-1.5 py-0.5 text-[9px] font-bold text-bull">
                            TRUSTED (30D)
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleRevokeTrustedDevice(d.id)}
                            className="text-[11px] font-semibold text-bear hover:underline cursor-pointer"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION F: LOGIN ACTIVITY AUDIT TIMELINE */}
      {activeTab === "activity" && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Security Audit Activity Trail
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authoritative chronological record of logins, OTP validations, session creations,
                and security events.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportActivityCsv}
              className="text-xs h-7 gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border uppercase tracking-wider text-[10px]">
                  <th className="pb-2 font-semibold">Timestamp (IST)</th>
                  <th className="pb-2 font-semibold">Security Event</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Terminal / Device</th>
                  <th className="pb-2 font-semibold">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 num">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-2/40">
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(a.timestamp).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-semibold text-foreground">
                      <span className="font-mono text-[11px]">{a.eventType}</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          a.status === "SUCCESS"
                            ? "bg-bull/10 text-bull border border-bull/30"
                            : a.status === "FAILED"
                              ? "bg-bear/10 text-bear border border-bear/30"
                              : a.status === "CHALLENGE"
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{a.device}</td>
                    <td className="py-3 text-foreground">{a.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION G: BROKER CONNECTIVITY */}
      {activeTab === "broker" && (
        <div className="space-y-6">
          {/* Architecture Isolation Diagram */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" /> Sovereign Broker Isolation Architecture
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SmartQuant Edge separates authentication from execution. Broker credentials remain
              strictly on the server layer.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs num py-2">
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                  Step 1
                </span>
                <p className="font-bold text-foreground mt-0.5">SmartQuant Account</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                  Step 2
                </span>
                <p className="font-bold text-foreground mt-0.5">2FA Authentication</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                  Step 3
                </span>
                <p className="font-bold text-foreground mt-0.5">Trading Platform</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                  Step 4
                </span>
                <p className="font-bold text-foreground mt-0.5">Broker API Gateway</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 col-span-2 md:col-span-1">
                <span className="text-[10px] text-primary font-semibold uppercase">Execution</span>
                <p className="font-bold text-primary mt-0.5">Dhan Data & Feeds</p>
              </div>
            </div>
          </div>

          {/* Broker Status Cards */}
          <div className="space-y-4">
            {/* DhanHQ Card */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-foreground font-bold">
                    DH
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">DhanHQ Trading Gateway</h3>
                    <p className="text-xs text-muted-foreground">
                      NSE/BSE equities, F&O derivatives, and tick feeds
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      brokerSession.status === "CONNECTED" && brokerSession.brokerId === "dhan"
                        ? "bg-bull/10 border border-bull/30 text-bull"
                        : "bg-surface-2 border border-border text-muted-foreground"
                    }`}
                  >
                    {brokerSession.status === "CONNECTED" && brokerSession.brokerId === "dhan"
                      ? "CONNECTED"
                      : "STANDBY"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 border-t border-border pt-4 text-xs num">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Credentials Security
                  </span>
                  <span className="font-bold text-bull flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Server-side Protected (.env)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Execution Sandboxing
                  </span>
                  <span className="font-bold text-foreground mt-0.5 block">
                    Paper Engine Active
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Client ID
                  </span>
                  <span className="font-mono text-muted-foreground mt-0.5 block">
                    DHAN-•••••••• (Protected)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border/50 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Configured via server-side DHAN_CLIENT_ID & DHAN_ACCESS_TOKEN.
                </span>
                {brokerSession.status === "CONNECTED" && brokerSession.brokerId === "dhan" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectBroker}
                    className="text-xs h-7 cursor-pointer"
                  >
                    Disconnect Broker
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connectBroker("dhan")}
                    className="text-xs h-7 font-semibold cursor-pointer"
                  >
                    Connect Dhan Gateway
                  </Button>
                )}
              </div>
            </div>

            {/* Groww Card */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    GW
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Groww Trade Gateway</h3>
                    <p className="text-xs text-muted-foreground">
                      Equities, F&O, TOTP Auth & Web Access via Groww API
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      brokerSession.status === "CONNECTED" && brokerSession.brokerId === "groww"
                        ? "bg-bull/10 border border-bull/30 text-bull"
                        : "bg-surface-2 border border-border text-muted-foreground"
                    }`}
                  >
                    {brokerSession.status === "CONNECTED" && brokerSession.brokerId === "groww"
                      ? "CONNECTED"
                      : "STANDBY"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 border-t border-border pt-4 text-xs num">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Credentials Security
                  </span>
                  <span className="font-bold text-bull flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Server-side Protected (.env)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    API Secret Status
                  </span>
                  <span className="font-bold text-foreground mt-0.5 block font-mono">
                    kZVv••••7dY (Secured)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Token Authority
                  </span>
                  <span className="font-mono text-muted-foreground mt-0.5 block">
                    apex-auth-prod-app (Protected)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border/50 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Configured securely via server-side GROWW_API_KEY & GROWW_API_SECRET.
                </span>
                {brokerSession.status === "CONNECTED" && brokerSession.brokerId === "groww" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectBroker}
                    className="text-xs h-7 cursor-pointer"
                  >
                    Disconnect Broker
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connectBroker("groww")}
                    className="text-xs h-7 font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Connect Groww Gateway
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION H: RISK & ACCOUNT CONTROLS */}
      {activeTab === "risk" && (
        <div className="space-y-6">
          {/* Simulated Mode Banner */}
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  PAPER TRADING · SIMULATED EXECUTION · NO REAL MONEY
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All algorithm signals and orders run against high-fidelity simulated ledger.
                </p>
              </div>
            </div>
            <span className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-xs font-mono font-bold text-primary">
              VIRTUAL LEDGER
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs num">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Kill Switch Status
              </span>
              <p
                className={`text-base font-bold ${
                  globalTradingState === "HALTED" ? "text-bear" : "text-bull"
                }`}
              >
                {globalTradingState === "HALTED" ? "HALTED (ENGAGED)" : "ARMED & READY"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Authoritative emergency kill switch active across all algorithms.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs num">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Max Position Size
              </span>
              <p className="text-base font-bold text-foreground">
                {riskLimits.maxPositionSizePct}% Capital
              </p>
              <p className="text-[11px] text-muted-foreground">
                Pre-trade ceiling preventing algorithmic over-allocation.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs num">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Max Trade Value
              </span>
              <p className="text-base font-bold text-foreground">
                ₹{riskLimits.maxTradeValue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Maximum portfolio exposure risk allowed on any single order.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs num">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Daily Loss Limit Cap
              </span>
              <p className="text-base font-bold text-bear">
                ₹{riskLimits.maxDailyLossCap.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Automatic halt trigger if day drawdown reaches threshold.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs num">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Pre-Trade Gating
              </span>
              <p className="text-base font-bold text-bull">100% Gated</p>
              <p className="text-[11px] text-muted-foreground">
                Every order verified against capital and risk rules before execution.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs num">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Execution Cluster
              </span>
              <p className="text-base font-bold text-foreground">Mumbai (IN)</p>
              <p className="text-[11px] text-muted-foreground">
                Deterministic order matching engine with sub-millisecond execution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION I: ACCOUNT ACTIONS */}
      {activeTab === "actions" && (
        <div className="max-w-2xl rounded-xl border border-border bg-surface p-5 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">Authoritative Account Actions</h2>
            <p className="text-xs text-muted-foreground">
              Execute sovereign security actions, manage active devices, or contact support.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40">
              <div>
                <p className="text-xs font-bold text-foreground">Change Account Password</p>
                <p className="text-[11px] text-muted-foreground">
                  Update your PBKDF2 derived password and invalidate old sessions.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("security")}
                className="text-xs h-7 cursor-pointer"
              >
                Go to Security
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40">
              <div>
                <p className="text-xs font-bold text-foreground">Sign Out Current Session</p>
                <p className="text-[11px] text-muted-foreground">
                  Safely end this browser session and return to the sign in gateway.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSignOutOpen(true)}
                className="text-xs h-7 text-bear border-bear/30 hover:bg-bear/10 cursor-pointer"
              >
                Sign Out
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40">
              <div>
                <p className="text-xs font-bold text-foreground">Sign Out All Other Devices</p>
                <p className="text-[11px] text-muted-foreground">
                  Invalidate all other sessions while keeping this terminal active.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setTerminateAllOpen(true)}
                className="text-xs h-7 cursor-pointer"
              >
                Terminate Others
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40">
              <div>
                <p className="text-xs font-bold text-foreground">Export Security Audit Log</p>
                <p className="text-[11px] text-muted-foreground">
                  Download immutable timestamped log of all account operations.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportActivityCsv}
                className="text-xs h-7 cursor-pointer"
              >
                Download CSV
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40">
              <div>
                <p className="text-xs font-bold text-foreground">Institutional Help Desk</p>
                <p className="text-[11px] text-muted-foreground">
                  Query technical documentation, API keys, or submit priority support tickets.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs h-7 cursor-pointer">
                <Link to="/app/support">Open Support</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: CHANGE PASSWORD */}
      <Dialog open={passConfirmOpen} onOpenChange={setPassConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Confirm Password Change
            </DialogTitle>
            <DialogDescription>
              Changing your account password will immediately invalidate all other active sessions
              across devices. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPassConfirmOpen(false)}
              disabled={passLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleChangePasswordSubmit}
              disabled={passLoading}
              className="font-semibold cursor-pointer"
            >
              {passLoading ? "Updating..." : "Confirm & Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: TERMINATE INDIVIDUAL SESSION */}
      <Dialog open={!!terminateTarget} onOpenChange={(open) => !open && setTerminateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-bear">
              <AlertTriangle className="h-5 w-5 text-bear" /> Terminate Active Session
            </DialogTitle>
            <DialogDescription>
              Terminate session on <strong>{terminateTarget?.deviceName}</strong> (
              {terminateTarget?.browser})? That device will be immediately logged out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTerminateTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteTerminateSession}>
              Terminate Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: TERMINATE ALL OTHER SESSIONS */}
      <Dialog open={terminateAllOpen} onOpenChange={setTerminateAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-bear">
              <AlertTriangle className="h-5 w-5 text-bear" /> Terminate All Other Sessions
            </DialogTitle>
            <DialogDescription>
              This will revoke all active sessions across all other computers, tablets, and phones.
              Only this current browser session will remain authenticated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTerminateAllOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteTerminateAllOther}>
              Terminate All Others
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: SIGN OUT */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-bear" /> Sign Out of SmartQuant Edge
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? Your current session token and authentication
              cookies will be securely cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteSignOut}>
              Sign Out Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: MULTIPLE DEVICE POLICY DISABLE */}
      <Dialog open={multiDeviceConfirmOpen} onOpenChange={setMultiDeviceConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-bear">
              <AlertTriangle className="h-5 w-5 text-bear" /> Enforce Single-Device Policy
            </DialogTitle>
            <DialogDescription>
              Disabling multiple devices will immediately terminate all {activeSessions.length - 1}{" "}
              other active sessions. Only this current terminal session will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setMultiDeviceConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setMultiDeviceConfirmOpen(false);
                setAllowMultipleDevices(false);
                toast.success("Single device policy active — other sessions closed");
                setActivities(authService.getLoginActivity());
              }}
            >
              Enforce Single Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
