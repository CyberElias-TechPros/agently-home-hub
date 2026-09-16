// Shared runtime helpers used by BOTH Node and the Cloudflare Worker build.

export function setGlobalEnv(env) {
  globalThis.__agentlyEnv = env || {};
  // Null out any falsy values so config fallbacks apply cleanly.
  for (const k of Object.keys(globalThis.__agentlyEnv)) {
    if (globalThis.__agentlyEnv[k] == null) delete globalThis.__agentlyEnv[k];
  }
}

export const ERROR_500 = JSON.stringify({ error: 'Internal server error' });

let logger = {
  info: (...a) => console.log('[api]', ...a),
  error: (...a) => console.error('[api]', ...a),
  warn: (...a) => console.warn('[api]', ...a),
};

export function setLogger(l) {
  logger = l;
}

export function getLogger() {
  return logger;
}
