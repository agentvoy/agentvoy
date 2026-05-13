/**
 * CrewAI Adapter
 *
 * Scaffolds projects using CrewAI (Python).
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

export const crewaiAdapter: FrameworkAdapter = {
  name: "crewai",
  displayName: "CrewAI",
  language: "python",

  async scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
    const isApp = config.buildMode === "app";
    const files: GeneratedFile[] = [];

    if (isApp) {
      // In app mode, expose a run_agent() entry point via crew
      files.push({ path: "src/agents/crew.py", content: generateCrewFile(config, true) });
      files.push({ path: "src/agents/agents.py", content: generateAgentsFile(config) });
      files.push({ path: "src/agents/tasks.py", content: generateTasksFile(config) });
      files.push({ path: "src/tools/tools.py", content: generateToolsFile() });
      for (const f of generateAppInfraFiles(config)) files.push(f);
    } else {
      files.push({ path: "crew.py", content: generateCrewFile(config, false) });
      files.push({ path: "agents.py", content: generateAgentsFile(config) });
      files.push({ path: "tasks.py", content: generateTasksFile(config) });
      files.push({ path: "tools.py", content: generateToolsFile() });
      files.push({ path: "run.py", content: generateRunFile(config) });
    }

    const baseReqs = `crewai>=0.80.0\npython-dotenv>=1.0.0\nagentvoy-guard>=0.1.0\n`;
    files.push({ path: "requirements.txt", content: isApp ? appendAppRequirements(baseReqs) : baseReqs });
    files.push({ path: ".env.example", content: generateEnvExample(config) });
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
        : ["pip install -r requirements.txt", "cp .env.example .env", "Add your API key to .env", "python run.py"],
    };
  },

  validateConfig(config: AgentGuardConfig): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    const supported = ["openai", "anthropic", "google", "ollama", "groq"];
    if (!supported.includes(config.model.provider)) {
      warnings.push({
        field: "model.provider",
        message: `CrewAI supports: ${supported.join(", ")}. Got "${config.model.provider}" — this may require additional configuration.`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  getDependencies() {
    return {
      crewai: ">=0.80.0",
      "crewai-tools": ">=0.14.0",
      "python-dotenv": ">=1.0.0",
    };
  },
};

function generateCrewFile(config: ScaffoldConfig, _isApp = false): string {
  return `"""
${config.projectName} Crew — Built with AgentVoy
https://github.com/agentvoy
"""

from crewai import Crew, Process
from agents import researcher, writer
from tasks import research_task, write_task


def create_crew() -> Crew:
    """Create the crew with AgentVoy guardrails."""
    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, write_task],
        process=Process.sequential,
        verbose=True,
    )
    return crew
`;
}

function generateAgentsFile(config: ScaffoldConfig): string {
  const model = config.model.model || "gpt-4o";

  return `"""
Agent definitions for ${config.projectName}.
"""

from crewai import Agent
from tools import search_tool


researcher = Agent(
    role="Research Analyst",
    goal="Find accurate and comprehensive information on the given topic",
    backstory="""You are an experienced research analyst with a keen eye
for detail. You excel at finding relevant information and synthesizing
it into clear insights.""",
    tools=[search_tool],
    llm="${model}",
    verbose=True,
)

writer = Agent(
    role="Content Writer",
    goal="Create clear, engaging content based on research findings",
    backstory="""You are a skilled writer who transforms complex research
into readable, well-structured content. You focus on clarity and
accuracy.""",
    llm="${model}",
    verbose=True,
)
`;
}

function generateTasksFile(config: ScaffoldConfig): string {
  return `"""
Task definitions for ${config.projectName}.
"""

from crewai import Task
from agents import researcher, writer


research_task = Task(
    description="""Research the following topic thoroughly: {topic}

    Provide:
    - Key facts and findings
    - Relevant statistics
    - Expert opinions or notable perspectives
    """,
    expected_output="A detailed research summary with key findings and sources.",
    agent=researcher,
)

write_task = Task(
    description="""Using the research provided, write a clear and engaging
    summary about: {topic}

    The output should be well-structured and accessible to a general audience.
    """,
    expected_output="A well-written article or summary based on the research.",
    agent=writer,
)
`;
}

function generateToolsFile(): string {
  return `"""
Agent tools — add your custom tools here.
"""

from crewai.tools import tool


@tool("Search")
def search_tool(query: str) -> str:
    """Search for information on a given topic."""
    # TODO: Implement your search logic (e.g., using SerperDev, Tavily, etc.)
    return f"Search results for: {query}"
`;
}

function generateRunFile(config: ScaffoldConfig): string {
  return `"""
Run the ${config.projectName} crew.
"""

from dotenv import load_dotenv
from crew import create_crew

load_dotenv()


def main():
    print("\\n🚀 ${config.projectName} — Powered by AgentVoy")
    print("=" * 50)

    from agentvoy_guard import Guard
    guard = Guard.from_config()

    topic = input("\\nEnter a topic to research: ")
    if not topic.strip():
        print("No topic provided. Exiting.")
        return

    with guard.session() as session:
        session.check_input(topic)
        crew = create_crew()
        result = crew.kickoff(inputs={"topic": topic})
        session.check_output(str(result))

    print("\\n" + "=" * 50)
    print("RESULT:")
    print("=" * 50)
    print(result)
    print(f"\\n[guard] {guard.last_summary}")


if __name__ == "__main__":
    main()
`;
}

function generateRequirements(): string {
  return `crewai>=0.80.0
crewai-tools>=0.14.0
python-dotenv>=1.0.0
agentvoy-guard>=0.1.0
`;
}

function generateEnvExample(config: ScaffoldConfig): string {
  const envVar =
    config.model.api_key_env ||
    `${config.model.provider.toUpperCase()}_API_KEY`;
  return `${envVar}=your-api-key-here\n`;
}
