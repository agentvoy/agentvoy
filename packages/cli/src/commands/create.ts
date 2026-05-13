/**
 * agentvoy create <name> — Scaffold a new agent or agentic app
 */

import { Command } from "commander";
import { input, select, number } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  getAdapter,
  listAdapters,
  listDeployers,
  generateServerPy,
  generateStreamlitApp,
  generatePipelinePy,
  type Framework,
  type ModelProvider,
  type ModelConfig,
  type BuildMode,
  type AgentMode,
  type DeploymentTarget,
} from "@agentvoy/core";

interface CreateOptions {
  framework?: Framework;
  model?: string;
  provider?: ModelProvider;
  buildMode?: BuildMode;
  agentMode?: AgentMode;
  deployTarget?: DeploymentTarget;
  yes?: boolean;
}

const defaultModels: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.0-flash",
  ollama: "llama3",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
};

const providerChoices: { name: string; value: ModelProvider }[] = [
  { name: "OpenAI (GPT-4o, o1, etc.)", value: "openai" },
  { name: "Anthropic (Claude)", value: "anthropic" },
  { name: "Google (Gemini)", value: "google" },
  { name: "Ollama (Local models)", value: "ollama" },
  { name: "Groq", value: "groq" },
  { name: "Mistral", value: "mistral" },
];

