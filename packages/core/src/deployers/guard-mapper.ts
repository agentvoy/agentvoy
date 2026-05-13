import type { AgentGuardConfig, CloudConfig } from "../types.js";

/** Parse guard duration string (e.g. "5m", "2h") to seconds */
function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 300;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}

/** Infer memory tier from cost_limit string (e.g. "$1.00") */
function inferMemory(costLimit?: string): string {
  if (!costLimit) return "512Mi";
  const match = costLimit.match(/\$(\d+)/);
  if (!match) return "512Mi";
  const dollars = parseInt(match[1], 10);
  if (dollars >= 10) return "2Gi";
  if (dollars >= 5) return "1Gi";
  return "512Mi";
}

/** Map agent.guard.yml guardrails to cloud deployment configuration */
export function mapGuardToCloudConfig(guard: AgentGuardConfig): CloudConfig {
  const behavior = guard.guardrails?.behavior;
  const timeoutSeconds = behavior?.timeout
    ? durationToSeconds(behavior.timeout)
    : 300;

  return {
    memory: inferMemory(behavior?.cost_limit),
    timeout: `${timeoutSeconds}s`,
    minInstances: 0,
    maxInstances: 3,
  };
}

/** Describe how guard config maps to deployment constraints (for CLI display) */
export function describeGuardMapping(guard: AgentGuardConfig): string[] {
  const lines: string[] = [];
  const behavior = guard.guardrails?.behavior;
  const execution = guard.permissions?.execution;
  const network = guard.permissions?.network;

  if (behavior?.timeout) {
    const secs = durationToSeconds(behavior.timeout);
    lines.push(`timeout: ${behavior.timeout} → ${secs}s container timeout`);
  }
  if (behavior?.cost_limit) {
    lines.push(`cost_limit: ${behavior.cost_limit} → ${inferMemory(behavior.cost_limit)} memory`);
  }
  if (execution?.allow_shell === false) {
    lines.push(`execution.allow_shell: false → non-root container user`);
  }
  if (network?.mode === "restricted") {
    lines.push(`network.mode: restricted → egress allowlist enforced`);
  }

  return lines;
}
