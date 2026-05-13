#!/usr/bin/env node

/**
 * AgentVoy CLI
 *
 * The universal agent development platform.
 * Scaffold, configure, and guard AI agents across any framework.
 */

import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { listCommand } from "./commands/list.js";
import { deployCommand } from "./commands/deploy.js";
import pkg from "../package.json";

const { version } = pkg;

const program = new Command();

program
  .name("agentvoy")
  .description(
    "The universal agent development platform. Scaffold, configure, and guard AI agents across any framework."
  )
  .version(version);

program.addCommand(createCommand);
program.addCommand(deployCommand);
program.addCommand(initCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);

program.parse();
