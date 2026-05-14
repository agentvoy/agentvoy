/**
 * agentvoy deploy — Deploy an existing agent project to the cloud
 *
 * Supports two modes:
 *   --dry-run (default for non-docker): generate deployment files only
 *   (default for docker): build and run the container
 *   fly-io: deploy to Fly.io via flyctl
 */

import { Command } from "commander";
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
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
    console.log(chalk.bold("  AgentVoy Deploy"));
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

    // Detect framework from project structure
    const framework = detectFramework(projectDir);
    const projectName = guard.identity?.name || "agent";

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
        projectName,
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
          projectName,
          framework,
          agentMode: "single",
          port,
        });
        writeFileSync(serverPath, serverPy);
      }

      if (!existsSync(streamlitPath)) {
        const streamlitApp = generateStreamlitApp({
          projectName,
          agentMode: "single",
          port,
        });
        writeFileSync(streamlitPath, streamlitApp);
      }

      // Generate target-specific files
      const result = await deployer.generateFiles({
        projectName,
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

      // Show generated files
      console.log("");
      console.log(chalk.bold("  Generated files:"));
      for (const file of result.files) {
        console.log(chalk.dim(`  ${file.path}`));
      }

      // ── Actual deployment ──────────────────────────────────────
      if (options.dryRun) {
        console.log("");
        console.log(chalk.dim("  --dry-run: skipping actual deployment"));
        console.log("");
        console.log(chalk.bold("  Next steps:"));
        for (const instruction of result.instructions) {
          console.log(chalk.dim(`  ${instruction}`));
        }
        console.log("");
        return;
      }

      // Docker: build and run
      if (target === "docker") {
        console.log("");
        const buildSpinner = ora("Building Docker image...").start();

        const buildResult = spawnSync("docker", ["build", "-t", projectName, "."], {
          cwd: projectDir,
          stdio: "pipe",
          encoding: "utf-8",
        });

        if (buildResult.status !== 0) {
          buildSpinner.fail(chalk.red("Docker build failed"));
          if (buildResult.stderr) console.error(chalk.dim(buildResult.stderr.slice(-500)));
          console.log("");
          console.log(chalk.dim("  Make sure Docker is installed and running."));
          console.log("");
          return;
        }

        buildSpinner.succeed(chalk.green(`Docker image built: ${projectName}`));

        // Check for .env file to pass environment variables
        const envFlag = existsSync(join(projectDir, ".env")) ? ["--env-file", ".env"] : [];

        console.log("");
        console.log(chalk.bold("  Starting container..."));
        console.log(`  ${chalk.dim("Agent:")}    ${chalk.cyan(`http://localhost:${port}`)}`);
        console.log(`  ${chalk.dim("DevTools:")} ${chalk.cyan(`http://localhost:${port}/dev`)}`);
        console.log(`  ${chalk.dim("Health:")}   ${chalk.cyan(`http://localhost:${port}/health`)}`);
        console.log("");
        console.log(chalk.dim("  Press Ctrl+C to stop"));
        console.log("");

        const runResult = spawnSync("docker", [
          "run", "--rm", "-p", `${port}:${port}`, ...envFlag, projectName,
        ], {
          cwd: projectDir,
          stdio: "inherit",
        });

        if (runResult.status !== 0 && runResult.status !== null) {
          console.log(chalk.red(`\n  Container exited with code ${runResult.status}`));
        }
        return;
      }

      // Fly.io: deploy via flyctl
      if (target === "fly-io") {
        console.log("");

        // Check flyctl is installed
        const flyCheck = spawnSync("flyctl", ["version"], { stdio: "pipe", encoding: "utf-8" });
        if (flyCheck.status !== 0) {
          console.log(chalk.red("  Error: flyctl not found."));
          console.log(chalk.dim("  Install it: curl -L https://fly.io/install.sh | sh"));
          console.log("");
          return;
        }

        // Check logged in
        const authCheck = spawnSync("flyctl", ["auth", "whoami"], { stdio: "pipe", encoding: "utf-8" });
        if (authCheck.status !== 0) {
          console.log(chalk.yellow("  Not logged in to Fly.io."));
          console.log(chalk.dim("  Run: flyctl auth login"));
          console.log("");
          return;
        }

        console.log(chalk.dim(`  Logged in as: ${(authCheck.stdout || "").trim()}`));

        // Set secrets from .env
        const envPath = join(projectDir, ".env");
        if (existsSync(envPath)) {
          const envContent = readFileSync(envPath, "utf-8");
          const secrets: string[] = [];
          for (const line of envContent.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
              const [key] = trimmed.split("=", 1);
              if (key.endsWith("_API_KEY") || key.endsWith("_KEY") || key.endsWith("_SECRET")) {
                secrets.push(trimmed);
              }
            }
          }
          if (secrets.length > 0) {
            const secretSpinner = ora("Setting secrets...").start();
            const secretResult = spawnSync("flyctl", ["secrets", "set", ...secrets], {
              cwd: projectDir,
              stdio: "pipe",
              encoding: "utf-8",
            });
            if (secretResult.status === 0) {
              secretSpinner.succeed(chalk.green(`${secrets.length} secret(s) set`));
            } else {
              secretSpinner.warn(chalk.yellow("Could not set secrets (app may not exist yet)"));
            }
          }
        }

        // Deploy
        const deploySpinner = ora("Deploying to Fly.io...").start();
        deploySpinner.stop();
        console.log("");

        const deployResult = spawnSync("flyctl", ["deploy", "--ha=false"], {
          cwd: projectDir,
          stdio: "inherit",
        });

        if (deployResult.status === 0) {
          console.log("");
          console.log(chalk.green.bold("  Deployed successfully!"));

          // Get app URL
          const infoResult = spawnSync("flyctl", ["info"], {
            cwd: projectDir,
            stdio: "pipe",
            encoding: "utf-8",
          });
          const hostname = (infoResult.stdout || "").match(/Hostname\s*=\s*(\S+)/)?.[1];
          if (hostname) {
            console.log(`  ${chalk.dim("App:")}      ${chalk.cyan(`https://${hostname}`)}`);
            console.log(`  ${chalk.dim("DevTools:")} ${chalk.cyan(`https://${hostname}/dev`)}`);
            console.log(`  ${chalk.dim("API:")}      ${chalk.cyan(`https://${hostname}/run`)}`);
          }
          console.log("");
        } else {
          console.log(chalk.red("\n  Deployment failed. Check the output above for details."));
          console.log("");
        }
        return;
      }

      // Other targets: show instructions
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
  if (existsSync(join(projectDir, "crew.py")) || existsSync(join(projectDir, "src/agents/crew.py"))) return "crewai";
  if (existsSync(join(projectDir, "state.py"))) return "langgraph";

  const reqPath = join(projectDir, "requirements.txt");
  if (existsSync(reqPath)) {
    const reqs = readFileSync(reqPath, "utf-8");
    if (reqs.includes("google-adk")) return "google-adk";
    if (reqs.includes("crewai")) return "crewai";
    if (reqs.includes("langgraph")) return "langgraph";
    if (reqs.includes("llama-index")) return "llamaindex";
    if (reqs.includes("pyautogen")) return "autogen";
    if (reqs.includes("anthropic")) return "anthropic";
    if (reqs.includes("openai-agents")) return "openai";
  }

  return "openai";
}
