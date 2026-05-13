/**
 * agentvoy deploy — Deploy an existing agent project to the cloud
 */

import { Command } from "commander";
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  listDeployers,
  getDeployer,
  loadConfig,
  describeGuardMapping,
  generateServerPy,
  generateStreamlitApp,
  type DeploymentTarget,
  type Framework,
} from "@agentvoy/core";

interface DeployOptions {
  target?: DeploymentTarget;
  port?: number;
  yes?: boolean;
  dryRun?: boolean;
}

export const deployCommand = new Command("deploy")
  .description("Deploy your agent to the cloud")
  .option("-t, --target <target>", "Deployment target (docker, fly-io, railway, gcp-cloud-run, aws-lambda)")
  .option("-p, --port <port>", "Port to expose", "8080")
  .option("-y, --yes", "Skip prompts and use docker as default target")
  .option("--dry-run", "Generate deployment files without executing deploy")
  .action(async (options: DeployOptions) => {
    console.log("");
    console.log(chalk.bold("  AgentVoy") + chalk.dim(" — Deploy your agent to the cloud"));
    console.log("");

    const projectDir = resolve(process.cwd());
    const port = Number(options.port) || 8080;

    // Load agent.guard.yml
    let guard;
    try {
      guard = loadConfig(projectDir);
    } catch {
      console.log(chalk.red("  Error: No agent.guard.yml found in the current directory."));
      console.log(chalk.dim("  Run this command from inside your agent project, or run agentvoy init first."));
      process.exit(1);
    }

    // Detect framework from project structure (best-effort)
    const framework = detectFramework(projectDir);

    // Choose deployment target
    const deployers = listDeployers();
    const target: DeploymentTarget = options.target as DeploymentTarget ||
      (options.yes
        ? "docker"
        : await select({
            message: "Choose a deployment target:",
            choices: deployers.map((d) => ({
              name: d.displayName,
              value: d.target,
              description: d.requiredCLI ? `Requires CLI: ${d.requiredCLI}` : undefined,
            })),
          }));

    const spinner = ora("Generating deployment files...").start();

    try {
      const deployer = getDeployer(target);

      // Validate
      const validation = await deployer.validate({
        projectName: guard.identity?.name || "agent",
        projectDir,
        target,
        framework,
        guard,
        port,
        envVars: [],
      });

      if (validation.missingTools && validation.missingTools.length > 0) {
        spinner.warn(chalk.yellow(`Missing tools: ${validation.missingTools.join(", ")}`));
        for (const w of validation.warnings) {
          console.log(chalk.dim(`  ${w.message}`));
        }
      }

      // Generate server.py and streamlit_app.py if not present
      const serverPath = join(projectDir, "server.py");
      const streamlitPath = join(projectDir, "streamlit_app.py");

      if (!existsSync(serverPath)) {
        const serverPy = generateServerPy({
          projectName: guard.identity?.name || "agent",
          framework,
          agentMode: "single",
          port,
        });
        writeFileSync(serverPath, serverPy);
        spinner.text = "Generating deployment files... server.py";
      }

      if (!existsSync(streamlitPath)) {
        const streamlitApp = generateStreamlitApp({
          projectName: guard.identity?.name || "agent",
          agentMode: "single",
          port,
        });
        writeFileSync(streamlitPath, streamlitApp);
        spinner.text = "Generating deployment files... streamlit_app.py";
      }

      // Generate target-specific files
      const result = await deployer.generateFiles({
        projectName: guard.identity?.name || "agent",
        projectDir,
        target,
        framework,
        guard,
        port,
        envVars: [],
      });

      for (const file of result.files) {
        const filePath = join(projectDir, file.path);
        const dirPath = join(projectDir, file.path.split("/").slice(0, -1).join("/"));
        if (dirPath !== projectDir) {
          mkdirSync(dirPath, { recursive: true });
        }
        writeFileSync(filePath, file.content);
      }

      spinner.succeed(chalk.green("Deployment files generated!"));

      // Show guard → cloud mapping
      const mappings = describeGuardMapping(guard);
      if (mappings.length > 0) {
        console.log("");
        console.log(chalk.bold("  agent.guard.yml → deployment config:"));
        for (const m of mappings) {
          console.log(chalk.dim(`  ✓ ${m}`));
        }
      }

      // Show next steps
      console.log("");
      console.log(chalk.bold("  Generated files:"));
      if (!existsSync(join(projectDir, "server.py"))) console.log(chalk.dim("  server.py"));
      if (!existsSync(join(projectDir, "streamlit_app.py"))) console.log(chalk.dim("  streamlit_app.py"));
      for (const file of result.files) {
        console.log(chalk.dim(`  ${file.path}`));
      }

      console.log("");
      console.log(chalk.bold("  Next steps:"));
      for (const instruction of result.instructions) {
        console.log(chalk.dim(`  ${instruction}`));
      }
      console.log("");
    } catch (error) {
      spinner.fail(chalk.red("Failed to generate deployment files"));
      console.error(error);
      process.exit(1);
    }
  });

/** Best-effort framework detection from project files */
function detectFramework(projectDir: string): Framework {
  const { existsSync } = require("node:fs");
  const { join } = require("node:path");

  if (existsSync(join(projectDir, "crew.py")) || existsSync(join(projectDir, "src/agents/crew.py"))) return "crewai";
  if (existsSync(join(projectDir, "state.py"))) return "langgraph";

  // Check requirements.txt for framework hints
  const reqPath = join(projectDir, "requirements.txt");
  if (existsSync(reqPath)) {
    const { readFileSync } = require("node:fs");
    const reqs = readFileSync(reqPath, "utf-8");
    if (reqs.includes("google-adk")) return "google-adk";
    if (reqs.includes("crewai")) return "crewai";
    if (reqs.includes("langgraph")) return "langgraph";
    if (reqs.includes("anthropic")) return "anthropic";
    if (reqs.includes("openai-agents")) return "openai";
  }

  return "openai"; // safe default
}
