import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function SecurityAnalystPage() {
  await requireRole("security_analyst");
  return <RoleWorkspace role="Security Analyst" />;
}
