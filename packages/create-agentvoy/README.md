# create-agentvoy

Scaffold a production-ready AI agent project in one command.

[![npm version](https://img.shields.io/npm/v/create-agentvoy.svg)](https://www.npmjs.com/package/create-agentvoy)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/agentvoy/agentvoy/blob/main/LICENSE)

## Usage

```bash
# npm
npm create agentvoy my-project

# npx
npx create-agentvoy my-project

# yarn
yarn create agentvoy my-project
```

This is a shorthand that runs the full [AgentVoy CLI](https://www.npmjs.com/package/agentvoy).

## Two paths

**Agent** — local development with interactive REPL:

```
my-project-agent/
  agent.py          # Agent logic
  tools.py          # Custom tools
  run.py            # Interactive entry point
  agent.guard.yml   # Guardrails & permissions config
  requirements.txt
  .env.example
```

**App** — deployable agentic app with API, chat UI, DevTools, and cloud configs:

```
my-project-app/
  src/agents/agent.py     # Agent logic
  src/trace/tracer.py     # Execution tracing
  server.py               # FastAPI — /run, /health, /dev
  streamlit_app.py        # Chat UI with model picker
  devtools.html           # Real-time DevTools dashboard
  Dockerfile
  agent.guard.yml
```

## Supported frameworks

OpenAI Agents SDK · Google ADK · CrewAI · LangGraph · Anthropic SDK · LlamaIndex · AutoGen

## Links

- [Full documentation](https://github.com/agentvoy/agentvoy)
- [Website](https://agentvoy.com)

## License

Apache 2.0
