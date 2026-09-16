// Node runtime entrypoint — local development server.
// Builds the same handler graph the Cloudflare Worker uses, over raw `http`.

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config, { allowedOrigins, originAllowed } from './config.js';
import { initNodeDatabase } from './db/db.js';
import { route, handleHealth } from './runtime/router.js';
import { createNodeRequest, createResponse } from './runtime/adapter.js';
import { json, applyCors } from './lib/http.js';
import { setGlobalEnv } from './worker-shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Merge a local .env file (if present) into process.env before config is read.
async function loadDotEnv() {
  try {
    const fs = await import('node:fs');
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      }
    }
  } catch (e) {
    console.warn('[env] could not load .env:', e.message);
  }
}

async function main() {
  await loadDotEnv();
  await initNodeDatabase(config.databasePath);
  setGlobalEnv(process.env);
  console.log(`[db] ready (${config.databasePath})`);

  const server = http.createServer(async (req, res) => {
    try {
      await dispatch(req, res);
    } catch (err) {
      console.error('[server] unhandled error', err);
      const resp = createResponse(res);
      if (!resp._sent) {
        json(resp, 500, { error: 'Internal server error', id: Date.now().toString(36) });
      }
      sendFromAdapter(resp, res);
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(`\n🚀 Agently API listening on http://${config.host}:${config.port}`);
    console.log(`   Health:        http://localhost:${config.port}/api/health`);
    console.log(`   Dev mailbox:   http://localhost:${config.port}/api/dev/mailbox`);
    console.log(`   Seed logins:   admin@agently.ng / landlord@agently.ng / tenant@agently.ng / agent@agently.ng  (Password123!)`);
    console.log(`   Payments:      ${config.paystackEnabled && config.paystackSecretKey ? 'Paystack (LIVE keys)' : 'Simulation mode (no keys → instant success)'}\n`);
  });
}

async function dispatch(req, res) {
  // Read body (size-capped).
  let bodyText = '';
  const length = parseInt(req.headers['content-length'] || '0', 10);
  if (length > 0 && length < 10 * 1024 * 1024) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
      if (chunks.reduce((a, c) => a + c.length, 0) > 10 * 1024 * 1024) break;
    }
    bodyText = Buffer.concat(chunks).toString('utf8');
  }

  if (req.method === 'OPTIONS') {
    const resp = createResponse(res);
    applyCors(reqAdapterForCors(req), resp);
    resp.status(204);
    resp.send('');
    sendFromAdapter(resp, res);
    return;
  }

  const adaRes = createResponse(res);
  applyCors(reqAdapterForCors(req), adaRes);

  const adapterReq = createNodeRequest(req, bodyText);
  adapterReq.headers = req.headers; // keep raw headers for getHeader

  const result = await route(adapterReq, adaRes);
  if (result && result.status && !adaRes._sent) {
    json(adaRes, result.status, result.body);
  }
  sendFromAdapter(adaRes, res);
}

function reqAdapterForCors(req) {
  return { getHeader: (n) => (req.headers[n.toLowerCase()] || ''), headers: req.headers };
}

function sendFromAdapter(adaRes, res) {
  if (!res.headersSent) res.writeHead(adaRes._status || 200, adaRes._headers);
  res.end(adaRes._body);
}

main();
