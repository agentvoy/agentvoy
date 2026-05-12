/**
 * Framework Adapter Registry
 *
 * Central registry for all supported agent framework adapters.
 * Each adapter knows how to scaffold a project for its framework.
 */

import type { Framework, FrameworkAdapter } from "../types.js";

const adapters = new Map<Framework, FrameworkAdapter>();

export function registerAdapter(adapter: FrameworkAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(framework: Framework): FrameworkAdapter {
  const adapter = adapters.get(framework);
  if (!adapter) {
    const available = Array.from(adapters.keys()).join(", ");
    throw new Error(
      `Unknown framework: "${framework}". Available: ${available}`
    );
  }
  return adapter;
}

export function listAdapters(): FrameworkAdapter[] {
  return Array.from(adapters.values());
}

export function listFrameworks(): Framework[] {
  return Array.from(adapters.keys());
}

export function hasAdapter(framework: Framework): boolean {
  return adapters.has(framework);
}
