<p align="center">
  <h1 align="center">AgentVoy</h1>
  <p align="center">
    The universal AI agent platform.<br/>
    Scaffold, configure, guard, and deploy AI agents across any framework.
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> |
  <a href="#two-paths">Two Paths</a> |
  <a href="#frameworks">Frameworks</a> |
  <a href="#deploy">Deploy</a> |
  <a href="#agent-guard-config">Guard Config</a> |
  <a href="#commands">Commands</a> |
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/agentvoy/agentvoy/actions/workflows/ci.yml"><img src="https://github.com/agentvoy/agentvoy/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/agentvoy/agentvoy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/agentvoy"><img src="https://img.shields.io/npm/v/agentvoy.svg" alt="npm version"></a>
  <a href="https://pypi.org/project/agentvoy-guard/"><img src="https://img.shields.io/pypi/v/agentvoy-guard.svg" alt="PyPI version"></a>
</p>

---

**AgentVoy** is a CLI tool and SDK that lets you scaffold and deploy production-ready AI agent projects in seconds — with built-in guardrails, security defaults, and support for every major agent framework.

**One command. Any framework. Any model. Deploy anywhere.**

## Two Paths

AgentVoy asks upfront what you want to build:

```
$ npx agentvoy create my-project

  ? What do you want to build?
  > Agent — Local agent for development & experimentation
    App   — Deployable agentic app (API + UI + Docker + cloud)
```

### Path A — Agent

Fast local development. Flat project structure, interactive REPL, zero infra.

```bash
npx agentvoy create my-project --yes
# Creates: my-project-agent/
```

```
my-project-agent/
├── agent.py           # Agent logic
├── tools.py           # Custom tools
├── run.py             # Interactive REPL
├── agent.guard.yml    # Guardrails & permissions
├── requirements.txt
└── .env.example
```

### Path B — App

Deployable agentic app with a FastAPI server, Streamlit chat UI, and cloud configs.

```bash
npx agentvoy create my-project --build-mode app --deploy-target docker --yes
# Creates: my-project-app/
```

```
my-project-app/
├── src/
│   ├── agents/
│   │   └── agent.py          # Agent logic
│   ├── tools/
│   │   └── tools.py          # Custom tools
│   └── config/
│       └── settings.py
├── server.py                  # FastAPI — /run and /health
├── streamlit_app.py           # Chat UI
├── Dockerfile
├── docker-compose.yml
├── agent.guard.yml
├── requirements.txt
└── .env.example
```

**Multi-agent pipelines** are supported — choose sequential pipeline and name your agents:

```bash
npx agentvoy create my-project --build-mode app --agent-mode multi --yes
# Creates: researcher → writer → reviewer pipeline
```

```
src/
├── agents/
│   ├── researcher.py
│   ├── writer.py
│   └── reviewer.py
└── pipeline.py          # Sequential orchestration
```

## Quick Start

```bash
# Interactive — guided prompts for framework, model, and build mode
npx agentvoy create my-project

# Agent mode with defaults (OpenAI + GPT-4o)
npx agentvoy create my-project --yes

# App with Docker, fully non-interactive
npx agentvoy create my-project \
  --framework openai \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --build-mode app \
  --deploy-target docker \
  --yes

# Add guardrails to an existing project
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
| **LangGraph** | Python | Available |
| **Anthropic SDK** | Python | Available |
| LlamaIndex | Python | Coming soon |
| AutoGen | Python | Coming soon |

## Model Providers

| Provider | Models | API Key Env |
|----------|--------|-------------|
| **OpenAI** | gpt-4o, o1, gpt-4-turbo | `OPENAI_API_KEY` |
| **Anthropic** | claude-opus-4, claude-sonnet-4 | `ANTHROPIC_API_KEY` |
| **Google** | gemini-2.0-flash, gemini-2.5-pro | `GOOGLE_API_KEY` |
| **Ollama** | llama3, mistral, codellama | Local — no key needed |
| **Groq** | llama-3.3-70b-versatile | `GROQ_API_KEY` |
| **Mistral** | mistral-large-latest | `MISTRAL_API_KEY` |

## Deploy

### Deploy during creation

Pick a deployment target when creating an app project:

```
? Deployment target:
> Docker
  Fly.io
  Railway
  GCP Cloud Run
  AWS Lambda
