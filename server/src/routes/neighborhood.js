// Neighborhood insights routes.

import { ok, parseJson } from '../lib/http.js';
import { all, get } from '../db/db.js';

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

export async function handleNeighborhood(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return list(req, res);
  if (req.method === 'GET' && parts.length === 1) return detail(req, res, parts[0]);
  return notFound(res, 'Neighborhood route not found');
}

function view(n) {
  return {
    id: n.id,
    name: n.name,
    city: n.city,
    state: n.state,
    description: n.description,
    walkScore: n.walk_score,
    transitScore: n.transit_score,
    safetyScore: n.safety_score,
    schoolScore: n.school_score,
    amenitiesScore: n.amenities_score,
    overallScore: n.overall_score,
    amenities: safeJson(n.amenities, []),
    priceTrend: n.price_trend,
  };
}

async function list(req, res) {
  const rows = await all('SELECT * FROM neighborhoods ORDER BY overall_score DESC');
  return ok(res, { items: rows.map(view) });
}

async function detail(req, res, id) {
  const n = await get('SELECT * FROM neighborhoods WHERE id = ?', [id]);
  if (!n) {
    return notFound(res, 'Neighborhood not found');
  }
  const listings = await all(
    `SELECT id, title, price, bedrooms, bathrooms, area_sqm, images FROM properties WHERE city = ? AND published = 1 LIMIT 6`,
    [n.city]
  );
  const similar = await all(
    `SELECT id, name, overall_score, walk_score, safety_score FROM neighborhoods WHERE city = ? AND id != ? LIMIT 4`,
    [n.city, id]
  );
  return ok(res, {
    item: {
      ...view(n),
      listings: listings.map((p) => ({ id: p.id, title: p.title, price: p.price, bedrooms: p.bedrooms, bathrooms: p.bathrooms, area: p.area_sqm, images: safeJson(p.images, []) })),
      nearby: similar.map(view),
    },
  });
}
