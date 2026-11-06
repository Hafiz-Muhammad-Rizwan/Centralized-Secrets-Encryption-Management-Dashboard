import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function TeamLeadPage() {
  await requireRole("team_lead");
  return <RoleWorkspace role="Team Lead" />;
}
