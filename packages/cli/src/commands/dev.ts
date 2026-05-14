/**
 * agentvoy dev — Start the agent server with DevTools dashboard
 */

import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";

interface DevOptions {
  port?: string;
}

export const devCommand = new Command("dev")
  .description("Start your agent with the AgentVoy DevTools dashboard")
  .option("-p, --port <port>", "Port for the agent server", "8080")
  .action(async (options: DevOptions) => {
    const port = Number(options.port) || 8080;
    const projectDir = resolve(process.cwd());

    // Check we're in an app project
    const serverPath = join(projectDir, "server.py");
    if (!existsSync(serverPath)) {
      console.log("");
      console.log(chalk.red("  Error: No server.py found in the current directory."));
      console.log(chalk.dim("  Run this command from inside an AgentVoy app project."));
      console.log(chalk.dim("  Create one with: agentvoy create my-app --build-mode app"));
      console.log("");
      process.exit(1);
    }

    // Check devtools.html exists
    const devtoolsPath = join(projectDir, "devtools.html");
    if (!existsSync(devtoolsPath)) {
      console.log(chalk.yellow("  Warning: devtools.html not found. The /dev dashboard may not work."));
      console.log(chalk.dim("  Regenerate your project or run: agentvoy deploy"));
    }

    console.log("");
    console.log(chalk.bold("  AgentVoy DevTools"));
    console.log("");
    console.log(`  ${chalk.dim("Agent server:")}  ${chalk.cyan(`http://localhost:${port}`)}`);
    console.log(`  ${chalk.dim("DevTools:")}      ${chalk.cyan(`http://localhost:${port}/dev`)}`);
    console.log(`  ${chalk.dim("Health:")}        ${chalk.cyan(`http://localhost:${port}/health`)}`);
    console.log("");
    console.log(chalk.dim("  Press Ctrl+C to stop"));
    console.log("");

    // Try to open browser after a short delay
    setTimeout(() => {
      const url = `http://localhost:${port}/dev`;
      const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      spawn(openCmd, [url], { stdio: "ignore", detached: true }).unref();
    }, 2000);

    // Start uvicorn
    const uvicorn = spawn("uvicorn", ["server:app", "--reload", "--port", String(port)], {
      cwd: projectDir,
      stdio: "inherit",
      env: { ...process.env },
    });

    uvicorn.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("");
        console.log(chalk.red("  Error: uvicorn not found."));
        console.log(chalk.dim("  Install it with: pip install uvicorn[standard]"));
        console.log(chalk.dim("  Or activate your virtual environment: source .venv/bin/activate"));
        console.log("");
      } else {
        console.error(err);
      }
      process.exit(1);
    });

    uvicorn.on("close", (code) => {
      process.exit(code || 0);
    });

    // Forward signals
    process.on("SIGINT", () => {
      uvicorn.kill("SIGINT");
    });
    process.on("SIGTERM", () => {
      uvicorn.kill("SIGTERM");
    });
  });
