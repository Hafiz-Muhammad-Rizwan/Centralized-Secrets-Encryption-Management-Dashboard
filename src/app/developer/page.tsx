import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function DeveloperPage() {
  const access = await requireRole("developer");
  return <RoleWorkspace identity={access.email} role="Developer" />;
}
