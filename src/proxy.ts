import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authFetch, sessionCookieOptions, supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self'",
    "connect-src 'self'", "object-src 'none'", "base-uri 'none'",
    "report-uri /api/csp-report/", "report-to csp",
    "form-action 'self'", "frame-ancestors 'none'", "frame-src 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", policy);
  let response = NextResponse.next({ request: { headers: request.headers } });
  const config = supabaseConfig();
  if (config && request.cookies.getAll().some(cookie => cookie.name.startsWith("sb-"))) {
    const client = createServerClient(config.url, config.key, {
      global: { fetch: authFetch },
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, ...sessionCookieOptions }));
        },
      },
    });
    try { await client.auth.getUser(); } catch { /* Page guards independently deny access. */ }
  }
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  // A fixed configured origin avoids constructing report destinations from Host.
  try {
    const origin = new URL(process.env.APP_ORIGIN ?? "");
    if (origin.protocol === "https:" && !origin.username && !origin.password && origin.pathname === "/" && !origin.search && !origin.hash)
      response.headers.set("Reporting-Endpoints", `csp="${origin.origin}/api/csp-report/"`);
  } catch { /* report-uri remains available without APP_ORIGIN. */ }
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (process.env.NODE_ENV === "production") response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
