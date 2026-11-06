import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authFetch, sessionCookieOptions, supabaseConfig } from "./config";

export async function createAuthClient(writable = false) {
  const config = supabaseConfig();
  if (!config) throw new Error("Authentication is not configured");
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    global: { fetch: authFetch },
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        // Proxy refreshes cookies before Server Components render.
        if (!writable) return;
        values.forEach(({ name, value, options }) => jar.set(name, value, { ...options, ...sessionCookieOptions }));
      },
    },
  });
}
