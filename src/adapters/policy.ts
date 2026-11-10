import type { AccessPolicy } from "../types.ts";
import { AdapterInactiveError, AdapterPolicyError } from "./errors.ts";

export function assertActivePolicy(adapter: "github" | "clickup", policy: AccessPolicy | undefined): AccessPolicy {
  if (!policy || !policy.enabled) {
    throw new AdapterInactiveError(adapter);
  }
  if (policy.adapter !== adapter) {
    throw new AdapterPolicyError(`política de adapter incompatível: ${policy.adapter}`);
  }
  if (!policy.allowlist.account.trim()) {
    throw new AdapterPolicyError("allowlist.account é obrigatório");
  }
  if (!policy.allowlist.resources.length) {
    throw new AdapterPolicyError("allowlist.resources (repositórios ou listas) é obrigatório");
  }
  if (!policy.retention.maxDays || policy.retention.maxDays < 1) {
    throw new AdapterPolicyError("retention.maxDays inválido");
  }
  if (policy.retention.destination !== "memory" && policy.retention.destination !== "local_sanitized") {
    throw new AdapterPolicyError("destino de retenção não permitido");
  }
  return policy;
}

export function resourceAllowed(policy: AccessPolicy, resource: string): boolean {
  return policy.allowlist.resources.includes(resource);
}
