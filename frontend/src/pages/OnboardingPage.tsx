import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/context/AuthContext";
import {
  saveOrgProfileStep,
  saveBusinessTypeStep,
  saveVerificationStep,
  uploadVerificationFile,
  type BusinessType,
  type VerificationDocumentType,
} from "@/services/auth/authService";
import {
  Building2,
  Globe2,
  Ship,
  ArrowLeftRight,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";
import { cn } from "@/lib/utils";

type WizardStep = "PROFILE" | "BUSINESS_TYPE" | "VERIFICATION";

const STEP_ORDER: WizardStep[] = ["PROFILE", "BUSINESS_TYPE", "VERIFICATION"];

interface PendingDoc {
  file: File;
  documentType: VerificationDocumentType;
}

const StepIndicator: React.FC<{ current: WizardStep }> = ({ current }) => {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_ORDER.map((step, i) => (
        <React.Fragment key={step}>
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold shrink-0",
              i < idx
                ? "bg-[var(--brand)] text-white"
                : i === idx
                  ? "border-2 border-[var(--brand)] text-[var(--brand)]"
                  : "border border-[var(--hairline-strong)] text-[var(--text-muted)]"
            )}
          >
            {i < idx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < STEP_ORDER.length - 1 && (
            <div className={cn("flex-1 h-px", i < idx ? "bg-[var(--brand)]" : "bg-[var(--hairline)]")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const OnboardingPage: React.FC = () => {
  const { appUser, organization, refresh } = useAuthContext();

  const currentStep: WizardStep =
    !organization ? "PROFILE" : organization.onboardingStep === "DONE" ? "VERIFICATION" : organization.onboardingStep;
  const orgId = organization?.id ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1 — profile
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  // Step 2 — business type
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Step 3 — verification documents
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await saveOrgProfileStep(appUser.id, { legalName, tradeName, country, state, city });
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save organization profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusinessTypeSubmit = async () => {
    if (!orgId || !businessType) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await saveBusinessTypeStep(orgId, businessType);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save business type.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDoc = (documentType: VerificationDocumentType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingDocs((prev) => [...prev, { file, documentType }]);
    e.target.value = "";
  };

  const handleRemoveDoc = (index: number) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVerificationSubmit = async () => {
    if (!appUser || !orgId) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const uploaded = await Promise.all(
        pendingDocs.map(async (d) => {
          const filePath = await uploadVerificationFile(orgId, d.file);
          return { documentType: d.documentType, filePath, fileName: d.file.name };
        })
      );
      await saveVerificationStep(appUser.id, orgId, uploaded);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit verification documents.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredDocs: { type: VerificationDocumentType; label: string }[] =
    businessType === "IMPORTER"
      ? [
          { type: "COMPANY_REGISTRATION", label: "Company Registration" },
          { type: "IMPORT_LICENSE", label: "Import License" },
          { type: "GST_CERTIFICATE", label: "GST Certificate" },
        ]
      : [
          { type: "COMPANY_REGISTRATION", label: "Company Registration" },
          { type: "IEC_EXPORT_LICENSE", label: "IEC Export License" },
          { type: "GST_CERTIFICATE", label: "GST Certificate" },
        ];

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--surface-0)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-subtle)] border border-[var(--brand)]/25 flex items-center justify-center">
            <Globe2 className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-[var(--text-primary)]">
            Globex
          </span>
        </div>

        <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface-1)] p-6 sm:p-8 shadow-xl">
          <StepIndicator current={currentStep} />

          <AnimatePresence mode="wait">
            {currentStep === "PROFILE" && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)] mb-1">Organization profile</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-5">Tell us about the organization you're setting up.</p>

                <form onSubmit={handleProfileSubmit} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5 font-medium">
                      <Building2 className="w-3 h-3 text-[var(--text-tertiary)]" />
                      <span>Legal Name</span>
                    </label>
                    <input
                      type="text" required value={legalName} onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. Acme Global Trading Ltd."
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[var(--text-secondary)] text-[11px] font-medium">Trade Name (optional)</label>
                    <input
                      type="text" value={tradeName} onChange={(e) => setTradeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-cyan)]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[var(--text-secondary)] text-[11px] font-medium">Country</label>
                      <input
                        type="text" required value={country} onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[var(--text-secondary)] text-[11px] font-medium">State</label>
                      <input
                        type="text" value={state} onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[var(--text-secondary)] text-[11px] font-medium">City</label>
                      <input
                        type="text" value={city} onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-cyan)]"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-start gap-2 text-[11px] text-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded-lg px-2.5 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <SpecularButton type="submit" size="md" radius={12} variant="sky" isLoading={isSubmitting} className="w-full justify-center">
                      Continue <ArrowRight className="w-3.5 h-3.5" />
                    </SpecularButton>
                  </div>
                </form>
              </motion.div>
            )}

            {currentStep === "BUSINESS_TYPE" && (
              <motion.div key="business-type" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)] mb-1">How do you trade?</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-5">This decides your entire workspace journey.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {(["EXPORTER", "IMPORTER", "BOTH"] as BusinessType[]).map((bt) => {
                    const Icon = bt === "EXPORTER" ? Ship : bt === "IMPORTER" ? Building2 : ArrowLeftRight;
                    const label = bt === "EXPORTER" ? "I Export" : bt === "IMPORTER" ? "I Import" : "Both";
                    const selected = businessType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBusinessType(bt)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-colors cursor-pointer",
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand-subtle)]"
                            : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", selected ? "text-[var(--brand)]" : "text-[var(--text-tertiary)]")} />
                        <span className={cn("text-xs font-semibold", selected ? "text-[var(--brand)]" : "text-[var(--text-primary)]")}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {formError && (
                  <div className="flex items-start gap-2 text-[11px] text-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded-lg px-2.5 py-2 mb-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <SpecularButton
                  type="button" size="md" radius={12} variant="sky" isLoading={isSubmitting}
                  disabled={!businessType} onClick={handleBusinessTypeSubmit} className="w-full justify-center"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </SpecularButton>
              </motion.div>
            )}

            {currentStep === "VERIFICATION" && (
              <motion.div key="verification" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)] mb-1">Verification documents</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-5">
                  Upload documents so compliance can verify your organization. You can add more later.
                </p>

                <div className="space-y-2.5 mb-4">
                  {requiredDocs.map((rd) => (
                    <label
                      key={rd.type}
                      className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-[var(--hairline-strong)] hover:border-[var(--brand)]/40 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] flex-1">{rd.label}</span>
                      <input type="file" className="hidden" onChange={handleAddDoc(rd.type)} />
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">Choose file</span>
                    </label>
                  ))}
                </div>

                {pendingDocs.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    {pendingDocs.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-2)] text-xs">
                        <FileText className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                        <span className="flex-1 truncate text-[var(--text-secondary)]">{d.file.name}</span>
                        <button type="button" onClick={() => handleRemoveDoc(i)} className="text-[var(--text-muted)] hover:text-[var(--status-blocked)] cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formError && (
                  <div className="flex items-start gap-2 text-[11px] text-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded-lg px-2.5 py-2 mb-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <SpecularButton
                  type="button" size="md" radius={12} variant="emerald" isLoading={isSubmitting}
                  disabled={pendingDocs.length === 0} onClick={handleVerificationSubmit} className="w-full justify-center"
                >
                  Submit &amp; Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
                </SpecularButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
