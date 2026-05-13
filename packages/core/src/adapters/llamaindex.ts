/**
 * LlamaIndex Adapter
 *
 * Scaffolds projects using LlamaIndex (Python).
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

export const llamaindexAdapter: FrameworkAdapter = {
  name: "llamaindex",
  displayName: "LlamaIndex",
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

    const supported = ["openai", "anthropic", "google"];
    if (!supported.includes(config.model.provider)) {
      warnings.push({
        field: "model.provider",
        message: `LlamaIndex works best with openai, anthropic, or google. Got "${config.model.provider}"`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      "llama-index": ">=0.12.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function getLLMImport(config: ScaffoldConfig): string {
  const provider = config.model.provider;
  const model = config.model.model || "gpt-4o";

  if (provider === "anthropic") {
    return `from llama_index.llms.anthropic import Anthropic
llm = Anthropic(model="${model}")`;
  }
  if (provider === "google") {
    return `from llama_index.llms.gemini import Gemini
llm = Gemini(model="${model}")`;
  }
  return `from llama_index.llms.openai import OpenAI
llm = OpenAI(model="${model}")`;
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
    ? "from src.tools.tools import get_tools"
    : "from tools import get_tools";
  const llmSetup = getLLMImport(config);
  const maxIter = config.guardrails?.behavior?.max_iterations || 20;

  return `"""
${agentName} agent — Part of ${config.projectName} (Built with AgentVoy)
"""

from dotenv import load_dotenv
from llama_index.core.agent import ReActAgent
${llmSetup.split("\n")[0]}
${toolsImport}

load_dotenv()

${llmSetup.split("\n").slice(1).join("\n")}


def create_agent() -> ReActAgent:
    """Create and configure the LlamaIndex ReAct agent."""
    tools = get_tools()
    agent = ReActAgent.from_tools(
        tools,
        llm=llm,
        verbose=True,
        max_iterations=${maxIter},
        system_prompt="""You are a helpful AI assistant.

Follow these guidelines:
- Be concise and accurate
- Ask for clarification when the request is ambiguous
- Respect the guardrails defined in agent.guard.yml
""",
    )
    return agent


def run_agent(prompt: str) -> str:
    """Run the agent with the given prompt, enforcing agent.guard.yml at runtime."""
    from agentvoy_guard import Guard
    guard = Guard.from_config()

    with guard.session() as session:
        session.check_input(prompt)

        agent = create_agent()
        response = agent.chat(prompt)
        final = str(response)

        session.check_output(final)

    print(f"[guard] {guard.last_summary}")
    return final
`;
}

function generateToolsFile(_config: ScaffoldConfig): string {
  return `"""
Agent tools — add your custom tools here.
"""

from llama_index.core.tools import FunctionTool


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


def get_tools() -> list:
    """Return all available tools as LlamaIndex FunctionTools."""
    return [
        FunctionTool.from_defaults(fn=search_web),
        FunctionTool.from_defaults(fn=read_file),
    ]
`;
}

function generateRunFile(config: ScaffoldConfig): string {
  return `"""
Run the ${config.projectName} agent.
"""

import asyncio
from agent import run_agent


async def main():
    print("\\n${config.projectName} — Powered by AgentVoy + LlamaIndex")
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
  const base = `llama-index>=0.12.0\nllama-index-llms-openai>=0.4.0\nllama-index-llms-anthropic>=0.6.0\nllama-index-llms-gemini>=0.4.0\npython-dotenv>=1.0.0\nagentvoy-guard>=0.1.0\n`;
  return isApp ? appendAppRequirements(base) : base;
}
