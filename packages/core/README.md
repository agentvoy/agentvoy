# @agentvoy/core

Core engine for [AgentVoy](https://agentvoy.com) — the universal AI agent platform.

[![npm version](https://img.shields.io/npm/v/@agentvoy/core.svg)](https://www.npmjs.com/package/@agentvoy/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/agentvoy/agentvoy/blob/main/LICENSE)

## What's in here

This package provides the foundation for AgentVoy:

- **Framework adapters** — OpenAI Agents SDK, Google ADK, CrewAI, LangGraph, Anthropic SDK, LlamaIndex, AutoGen
- **Deployment adapters** — Docker, Fly.io, Railway, GCP Cloud Run, AWS Lambda
- **Code generators** — server.py (FastAPI + DevTools endpoints), streamlit_app.py (chat UI), tracer.py (execution tracing), devtools.html (dashboard), pipeline.py (multi-agent orchestration)
- **Config parser** — parse and validate `agent.guard.yml`
- **Guard-to-cloud mapper** — translate guardrail settings into deployment configuration

## Usage

This package is consumed internally by the `agentvoy` CLI and `create-agentvoy`. You typically don't need to install it directly.

If you're **building a custom adapter**, implement the `FrameworkAdapter` interface:

```typescript
import type { FrameworkAdapter, ScaffoldConfig, ScaffoldResult } from "@agentvoy/core";

export const myAdapter: FrameworkAdapter = {
  name: "my-framework",
  displayName: "My Framework",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    return {
      files: [
        { path: "agent.py", content: "..." },
        { path: "requirements.txt", content: "my-framework\nagentvoy-guard>=0.1.0\n" },
      ],
      dependencies: {},
      devDependencies: {},
      scripts: { start: "python run.py" },
      postInstallInstructions: ["pip install -r requirements.txt", "python run.py"],
    };
  },

  validateConfig(config) {
    return { valid: true, errors: [], warnings: [] };
  },

  getDependencies() {
    return { "my-framework": ">=1.0.0" };
  },
};
```

If you're **building a custom deployment target**, implement the `DeploymentAdapter` interface:

```typescript
import type { DeploymentAdapter, DeployConfig, DeploymentFiles } from "@agentvoy/core";

export const myTargetAdapter: DeploymentAdapter = {
  target: "my-target",
  displayName: "My Target",
  requiredCLI: "my-cli",

  async generateFiles(config: DeployConfig): Promise<DeploymentFiles> {
    return {
      files: [{ path: "deploy/config.yml", content: "..." }],
      instructions: ["my-cli deploy"],
    };
  },

  async validate(config: DeployConfig) {
    return { valid: true, errors: [], warnings: [] };
  },
};
```

See [CONTRIBUTING.md](https://github.com/agentvoy/agentvoy/blob/main/CONTRIBUTING.md) for the full guide.

## Links

- [GitHub](https://github.com/agentvoy/agentvoy)
- [Website](https://agentvoy.com)
- [npm: agentvoy CLI](https://www.npmjs.com/package/agentvoy)

## License

Apache 2.0
