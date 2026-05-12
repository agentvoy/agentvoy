/**
 * Framework Adapters
 *
 * Auto-registers all built-in adapters on import.
 */

export { registerAdapter, getAdapter, listAdapters, listFrameworks, hasAdapter } from "./registry.js";

import { registerAdapter } from "./registry.js";
import { openaiAdapter } from "./openai.js";
import { googleAdkAdapter } from "./google-adk.js";
import { crewaiAdapter } from "./crewai.js";

// Register built-in adapters
registerAdapter(openaiAdapter);
registerAdapter(googleAdkAdapter);
registerAdapter(crewaiAdapter);
