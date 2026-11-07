"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { credentials, ROLE_PATHS } from "@/lib/auth/policy";

import { currentAccess } from "@/lib/auth/access";
import { allowAttempt } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";

export type LoginState = { error: string };
const denied = { error: "Unable to sign in. Check your credentials and workspace access, or contact your administrator." };

export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const input = credentials(form);
  if (!input) { audit("login_denied"); return denied; }
  // No attacker-controlled forwarding headers are trusted as identity.
  if (!await allowAttempt("login-account", input.email, 10, 15 * 60_000) ||
      !await allowAttempt("login-total", "application", 100, 60_000)) {
    audit("rate_limited");
    return denied;
  }
  let destination: string;
  try {
    const client = await createAuthClient(true);
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.user) { audit("login_denied"); return denied; }
    const access = await currentAccess(client);
    if (!access) {
      await client.auth.signOut({ scope: "local" });
      audit("login_denied");
      return denied;
    }
    audit("login_password_verified", access.userId);
    destination = access.mfaVerified ? ROLE_PATHS[access.role] : "/mfa/";
  } catch {
    audit("auth_unavailable");
    return denied;
  }
  // Outside the catch because Next redirect is a control-flow exception.
  redirect(destination);
}

export async function signOut(): Promise<{ error: string } | undefined> {
  try {
    const client = await createAuthClient(true);
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) { audit("logout_failed"); return { error: "Sign-out could not complete. Please try again." }; }
    audit("logout", user?.id);
  } catch {
    audit("logout_failed");
    return { error: "Sign-out could not complete. Please try again." };
  }
  redirect("/login/");
}
