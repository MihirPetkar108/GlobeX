import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — auth will fail until the local " +
      "Supabase stack is configured (see the onboarding-state-machine plan's final sequencing step)."
  );
}

// createClient throws synchronously on an empty key (not just at call time), which
// would crash the whole app before render — a non-functional placeholder keeps the
// client constructible; unconfigured auth then fails per-call (network/401), caught
// by useAuth's try/catch, rather than crashing the module graph on import.
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "unconfigured-placeholder-anon-key"
);
