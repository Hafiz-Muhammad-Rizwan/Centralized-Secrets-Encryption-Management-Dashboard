import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { assignedRole, ROLE_PATHS, type Role } from "./policy";

export async function currentAccess() {
  try {
    const client = await createAuthClient();
    // Verify with Supabase; never trust a role or user supplied by a cookie alone.
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    const { data, error: memberError } = await client.from("workspace_members")
      .select("role, active").eq("user_id", user.id).maybeSingle();
    if (memberError) return null;
    const role = assignedRole(data);
    return role ? { role } : null;
  } catch {
    return null; // Missing config, network failure, or failed lookup denies access.
  }
}

export async function requireRole(expected: Role) {
  const access = await currentAccess();
  if (!access) redirect("/login/?reason=access");
  if (access.role !== expected) redirect(ROLE_PATHS[access.role]);
  return access;
}
