import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/context/AuthContext";
import SpecularButton from "@/components/ui/SpecularButton";
import { Globe2, Building2, Mail, Lock, Eye, EyeOff, User, ShieldCheck, AlertCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthAccordionProps {
  onSuccess?: () => void;
  className?: string;
  initialMode?: "signin" | "register";
}

export const AuthAccordion: React.FC<AuthAccordionProps> = ({
  onSuccess,
  className = "",
  initialMode = "signin",
}) => {
  const navigate = useNavigate();
  const { signIn, signUp, enterDemo } = useAuthContext();

  const [activeTab, setActiveTab] = useState<"signin" | "register">(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const splitName = (name: string): [string, string] => {
    const parts = name.trim().split(/\s+/);
    return [parts[0] || "New", parts.slice(1).join(" ") || "Member"];
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      if (onSuccess) onSuccess();
      else navigate("/home");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const [firstName, lastName] = splitName(fullName);
      await signUp(email, password, firstName, lastName);
      // Onboarding hasn't run yet for a brand-new account — always land on
      // /onboarding, never /dashboard, regardless of onSuccess.
      navigate("/onboarding");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = (mode: "onboarding" | "home") => {
    enterDemo(mode);
    navigate(mode === "home" ? "/home" : "/onboarding");
  };

  return (
    <div className={cn("w-full flex items-center justify-center p-2 sm:p-4 select-none font-sans", className)}>
      <div
        className={cn(
          "w-full max-w-[440px] rounded-3xl p-5 sm:p-7 overflow-hidden flex flex-col justify-between",
          "bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]",
          "shadow-2xl shadow-black/10 dark:shadow-black/50 transition-all duration-200"
        )}
      >
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab("signin"); setFormError(null); }}
            className={cn(
              "py-2 px-3 sm:px-4 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2",
              activeTab === "signin"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Globe2 className="w-3.5 h-3.5 text-[var(--brand-teal)]" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("register"); setFormError(null); }}
            className={cn(
              "py-2 px-3 sm:px-4 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2",
              activeTab === "register"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-[var(--brand-cyan)]" />
            <span>Create Account</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "signin" ? (
            <motion.div
              key="signin-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                    Sign in to GlobeXAI
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--brand-teal)] px-2 py-0.5 rounded bg-[var(--success-bg)] border border-[var(--brand-teal)]/30 font-semibold">
                    TLS-256
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Access verified cross-border trade operations &amp; smart escrow.
                </p>
              </div>

              <form onSubmit={handleSignInSubmit} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5 font-medium">
                    <Mail className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-teal)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5 font-medium">
                    <Lock className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full px-3 py-2 pr-9 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-teal)] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-start gap-2 text-[11px] text-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded-lg px-2.5 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-0.5">
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[var(--brand-teal)]" />
                    <span>EVM Escrow</span>
                  </span>
                </div>

                <div className="pt-2">
                  <SpecularButton
                    type="submit"
                    size="md"
                    radius={12}
                    variant="emerald"
                    isLoading={isSubmitting}
                    className="w-full justify-center"
                  >
                    Sign In &amp; Launch Workspace &#8594;
                  </SpecularButton>
                </div>
              </form>

              <button
                type="button"
                onClick={() => navigate("/super-admin/login")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2.5 text-[11px] font-mono font-semibold text-[var(--text-secondary)] hover:border-red-500/40 hover:text-red-500 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin Login
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="register-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                    Create your account
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--brand-cyan)] px-2 py-0.5 rounded bg-[var(--info-bg)] border border-[var(--brand-cyan)]/30 font-semibold">
                    Step 1 of 2
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Set up your credentials, then complete your organization profile.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5 font-medium">
                    <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-cyan)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5 font-medium">
                    <Mail className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@organization.com"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-cyan)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5 font-medium">
                    <Lock className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-cyan)] font-mono"
                  />
                </div>

                {formError && (
                  <div className="flex items-start gap-2 text-[11px] text-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded-lg px-2.5 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="pt-2">
                  <SpecularButton
                    type="submit"
                    size="md"
                    radius={12}
                    variant="sky"
                    isLoading={isSubmitting}
                    className="w-full justify-center"
                  >
                    Create Account &amp; Continue &#8594;
                  </SpecularButton>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TEMPORARY — Supabase isn't configured yet (deferred to Phase 8).
            Lets the rebuilt UI be clicked through locally, no network calls. */}
        <div className="mt-5 pt-4 border-t border-dashed border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
            <FlaskConical className="w-3 h-3" />
            <span>Preview only — Supabase not configured yet</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo("onboarding")}
              className="py-2 px-3 rounded-xl text-[11px] font-mono font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-cyan)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              View onboarding
            </button>
            <button
              type="button"
              onClick={() => handleDemo("home")}
              className="py-2 px-3 rounded-xl text-[11px] font-mono font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-teal)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              View workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthAccordion;
