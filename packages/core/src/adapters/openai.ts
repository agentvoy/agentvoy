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

export const openaiAdapter: FrameworkAdapter = {
  name: "openai",
  displayName: "OpenAI Agents SDK",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const files: GeneratedFile[] = [
      {
        path: "agent.py",
        content: generateAgentFile(config),
      },
      {
        path: "tools.py",
        content: generateToolsFile(config),
      },
      {
        path: "run.py",
        content: generateRunFile(config),
      },
      {
        path: "requirements.txt",
        content: generateRequirements(),
      },
      {
        path: ".env.example",
        content: "OPENAI_API_KEY=your-api-key-here\n",
      },
      {
        path: "agent.guard.yml",
        content: generateDefaultConfig(
          config.projectName,
          config.model.provider,
          config.model.model
        ),
      },
    ];

    return {
      files,
      dependencies: {},
      devDependencies: {},
      scripts: {
        start: "python run.py",
      },
      postInstallInstructions: [
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

function generateAgentFile(config: ScaffoldConfig): string {
  const guardConfig = config.guardrails?.behavior;
  const maxTurns = guardConfig?.max_iterations || 20;

  return `"""
${config.projectName} — Built with AgentVoy
https://github.com/agentvoy
"""

from agents import Agent, Runner
from tools import get_tools


def create_agent() -> Agent:
    """Create and configure the agent with AgentVoy guardrails."""
    tools = get_tools()

    agent = Agent(
        name="${config.projectName}",
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


async def run_agent(prompt: str) -> str:
    """Run the agent with the given prompt."""
    agent = create_agent()
    result = await Runner.run(
        agent,
        prompt,
        max_turns=${maxTurns},
    )
    return result.final_output
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

function generateRequirements(): string {
  return `openai-agents>=0.1.0
python-dotenv>=1.0.0
`;
}
