// Payments — Paystack (Nigeria, NGN) with a deterministic simulation fallback.
// Both paths produce the same contract so the frontend never has to branch:
//   { reference, authorizationUrl | null, status, test_mode, message }
// `paystack_enabled` (with a secret key) flips real API usage on.

import config from '../config.js';
import { newId, now } from '../db/db.js';

export function isSimulated() {
  return !(config.paystackEnabled && config.paystackSecretKey);
}

export async function createBookingPayment({ userId, bookingId, amount, email, metadata = {} }) {
  const reference = `AGY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const description = metadata.description || `Agently booking payment — ${amount / 100} NGN`;

  if (isSimulated()) {
    // Deterministic simulation: mark paid immediately on the platform side.
    return {
      reference,
      authorizationUrl: null,
      status: 'completed',
      test_mode: true,
      channel: 'simulation',
      message: 'Simulated payment completed (no Paystack keys configured).',
    };
  }

  const res = await paystackRequest('POST', '/transaction/initialize', {
    email,
    amount, // kobo
    currency: 'NGN',
    reference,
    callback_url: `${config.frontendUrl}/bookings?ref=${reference}`,
    metadata: { userId, bookingId, ...metadata },
  });

  return {
    reference,
    authorizationUrl: res.data?.authorization_url ?? null,
    status: 'pending',
    test_mode: false,
    channel: 'paystack',
    message: 'Paystack initialisation successful.',
  };
}

export async function verifyPaystack(reference) {
  if (isSimulated()) {
    return { status: 'completed', test_mode: true, channel: 'simulation', paystack_ref: reference };
  }
  const res = await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
  const status = res.data?.status === 'success' ? 'completed' : res.data?.status || 'pending';
  return {
    status,
    test_mode: false,
    channel: 'paystack',
    paystack_ref: res.data?.reference || reference,
  };
}

async function paystackRequest(method, path, body) {
  const url = `${config.paystackBaseUrl}${path}`;
  const headers = {
    Authorization: `Bearer ${config.paystackSecretKey}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Paystack ${method} ${path} failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function naira(intAmount) {
  return `₦${Number(intAmount || 0).toLocaleString('en-NG')}`;
}

export { newId, now };
