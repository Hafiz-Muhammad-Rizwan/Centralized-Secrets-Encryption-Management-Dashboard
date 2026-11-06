export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
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
  fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) });
