'use server';

import {
  provisionModuleSecret,
  getRecentModuleSecrets,
  type ModuleSecretInput,
  type ModuleResult,
  type ModuleSecretRow,
} from '@/lib/vault/modules';

export async function provisionSecret(input: ModuleSecretInput): Promise<ModuleResult<{
  id: string;
  name: string;
  version: number;
}>> {
  return provisionModuleSecret(input);
}

export async function getRecentProvisions(limit: number = 5): Promise<ModuleResult<ModuleSecretRow[]>> {
  return getRecentModuleSecrets(limit);
}

