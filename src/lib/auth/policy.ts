export const ROLE_PATHS = {
  team_lead: "/team-lead/",
  developer: "/developer/",
  security_analyst: "/security-analyst/",
} as const;
export type Role = keyof typeof ROLE_PATHS;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && Object.hasOwn(ROLE_PATHS, value);
}

export function assignedRole(member: { role?: unknown; active?: unknown } | null): Role | null {
  return member?.active === true && isRole(member.role) ? member.role : null;
}

export function credentials(form: FormData): { email: string; password: string } | null {
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return null;
  if (password.length < 1 || password.length > 1024) return null;
  return { email: email.trim(), password }; // Never trim or log passwords.
}
