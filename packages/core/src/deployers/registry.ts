import type { DeploymentAdapter, DeploymentTarget } from "../types.js";

const deployers = new Map<DeploymentTarget, DeploymentAdapter>();

export function registerDeployer(adapter: DeploymentAdapter): void {
  deployers.set(adapter.target, adapter);
}

export function getDeployer(target: DeploymentTarget): DeploymentAdapter {
  const deployer = deployers.get(target);
  if (!deployer) {
    const available = Array.from(deployers.keys()).join(", ");
    throw new Error(`Unknown deployment target: "${target}". Available: ${available}`);
  }
  return deployer;
}

export function listDeployers(): DeploymentAdapter[] {
  return Array.from(deployers.values());
}

export function listTargets(): DeploymentTarget[] {
  return Array.from(deployers.keys());
}

export function hasDeployer(target: DeploymentTarget): boolean {
  return deployers.has(target);
}
