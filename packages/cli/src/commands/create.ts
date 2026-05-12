/**
 * agentvoy create <name> — Scaffold a new agent project
 */

import { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  getAdapter,
  listAdapters,
  type Framework,
  type ModelProvider,
  type ModelConfig,
} from "@agentvoy/core";

interface CreateOptions {
  framework?: Framework;
  model?: string;
  provider?: ModelProvider;
  yes?: boolean;
}

export const createCommand = new Command("create")
  .argument("[name]", "Name of the agent project")
  .option("-f, --framework <framework>", "Agent framework to use")
  .option("-m, --model <model>", "LLM model to use")
  .option("-p, --provider <provider>", "Model provider")
  .option("-y, --yes", "Skip prompts and use defaults")
  .description("Create a new agent project")
  .action(async (name: string | undefined, options: CreateOptions) => {
    console.log("");
    console.log(
      chalk.bold("  AgentVoy") + chalk.dim(" — Create a new agent project")
    );
    console.log("");

    // Get project name
    const projectName =
      name ||
      (await input({
        message: "Project name:",
        default: "my-agent",
        validate: (val) => {
          if (!val.trim()) return "Project name is required";
          if (!/^[a-z0-9-_]+$/.test(val))
            return "Use lowercase letters, numbers, hyphens, and underscores only";
          return true;
        },
      }));

    // Check if directory exists
    const projectDir = resolve(process.cwd(), projectName);
    if (existsSync(projectDir)) {
      console.log(
        chalk.red(`\n  Error: Directory "${projectName}" already exists.\n`)
      );
      process.exit(1);
    }

    // Get framework
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

    // Get model provider
    const providerChoices: { name: string; value: ModelProvider }[] = [
      { name: "OpenAI (GPT-4o, o1, etc.)", value: "openai" },
      { name: "Anthropic (Claude)", value: "anthropic" },
      { name: "Google (Gemini)", value: "google" },
      { name: "Ollama (Local models)", value: "ollama" },
      { name: "Groq", value: "groq" },
      { name: "Mistral", value: "mistral" },
    ];

    const provider: ModelProvider =
      (options.provider as ModelProvider) ||
      (options.yes
        ? "openai"
        : await select({
            message: "Choose a model provider:",
            choices: providerChoices,
          }));

    // Get model name
    const defaultModels: Record<string, string> = {
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
      google: "gemini-2.0-flash",
      ollama: "llama3",
      groq: "llama-3.3-70b-versatile",
      mistral: "mistral-large-latest",
    };

    const model =
      options.model ||
      (options.yes
        ? defaultModels[provider] || "gpt-4o"
        : await input({
            message: "Model name:",
            default: defaultModels[provider] || "gpt-4o",
          }));

    // Scaffold
    const spinner = ora("Creating your agent project...").start();

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
      });

      // Create project directory
      mkdirSync(projectDir, { recursive: true });

      // Write all files
      for (const file of result.files) {
        const filePath = join(projectDir, file.path);
        const dir = join(projectDir, file.path.split("/").slice(0, -1).join("/"));
        if (dir !== projectDir) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(filePath, file.content);
      }

      // Create .gitignore
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

      spinner.succeed(chalk.green("Project created!"));

      // Print next steps
      console.log("");
      console.log(chalk.bold("  Next steps:"));
      console.log("");
      console.log(chalk.dim(`  cd ${projectName}`));
      if (result.postInstallInstructions) {
        for (const instruction of result.postInstallInstructions) {
          console.log(chalk.dim(`  ${instruction}`));
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
