/**
 * AutoGen Adapter
 *
 * Scaffolds projects using Microsoft AutoGen (Python).
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

export const autogenAdapter: FrameworkAdapter = {
  name: "autogen",
  displayName: "AutoGen",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const isApp = config.buildMode === "app";
    const agentNames = config.agentNames ?? ["agent"];
    const files: GeneratedFile[] = [];

    if (isApp) {
      for (const agentName of agentNames) {
        files.push({
          path: `src/agents/${agentName}.py`,
          content: generateAgentFile(config, agentName),
        });
      }
      files.push({ path: "src/tools/tools.py", content: generateToolsFile(config) });
      for (const f of generateAppInfraFiles(config)) files.push(f);
    } else {
      files.push({ path: "agent.py", content: generateAgentFile(config, "agent") });
      files.push({ path: "tools.py", content: generateToolsFile(config) });
      files.push({ path: "run.py", content: generateRunFile(config) });
    }

    const envVar = getEnvVar(config.model.provider);
    files.push({ path: "requirements.txt", content: generateRequirements(isApp) });
    files.push({ path: ".env.example", content: `${envVar}=your-api-key-here\n` });
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
        ? appPostInstallInstructions(envVar)
        : [
            "pip install -r requirements.txt",
            "cp .env.example .env",
            `Add your ${envVar} to .env`,
            "python run.py",
          ],
    };
  },

  validateConfig(config: AgentGuardConfig): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!["openai", "anthropic"].includes(config.model.provider)) {
      warnings.push({
        field: "model.provider",
        message: `AutoGen works best with openai or anthropic. Got "${config.model.provider}"`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      "pyautogen": ">=0.4.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function getLLMConfig(config: ScaffoldConfig): string {
  const model = config.model.model || "gpt-4o";
  const provider = config.model.provider;

  if (provider === "anthropic") {
    return `llm_config = {
    "config_list": [
        {
            "model": "${model}",
            "api_type": "anthropic",
            "api_key": os.environ["ANTHROPIC_API_KEY"],
        }
    ],
}`;
  }
  return `llm_config = {
    "config_list": [
        {
            "model": "${model}",
            "api_key": os.environ["OPENAI_API_KEY"],
        }
    ],
}`;
}

function getEnvVar(provider: string): string {
  const map: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
    groq: "GROQ_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[provider] || "OPENAI_API_KEY";
}

function generateAgentFile(config: ScaffoldConfig, agentName: string): string {
  const isApp = config.buildMode === "app";
  const toolsImport = isApp
    ? "from src.tools.tools import get_tool_functions"
    : "from tools import get_tool_functions";
  const llmConfig = getLLMConfig(config);
  const maxReplies = config.guardrails?.behavior?.max_iterations || 20;

  return `"""
${agentName} agent — Part of ${config.projectName} (Built with AgentVoy)
"""

import os
import asyncio
from dotenv import load_dotenv
from autogen import AssistantAgent, UserProxyAgent
${toolsImport}

load_dotenv()

${llmConfig}


def create_agent() -> AssistantAgent:
    """Create and configure the AutoGen assistant agent."""
    tools = get_tool_functions()

    assistant = AssistantAgent(
        name="${agentName}",
        system_message="""You are a helpful AI assistant.

Follow these guidelines:
- Be concise and accurate
- Ask for clarification when the request is ambiguous
- Respect the guardrails defined in agent.guard.yml
""",
        llm_config=llm_config,
        max_consecutive_auto_reply=${maxReplies},
    )

    # Register tools
    for tool_fn in tools:
        assistant.register_for_llm(description=tool_fn.__doc__ or "")(tool_fn)

    return assistant


def run_agent(prompt: str) -> str:
    """Run the agent with the given prompt, enforcing agent.guard.yml at runtime."""
    import asyncio
    from agentvoy_guard import Guard
    guard = Guard.from_config()

    async def _run():
        assistant = create_agent()

        user_proxy = UserProxyAgent(
            name="user_proxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=1,
            is_termination_msg=lambda msg: msg.get("content", "").rstrip().endswith("TERMINATE"),
            code_execution_config=False,
        )

        await user_proxy.a_initiate_chat(
            assistant,
            message=prompt,
            max_turns=2,
        )

        chat_history = user_proxy.chat_messages.get(assistant, [])
        return next(
            (m["content"] for m in reversed(chat_history) if m.get("role") == "assistant"),
            "",
        )

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


def search_web(query: str) -> str:
    """Search the web for information."""
    # TODO: Implement your search logic
    return f"Search results for: {query}"


def read_file(path: str) -> str:
    """Read the contents of a file."""
    try:
        with open(path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {path}"
    except PermissionError:
        return f"Permission denied: {path}"


def get_tool_functions() -> list:
    """Return all available tool functions."""
    return [search_web, read_file]
`;
}

function generateRunFile(config: ScaffoldConfig): string {
  return `"""
Run the ${config.projectName} agent.
"""

import asyncio
from agent import run_agent


async def main():
    print("\\n${config.projectName} — Powered by AgentVoy + AutoGen")
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
  const base = `pyautogen>=0.4.0\npython-dotenv>=1.0.0\nagentvoy-guard>=0.1.0\n`;
  return isApp ? appendAppRequirements(base) : base;
}
