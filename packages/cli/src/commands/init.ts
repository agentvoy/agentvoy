/**
 * agentvoy init — Initialize agent.guard.yml in the current project
 */

import { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateDefaultConfig,
  findConfigFile,
  type ModelProvider,
} from "@agentvoy/core";

export const initCommand = new Command("init")
  .description("Initialize an agent.guard.yml config in the current directory")
  .option("-y, --yes", "Use defaults without prompting")
  .action(async (options: { yes?: boolean }) => {
    const cwd = process.cwd();
    const existingConfig = findConfigFile(cwd);

    if (existingConfig) {
      console.log(
        chalk.yellow(`\n  agent.guard.yml already exists at ${existingConfig}\n`)
      );
      return;
    }

    let agentName: string;
    let provider: string;
    let model: string;

    if (options.yes) {
      agentName = "my-agent";
      provider = "openai";
      model = "gpt-4o";
    } else {
      agentName = await input({
        message: "Agent name:",
        default: "my-agent",
      });

      provider = await select({
        message: "Model provider:",
        choices: [
          { name: "OpenAI", value: "openai" },
          { name: "Anthropic", value: "anthropic" },
          { name: "Google", value: "google" },
          { name: "Ollama (local)", value: "ollama" },
          { name: "Groq", value: "groq" },
          { name: "Mistral", value: "mistral" },
        ],
      });

      const defaultModels: Record<string, string> = {
        openai: "gpt-4o",
        anthropic: "claude-sonnet-4-20250514",
        google: "gemini-2.0-flash",
        ollama: "llama3",
        groq: "llama-3.3-70b-versatile",
        mistral: "mistral-large-latest",
      };

      model = await input({
        message: "Model name:",
        default: defaultModels[provider] || "gpt-4o",
      });
    }

    const configContent = generateDefaultConfig(agentName, provider, model);
    const configPath = resolve(cwd, "agent.guard.yml");
    writeFileSync(configPath, configContent);

    console.log(chalk.green(`\n  Created agent.guard.yml`));
    console.log(
      chalk.dim("  Edit this file to configure guardrails, permissions, and model settings.\n")
    );
  });
