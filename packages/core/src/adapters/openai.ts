/**
 * OpenAI Agents SDK Adapter
 *
 * Scaffolds projects using the OpenAI Agents SDK (Python).
 */

import type {
  FrameworkAdapter,
  ScaffoldConfig,
  ScaffoldResult,
  AgentGuardConfig,
  ValidationResult,
  GeneratedFile,
} from "../types.js";
import { generateDefaultConfig } from "../config.js";
import { generateAppInfraFiles, appendAppRequirements, appPostInstallInstructions } from "./app-scaffold.js";

export const openaiAdapter: FrameworkAdapter = {
  name: "openai",
  displayName: "OpenAI Agents SDK",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const isApp = config.buildMode === "app";
    const isMulti = isApp && config.agentMode === "multi";
    const agentNames = config.agentNames ?? ["agent"];

    const files: GeneratedFile[] = [];

    if (isApp) {
      // src/agents/ — one file per agent
      for (const agentName of agentNames) {
        files.push({
          path: `src/agents/${agentName}.py`,
          content: generateAgentFile(config, agentName),
        });
      }
      // src/tools/tools.py
      files.push({ path: "src/tools/tools.py", content: generateToolsFile(config) });
      // Common src/ infrastructure files
      for (const f of generateAppInfraFiles(config)) files.push(f);
    } else {
      files.push({ path: "agent.py", content: generateAgentFile(config, "agent") });
      files.push({ path: "tools.py", content: generateToolsFile(config) });
      files.push({ path: "run.py", content: generateRunFile(config) });
    }

    files.push({
      path: "requirements.txt",
      content: generateRequirements(isApp),
    });
    files.push({
      path: ".env.example",
      content: "OPENAI_API_KEY=your-api-key-here\n",
    });
    files.push({
      path: "agent.guard.yml",
      content: generateDefaultConfig(config.projectName, config.model.provider, config.model.model),
    });

    return {
      files,
      dependencies: {},
      devDependencies: {},
      scripts: { start: isApp ? "uvicorn server:app --reload --port 8080" : "python run.py" },
      postInstallInstructions: isApp
        ? appPostInstallInstructions("OPENAI_API_KEY")
        : [
            "pip install -r requirements.txt",
            "cp .env.example .env",
            "Add your OPENAI_API_KEY to .env",
            "python run.py",
          ],
    };
  },

  validateConfig(config: AgentGuardConfig): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (config.model.provider !== "openai") {
      warnings.push({
        field: "model.provider",
        message: `OpenAI adapter works best with provider "openai", got "${config.model.provider}"`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      "openai-agents": ">=0.1.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function generateAgentFile(config: ScaffoldConfig, agentName: string): string {
  const guardConfig = config.guardrails?.behavior;
  const maxTurns = guardConfig?.max_iterations || 20;
  const isApp = config.buildMode === "app";
  const toolsImport = isApp ? "from src.tools.tools import get_tools" : "from tools import get_tools";

  return `"""
${agentName} agent — Part of ${config.projectName} (Built with AgentVoy)
"""

from agents import Agent, Runner
${toolsImport}


def create_agent() -> Agent:
    """Create and configure the agent with AgentVoy guardrails."""
    tools = get_tools()

    agent = Agent(
        name="${agentName}",
        instructions="""You are a helpful AI assistant.

Follow these guidelines:
- Be concise and accurate
- Ask for clarification when the request is ambiguous
- Respect the guardrails defined in agent.guard.yml
""",
        model="${config.model.model || "gpt-4o"}",
        tools=tools,
    )

    return agent


def run_agent(prompt: str) -> str:
    """Run the agent with the given prompt, enforcing agent.guard.yml at runtime."""
    import asyncio
    from agentvoy_guard import Guard
    guard = Guard.from_config()

    async def _run():
        agent = create_agent()
        result = await Runner.run(
            agent,
            prompt,
            max_turns=${maxTurns},
        )
        return result.final_output or ""

    with guard.session() as session:
        session.check_input(prompt)
        final = asyncio.run(_run())
        session.check_output(final)

    print(f"[guard] {guard.last_summary}")
    return final
`;
}

function generateToolsFile(_config: ScaffoldConfig): string {
  return `"""
Agent tools — add your custom tools here.
"""

from agents import function_tool


@function_tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # TODO: Implement your search logic
    return f"Search results for: {query}"


@function_tool
def read_file(path: str) -> str:
    """Read the contents of a file."""
    try:
        with open(path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {path}"
    except PermissionError:
        return f"Permission denied: {path}"


def get_tools() -> list:
    """Return all available tools."""
    return [search_web, read_file]
`;
}

function generateRunFile(config: ScaffoldConfig): string {
  return `"""
Run the ${config.projectName} agent.
"""

import asyncio
import os
from dotenv import load_dotenv
from agent import run_agent

load_dotenv()


async def main():
    print("\\n🚀 ${config.projectName} — Powered by AgentVoy")
    print("=" * 50)
    print("Type your prompt (or 'quit' to exit):\\n")

    while True:
        try:
            prompt = input("> ")
            if prompt.lower() in ("quit", "exit", "q"):
                print("\\nGoodbye!")
                break
            if not prompt.strip():
                continue

            print("\\nThinking...\\n")
            result = await run_agent(prompt)
            print(f"\\n{result}\\n")
        except KeyboardInterrupt:
            print("\\n\\nGoodbye!")
            break


if __name__ == "__main__":
    asyncio.run(main())
`;
}

function generateRequirements(isApp = false): string {
  const base = `openai-agents>=0.1.0\npython-dotenv>=1.0.0\nagentvoy-guard>=0.1.0\n`;
  return isApp ? appendAppRequirements(base) : base;
}
