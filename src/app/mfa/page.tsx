import { redirect } from "next/navigation";
import { currentAccess } from "@/lib/auth/access";
import { ROLE_PATHS } from "@/lib/auth/policy";
import MfaForm from "@/components/MfaForm";

export default async function MfaPage() {
  const access = await currentAccess();
  if (!access) redirect("/login/");
  if (access.mfaVerified) redirect(ROLE_PATHS[access.role]);
  return <MfaForm factors={access.factors.filter(f => f.type === "totp").map(f => f.id)} hasOtherFactor={access.factors.some(f => f.type !== "totp")} />;
}
