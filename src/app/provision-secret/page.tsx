import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
export default async function Page() {
  await requireRole("team_lead");
  redirect("/vault/");
}
