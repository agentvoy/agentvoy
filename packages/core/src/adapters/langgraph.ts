/**
 * LangGraph Adapter
 *
 * Scaffolds projects using LangGraph (Python) — stateful, graph-based agent workflows.
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

export const langgraphAdapter: FrameworkAdapter = {
  name: "langgraph",
  displayName: "LangGraph",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const isApp = config.buildMode === "app";
    const agentNames = config.agentNames ?? ["agent"];
    const files: GeneratedFile[] = [];

    if (isApp) {
      for (const agentName of agentNames) {
        files.push({ path: `src/agents/${agentName}.py`, content: generateAgentFile(config, agentName) });
        files.push({ path: `src/agents/${agentName}_state.py`, content: generateStateFile(config, agentName) });
      }
      files.push({ path: "src/tools/tools.py", content: generateToolsFile() });
      for (const f of generateAppInfraFiles(config)) files.push(f);
    } else {
      files.push({ path: "agent.py", content: generateAgentFile(config, "agent") });
      files.push({ path: "tools.py", content: generateToolsFile() });
      files.push({ path: "state.py", content: generateStateFile(config, "agent") });
      files.push({ path: "run.py", content: generateRunFile(config) });
    }

    const baseReqs = generateRequirements(config);
    files.push({ path: "requirements.txt", content: isApp ? appendAppRequirements(baseReqs) : baseReqs });
    files.push({ path: ".env.example", content: generateEnvExample(config) });
    files.push({
      path: "agent.guard.yml",
      content: generateDefaultConfig(config.projectName, "langgraph", config.model.model || "gpt-4o"),
    });

    return {
      files,
      dependencies: {},
      devDependencies: {},
      scripts: { start: isApp ? "uvicorn server:app --reload --port 8080" : "python run.py" },
      postInstallInstructions: isApp
        ? appPostInstallInstructions(getApiKeyEnv(config))
        : ["pip install -r requirements.txt", "cp .env.example .env", `Add your ${getApiKeyEnv(config)} to .env`, "python run.py"],
    };
  },

  validateConfig(config: AgentGuardConfig): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    const supported = ["openai", "anthropic", "google"];
    if (!supported.includes(config.model.provider)) {
      warnings.push({
        field: "model.provider",
        message: `LangGraph works best with providers: ${supported.join(", ")}. Got "${config.model.provider}"`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      langgraph: ">=0.2.0",
      langchain: ">=0.3.0",
      "langchain-core": ">=0.3.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function getApiKeyEnv(config: ScaffoldConfig): string {
  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
  };
  return envMap[config.model.provider] || "API_KEY";
}

function getLangChainPackage(config: ScaffoldConfig): string {
  const pkgMap: Record<string, string> = {
    openai: "langchain-openai",
    anthropic: "langchain-anthropic",
    google: "langchain-google-genai",
  };
  return pkgMap[config.model.provider] || "langchain-openai";
}

function getLLMImport(config: ScaffoldConfig): string {
  const importMap: Record<string, string> = {
    openai: "from langchain_openai import ChatOpenAI",
    anthropic: "from langchain_anthropic import ChatAnthropic",
    google: "from langchain_google_genai import ChatGoogleGenerativeAI",
  };
  return importMap[config.model.provider] || "from langchain_openai import ChatOpenAI";
}

function getLLMClass(config: ScaffoldConfig): string {
  const classMap: Record<string, string> = {
    openai: "ChatOpenAI",
    anthropic: "ChatAnthropic",
    google: "ChatGoogleGenerativeAI",
  };
  return classMap[config.model.provider] || "ChatOpenAI";
}

function generateAgentFile(config: ScaffoldConfig, _agentName = "agent"): string {
  const model = config.model.model || "gpt-4o";
  const maxIterations = config.guardrails?.behavior?.max_iterations || 20;
  const llmImport = getLLMImport(config);
  const llmClass = getLLMClass(config);

  return `"""
${config.projectName} — Built with AgentVoy
https://github.com/agentvoy

LangGraph agent with a stateful agentic loop.
"""

import os
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
${llmImport}

from state import AgentState
from tools import get_tools


def create_graph(model_override: str | None = None):
    """Build the agent state graph."""
    tools = get_tools()
    llm = ${llmClass}(model=model_override or os.environ.get("DEFAULT_MODEL", "${model}")).bind_tools(tools)
    tool_node = ToolNode(tools)

    def should_continue(state: AgentState) -> str:
        """Route: call tools or finish."""
        messages = state["messages"]
        last = messages[-1]
        if last.tool_calls:
            return "tools"
        return END

    def call_model(state: AgentState) -> dict:
        """Call the LLM with current messages."""
        messages = state["messages"]
        iteration = state.get("iteration", 0)

        if iteration >= ${maxIterations}:
            from langchain_core.messages import AIMessage
            return {
                "messages": [AIMessage(content="Max iterations reached.")],
                "iteration": iteration,
            }

        response = llm.invoke(messages)
        return {
            "messages": [response],
            "iteration": iteration + 1,
        }

    # Build the graph
    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    return graph.compile()


def run_agent(prompt: str, model: str | None = None) -> str:
    """Run the agent graph with a user prompt."""
    import time

    try:
        from src.trace.tracer import tracer
    except ImportError:
        tracer = None

    _model = model or os.environ.get("DEFAULT_MODEL", "${model}")
    if tracer:
        tracer.agent_start("${config.projectName}", prompt, _model)

    app = create_graph(model_override=model)

    initial_state = {
        "messages": [HumanMessage(content=prompt)],
        "iteration": 0,
    }

    t0 = time.time()
    final_state = app.invoke(initial_state)
    if tracer:
        tracer.llm_call(_model, latency=round(time.time() - t0, 2),
                        prompt_preview=prompt)
    messages = final_state["messages"]

    # Return the last AI message text
    for msg in reversed(messages):
        if hasattr(msg, "content") and isinstance(msg.content, str):
            if tracer:
                tracer.agent_complete("${config.projectName}", msg.content)
            return msg.content

    return "Done."
`;
}

function generateStateFile(_config: ScaffoldConfig, _agentName = "agent"): string {
  return `"""
Agent state definition for LangGraph.
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    """State passed between nodes in the graph."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    iteration: int
`;
}

function generateToolsFile(): string {
  return `"""
Agent tools — add your custom tools here.
LangGraph uses @tool decorated functions from langchain_core.
"""

from langchain_core.tools import tool


@tool
def search_web(query: str) -> str:
    """Search the web for information on a given topic.

    Args:
        query: The search query.
    """
    # TODO: Implement your search logic (e.g., Tavily, Serper, Brave Search)
    # Example with Tavily:
    # from tavily import TavilyClient
    # client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
    # return client.search(query)["results"][0]["content"]
    return f"Search results for: {query}"


@tool
def read_file(path: str) -> str:
    """Read the contents of a file.

    Args:
        path: Path to the file to read.
    """
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

from dotenv import load_dotenv
from agentvoy_guard import Guard
from agent import run_agent

load_dotenv()

guard = Guard.from_config()


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
            with guard.session() as session:
                session.check_input(prompt)
                result = run_agent(prompt)
                session.check_output(result)
            print(f"\\n{result}\\n")
            print(f"[guard] {guard.last_summary}")
        except KeyboardInterrupt:
            print("\\n\\nGoodbye!")
            break


if __name__ == "__main__":
    main()
`;
}

function generateRequirements(config: ScaffoldConfig): string {
  const langchainPkg = getLangChainPackage(config);
  return `langgraph>=0.2.0
langchain>=0.3.0
langchain-core>=0.3.0
${langchainPkg}>=0.2.0
python-dotenv>=1.0.0
agentvoy-guard>=0.1.0
`;
}

function generateEnvExample(config: ScaffoldConfig): string {
  const envKey = getApiKeyEnv(config);
  return `${envKey}=your-api-key-here\nDEFAULT_MODEL=${config.model.model || "gpt-4o"}\n`;
}
