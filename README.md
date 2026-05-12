<p align="center">
  <h1 align="center">AgentVoy</h1>
  <p align="center">
    The universal agent development platform.<br/>
    Scaffold, configure, and guard AI agents across any framework.
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> |
  <a href="#frameworks">Frameworks</a> |
  <a href="#agent-guard-config">Guard Config</a> |
  <a href="#commands">Commands</a> |
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/agentvoy/agentvoy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/agentvoy"><img src="https://img.shields.io/npm/v/agentvoy.svg" alt="npm version"></a>
</p>

---

**AgentVoy** is a CLI tool and SDK that lets you scaffold production-ready AI agent projects in seconds — with built-in guardrails, security defaults, and support for every major agent framework.

**One command. Any framework. Any model. Secure by default.**

```bash
npx agentvoy create my-agent
```

## Why AgentVoy?

Building AI agents today means choosing a framework, wiring up models, configuring security, and writing boilerplate — before you even start on your actual agent logic.

AgentVoy solves this:

- **Multi-framework** — Google ADK, OpenAI Agents SDK, CrewAI, and more. One CLI, any framework.
- **Any model** — OpenAI, Anthropic, Google, Ollama (local), Groq, Mistral. Bring your own API key.
- **Secure by default** — Every project ships with `agent.guard.yml`, a universal guardrails config that defines permissions, cost limits, and behavior constraints.
- **No GPU required** — Runs on any personal computer. Just bring your API key.
- **Framework-agnostic guardrails** — One config format that works across all frameworks. Define it once, enforce everywhere.

## Quick Start

### Create a new agent project

```bash
# Interactive mode — choose your framework and model
npx agentvoy create my-agent

# Or specify everything upfront
npx agentvoy create my-agent --framework openai --provider anthropic --model claude-sonnet-4-20250514

# Quick start with defaults (OpenAI + GPT-4o)
npx agentvoy create my-agent --yes
```

### Add guardrails to an existing project

```bash
# Initialize agent.guard.yml in your current project
npx agentvoy init

# Validate your config
npx agentvoy validate
```

## Frameworks

| Framework | Language | Status |
|-----------|----------|--------|
| **OpenAI Agents SDK** | Python | Available |
| **Google ADK** | Python | Available |
| **CrewAI** | Python | Available |
| LangGraph | Python | Coming soon |
| Anthropic SDK | Python/TS | Coming soon |
| LlamaIndex | Python | Coming soon |
| AutoGen / MAF | Python | Coming soon |
| Custom | Any | Coming soon |

## Model Providers

Bring your own API key. AgentVoy supports:

| Provider | Models | API Key Env |
|----------|--------|-------------|
| **OpenAI** | gpt-4o, o1, gpt-4-turbo | `OPENAI_API_KEY` |
| **Anthropic** | claude-opus-4, claude-sonnet-4 | `ANTHROPIC_API_KEY` |
| **Google** | gemini-2.0-flash, gemini-2.5-pro | `GOOGLE_API_KEY` |
| **Ollama** | llama3, mistral, codellama | Local — no key needed |
| **Groq** | llama-3.3-70b-versatile | `GROQ_API_KEY` |
| **Mistral** | mistral-large-latest | `MISTRAL_API_KEY` |

## Agent Guard Config

Every AgentVoy project includes an `agent.guard.yml` file — a universal, declarative configuration for agent security and behavior.

```yaml
version: "1.0"

identity:
  name: my-agent
  description: Research assistant agent
  version: 0.1.0

model:
  provider: anthropic
  model: claude-sonnet-4-20250514
  api_key_env: ANTHROPIC_API_KEY

permissions:
  network:
    mode: restricted
    allow: ["*.github.com", "*.stackoverflow.com"]
    deny: ["*.social-media.com"]
  filesystem:
    read: ["./**"]
    write: ["./output/**"]
  tools:
    require_approval: ["delete_*", "send_*", "deploy_*"]
    max_cost_per_run: "$1.00"
  execution:
    allow_shell: false
    allow_subprocess: false

guardrails:
  input:
    block_prompt_injection: true
    max_tokens: 4096
    pii_detection: warn
    content_filter: moderate
  output:
    block_harmful_content: true
    max_output_tokens: 8192
    pii_redaction: false
    hallucination_check: false
  behavior:
    max_iterations: 20
    timeout: 5m
    max_tool_calls: 50
    human_approval_after: 10
    retry_limit: 3
    cost_limit: "$1.00"

auth:
  type: api_key
  token_storage: env

observability:
  tracing: true
  log_level: info
  cost_tracking: true
```

### What `agent.guard.yml` controls

| Section | What it does |
|---------|-------------|
| **identity** | Agent name, version, and metadata |
| **model** | LLM provider, model, and API key configuration |
| **permissions** | Network access, filesystem access, tool restrictions, shell execution |
| **guardrails.input** | Prompt injection blocking, PII detection, content filtering |
| **guardrails.output** | Harmful content blocking, schema validation, PII redaction |
| **guardrails.behavior** | Iteration limits, timeouts, cost caps, human-in-the-loop triggers |
| **auth** | Authentication type and token storage |
| **observability** | Tracing, logging, and cost tracking |

## Commands

```bash
agentvoy create [name]     # Create a new agent project
agentvoy init              # Add agent.guard.yml to an existing project
agentvoy validate          # Validate your agent.guard.yml config
agentvoy list              # List supported frameworks and models
```

## Project Structure

A scaffolded OpenAI agent project:

```
my-agent/
  agent.py             # Agent definition
  tools.py             # Custom tools
  run.py               # Entry point
  agent.guard.yml      # Guardrails & permissions config
  requirements.txt     # Dependencies
  .env.example         # API key template
  .gitignore
```

## Architecture

```
agentvoy/
  packages/
    core/              # Types, config parser, framework adapters
    cli/               # CLI tool (agentvoy create, init, validate)
    create-agentvoy/   # npx create-agentvoy shorthand
```

AgentVoy is a TypeScript monorepo. The core package provides:

- **Type system** for universal agent configuration
- **Config parser** for `agent.guard.yml` with validation
- **Framework adapters** that generate project boilerplate for each framework
- **Adapter registry** for plugging in new frameworks

## Contributing

AgentVoy is open source under the Apache 2.0 license. Contributions welcome!

### Adding a new framework adapter

1. Create a new file in `packages/core/src/adapters/`
2. Implement the `FrameworkAdapter` interface
3. Register it in `packages/core/src/adapters/index.ts`
4. Submit a PR

### Development

```bash
git clone https://github.com/agentvoy/agentvoy.git
cd agentvoy
npm install
npm run build
node packages/cli/dist/index.js --help
```

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/ChinmayMurugkar">Chinmay Murugkar</a>
</p>
