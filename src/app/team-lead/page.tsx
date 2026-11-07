import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function TeamLeadPage() {
  const access = await requireRole("team_lead");
  return <RoleWorkspace identity={access.email} role="Team Lead" />;
}