```

### Deploy an existing agent project

```bash
cd my-project-agent
npx agentvoy deploy --target docker
```

This generates `server.py`, `streamlit_app.py`, and all deployment files for the chosen target — without touching your existing agent code.

### Deployment targets

| Target | Files generated | CLI required |
|--------|----------------|--------------|
| **Docker** | `Dockerfile`, `.dockerignore`, `docker-compose.yml` | `docker` |
| **Fly.io** | `deploy/fly.toml` | `flyctl` |
| **Railway** | `deploy/railway.json` | `railway` |
| **GCP Cloud Run** | `deploy/cloud-run.yaml` | `gcloud` |
| **AWS Lambda** | `deploy/template.yaml`, `deploy/lambda_handler.py` | `aws`, `sam` |

### Guard-to-infrastructure mapping

`agent.guard.yml` settings flow directly into deployment configuration:

```yaml
guardrails:
  behavior:
    timeout: 5m       → Docker HEALTHCHECK interval, Cloud Run timeout
    cost_limit: $1.00 → Container memory limit (512Mi)
permissions:
  execution:
    allow_shell: false → non-root Docker user
```

## Agent Guard Config

Every AgentVoy project includes `agent.guard.yml` — a universal declarative config for security and behavior.

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
  filesystem:
    read: ["./**"]
    write: ["./output/**"]
  tools:
    require_approval: ["delete_*", "send_*", "deploy_*"]
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
  behavior:
    max_iterations: 20
    timeout: 5m
    cost_limit: "$1.00"

observability:
  tracing: true
  log_level: info
  cost_tracking: true
```

### Runtime enforcement — `agentvoy-guard`

```bash
pip install agentvoy-guard
```

```python
from agentvoy_guard import Guard

guard = Guard.from_config()  # reads agent.guard.yml

with guard.session() as session:
    session.check_input(user_prompt)
    result = my_agent.run(user_prompt)
    session.check_output(result)
```

## Commands

```bash
agentvoy create [name]     # Create a new agent or app project
agentvoy deploy            # Add deployment config to an existing project
agentvoy init              # Add agent.guard.yml to an existing project
agentvoy validate          # Validate your agent.guard.yml config
agentvoy list              # List supported frameworks, models, and targets
```

## Architecture

```
agentvoy/                        # TypeScript monorepo
  packages/
    core/                        # Types, config, adapters, deployers
      src/
        adapters/                # Framework adapters (openai, crewai, …)
        deployers/               # Deployment adapters (docker, fly-io, …)
        types.ts                 # Universal type system
        config.ts                # agent.guard.yml parser
    cli/                         # agentvoy CLI
    create-agentvoy/             # npx create-agentvoy shorthand

agentvoy-guard/                  # Python runtime enforcement package
```

## Contributing

### Adding a new framework adapter

1. Create `packages/core/src/adapters/my-framework.ts`
2. Implement `FrameworkAdapter` — `scaffold()` and `validateConfig()`
3. Register in `packages/core/src/adapters/index.ts`
4. Submit a PR

### Adding a new deployment target

1. Create `packages/core/src/deployers/my-target.ts`
2. Implement `DeploymentAdapter` — `generateFiles()` and `validate()`
3. Register in `packages/core/src/deployers/index.ts`
4. Submit a PR

### Development

```bash
git clone https://github.com/agentvoy/agentvoy.git
cd agentvoy
npm install
npm run build

# Smoke test agent mode
node packages/cli/dist/index.js create test-project --yes

# Smoke test app mode
node packages/cli/dist/index.js create test-project --build-mode app --deploy-target docker --yes
```

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/ChinmayMurugkar">Chinmay Murugkar</a>
</p>
