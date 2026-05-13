# create-agentvoy

Scaffold a production-ready AI agent project in one command.

[![npm version](https://img.shields.io/npm/v/create-agentvoy.svg)](https://www.npmjs.com/package/create-agentvoy)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/agentvoy/agentvoy/blob/main/LICENSE)

## Usage

```bash
# npm
npm create agentvoy my-agent

# npx
npx create-agentvoy my-agent

# yarn
yarn create agentvoy my-agent
```

This is a shorthand that runs the full [AgentVoy CLI](https://www.npmjs.com/package/agentvoy).

## What you get

```
my-agent/
  agent.py          # Agent logic
  tools.py          # Custom tools
  run.py            # Interactive entry point
  agent.guard.yml   # Guardrails & permissions config
  requirements.txt  # Python dependencies
  .env.example      # API key template
  .gitignore
```

## Supported frameworks

OpenAI Agents SDK · Google ADK · CrewAI · LangGraph · Anthropic SDK

## Links

- [Full documentation](https://github.com/agentvoy/agentvoy)
- [Website](https://agentvoy.com)

## License

Apache 2.0
