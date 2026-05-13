/**
 * Google Agent Development Kit (ADK) Adapter
 *
 * Scaffolds projects using Google's ADK (Python).
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

export const googleAdkAdapter: FrameworkAdapter = {
  name: "google-adk",
  displayName: "Google ADK",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const isApp = config.buildMode === "app";
    const agentDir = config.projectName.replace(/-/g, "_");
    const agentNames = config.agentNames ?? ["agent"];
    const files: GeneratedFile[] = [];

    if (isApp) {
      // Standard run_agent entry point for server.py
      files.push({ path: "src/agents/agent.py", content: generateAppAgentEntry(config) });
      for (const agentName of agentNames) {
        files.push({ path: `src/agents/${agentName}_adk/__init__.py`, content: "" });
        files.push({ path: `src/agents/${agentName}_adk/agent.py`, content: generateAgentFile(config) });
        files.push({ path: `src/agents/${agentName}_adk/tools.py`, content: generateToolsFile(config) });
      }
      for (const f of generateAppInfraFiles(config)) files.push(f);
    } else {
      files.push({ path: `${agentDir}/__init__.py`, content: "" });
      files.push({ path: `${agentDir}/agent.py`, content: generateAgentFile(config) });
      files.push({ path: `${agentDir}/tools.py`, content: generateToolsFile(config) });
    }

    const baseReqs = `google-adk>=0.5.0\npython-dotenv>=1.0.0\nagentvoy-guard>=0.1.0\n`;
    files.push({ path: "requirements.txt", content: isApp ? appendAppRequirements(baseReqs) : baseReqs });
    files.push({ path: ".env.example", content: "GOOGLE_API_KEY=your-api-key-here\n" });
    files.push({
      path: "agent.guard.yml",
      content: generateDefaultConfig(config.projectName, "google", config.model.model || "gemini-2.0-flash"),
    });

    return {
      files,
      dependencies: {},
      devDependencies: {},
      scripts: isApp
        ? { start: "uvicorn server:app --reload --port 8080" }
        : { start: `adk run ${agentDir}`, web: `adk web ${agentDir}` },
      postInstallInstructions: isApp
        ? appPostInstallInstructions("GOOGLE_API_KEY")
        : ["pip install -r requirements.txt", "cp .env.example .env", "Add your GOOGLE_API_KEY to .env", `adk run ${agentDir}`, `Or use the web UI: adk web ${agentDir}`],
    };
  },

  validateConfig(config: AgentGuardConfig): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (config.model.provider !== "google") {
      warnings.push({
        field: "model.provider",
        message: `Google ADK works best with provider "google", got "${config.model.provider}"`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      "google-adk": ">=1.0.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function generateAppAgentEntry(config: ScaffoldConfig): string {
  return `"""
${config.projectName} — run_agent entry point for server.py
Wraps the Google ADK agent as a single callable.
"""

from dotenv import load_dotenv
load_dotenv()


def run_agent(prompt: str) -> str:
    """Run the Google ADK agent with the given prompt, enforcing agent.guard.yml."""
    from agentvoy_guard import Guard
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from src.agents.agent_adk.agent import root_agent

    guard = Guard.from_config()

    with guard.session() as session:
        session.check_input(prompt)

        session_service = InMemorySessionService()
        adk_session = session_service.create_session(app_name="${config.projectName}", user_id="user")
        runner = Runner(agent=root_agent, app_name="${config.projectName}", session_service=session_service)

        from google.genai import types
        content = types.Content(role="user", parts=[types.Part(text=prompt)])
        final = ""
        for event in runner.run(user_id="user", session_id=adk_session.id, new_message=content):
            if event.is_final_response() and event.content and event.content.parts:
                final = event.content.parts[0].text or ""

        session.check_output(final)

    print(f"[guard] {guard.last_summary}")
    return final
`;
}

function generateAgentFile(config: ScaffoldConfig): string {
  const model = config.model.model || "gemini-2.0-flash";

  return `"""
${config.projectName} — Built with AgentVoy
https://github.com/agentvoy
"""

from google.adk.agents import Agent
from .tools import search_web, read_file

root_agent = Agent(
    name="${config.projectName}",
    model="${model}",
    description="AI agent created with AgentVoy",
    instruction="""You are a helpful AI assistant.

Follow these guidelines:
- Be concise and accurate
- Ask for clarification when the request is ambiguous
- Respect the guardrails defined in agent.guard.yml
""",
    tools=[search_web, read_file],
)
`;
}

function generateToolsFile(_config: ScaffoldConfig): string {
  return `"""
Agent tools — add your custom tools here.
"""

from google.adk.tools import FunctionTool


def search_web(query: str) -> dict:
    """Search the web for information.

    Args:
        query: The search query string.

    Returns:
        A dictionary with search results.
    """
    # TODO: Implement your search logic
    return {"results": f"Search results for: {query}"}


def read_file(path: str) -> dict:
    """Read the contents of a file.

    Args:
        path: Path to the file to read.

    Returns:
        A dictionary with the file contents or an error message.
    """
    try:
        with open(path, "r") as f:
            return {"content": f.read()}
    except FileNotFoundError:
        return {"error": f"File not found: {path}"}
    except PermissionError:
        return {"error": f"Permission denied: {path}"}
`;
}

function generateRequirements(): string {
  return `google-adk>=1.0.0
python-dotenv>=1.0.0
agentvoy-guard>=0.1.0
`;
}
