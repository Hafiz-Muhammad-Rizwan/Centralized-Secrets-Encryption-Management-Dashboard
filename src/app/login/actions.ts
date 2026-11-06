"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { assignedRole, credentials, ROLE_PATHS } from "@/lib/auth/policy";

export type LoginState = { error: string };
const denied = { error: "Unable to sign in. Check your credentials and workspace access, or contact your administrator." };

export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const input = credentials(form);
  if (!input) return denied;
  let destination: string;
  try {
    const client = await createAuthClient(true);
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.user) return denied;
    const { data: member, error: memberError } = await client.from("workspace_members")
      .select("role, active").eq("user_id", data.user.id).maybeSingle();
    const role = memberError ? null : assignedRole(member);
    if (!role) {
      await client.auth.signOut({ scope: "local" });
      return denied;
    }
    destination = ROLE_PATHS[role];
  } catch {
    return denied;
  }
  // Outside the catch because Next redirect is a control-flow exception.
  redirect(destination);
}

export async function signOut(): Promise<{ error: string } | undefined> {
  try {
    const client = await createAuthClient(true);
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return { error: "Sign-out could not complete. Please try again." };
  } catch {
    return { error: "Sign-out could not complete. Please try again." };
  }
  redirect("/login/");
}
