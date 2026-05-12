/**
 * AgentVoy Core Types
 *
 * These types define the universal agent configuration, guardrails,
 * and framework adapter interfaces that power AgentVoy.
 */

// ─── Supported Frameworks ────────────────────────────────────────

export type Framework =
  | "google-adk"
  | "openai"
  | "anthropic"
  | "crewai"
  | "langgraph"
  | "llamaindex"
  | "autogen"
  | "custom";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "ollama"
  | "groq"
  | "mistral"
  | "azure"
  | "bedrock"
  | "custom";

// ─── Agent Guard Config (agent.guard.yml) ────────────────────────

export interface AgentGuardConfig {
  version: string;
  identity: AgentIdentity;
  model: ModelConfig;
  permissions: PermissionsConfig;
  guardrails: GuardrailsConfig;
  auth?: AuthConfig;
  observability?: ObservabilityConfig;
}

export interface AgentIdentity {
  name: string;
  description?: string;
  owner?: string;
  version?: string;
  tags?: string[];
}

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  api_key_env?: string;
  temperature?: number;
  max_tokens?: number;
  base_url?: string;
}

export interface PermissionsConfig {
  network?: NetworkPermissions;
  filesystem?: FilesystemPermissions;
  tools?: ToolPermissions;
  execution?: ExecutionPermissions;
}

export interface NetworkPermissions {
  allow?: string[];
  deny?: string[];
  mode?: "unrestricted" | "restricted" | "blocked";
}

export interface FilesystemPermissions {
  read?: string[];
  write?: string[];
  deny?: string[];
}

export interface ToolPermissions {
  allowed?: string[];
  denied?: string[];
  require_approval?: string[];
  max_cost_per_run?: string;
}

export interface ExecutionPermissions {
  allow_shell?: boolean;
  allow_subprocess?: boolean;
  allowed_commands?: string[];
  denied_commands?: string[];
}

export interface GuardrailsConfig {
  input?: InputGuardrails;
  output?: OutputGuardrails;
  behavior?: BehaviorGuardrails;
}

export interface InputGuardrails {
  block_prompt_injection?: boolean;
  max_tokens?: number;
  pii_detection?: "block" | "warn" | "off";
  content_filter?: "strict" | "moderate" | "off";
  custom_validators?: string[];
}

export interface OutputGuardrails {
  block_harmful_content?: boolean;
  validate_schema?: string;
  max_output_tokens?: number;
  pii_redaction?: boolean;
  hallucination_check?: boolean;
  custom_validators?: string[];
}

export interface BehaviorGuardrails {
  max_iterations?: number;
  timeout?: string;
  max_tool_calls?: number;
  human_approval_after?: number;
  retry_limit?: number;
  cost_limit?: string;
}

export interface AuthConfig {
  type?: "none" | "api_key" | "oauth2" | "jwt";
  scopes?: string[];
  token_storage?: "env" | "keychain" | "file";
  session_timeout?: string;
}

export interface ObservabilityConfig {
  tracing?: boolean;
  log_level?: "debug" | "info" | "warn" | "error";
  export_to?: string;
  cost_tracking?: boolean;
}

// ─── Framework Adapter Interface ──────────────────────────────────

export interface FrameworkAdapter {
  readonly name: Framework;
  readonly displayName: string;
  readonly language: "typescript" | "python";

  /** Generate project files for this framework */
  scaffold(config: ScaffoldConfig): Promise<ScaffoldResult>;

  /** Validate that the guardrails config is compatible with this framework */
  validateConfig(config: AgentGuardConfig): ValidationResult;

  /** Get the list of dependencies required for this framework */
  getDependencies(): Record<string, string>;
}

export interface ScaffoldConfig {
  projectName: string;
  projectDir: string;
  framework: Framework;
  model: ModelConfig;
  guardrails?: GuardrailsConfig;
  auth?: AuthConfig;
  features?: string[];
}

export interface ScaffoldResult {
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  postInstallInstructions?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  executable?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ─── Project Config ───────────────────────────────────────────────

export interface ProjectConfig {
  name: string;
  framework: Framework;
  model: ModelConfig;
  guard: AgentGuardConfig;
}
