import 'server-only';
import { headers } from 'next/headers';
import { isIP } from 'node:net';

export async function clientAddress(): Promise<string | null> {
  // Vercel overwrites this header at its ingress. Do NOT trust generic XFF on
  // arbitrary/self-hosted deployments; configure an ingress limiter there.
  if (process.env.VERCEL !== '1') return null;
  const value = (await headers()).get('x-vercel-forwarded-for')?.trim();
  return value && isIP(value) ? value : null;
}
