import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { currentAccess } from "@/lib/auth/access";
import { ROLE_PATHS } from "@/lib/auth/policy";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage() {
  const access = await currentAccess();
  if (access) redirect(access.mfaVerified ? ROLE_PATHS[access.role] : "/mfa/");
  return <LoginForm configured={Boolean(supabaseConfig())} />;
}
