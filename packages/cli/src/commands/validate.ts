/**
 * agentvoy validate — Validate the agent.guard.yml config
 */

import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, validateConfig, findConfigFile, ConfigError } from "@agentvoy/core";

export const validateCommand = new Command("validate")
  .description("Validate the agent.guard.yml config file")
  .option("-p, --path <path>", "Path to project directory", process.cwd())
  .action(async (options: { path: string }) => {
    console.log("");

    const configPath = findConfigFile(options.path);
    if (!configPath) {
      console.log(
        chalk.red("  No agent.guard.yml found in this directory.\n")
      );
      console.log(chalk.dim("  Run 'agentvoy init' to create one.\n"));
      process.exit(1);
    }

    try {
      const config = loadConfig(options.path);
      const result = validateConfig(config);

      if (result.valid && result.warnings.length === 0) {
        console.log(chalk.green("  agent.guard.yml is valid!\n"));
      } else if (result.valid) {
        console.log(chalk.green("  agent.guard.yml is valid") + chalk.yellow(" (with warnings)\n"));
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  Warning: ${warning.field} — ${warning.message}`));
        }
        console.log("");
      } else {
        console.log(chalk.red("  agent.guard.yml has errors:\n"));
        for (const error of result.errors) {
          console.log(chalk.red(`  Error: ${error.field} — ${error.message}`));
        }
        console.log("");
        process.exit(1);
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        console.log(chalk.red(`  ${error.message}\n`));
      } else {
        console.log(chalk.red(`  Unexpected error: ${error}\n`));
      }
      process.exit(1);
    }
  });
