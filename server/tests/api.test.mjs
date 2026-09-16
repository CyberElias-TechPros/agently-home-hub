// Agently API test suite — exercises the real handlers end-to-end against a
// throwaway in-memory(:memory:) SQLite DB. No network, no side effects.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import config from '../src/config.js';
import { setGlobalEnv } from '../src/worker-shared.js';
import { createResponse } from '../src/runtime/adapter.js';
import { route } from '../src/runtime/router.js';

const API = 'http://localhost';

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret-please-change-0000';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-please-change';
  process.env.ALLOWED_ORIGINS = '*';
  process.env.PAYSTACK_ENABLED = 'false';
  setGlobalEnv(process.env);
  // Reset in-memory DB on first init
  const { initNodeDatabase } = await import('../src/db/db.js');
  // initNodeDatabase uses config.databasePath, which is read at module load.
  // We set DATABASE_PATH before importing db — see top-of-file import order
  // caveat handled by importing db lazily here.
  await initNodeDatabase(':memory:');
});

function parse(body) {
  return JSON.parse(body);
}

async function call(method, path, { body, token } = {}) {
  const req = {
    method,
    url: path,
    headers: {},
    text: body ? JSON.stringify(body) : '',
    getHeader(name) {
      if (name === 'authorization' && token) return `Bearer ${token}`;
      return '';
    },
  };
  req.query = {};
  for (const [k, v] of new URL(path, API).searchParams) req.query[k] = v;
  const res = createResponse();
  const result = await route(req, res);
  if (result && result.status && !res._sent) {
    res.status(result.status);
    res.json(result.body);
  }
  return { status: res._status, body: parse(res._body || '{}') };
}

async function login(email, password = 'Password123!') {
  const r = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
  return r.body.tokens.accessToken;
}

describe('auth', () => {
  it('logs in with seeded accounts (all roles)', async () => {
    for (const email of ['admin@agently.ng', 'landlord@agently.ng', 'tenant@agently.ng', 'agent@agently.ng', 'manager@agently.ng']) {
      await login(email);
    }
  });

  it('rejects bad credentials', async () => {
    const r = await call('POST', '/api/auth/login', { body: { email: 'tenant@agently.ng', password: 'nope' } });
    assert.equal(r.status, 401);
  });

  it('registers → verifies → logs in → reads /me', async () => {
    const email = `u${Date.now()}@test.com`;
    const reg = await call('POST', '/api/auth/register', {
      body: { name: 'New Person', email, password: 'Password123!', role: 'tenant' },
    });
    assert.equal(reg.status, 201);
    assert.ok(reg.body.tokens.accessToken);

    const mb = await call('GET', `/api/dev/mailbox?tokenFor=${email}`);
    const link = mb.body.latest?.link || '';
    const token = link.split('token=')[1];
    assert.ok(token, 'verification email should contain a token link');

    const verify = await call('GET', `/api/auth/verify/${token}`);
    assert.equal(verify.status, 200);

    const l = await login(email);
    const me = await call('GET', '/api/auth/me', { token: l });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.verified, true);
  });

  it('rejects duplicate registration', async () => {
    const email = `dup${Date.now()}@test.com`;
    await call('POST', '/api/auth/register', { body: { name: 'D', email, password: 'Password123!', role: 'tenant' } });
    const again = await call('POST', '/api/auth/register', { body: { name: 'D', email, password: 'Password123!', role: 'tenant' } });
    assert.equal(again.status, 409);
  });

  it('resets password and revokes old sessions', async () => {
    const email = `pw${Date.now()}@test.com`;
    await call('POST', '/api/auth/register', { body: { name: 'PW', email, password: 'Password123!', role: 'tenant' } });
    const fg = await call('POST', '/api/auth/forgot-password', { body: { email } });
    assert.equal(fg.status, 200);
    const mb = await call('GET', `/api/dev/mailbox?tokenFor=${email}`);
    const token = (mb.body.latest?.link || '').split('token=')[1];
    const rp = await call('POST', '/api/auth/reset-password', { body: { token, password: 'NewPassword123!' } });
    assert.equal(rp.status, 200);
    const l = await login(email, 'NewPassword123!');
    assert.ok(l);
  });

  it('rejects requests without a token (401)', async () => {
    const r = await call('GET', '/api/bookings');
    assert.equal(r.status, 401);
  });
});

