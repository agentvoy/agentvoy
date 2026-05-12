/**
 * AgentVoy Config Parser
 *
 * Loads, validates, and manages agent.guard.yml configuration files.
 * This is the core innovation — a universal, declarative guardrails
 * config that works across all agent frameworks.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type {
  AgentGuardConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./types.js";

const CONFIG_FILENAMES = [
  "agent.guard.yml",
  "agent.guard.yaml",
  "agentguard.yml",
  "agentguard.yaml",
];

/**
 * Load and parse an agent.guard.yml config file
 */
export function loadConfig(projectDir: string): AgentGuardConfig {
  const configPath = findConfigFile(projectDir);
  if (!configPath) {
    throw new ConfigError(
      `No agent.guard.yml found in ${projectDir}. Run 'agentvoy init' to create one.`
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = parseYaml(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new ConfigError(`Invalid config file: ${configPath}`);
  }

  const validation = validateConfig(parsed as AgentGuardConfig);
  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => `  - ${e.field}: ${e.message}`)
      .join("\n");
    throw new ConfigError(
      `Invalid agent.guard.yml:\n${errorMessages}`
    );
  }

  return applyDefaults(parsed as AgentGuardConfig);
}

/**
 * Find the config file by searching up the directory tree
 */
export function findConfigFile(startDir: string): string | null {
  let dir = resolve(startDir);

  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const filePath = resolve(dir, filename);
      if (existsSync(filePath)) {
        return filePath;
      }
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }

  return null;
}

/**
 * Validate an agent guard config
 */
export function validateConfig(config: AgentGuardConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!config.version) {
    errors.push({ field: "version", message: "version is required" });
  }

  if (!config.identity) {
    errors.push({ field: "identity", message: "identity is required" });
  } else if (!config.identity.name) {
    errors.push({ field: "identity.name", message: "agent name is required" });
  }

  if (!config.model) {
    errors.push({ field: "model", message: "model configuration is required" });
  } else {
    if (!config.model.provider) {
      errors.push({
        field: "model.provider",
        message: "model provider is required",
      });
    }
    if (!config.model.model) {
      errors.push({ field: "model.model", message: "model name is required" });
    }
  }

  // Validate permissions
  if (config.permissions?.network) {
    const net = config.permissions.network;
    if (net.mode === "restricted" && !net.allow?.length) {
      warnings.push({
        field: "permissions.network",
        message:
          "network mode is 'restricted' but no allow list specified — all network access will be blocked",
      });
    }
  }

  // Validate guardrails
  if (config.guardrails?.behavior) {
    const behavior = config.guardrails.behavior;
    if (behavior.max_iterations !== undefined && behavior.max_iterations < 1) {
      errors.push({
        field: "guardrails.behavior.max_iterations",
        message: "max_iterations must be at least 1",
      });
    }
    if (behavior.timeout) {
      if (!isValidDuration(behavior.timeout)) {
        errors.push({
          field: "guardrails.behavior.timeout",
          message:
            'timeout must be a valid duration string (e.g., "5m", "1h", "30s")',
        });
      }
    }
    if (behavior.cost_limit) {
      if (!isValidCost(behavior.cost_limit)) {
        errors.push({
          field: "guardrails.behavior.cost_limit",
          message:
            'cost_limit must be a valid cost string (e.g., "$0.50", "$10")',
        });
      }
    }
  }

  // Validate auth
  if (config.auth) {
    const validTypes = ["none", "api_key", "oauth2", "jwt"];
    if (config.auth.type && !validTypes.includes(config.auth.type)) {
      errors.push({
        field: "auth.type",
        message: `auth type must be one of: ${validTypes.join(", ")}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Apply default values to a config
 */
function applyDefaults(config: AgentGuardConfig): AgentGuardConfig {
  return {
    ...config,
    version: config.version || "1.0",
    permissions: {
      network: { mode: "unrestricted", ...config.permissions?.network },
      filesystem: { ...config.permissions?.filesystem },
      tools: { ...config.permissions?.tools },
      execution: {
        allow_shell: false,
        allow_subprocess: false,
        ...config.permissions?.execution,
      },
    },
    guardrails: {
      input: {
        block_prompt_injection: true,
        pii_detection: "warn",
        content_filter: "moderate",
        ...config.guardrails?.input,
      },
      output: {
        block_harmful_content: true,
        pii_redaction: false,
        hallucination_check: false,
        ...config.guardrails?.output,
      },
      behavior: {
        max_iterations: 50,
        timeout: "10m",
        retry_limit: 3,
        ...config.guardrails?.behavior,
      },
    },
    auth: config.auth || { type: "none" },
    observability: {
      tracing: false,
      log_level: "info",
      cost_tracking: true,
      ...config.observability,
    },
  };
}

/**
 * Generate a default agent.guard.yml config
 */
export function generateDefaultConfig(
  agentName: string,
  provider: string,
  model: string
): string {
  const config: AgentGuardConfig = {
    version: "1.0",
    identity: {
      name: agentName,
      description: `AI agent created with AgentVoy`,
      version: "0.1.0",
    },
    model: {
      provider: provider as AgentGuardConfig["model"]["provider"],
      model,
      api_key_env: getDefaultApiKeyEnv(provider),
    },
    permissions: {
      network: {
        mode: "restricted",
        allow: ["*"],
      },
      filesystem: {
        read: ["./**"],
        write: ["./output/**"],
      },
      tools: {
        require_approval: ["delete_*", "send_*", "deploy_*"],
        max_cost_per_run: "$1.00",
      },
      execution: {
        allow_shell: false,
        allow_subprocess: false,
      },
    },
    guardrails: {
      input: {
        block_prompt_injection: true,
        max_tokens: 4096,
        pii_detection: "warn",
        content_filter: "moderate",
      },
      output: {
        block_harmful_content: true,
        max_output_tokens: 8192,
        pii_redaction: false,
        hallucination_check: false,
      },
      behavior: {
        max_iterations: 20,
        timeout: "5m",
        max_tool_calls: 50,
        human_approval_after: 10,
        retry_limit: 3,
        cost_limit: "$1.00",
      },
    },
    auth: {
      type: "api_key",
      token_storage: "env",
    },
    observability: {
      tracing: true,
      log_level: "info",
      cost_tracking: true,
    },
  };

  return stringifyYaml(config, { lineWidth: 0 });
}

function getDefaultApiKeyEnv(provider: string): string {
  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
    groq: "GROQ_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return envMap[provider] || `${provider.toUpperCase()}_API_KEY`;
}

function isValidDuration(duration: string): boolean {
  return /^\d+[smhd]$/.test(duration);
}

function isValidCost(cost: string): boolean {
  return /^\$\d+(\.\d{1,2})?$/.test(cost);
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
