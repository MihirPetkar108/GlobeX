/**
 * Express API origin. Prefer VITE_API_URL when set. Otherwise use a relative
 * URL so phones/other laptops talking to this machine's Vite server hit the
 * /api proxy instead of their own localhost:5002.
 */
export function getApiBaseUrl(): string {
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, "");
  }
  return "";
}
