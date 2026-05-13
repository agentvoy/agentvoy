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

export const googleAdkAdapter: FrameworkAdapter = {
  name: "google-adk",
  displayName: "Google ADK",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const agentDir = config.projectName.replace(/-/g, "_");

    const files: GeneratedFile[] = [
      {
        path: `${agentDir}/__init__.py`,
        content: "",
      },
      {
        path: `${agentDir}/agent.py`,
        content: generateAgentFile(config),
      },
      {
        path: `${agentDir}/tools.py`,
        content: generateToolsFile(config),
      },
      {
        path: "requirements.txt",
        content: generateRequirements(),
      },
      {
        path: ".env.example",
        content: "GOOGLE_API_KEY=your-api-key-here\n",
      },
      {
        path: "agent.guard.yml",
        content: generateDefaultConfig(
          config.projectName,
          "google",
          config.model.model || "gemini-2.0-flash"
        ),
      },
    ];

    return {
      files,
      dependencies: {},
      devDependencies: {},
      scripts: {
        start: `adk run ${agentDir}`,
        web: `adk web ${agentDir}`,
      },
      postInstallInstructions: [
        "pip install -r requirements.txt",
        "cp .env.example .env",
        "Add your GOOGLE_API_KEY to .env",
        `adk run ${agentDir}`,
        `Or use the web UI: adk web ${agentDir}`,
      ],
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
