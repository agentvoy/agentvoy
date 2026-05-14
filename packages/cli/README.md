# agentvoy

The universal AI agent platform. Scaffold, develop, and deploy production-ready AI agents in seconds — any framework, any model, secure by default.

```bash
npx agentvoy create my-agent
```

[![npm version](https://img.shields.io/npm/v/agentvoy.svg)](https://www.npmjs.com/package/agentvoy)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/agentvoy/agentvoy/blob/main/LICENSE)

## Quick start

```bash
# Interactive — choose framework, model, and build mode
npx agentvoy create my-project

# Agent mode with defaults (OpenAI + GPT-4o)
npx agentvoy create my-project --yes

# App mode — API + chat UI + DevTools + Docker
npx agentvoy create my-project --build-mode app --deploy-target docker --yes

# Start development server with DevTools
cd my-project-app
agentvoy dev    # http://localhost:8080/dev

# Deploy to Docker or Fly.io
agentvoy deploy --target docker
agentvoy deploy --target fly-io
```

## Two paths

**Agent** — fast local development with a flat project structure and interactive REPL.

**App** — deployable agentic app with FastAPI server, Streamlit chat UI, real-time DevTools dashboard, and cloud deployment configs.

## Supported frameworks

| Framework | Language | Status |
|-----------|----------|--------|
| OpenAI Agents SDK | Python | Available |
| Google ADK | Python | Available |
| CrewAI | Python | Available |
| LangGraph | Python | Available |
| Anthropic SDK | Python | Available |
| LlamaIndex | Python | Available |
| AutoGen | Python | Available |

## Supported model providers

OpenAI · Anthropic · Google · Ollama (local) · Groq · Mistral

## What gets generated

### Agent mode

```
my-project-agent/
  agent.py          # Agent logic with agentic loop
  tools.py          # Custom tools
  run.py            # Interactive REPL entry point
  agent.guard.yml   # Guardrails & permissions config
  requirements.txt
  .env.example
```

### App mode

```
my-project-app/
  src/
    agents/agent.py     # Agent logic
    tools/tools.py      # Custom tools
    trace/tracer.py     # Execution tracing
  server.py             # FastAPI — /run, /health, /dev, /ws/trace
  streamlit_app.py      # Chat UI with model picker & glass theme
  devtools.html         # Real-time DevTools dashboard
  Dockerfile
  agent.guard.yml
  requirements.txt
```

## DevTools — `agentvoy dev`

Start your agent with the live DevTools dashboard:

```bash
agentvoy dev
```

- Real-time trace streaming via WebSocket
- Event timeline: agent_start, llm_call, tool_call, guard_check, pipeline_stage
- Pipeline visualization for multi-agent apps
- Dark-themed single-page dashboard — no extra dependencies

## Deploy — `agentvoy deploy`

One-command deployment to Docker or Fly.io:

```bash
agentvoy deploy --target docker    # Build + run locally
agentvoy deploy --target fly-io    # Deploy to cloud
agentvoy deploy --dry-run          # Generate files only
```

Deployment targets: Docker, Fly.io, Railway, GCP Cloud Run, AWS Lambda.

## agent.guard.yml — built-in guardrails

Every project ships with a universal guardrails config:

```yaml
guardrails:
  input:
    block_prompt_injection: true
    pii_detection: warn
  behavior:
    max_iterations: 20
    cost_limit: "$1.00"
    timeout: 5m
permissions:
  execution:
    allow_shell: false
```

Enforced at runtime by [agentvoy-guard](https://pypi.org/project/agentvoy-guard/) — automatically included in every project.

## All commands

```bash
agentvoy create [name]     # Create a new agent or app project
agentvoy dev               # Start agent server with DevTools dashboard
agentvoy deploy            # Deploy to Docker, Fly.io, or other targets
agentvoy init              # Add agent.guard.yml to an existing project
agentvoy validate          # Validate your agent.guard.yml
agentvoy list              # List all supported frameworks and providers
```

## Links

- [Website](https://agentvoy.com)
- [GitHub](https://github.com/agentvoy/agentvoy)
- [agentvoy-guard on PyPI](https://pypi.org/project/agentvoy-guard/)

## License

Apache 2.0
