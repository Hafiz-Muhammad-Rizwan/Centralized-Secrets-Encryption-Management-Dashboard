'use server';

import {
  listModuleSecrets,
  rotateModuleSecret,
  deleteModuleSecret,
  type ModuleResult,
  type ModuleSecretRow,
} from '@/lib/vault/modules';
import { revealSecret as revealVaultSecret, type VaultResult } from '@/app/vault/actions';

export async function listSecrets(): Promise<ModuleResult<ModuleSecretRow[]>> {
  return listModuleSecrets();
}

export async function revealSecret(id: string): Promise<VaultResult> {
  return revealVaultSecret(id);
}

export async function rotateSecret(id: string, version: number): Promise<ModuleResult> {
  return rotateModuleSecret(id, version);
}

export async function deleteSecret(id: string): Promise<ModuleResult> {
  return deleteModuleSecret(id);
}

