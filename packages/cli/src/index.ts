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

const program = new Command();

program
  .name("agentvoy")
  .description(
    "The universal agent development platform. Scaffold, configure, and guard AI agents across any framework."
  )
  .version("0.1.0");

program.addCommand(createCommand);
program.addCommand(initCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);

program.parse();
