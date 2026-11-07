import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { assignedRole, ROLE_PATHS, type Role } from "./policy";
import { audit } from "@/lib/security/audit";

export async function currentAccess(existingClient?: Awaited<ReturnType<typeof createAuthClient>>) {
  try {
    const client = existingClient ?? await createAuthClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    // Claims must be verified, never decoded from an untrusted cookie for AAL.
    const { data: verified, error: claimsError } = await client.auth.getClaims();
    if (claimsError || !verified || verified.claims.sub !== user.id) return null;
    const { data, error: memberError } = await client.from("workspace_members")
      .select("role, active").eq("user_id", user.id).maybeSingle();
    if (memberError) { await audit("auth_unavailable", user.id); return null; }
    const role = assignedRole(data);
    if (!role) { await audit("access_denied", user.id); return null; }
    if (verified.claims.aal === "aal2") {
      const { data: factorApproved, error: approvalError } = await client.rpc("check_mfa_approval");
      if (approvalError || factorApproved !== true) return null;
    }
    if (process.env.SECURITY_DATA_ENABLED === "true") {
      const { data: sessionAllowed, error: sessionError } = await client.rpc("check_workspace_session");
      if (sessionError || sessionAllowed !== true) return null;
    }
    return {
      role, userId: user.id, email: user.email ?? "Workspace member",
      mfaVerified: verified.claims.aal === "aal2",
      factors: (user.factors ?? []).filter(f => f.status === "verified").map(f => ({ id: f.id, type: f.factor_type })),
    };
  } catch {
    await audit("auth_unavailable");
    return null;
  }
}

export async function requireRole(expected: Role) {
  const access = await currentAccess();
  if (!access) redirect("/login/?reason=access");
  if (!access.mfaVerified) redirect("/mfa/");
  if (access.role !== expected) {
    await audit("access_denied", access.userId);
    redirect(ROLE_PATHS[access.role]);
  }
  return access;
}
