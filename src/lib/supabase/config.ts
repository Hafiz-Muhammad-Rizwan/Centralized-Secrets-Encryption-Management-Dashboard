function isPublicApiKey(key: string): boolean {
  if (key.length > 4096) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  // Compatibility with legacy anon keys. This inspects trusted configuration,
  // not user identity: Supabase still validates the key's signature remotely.
  // Never accept a service_role JWT in a NEXT_PUBLIC variable.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    return claims?.role === "anon";
  } catch { return false; }
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !isPublicApiKey(key)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
        parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

// Auth is server-only: no browser Supabase client needs to read these cookies.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const authFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
    // Credentials must reach the configured service, never a redirect target.
    redirect: "error",
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
