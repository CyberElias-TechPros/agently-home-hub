import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the API's pure logic.
 *
 * These run in plain Node — no Workers runtime — so they cover only the parts
 * that have no binding dependencies: password hashing, password policy, match
 * scoring and DTO mapping. Anything that touches D1, R2, KV or a Durable
 * Object is covered by `scripts/e2e.sh`, which runs against real simulated
 * bindings.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Web Crypto is available as a global in Node 20+ but not in every CI
    // image; the API relies on it, so fail fast and loudly instead of with a
    // confusing "crypto is not defined".
    setupFiles: ['./test/setup.ts'],
  },
});
