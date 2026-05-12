#!/usr/bin/env node

/**
 * create-agentvoy
 *
 * Quick project scaffolding: npx create-agentvoy my-agent
 * Delegates to the main agentvoy CLI create command.
 */

import { execSync } from "node:child_process";

const args = process.argv.slice(2).join(" ");
console.log("\nDelegating to: agentvoy create " + args + "\n");
execSync(`npx agentvoy create ${args}`, { stdio: "inherit" });
