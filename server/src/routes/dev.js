// Development + diagnostics routes (Node runtime only helpers, plus harmless
// identity/mailbox endpoints that work on both runtimes).

import { ok, badRequest, currentUser } from '../lib/http.js';
import { getMailbox, latestMessageFor, clearMailbox } from '../lib/email.js';
import config from '../config.js';

export async function handleDev(req, res, parts) {
  // POST /api/dev/resend-verification → email the logged-in user a fresh link.
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'mailbox') {
    return clearMailboxHandler(res);
  }
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'mailbox') {
    const { tokenFor } = req.query || {};
    const mailbox = getMailbox();
    if (tokenFor) {
      const latest = latestMessageFor(tokenFor);
      return ok(res, { latest: latest ? strip(latest) : null });
    }
    return ok(res, { count: mailbox.length, items: mailbox.map(strip) });
  }
  return badRequest(res, 'dev route not found');
}

async function clearMailboxHandler(res) {
  clearMailbox();
  return ok(res, { message: 'mailbox cleared' });
}

function strip(m) {
  const extractLink = (html) => {
    const m = /href="([^"]+)"/.exec(html || '');
    return m ? m[1] : null;
  };
  return {
    to: m.to,
    subject: m.subject,
    createdAt: m.createdAt,
    link: extractLink(m.html),
    html: m.html,
  };
}