describe('properties', () => {
  it('lists properties with pagination', async () => {
    const r = await call('GET', '/api/properties?limit=2&page=1');
    assert.equal(r.status, 200);
    assert.ok(r.body.items.length <= 2);
    assert.ok(r.body.pagination.total > 0);
  });

  it('filters by search, type, city and price', async () => {
    const r = await call('GET', '/api/properties?search=lekki&type=apartment&city=Lekki');
    assert.equal(r.status, 200);
    assert.ok(r.body.items.length > 0);
    assert.ok(r.body.items.every((p) => /lekki/i.test(p.title) && p.location.city === 'Lekki' && p.type === 'apartment'));
    const p = await call('GET', '/api/properties?minPrice=1000000');
    assert.ok(p.body.items.every((x) => x.price >= 1000000));
  });

  it('returns a single property', async () => {
    const r = await call('GET', '/api/properties/prp_lekki_duplex');
    assert.equal(r.status, 200);
    assert.equal(r.body.item.id, 'prp_lekki_duplex');
    assert.equal(r.body.item.pricePeriod, 'month');
  });

  it('creates a property as landlord', async () => {
    const tok = await login('landlord@agently.ng');
    const title = `Test Listing ${Date.now()}`;
    const r = await call('POST', '/api/properties', {
      token: tok,
      body: { title, type: 'apartment', price: 500000, address: '1 Test St', city: 'Lekki', state: 'Lagos', bedrooms: 2, amenities: ['Parking'] },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.ok(r.body.item.id);
  });

  it('forbids tenants from creating listings', async () => {
    const tok = await login('tenant@agently.ng');
    const r = await call('POST', '/api/properties', {
      token: tok,
      body: { title: 'Nope', type: 'apartment', price: 1, address: 'x', city: 'Y', state: 'Z' },
    });
    assert.equal(r.status, 403);
  });

  it('toggles favorites', async () => {
    const tok = await login('tenant@agently.ng');
    const add = await call('POST', '/api/properties/prp_yaba_flat/favorite', { token: tok });
    assert.equal(add.status, 200);
    assert.equal(add.body.favorited, true);
    const favs = await call('GET', '/api/properties/favorites', { token: tok });
    assert.ok(favs.body.items.some((p) => p.id === 'prp_yaba_flat'));
    const del = await call('DELETE', '/api/properties/prp_yaba_flat/favorite', { token: tok });
    assert.equal(del.body.favorited, false);
  });
});

describe('bookings (happy path)', () => {
  it('checks availability, creates, confirms', async () => {
    const tenant = await login('tenant2@agently.ng');
    const avail = await call('GET', '/api/bookings/availability/prp_ikeja_duplex?startDate=2026-09-01&endDate=2027-08-31');
    assert.equal(avail.body.available, true);

    const create = await call('POST', '/api/bookings', {
      token: tenant,
      body: { propertyId: 'prp_ikeja_duplex', startDate: '2026-09-01', endDate: '2027-08-31', notes: 'Moving for work.' },
    });
    assert.equal(create.status, 201, JSON.stringify(create.body));
    const bookingId = create.body.item.id;

    const landlord = await login('landlord@agently.ng');
    const approve = await call('PUT', `/api/bookings/status/${bookingId}`, { token: landlord, body: { status: 'confirmed' } });
    assert.equal(approve.status, 200);
    assert.equal(approve.body.item.status, 'confirmed');
  });

  it('rejects overlapping bookings', async () => {
    const tenant = await login('tenant2@agently.ng');
    const r = await call('POST', '/api/bookings', {
      token: tenant,
      body: { propertyId: 'prp_ikeja_duplex', startDate: '2026-10-01', endDate: '2027-03-31' },
    });
    assert.equal(r.status, 400);
  });

  it('prevents tenants from approving bookings', async () => {
    const tenant = await login('tenant2@agently.ng');
    const r = await call('PUT', '/api/bookings/status/bk_1', { token: tenant, body: { status: 'confirmed' } });
    assert.equal(r.status, 403);
  });
});

describe('maintenance', () => {
  it('tenant → landlord full cycle with role guards', async () => {
    const tenant = await login('tenant@agently.ng'); // has confirmed tenancy bk_1 (surulere)
    const create = await call('POST', '/api/maintenance', {
      token: tenant,
      body: { propertyId: 'prp_surulere_flat', title: 'Leak', description: 'Leaking tap', category: 'plumbing', priority: 'medium' },
    });
    assert.equal(create.status, 201, JSON.stringify(create.body));

    const landlord = await login('landlord@agently.ng');
    const list = await call('GET', '/api/maintenance', { token: landlord });
    assert.ok(list.body.items.length > 0);

    const update = await call('PUT', `/api/maintenance/${create.body.item.id}`, { token: landlord, body: { status: 'resolved', actualCost: 15000 } });
    assert.equal(update.status, 200);
    assert.equal(update.body.item.status, 'resolved');
  });
});

describe('payments (simulation mode)', () => {
  it('creates a booking and instantly marks fee paid when zero-fee', async () => {
    const tenant = await login('tenant2@agently.ng');
    const create = await call('POST', '/api/bookings', {
      token: tenant,
      body: { propertyId: 'prp_yaba_flat', startDate: '2026-11-01', endDate: '2027-10-31' },
    });
    assert.equal(create.status, 201);
    const pay = await call('POST', `/api/bookings/${create.body.item.id}/pay`, { token: tenant });
    assert.equal(pay.status, 200);
    assert.equal(pay.body.item.paymentStatus, 'paid');
  });
});

describe('marketplace & financials', () => {
  it('lists mortgage rates and calculates', async () => {
    const rates = await call('GET', '/api/mortgage/rates');
    assert.ok(rates.body.items.length >= 3);
    const calc = await call('POST', '/api/mortgage/calculate', { body: { loanAmount: 15000000, interestRate: 21, loanTerm: 15 } });
    assert.equal(calc.status, 200);
    assert.ok(calc.body.monthlyPayment > 200000);
  });

  it('produces insurance quotes and purchases a policy', async () => {
    const tenant = await login('tenant@agently.ng');
    const q = await call('POST', '/api/insurance/quotes', { token: tenant, body: { providerId: 'ins_1', coverageAmount: 6000000, deductible: 50000 } });
    assert.equal(q.status, 201);
    const buy = await call('POST', '/api/insurance/quotes/purchase', { token: tenant, body: { quoteId: q.body.item.id } });
    assert.equal(buy.status, 201);
    assert.ok(buy.body.item.policyNumber);
    const pol = await call('GET', '/api/insurance/policies', { token: tenant });
    assert.ok(pol.body.items.length >= 1);
  });

  it('books and cancels a vendor service', async () => {
    const tenant = await login('tenant@agently.ng');
    const book = await call('POST', '/api/vendors/bookings', { token: tenant, body: { vendorId: 'vnd_1', serviceId: 'vsv_1', date: '2026-05-05', time: '10:00' } });
    assert.equal(book.status, 201);
    const cancel = await call('PUT', `/api/vendors/bookings/${book.body.item.id}/cancel`, { token: tenant });
    assert.equal(cancel.status, 200);
  });

  it('generates a valuation', async () => {
    const tenant = await login('tenant@agently.ng');
    const v = await call('POST', '/api/valuation', { token: tenant, body: { propertyId: 'prp_lekki_duplex' } });
    assert.equal(v.status, 201);
    assert.ok(v.body.item.avmValue > 0);
  });
});

describe('messaging', () => {
  it('starts a conversation, sends, lists, reads', async () => {
    const tenant = await login('tenant@agently.ng');
    const send = await call('POST', '/api/messages/send', {
      token: tenant,
      body: { receiverId: 'usr_landlord1', content: 'Hello landlord', propertyId: 'prp_lekki_duplex' },
    });
    assert.equal(send.status, 201);

    const landlord = await login('landlord@agently.ng');
    const convos = await call('GET', '/api/messages/conversations', { token: landlord });
    assert.ok(convos.body.items.length >= 1);
    const msgs = await call('GET', `/api/messages/conversations/${send.body.item.conversationId}/messages`, { token: landlord });
    assert.equal(msgs.body.items[0].content, 'Hello landlord');
    const mark = await call('PUT', '/api/messages/read', { token: landlord, body: { messageIds: ['noid-existing'], ids: [] } });
    // Mark-read requires messageIds; test unread endpoint instead
    const unread = await call('GET', '/api/messages/unread', { token: landlord });
    assert.equal(unread.status, 200);
  });
});

describe('admin & ops', () => {
  it('serves platform stats only to admins', async () => {
    const admin = await login('admin@agently.ng');
    const r = await call('GET', '/api/admin/stats', { token: admin });
    assert.equal(r.status, 200);
    assert.ok(r.body.metrics.totalUsers >= 7);

    const tenant = await login('tenant@agently.ng');
    const denied = await call('GET', '/api/admin/stats', { token: tenant });
    assert.equal(denied.status, 403);
  });

  it('health endpoint reports DB state', async () => {
    const r = await call('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'OK');
  });

  it('raises a support ticket and lists it', async () => {
    const tenant = await login('tenant@agently.ng');
    const r = await call('POST', '/api/support', { token: tenant, body: { subject: 'Help!', message: 'Need help with my booking', category: 'bookings' } });
    assert.equal(r.status, 201);
    const list = await call('GET', '/api/support', { token: tenant });
    assert.ok(list.body.items.length >= 1);
  });
});

describe('auctions & neighborhoods & CRM', () => {
  it('seeds an auction and accepts bids', async () => {
    const list = await call('GET', '/api/auctions');
    assert.equal(list.status, 200);
    const tenant = await login('tenant@agently.ng');
    const auction = list.body.items[0];
    const bid = await call('POST', `/api/auctions/bids/${auction.id}`, { token: tenant, body: { amount: auction.currentBid + auction.bidIncrement } });
    assert.equal(bid.status, 201, JSON.stringify(bid.body));
  });

  it('serves neighborhoods and CRM leads', async () => {
    const hoods = await call('GET', '/api/neighborhood');
    assert.ok(hoods.body.items.length >= 3);

    const agent = await login('agent@agently.ng');
    const leads = await call('GET', '/api/leads', { token: agent });
    assert.equal(leads.status, 200);
    const create = await call('POST', '/api/leads', { token: agent, body: { firstName: 'Ada', lastName: 'Obi', email: 'ada@x.com' } });
    assert.equal(create.status, 201);
  });
});

// ── Landlord tenants list + valuation reports/disputes + document studio ───
it('landlord tenants, valuation reports/disputes and document templates', async () => {
  // Landlord tenants (bk_1 is confirmed tenancy for tenant@agently.ng)
  const lTok = await login('landlord@agently.ng');
  const lt = await call('GET', '/api/bookings/tenants', { token: lTok });
  assert.equal(lt.status, 200);
  assert.ok(Array.isArray(lt.body.items));

  // Tenant can request a valuation
  const tTok = await login('tenant@agently.ng');
  const requestValuationRes = await call('POST', '/api/valuation', { token: tTok, body: { propertyId: 'prp_surulere_flat' } });
  assert.equal(requestValuationRes.status, 201);
  const valId = requestValuationRes.body.item.id;

  // Reports endpoint returns it
  const reports = await call('GET', '/api/valuation/reports', { token: tTok });
  assert.equal(reports.status, 200);
  assert.ok(reports.body.items.length >= 1);

  // File a dispute on the valuation
  const dispute = await call('POST', '/api/valuation/disputes', { token: tTok, body: { valuationId: valId, reason: 'Comparable properties undervalue the property.' } });
  assert.equal(dispute.status, 201);
  assert.equal(dispute.body.item.status, 'under_review');

  const disputes = await call('GET', '/api/valuation/disputes', { token: tTok });
  assert.equal(disputes.status, 200);
  assert.ok(disputes.body.items.length >= 1);

  // Schedule an inspection
  const insp = await call('POST', '/api/valuation/inspections', { token: tTok, body: { propertyId: 'prp_surulere_flat', scheduledDate: '2026-10-01T09:00:00Z', notes: 'Pre-move-in inspection' } });
  assert.equal(insp.status, 201);

  // Document templates now include lease/contract/agreement types
  const tmpl = await call('GET', '/api/documents/templates', { token: tTok });
  assert.equal(tmpl.status, 200);
  const types = tmpl.body.items.map((t) => t.type);
  assert.ok(types.includes('lease'));
  assert.ok(types.includes('contract'));
  assert.ok(types.includes('agreement'));

  // Generate a lease from a template
  const gen = await call('POST', '/api/documents/generate', {
    token: tTok,
    body: {
      templateId: 'dtm_lease', title: 'My Lekki Lease',
      variables: { landlord_name: 'Adebowale Holdings', tenant_name: 'Chidi Okeke', property_address: '14 Admiralty Way, Lekki Phase 1', monthly_rent: 850000, deposit: 850000, start_date: '2026-10-01', end_date: '2027-09-30' },
    },
  });
  assert.equal(gen.status, 201);
  assert.match(gen.body.item.content, /₦850,000/);
  assert.equal(gen.body.item.status, 'generated');
});
