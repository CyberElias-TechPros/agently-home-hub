// Cloudflare Worker entrypoint (production build for the Agently API).
// Deploy with Wrangler; bindings: DB (D1), plus optional secrets/env vars.
//
//   npx wrangler deploy workers/worker.js --name agently-api
//
// Local Node development uses src/index.js instead — the route graph and
// schema are identical between the two runtimes.

import config from '../src/config.js';
import configFallback from '../src/config.js';
import { initD1Database } from '../src/db/db.js';
import { route, handleHealth } from '../src/runtime/router.js';
import { createWorkerRequest, createResponse } from '../src/runtime/adapter.js';
import { applyCors, json } from '../src/lib/http.js';
import { setGlobalEnv, getLogger } from '../src/worker-shared.js';
import { SCHEMA_STATEMENTS } from '../src/db/db.js';

// D1 bindings are injected as globals by the esbuild wrangler bundling.
/* global AGENTLY_D1 */

export default {
  async fetch(request, env = {}) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const bindings = env.AGENTLY_D1 || env.DB || globalThis.AGENTLY_D1;
      if (bindings) {
        await initD1Database(bindings);
        await runMigrations(bindings);
      } else {
        getLogger().warn('No D1 binding found (AGENTLY_D1). Running without persistence.');
      }
      setGlobalEnv(env);

      const adaRes = createResponse();
      const adaReq = createWorkerRequest(request);
      const result = await route(adaReq, adaRes);

      if (result && result.status && !adaRes._sent) {
        json(adaRes, result.status, result.body);
      }
      return new Response(adaRes._body, {
        status: adaRes._status || 200,
        headers: { ...cors, ...adaRes._headers },
      });
    } catch (err) {
      getLogger().error('worker error', err && err.message ? err.message : err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  },
};

async function runMigrations(d1) {
  for (const stmt of SCHEMA_STATEMENTS) {
    await d1.exec(stmt);
  }
}
