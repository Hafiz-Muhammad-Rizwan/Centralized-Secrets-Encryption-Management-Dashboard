"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { currentAccess } from "@/lib/auth/access";
import { ROLE_PATHS } from "@/lib/auth/policy";
import { audit } from "@/lib/security/audit";
import { allowAttempt } from "@/lib/security/rate-limit";

export type MfaState = { error: string; factorId?: string; qr?: string; secret?: string };
const denied = { error: "Unable to complete verification. Check the code and try again, or contact your administrator." };

export async function enrollAuthenticator(token: string): Promise<MfaState> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return denied;
  try {
    const client = await createAuthClient(true);
    const access = await currentAccess(client);
    if (!access || access.factors.length > 0) return denied;
    if (!await allowAttempt("enroll", access.userId, 3, 15 * 60_000)) return denied;
    const { data: authorized, error: bootstrapError } = await client.rpc("authorize_mfa_bootstrap", { token });
    if (bootstrapError || authorized !== true) return denied;
    // Clean up only this user's UNVERIFIED attempts; never replace a verified MFA
    // factor based on a password alone. This keeps interrupted enrollment recoverable.
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user || user.id !== access.userId) return denied;
    if (user.factors?.some(f => f.status === "verified")) return denied;
    for (const factor of user.factors ?? []) {
      if (factor.factor_type === "totp" && factor.status === "unverified") {
        const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
        if (error) return denied;
      }
    }
    const { data, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp", issuer: "Vaultline" });
    if (enrollError || !data) return denied;
    const { data: registered, error: registerError } = await client.rpc("register_mfa_factor", { factor: data.id });
    if (registerError || registered !== true) return denied;
    await audit("mfa_enrolled", access.userId);
    // Seed is returned only during enrollment to its authenticated owner; never logged.
    return { error: "", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  } catch { return denied; }
}

export async function verifyAuthenticator(_previous: MfaState, form: FormData): Promise<MfaState> {
  const factorId = form.get("factorId");
  const code = form.get("code");
  if (typeof factorId !== "string" || !/^[a-f0-9-]{36}$/i.test(factorId) || typeof code !== "string" || !/^\d{6}$/.test(code)) return denied;
  let destination: string;
  try {
    const client = await createAuthClient(true);
    const access = await currentAccess(client);
    if (!access) return denied;
    if (!await allowAttempt("mfa", access.userId, 10, 5 * 60_000)) { await audit("rate_limited", access.userId); return denied; }
    const { data: { user }, error } = await client.auth.getUser();
    // Explicit factor ownership and factor-type check before challenging.
    const factor = user?.factors?.find(f => f.id === factorId && f.factor_type === "totp");
    if (error || !user || user.id !== access.userId || !factor) return denied;
    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) { await audit("mfa_denied", access.userId); return denied; }
    const upgraded = await currentAccess(client);
    if (!upgraded?.mfaVerified) return denied;
    await audit("mfa_verified", access.userId);
    destination = ROLE_PATHS[upgraded.role];
  } catch { return denied; }
  redirect(destination);
}
