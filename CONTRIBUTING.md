# Contributing to AgentVoy

Thanks for your interest in contributing! AgentVoy is open source under Apache 2.0.

## Ways to contribute

- **Add a framework adapter** — the highest-impact contribution
- **Report bugs** — use the bug report issue template
- **Improve guardrails** — enhance `agent.guard.yml` validation or detection
- **Improve docs** — clearer README, examples, guides

## Development setup

```bash
git clone https://github.com/agentvoy/agentvoy.git
cd agentvoy
npm install
npm run build
node packages/cli/dist/index.js --help
```

## Adding a new framework adapter

This is the most common contribution. Here's how:

### 1. Create the adapter file

```bash
# Create your adapter
touch packages/core/src/adapters/my-framework.ts
```

Implement the `FrameworkAdapter` interface:

```typescript
import type { FrameworkAdapter, ScaffoldConfig, ScaffoldResult } from "../types.js";
import { generateDefaultConfig } from "../config.js";

export const myFrameworkAdapter: FrameworkAdapter = {
  name: "my-framework",          // used in CLI: --framework my-framework
  displayName: "My Framework",   // shown in interactive prompt
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    return {
      files: [
        { path: "agent.py", content: generateAgentFile(config) },
        { path: "requirements.txt", content: generateRequirements() },
        { path: "run.py", content: generateRunFile(config) },
        { path: ".env.example", content: "API_KEY=your-key-here\n" },
        {
          path: "agent.guard.yml",
          content: generateDefaultConfig(config.projectName, "my-framework", config.model.model),
        },
      ],
      dependencies: {},
      devDependencies: {},
      scripts: { start: "python run.py" },
      postInstallInstructions: [
        "pip install -r requirements.txt",
        "cp .env.example .env",
        "python run.py",
      ],
    };
  },

  validateConfig(config) {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];
    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return { "my-framework": ">=1.0.0", "python-dotenv": ">=1.0.0" };
  },
};
```

**Important:** Always include `agentvoy-guard>=0.1.0` in `requirements.txt` and wire it into `run.py`:

```python
from agentvoy_guard import Guard
guard = Guard.from_config()

with guard.session() as session:
    session.check_input(prompt)
    result = run_my_agent(prompt)
    session.check_output(result)
```

### 2. Register the adapter

In `packages/core/src/adapters/index.ts`:

```typescript
import { myFrameworkAdapter } from "./my-framework.js";
registerAdapter(myFrameworkAdapter);
```

### 3. Test it

```bash
npm run build
node packages/cli/dist/index.js create test-project --framework my-framework --provider openai --model gpt-4o --yes
ls test-project/
```

### 4. Update the README

Add your framework to the table in `README.md`.

### 5. Open a PR

Use the PR template. CI will run build + smoke tests automatically.

## Code style

- TypeScript with strict mode
- No `any` types
- Generated Python code should include `agentvoy-guard` integration

## Questions?

Open an issue or start a GitHub Discussion.
