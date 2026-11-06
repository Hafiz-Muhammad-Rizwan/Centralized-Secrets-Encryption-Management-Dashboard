import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function DeveloperPage() {
  await requireRole("developer");
  return <RoleWorkspace role="Developer" />;
}
