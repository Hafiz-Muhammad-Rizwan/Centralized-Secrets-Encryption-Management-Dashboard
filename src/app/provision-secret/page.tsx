import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function ProvisionSecretPage() {
  await requireRole("team_lead");
  return <RoleWorkspace role="Team Lead" initialTab="Provision Secret" />;
}
