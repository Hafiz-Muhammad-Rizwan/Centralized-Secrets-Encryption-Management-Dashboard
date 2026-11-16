import { redirect } from "next/navigation";
import { currentAccess } from "@/lib/auth/access";
import RoleWorkspace, { WorkspaceRole } from "@/components/RoleWorkspace";

const ROLE_DISPLAY: Record<string, WorkspaceRole> = {
  team_lead: "Team Lead",
  developer: "Developer",
  security_analyst: "Security Analyst",
};

export default async function SecretsDirectoryPage() {
  const access = await currentAccess();
  if (!access) redirect("/login/?reason=access");
  if (!access.mfaVerified) redirect("/mfa/");

  const roleName = ROLE_DISPLAY[access.role] ?? "Team Lead";
  return <RoleWorkspace identity={access.email} role={roleName} initialTab="Secrets Directory" />;
}