export const createCommand = new Command("create")
  .argument("[name]", "Name of the project")
  .option("-f, --framework <framework>", "Agent framework to use")
  .option("-m, --model <model>", "LLM model to use")
  .option("-p, --provider <provider>", "Model provider")
  .option("-b, --build-mode <mode>", "Build mode: agent or app")
  .option("--agent-mode <mode>", "Agent mode for apps: single or multi")
  .option("--deploy-target <target>", "Deployment target for apps")
  .option("-y, --yes", "Skip prompts and use defaults (agent mode)")
  .description("Create a new agent or agentic app")
  .action(async (name: string | undefined, options: CreateOptions) => {
    console.log("");
    console.log(chalk.bold("  AgentVoy") + chalk.dim(" — The universal AI agent platform"));
    console.log("");

    // ── Project name ──────────────────────────────────────────────
    const baseName =
      name ||
      (await input({
        message: "Project name:",
        default: "my-project",
        validate: (val) => {
          if (!val.trim()) return "Project name is required";
          if (!/^[a-z0-9-_]+$/.test(val))
            return "Use lowercase letters, numbers, hyphens, and underscores only";
          return true;
        },
      }));

    // ── Build mode ────────────────────────────────────────────────
    const buildMode: BuildMode = (options.buildMode as BuildMode) ||
      (options.yes
        ? "agent"
        : await select({
            message: "What do you want to build?",
            choices: [
              {
                name: "Agent — Local agent for development & experimentation",
                value: "agent",
                description: "Scaffolds agent.py, tools.py, run.py, agent.guard.yml",
              },
              {
                name: "App — Deployable agentic app (API + UI + Docker + cloud)",
                value: "app",
                description: "Scaffolds src/ structure, FastAPI server, Streamlit chat UI, Dockerfile",
              },
            ],
          }));

    // Suffix the project name based on mode
    const projectName = `${baseName}-${buildMode}`;
    const projectDir = resolve(process.cwd(), projectName);

    if (existsSync(projectDir)) {
      console.log(chalk.red(`\n  Error: Directory "${projectName}" already exists.\n`));
      process.exit(1);
    }

    // ── App-specific options ──────────────────────────────────────
    let agentMode: AgentMode = "single";
    let agentNames: string[] = ["agent"];
    let deployTarget: DeploymentTarget = "docker";

    if (buildMode === "app") {
      agentMode = (options.agentMode as AgentMode) || await select({
        message: "Single agent or multi-agent pipeline?",
        choices: [
          {
            name: "Single agent — One agent powering the app",
            value: "single",
            description: "Simpler, faster to build",
          },
          {
            name: "Multi-agent — Multiple agents in a sequential pipeline",
            value: "multi",
            description: "Each agent builds on the previous stage's output",
          },
        ],
      });

      if (agentMode === "multi") {
        const defaultAgentNames = ["researcher", "writer", "reviewer"];
        if (options.yes) {
          agentNames = defaultAgentNames;
        } else {
          const agentCount =
            (await number({
              message: "How many agents in the pipeline? (2–5):",
              default: 3,
              validate: (v) => {
                if (!v || v < 2) return "At least 2 agents required";
                if (v > 5) return "Maximum 5 agents";
                return true;
              },
            })) ?? 3;

          agentNames = [];
          for (let i = 1; i <= agentCount; i++) {
            const agentName = await input({
              message: `Agent ${i} name:`,
              default: ["researcher", "writer", "reviewer", "validator", "publisher"][i - 1] ?? `agent${i}`,
              validate: (val) => {
                if (!/^[a-z0-9_]+$/.test(val))
                  return "Use lowercase letters, numbers, underscores only";
                return true;
              },
            });
            agentNames.push(agentName);
          }
        }
      }

      // Deployment target
      const deployers = listDeployers();
      deployTarget = (options.deployTarget as DeploymentTarget) || await select({
        message: "Deployment target:",
        choices: deployers.map((d) => ({
          name: d.displayName,
          value: d.target,
          description: d.requiredCLI ? `Requires: ${d.requiredCLI}` : undefined,
        })),
      });
    }

    // ── Framework ─────────────────────────────────────────────────
    const adapters = listAdapters();
    const framework: Framework =
      (options.framework as Framework) ||
      (options.yes
        ? "openai"
        : await select({
            message: "Choose a framework:",
            choices: adapters.map((a) => ({
              name: `${a.displayName} (${a.language})`,
              value: a.name,
              description: `Scaffold with ${a.displayName}`,
            })),
          }));

    // ── Provider ──────────────────────────────────────────────────
    const provider: ModelProvider =
      (options.provider as ModelProvider) ||
      (options.yes
        ? "openai"
        : await select({
            message: "Choose a model provider:",
            choices: providerChoices,
          }));

    // ── Model ─────────────────────────────────────────────────────
    const model =
      options.model ||
      (options.yes
        ? defaultModels[provider] || "gpt-4o"
        : await input({
            message: "Model name:",
            default: defaultModels[provider] || "gpt-4o",
          }));

    // ── Scaffold ──────────────────────────────────────────────────
    const spinner = ora(
      `Creating ${buildMode === "app" ? "agentic app" : "agent"} project...`
    ).start();

    try {
      const adapter = getAdapter(framework);
      const modelConfig: ModelConfig = {
        provider,
        model,
        api_key_env: `${provider.toUpperCase()}_API_KEY`,
      };

      const result = await adapter.scaffold({
        projectName,
        projectDir,
        framework,
        model: modelConfig,
        buildMode,
        agentMode,
        agentNames,
        deployTarget,
      });

      // Create project directory
      mkdirSync(projectDir, { recursive: true });

      // Write all files from the adapter
      for (const file of result.files) {
        const filePath = join(projectDir, file.path);
        const dirPath = join(projectDir, file.path.split("/").slice(0, -1).join("/"));
        if (dirPath !== projectDir) {
          mkdirSync(dirPath, { recursive: true });
        }
        writeFileSync(filePath, file.content);
      }

      // For app mode: write extra deployment files
      if (buildMode === "app") {
        const port = 8080;

        // server.py
        const serverPy = generateServerPy({ projectName, framework, agentMode, agentNames, port });
        writeFileSync(join(projectDir, "server.py"), serverPy);

        // streamlit_app.py
        const streamlitApp = generateStreamlitApp({ projectName, agentMode, agentNames, port });
        writeFileSync(join(projectDir, "streamlit_app.py"), streamlitApp);

        // pipeline.py for multi-agent
        if (agentMode === "multi") {
          const pipelinePy = generatePipelinePy({ projectName, framework, agentNames });
          const srcDir = join(projectDir, "src");
          mkdirSync(srcDir, { recursive: true });
          writeFileSync(join(srcDir, "pipeline.py"), pipelinePy);
        }

        // Docker + target-specific files
        const { getDeployer } = await import("@agentvoy/core");
        const { loadConfig } = await import("@agentvoy/core");
        const deployer = getDeployer(deployTarget);

        // Load the guard config that was just written
        let guard;
        try {
          guard = loadConfig(projectDir);
        } catch {
          // Use a minimal guard config if loadConfig fails (e.g. YAML not written yet)
          guard = {
            version: "1.0",
            identity: { name: projectName },
            model: modelConfig,
            permissions: { execution: { allow_shell: false } },
            guardrails: { behavior: { timeout: "5m", cost_limit: "$1.00" } },
          } as never;
        }

        const deployResult = await deployer.generateFiles({
          projectName,
          projectDir,
          target: deployTarget,
          framework,
          guard,
          port,
          envVars: [`${provider.toUpperCase()}_API_KEY`],
        });

        for (const file of deployResult.files) {
          const filePath = join(projectDir, file.path);
          const dirPath = join(projectDir, file.path.split("/").slice(0, -1).join("/"));
          if (dirPath !== projectDir) {
            mkdirSync(dirPath, { recursive: true });
          }
          writeFileSync(filePath, file.content);
        }
      }

      // .gitignore
      writeFileSync(
        join(projectDir, ".gitignore"),
        [
          "node_modules/",
          "__pycache__/",
          "*.pyc",
          ".env",
          ".venv/",
          "venv/",
          "dist/",
          ".DS_Store",
          "",
        ].join("\n")
      );

      spinner.succeed(chalk.green(`${projectName}/ created!`));

      // ── Next steps ──────────────────────────────────────────────
      console.log("");
      console.log(chalk.bold("  Next steps:"));
      console.log("");
      console.log(chalk.dim(`  cd ${projectName}`));

      if (buildMode === "app") {
        // App-mode next steps
        console.log(chalk.dim("  pip install -r requirements.txt"));
        console.log(chalk.dim("  cp .env.example .env  # add your API key"));
        console.log("");
        console.log(chalk.bold("  Run locally:"));
        console.log(chalk.dim("  uvicorn server:app --reload --port 8080"));
        console.log(chalk.dim("  streamlit run streamlit_app.py  # in a second terminal"));
        console.log("");
        console.log(chalk.bold("  Deploy:"));
        const deployer = listDeployers().find((d) => d.target === deployTarget);
        const { getDeployer } = await import("@agentvoy/core");
        const depResult = await getDeployer(deployTarget).generateFiles({
          projectName,
          projectDir,
          target: deployTarget,
          framework,
          guard: {} as never,
          port: 8080,
          envVars: [],
        });
        for (const instruction of depResult.instructions) {
          console.log(chalk.dim(`  ${instruction}`));
        }
      } else {
        // Agent-mode next steps
        if (result.postInstallInstructions) {
          for (const instruction of result.postInstallInstructions) {
            console.log(chalk.dim(`  ${instruction}`));
          }
        }
      }

      console.log("");
      console.log(
        chalk.dim("  Edit ") +
          chalk.cyan("agent.guard.yml") +
          chalk.dim(" to configure guardrails, permissions, and model settings.")
      );
      console.log("");
    } catch (error) {
      spinner.fail(chalk.red("Failed to create project"));
      console.error(error);
      process.exit(1);
    }
  });
