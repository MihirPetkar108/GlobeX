import { supabase } from "@/lib/supabaseClient";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import type { Session } from "@supabase/supabase-js";

export type BusinessType = "EXPORTER" | "IMPORTER" | "BOTH";
export type OrganizationRole = "ORGANIZATION_ADMIN" | "SALES" | "COMPLIANCE" | "LOGISTICS" | "DELIVERY_STAFF";
export type OnboardingStep = "PROFILE" | "BUSINESS_TYPE" | "VERIFICATION" | "DONE";
export type VerificationDocumentType =
  | "COMPANY_REGISTRATION"
  | "GST_CERTIFICATE"
  | "PAN"
  | "ADDRESS_PROOF"
  | "IEC_EXPORT_LICENSE"
  | "IMPORT_LICENSE"
  | "PRODUCT_LICENSE"
  | "CERTIFICATION"
  | "OTHER";

export interface AppUser {
  id: string;
  authId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface OrgProfile {
  id: string;
  legalName: string;
  tradeName: string | null;
  businessType: BusinessType | null;
  country: string | null;
  organizationRole: OrganizationRole;
  onboardingStep: OnboardingStep;
  onboardingCompleted: boolean;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";
}

export interface AuthSnapshot {
  session: Session | null;
  appUser: AppUser | null;
  organization: OrgProfile | null;
}

export interface RegistrationDocumentPayload {
  fileName: string;
  mimeType: string;
  documentType: string;
  data: string;
}

export interface OrganizationLoginUser {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  tradeName?: string | null;
  businessType?: BusinessType | null;
  country?: string | null;
  onboardingStep?: OnboardingStep;
  onboardingCompleted?: boolean;
  verificationStatus: OrgProfile["verificationStatus"];
}

export interface OrganizationLoginResult {
  session: Session;
  user: OrganizationLoginUser;
}

const API_BASE_URL = getApiBaseUrl();

/** Reads the full app-level snapshot for the current Supabase session; null slices when signed out or pre-onboarding. */
export async function fetchAuthSnapshot(session: Session | null): Promise<AuthSnapshot> {
  if (!session) return { session: null, appUser: null, organization: null };

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("id, auth_id, email, first_name, last_name")
    .eq("auth_id", session.user.id)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!userRow) return { session, appUser: null, organization: null };

  const appUser: AppUser = {
    id: userRow.id,
    authId: userRow.auth_id,
    email: userRow.email,
    firstName: userRow.first_name,
    lastName: userRow.last_name,
  };

  const { data: memberRow } = await supabase
    .from("organization_members")
    .select("organization_role, organizations(id, legal_name, trade_name, business_type, country, verification_status)")
    .eq("user_id", userRow.id)
    .eq("is_active", true)
    .maybeSingle();

  let organization: OrgProfile | null = null;
  if (memberRow?.organizations) {
    const org = memberRow.organizations as unknown as {
      id: string; legal_name: string; trade_name: string | null; business_type: BusinessType | null;
      country: string | null;
      verification_status: OrgProfile["verificationStatus"];
    };
    organization = {
      id: org.id,
      legalName: org.legal_name,
      tradeName: org.trade_name,
      businessType: org.business_type,
      country: org.country,
      organizationRole: memberRow.organization_role,
      onboardingStep: "DONE",
      onboardingCompleted: true,
      verificationStatus: org.verification_status,
    };
  }

  return { session, appUser, organization };
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  organizationName: string,
  document?: RegistrationDocumentPayload | null
) {
  const response = await fetch(`${API_BASE_URL}/api/organizations/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: `${firstName} ${lastName}`.trim(),
      organizationName,
      email,
      password,
      role: "admin",
      document: document || null,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Registration failed.");

  // The Express flow creates the organization in PENDING state. Establish a
  // Supabase session so the existing onboarding route can continue normally.
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Registration succeeded, but sign-in could not be started. Try signing in again.");
  return data;
}

export async function signIn(email: string, password: string): Promise<OrganizationLoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/organizations/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Invalid login credentials.");
  if (!body.token || !body.refreshToken) throw new Error("Login response did not include a valid session.");

  const { data, error } = await supabase.auth.setSession({
    access_token: body.token,
    refresh_token: body.refreshToken,
  });
  if (error) throw new Error(`Could not establish the login session: ${error.message}`);
  if (!data.session) throw new Error("Could not establish the login session: Supabase returned no session.");
  return { session: data.session, user: body.user };
}

/** Server-side session invalidation (GoTrue revokes the refresh token), not just a local clear. */
export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw error;
}

/** Step 1: creates the organization + the caller's founding ORGANIZATION_ADMIN membership. */
export async function saveOrgProfileStep(userId: string, input: {
  legalName: string;
  tradeName?: string;
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
  registeredAddress?: string;
}): Promise<string> {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      legal_name: input.legalName,
      trade_name: input.tradeName ?? null,
      country: input.country,
      state: input.state ?? null,
      city: input.city ?? null,
      postal_code: input.postalCode ?? null,
      registered_address: input.registeredAddress ?? null,
      verification_status: "PENDING",
      onboarding_step: "BUSINESS_TYPE",
    })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  const { error: memberErr } = await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    organization_role: "ORGANIZATION_ADMIN",
    is_active: true,
  });
  if (memberErr) throw memberErr;

  return org.id as string;
}

export async function saveBusinessTypeStep(orgId: string, businessType: BusinessType) {
  const { error } = await supabase
    .from("organizations")
    .update({ business_type: businessType, onboarding_step: "VERIFICATION" })
    .eq("id", orgId);
  if (error) throw error;
}

export async function saveVerificationStep(
  userId: string,
  orgId: string,
  docs: Array<{ documentType: VerificationDocumentType; documentNumber?: string; filePath: string; fileName: string }>
) {
  if (docs.length === 0) throw new Error("At least one verification document is required.");

  const { error: docErr } = await supabase.from("verification_documents").insert(
    docs.map((d) => ({
      organization_id: orgId,
      document_type: d.documentType,
      document_number: d.documentNumber ?? null,
      file_path: d.filePath,
      file_name: d.fileName,
      status: "PENDING",
      uploaded_by: userId,
    }))
  );
  if (docErr) throw docErr;

  const { error: orgErr } = await supabase
    .from("organizations")
    .update({
      onboarding_step: "DONE",
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (orgErr) throw orgErr;
}

export async function uploadVerificationFile(orgId: string, file: File): Promise<string> {
  const path = `${orgId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("kyc_documents").upload(path, file);
  if (error) throw error;
  return path;
}
