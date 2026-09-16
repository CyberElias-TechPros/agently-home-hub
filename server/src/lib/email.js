// Transactional email. Two transports:
//   1. SMTP (when configured) — real delivery.
//   2. Console mailbox — stores messages in memory so the frontend dev flow
//      (email verification / password reset) works without any SMTP account.
//      The latest messages are retrievable at GET /api/dev/mailbox.

import config from '../config.js';

const mailbox = []; // { to, subject, text, html, createdAt }

export function getMailbox() {
  return mailbox.slice().reverse();
}

export function latestMessageFor(email) {
  return mailbox
    .slice()
    .reverse()
    .find((m) => m.to === email || m.to.includes(email));
}

export function clearMailbox() {
  mailbox.length = 0;
}

async function sendSmtp({ to, subject, text, html }) {
  if (!config.smtpHost) return false;
  // Minimal SMTP client using `net` — only available on Node.
  if (typeof process === 'undefined' || !process.versions?.node) return false;
  const net = await import('node:net');
  const host = config.smtpHost;
  const port = config.smtpPort;

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let stage = 0;
    const lines = [];
    const done = (ok) => {
      try {
        socket.end();
      } catch {
        /* noop */
      }
      resolve(ok);
    };

    socket.setTimeout(10000, () => done(false));
    socket.on('error', () => done(false));

    socket.on('data', (chunk) => {
      lines.push(chunk.toString());
      const last = lines.join('');
      if (stage === 0 && /220/.test(last)) {
        stage = 1;
        socket.write(`EHLO agently\r\n`);
      } else if (stage === 1 && /250/.test(last.split('\r\n').filter(Boolean).slice(-1)[0] || last)) {
        stage = 2;
        socket.write(`MAIL FROM:<${config.smtpUser || config.mailFrom}>\r\n`);
      } else if (stage === 2) {
        stage = 3;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (stage === 3) {
        stage = 4;
        socket.write(`DATA\r\n`);
      } else if (stage === 4 && /354/.test(last)) {
        const body =
          `From: ${config.mailFrom}\r\n` +
          `To: ${to}\r\n` +
          `Subject: ${subject}\r\n` +
          `Content-Type: text/html; charset=utf-8\r\n\r\n` +
          `${html || text}\r\n.\r\n`;
        socket.write(body);
        stage = 5;
      } else if (stage === 5) {
        socket.write(`QUIT\r\n`);
        done(true);
      }
    });
    socket.on('close', () => {
      if (stage < 5) done(false);
    });
  });
}

export async function sendMail({ to, subject, text, html }) {
  const record = { to, subject, text, html, createdAt: new Date().toISOString() };
  mailbox.push(record);
  if (mailbox.length > 100) mailbox.shift();

  if (config.smtpHost) {
    try {
      const ok = await sendSmtp({ to, subject, text, html });
      if (ok) {
        console.log(`[email] delivered via SMTP → ${to} (${subject})`);
        return { delivered: true, transport: 'smtp' };
      }
    } catch (err) {
      console.error('[email] SMTP failure, falling back to mailbox', err.message);
    }
  }
  console.log(`[email] stored in dev mailbox → ${to} (${subject})`);
  return { delivered: false, transport: 'mailbox' };
}
