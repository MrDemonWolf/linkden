// Vitest runs under Node, where the Workers-only `cloudflare:workers` module
// does not exist. Tests that need specific bindings mock `@linkden/env/server`;
// this stub keeps any unmocked import (e.g. through a differently-linked path
// under Bun's isolated installs in CI) from failing to resolve.
export const env: Record<string, unknown> = {};
