/**
 * agentvoy list — List supported frameworks and models
 */

import { Command } from "commander";
import chalk from "chalk";
import { listAdapters, listDeployers } from "@agentvoy/core";

export const listCommand = new Command("list")
  .description("List supported frameworks and model providers")
  .action(async () => {
    console.log("");
    console.log(chalk.bold("  Supported Frameworks:"));
    console.log("");

    const adapters = listAdapters();
    for (const adapter of adapters) {
      console.log(
        `  ${chalk.cyan(adapter.name.padEnd(15))} ${adapter.displayName} (${adapter.language})`
      );
    }

    console.log("");
    console.log(chalk.bold("  Supported Model Providers:"));
    console.log("");

    const providers = [
      { name: "openai", display: "OpenAI", models: "gpt-4o, o1, gpt-4-turbo" },
      { name: "anthropic", display: "Anthropic", models: "claude-opus-4-20250514, claude-sonnet-4-20250514" },
      { name: "google", display: "Google", models: "gemini-2.0-flash, gemini-2.5-pro" },
      { name: "ollama", display: "Ollama", models: "llama3, mistral, codellama (local)" },
      { name: "groq", display: "Groq", models: "llama-3.3-70b-versatile" },
      { name: "mistral", display: "Mistral", models: "mistral-large-latest" },
    ];

    for (const p of providers) {
      console.log(
        `  ${chalk.cyan(p.name.padEnd(15))} ${p.display} — ${chalk.dim(p.models)}`
      );
    }

    console.log("");
    console.log(chalk.bold("  Deployment Targets:"));
    console.log("");

    const deployers = listDeployers();
    for (const d of deployers) {
      const cli = d.requiredCLI ? chalk.dim(` (requires: ${d.requiredCLI})`) : "";
      console.log(`  ${chalk.cyan(d.target.padEnd(20))} ${d.displayName}${cli}`);
    }
    console.log("");
  });
