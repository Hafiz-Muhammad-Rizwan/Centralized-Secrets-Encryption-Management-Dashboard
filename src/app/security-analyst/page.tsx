import { requireRole } from "@/lib/auth/access";
import RoleWorkspace from "@/components/RoleWorkspace";

export default async function SecurityAnalystPage() {
  const access = await requireRole("security_analyst");
  return <RoleWorkspace identity={access.email} role="Security Analyst" />;
}
