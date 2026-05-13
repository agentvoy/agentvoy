# agentvoy

The universal AI agent development platform. Scaffold production-ready AI agents in seconds — any framework, any model, secure by default.

```bash
npx agentvoy create my-agent
```

[![npm version](https://img.shields.io/npm/v/agentvoy.svg)](https://www.npmjs.com/package/agentvoy)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/agentvoy/agentvoy/blob/main/LICENSE)

## Quick start

```bash
# Interactive — choose framework and model
npx agentvoy create my-agent

# Or specify everything upfront
npx agentvoy create my-agent --framework langgraph --provider anthropic --model claude-sonnet-4-20250514

# Skip all prompts with defaults
npx agentvoy create my-agent --yes
```

## Supported frameworks

| Framework | Language | Status |
|-----------|----------|--------|
| OpenAI Agents SDK | Python | ✅ Available |
| Google ADK | Python | ✅ Available |
| CrewAI | Python | ✅ Available |
| LangGraph | Python | ✅ Available |
| Anthropic SDK | Python | ✅ Available |
| LlamaIndex | Python | Coming soon |

## Supported model providers

OpenAI · Anthropic · Google · Ollama (local) · Groq · Mistral

## What gets generated

Every project includes:

```
my-agent/
  agent.py          # Agent logic with agentic loop
  tools.py          # Custom tools
  run.py            # Interactive REPL entry point
  agent.guard.yml   # Guardrails & permissions config
  requirements.txt  # Python dependencies (includes agentvoy-guard)
  .env.example      # API key template
  .gitignore
```

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

## Other commands

```bash
agentvoy init        # Add agent.guard.yml to an existing project
agentvoy validate    # Validate your agent.guard.yml
agentvoy list        # List all supported frameworks and providers
```

## Links

- [Website](https://agentvoy.com)
- [GitHub](https://github.com/agentvoy/agentvoy)
- [agentvoy-guard on PyPI](https://pypi.org/project/agentvoy-guard/)

## License

Apache 2.0
