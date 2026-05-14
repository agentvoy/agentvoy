/**
 * Anthropic SDK Adapter
 *
 * Scaffolds projects using the Anthropic Agent SDK (Python).
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

export const anthropicAdapter: FrameworkAdapter = {
  name: "anthropic",
  displayName: "Anthropic SDK",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const isApp = config.buildMode === "app";
    const agentNames = config.agentNames ?? ["agent"];
    const files: GeneratedFile[] = [];

    if (isApp) {
      for (const agentName of agentNames) {
        files.push({ path: `src/agents/${agentName}.py`, content: generateAgentFile(config, agentName) });
      }
      files.push({ path: "src/tools/tools.py", content: generateToolsFile(config) });
      for (const f of generateAppInfraFiles(config)) files.push(f);
    } else {
      files.push({ path: "agent.py", content: generateAgentFile(config, "agent") });
      files.push({ path: "tools.py", content: generateToolsFile(config) });
      files.push({ path: "run.py", content: generateRunFile(config) });
    }

    const baseReqs = `anthropic>=0.40.0\npython-dotenv>=1.0.0\nagentvoy-guard>=0.1.0\n`;
    files.push({ path: "requirements.txt", content: isApp ? appendAppRequirements(baseReqs) : baseReqs });
    files.push({ path: ".env.example", content: "ANTHROPIC_API_KEY=your-api-key-here\n" });
    files.push({
      path: "agent.guard.yml",
      content: generateDefaultConfig(config.projectName, "anthropic", config.model.model || "claude-sonnet-4-20250514"),
    });

    return {
      files,
      dependencies: {},
      devDependencies: {},
      scripts: { start: isApp ? "uvicorn server:app --reload --port 8080" : "python run.py" },
      postInstallInstructions: isApp
        ? appPostInstallInstructions("ANTHROPIC_API_KEY")
        : ["pip install -r requirements.txt", "cp .env.example .env", "Add your ANTHROPIC_API_KEY to .env", "python run.py"],
    };
  },

  validateConfig(config: AgentGuardConfig): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (config.model.provider !== "anthropic") {
      warnings.push({
        field: "model.provider",
        message: `Anthropic adapter works best with provider "anthropic", got "${config.model.provider}"`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      anthropic: ">=0.40.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function generateAgentFile(config: ScaffoldConfig, _agentName = "agent"): string {
  const model = config.model.model || "claude-sonnet-4-20250514";
  const maxIterations = config.guardrails?.behavior?.max_iterations || 20;
  const isApp = config.buildMode === "app";
  const toolsImport = isApp
    ? "from src.tools.tools import get_tools, process_tool_call"
    : "from tools import get_tools, process_tool_call";

  return `"""
${config.projectName} — Built with AgentVoy
https://github.com/agentvoy
"""

import anthropic
${toolsImport}


def create_client() -> anthropic.Anthropic:
    """Create the Anthropic client."""
    return anthropic.Anthropic()


def run_agent(prompt: str, model: str | None = None) -> str:
    """Run the agent with an agentic loop, enforcing agent.guard.yml at runtime."""
    import time
    from agentvoy_guard import Guard
    guard = Guard.from_config()

    try:
        from src.trace.tracer import tracer
    except ImportError:
        tracer = None

    _model = model or "${model}"
    if tracer:
        tracer.agent_start("${config.projectName}", prompt, _model)

    client = create_client()
    tools = get_tools()
    messages = [{"role": "user", "content": prompt}]

    with guard.session() as session:
        if tracer:
            tracer.guard_check("input", True)
        session.check_input(prompt)

        while True:
            session.tick()

            t0 = time.time()
            response = client.messages.create(
                model=_model,
                max_tokens=8096,
                tools=tools,
                messages=messages,
            )

            latency = round(time.time() - t0, 2)
            tokens_in = getattr(response.usage, 'input_tokens', 0)
            tokens_out = getattr(response.usage, 'output_tokens', 0)
            if tracer:
                tracer.llm_call(_model, tokens_in=tokens_in, tokens_out=tokens_out, latency=latency)
            session.track_usage(response.usage)
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text"):
                        session.check_output(block.text)
                        if tracer:
                            tracer.guard_check("output", True)
                            tracer.agent_complete("${config.projectName}", block.text)
                        print(f"[guard] {guard.last_summary}")
                        return block.text
                return "Done."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        session.tick_tool()
                        t_tool = time.time()
                        result = process_tool_call(block.name, block.input)
                        if tracer:
                            tracer.tool_call(block.name, str(block.input), str(result), round(time.time() - t_tool, 2))
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result),
                        })
                messages.append({"role": "user", "content": tool_results})

    return "Max iterations reached."
`;
}

function generateToolsFile(_config: ScaffoldConfig): string {
  return `"""
Agent tools — add your custom tools here.
"""


def get_tools() -> list:
    """Return tool definitions for the Anthropic API."""
    return [
        {
            "name": "search_web",
            "description": "Search the web for information on a given topic.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query.",
                    }
                },
                "required": ["query"],
            },
        },
        {
            "name": "read_file",
            "description": "Read the contents of a file.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file to read.",
                    }
                },
                "required": ["path"],
            },
        },
    ]


def process_tool_call(tool_name: str, tool_input: dict) -> str:
    """Execute a tool call and return the result."""
    if tool_name == "search_web":
        return _search_web(tool_input["query"])
    elif tool_name == "read_file":
        return _read_file(tool_input["path"])
    else:
        return f"Unknown tool: {tool_name}"


def _search_web(query: str) -> str:
    """Search the web for information."""
    # TODO: Implement your search logic (e.g., Tavily, Serper, Brave Search)
    return f"Search results for: {query}"


def _read_file(path: str) -> str:
    """Read a file's contents."""
    try:
        with open(path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {path}"
    except PermissionError:
        return f"Permission denied: {path}"
`;
}

function generateRunFile(config: ScaffoldConfig): string {
  return `"""
Run the ${config.projectName} agent.
"""

from dotenv import load_dotenv
from agent import run_agent

load_dotenv()


def main():
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
            result = run_agent(prompt)
            print(f"\\n{result}\\n")
        except KeyboardInterrupt:
            print("\\n\\nGoodbye!")
            break


if __name__ == "__main__":
    main()
`;
}

function generateRequirements(): string {
  return `anthropic>=0.40.0
python-dotenv>=1.0.0
agentvoy-guard>=0.1.0
`;
}
