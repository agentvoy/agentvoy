import type { DeploymentAdapter, DeployConfig, DeploymentFiles, DeployValidationResult } from "../types.js";

function generateRailwayJson(config: DeployConfig): string {
  return JSON.stringify(
    {
      "$schema": "https://railway.app/railway.schema.json",
      build: { builder: "DOCKERFILE", dockerfilePath: "./Dockerfile" },
      deploy: {
        startCommand: `uvicorn server:app --host 0.0.0.0 --port ${config.port}`,
        healthcheckPath: "/health",
        healthcheckTimeout: 300,
        restartPolicyType: "ON_FAILURE",
        restartPolicyMaxRetries: 3,
      },
    },
    null,
    2
  );
}

export const railwayAdapter: DeploymentAdapter = {
  target: "railway",
  displayName: "Railway",
  requiredCLI: "railway",

  async validate(config: DeployConfig): Promise<DeployValidationResult> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];
    const missingTools: string[] = [];

    try {
      const { execSync } = await import("child_process");
      execSync("railway --version", { stdio: "ignore" });
    } catch {
      missingTools.push("railway");
      warnings.push({
        field: "railway",
        message: "Railway CLI not found — install: npm install -g @railway/cli",
      });
    }

    return { valid: errors.length === 0, errors, warnings, missingTools };
  },

  async generateFiles(config: DeployConfig): Promise<DeploymentFiles> {
    const files = [
      { path: "deploy/railway.json", content: generateRailwayJson(config) },
    ];

    const instructions = [
      `npm install -g @railway/cli`,
      `railway login`,
      `railway init`,
      `railway variables set OPENAI_API_KEY=<your-key>  # set all required env vars`,
      `railway up`,
      `railway open`,
    ];

    return { files, instructions };
  },
};
