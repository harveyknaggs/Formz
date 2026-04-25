// Dogfood script — creates 3 varied listings, uploads images + docs + open homes,
// then submits buyer leads. Logs everything for the bug-hunt report.
//
// Run with: node scripts/dogfood-listings.mjs
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3001';
const LOG = [];
const log = (label, data) => {
  const entry = { t: new Date().toISOString(), label, data };
  LOG.push(entry);
  console.log(`\n=== ${label} ===`);
  if (typeof data === 'string') console.log(data);
  else console.log(JSON.stringify(data, null, 2));
};

const die = (msg) => { console.error('FATAL:', msg); process.exit(1); };

async function api(method, path_, { token, body, multipart, expectStatus } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let bodyToSend = undefined;
  if (multipart) {
    bodyToSend = multipart;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyToSend = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path_}`, { method, headers, body: bodyToSend });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (expectStatus && res.status !== expectStatus) {
    log(`UNEXPECTED ${method} ${path_} -> ${res.status} (expected ${expectStatus})`, json);
  }
  return { status: res.status, body: json };
}

// 1x1 jpeg pixel — works as a fixture image
const TINY_JPEG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';
const tinyJpeg = Buffer.from(TINY_JPEG_B64, 'base64');

// Minimal valid PDF (one blank page)
const TINY_PDF = Buffer.from(
  '%PDF-1.1\n%\xc2\xa5\xc2\xb1\xc3\xab\n\n1 0 obj\n  << /Type /Catalog\n     /Pages 2 0 R\n  >>\nendobj\n\n2 0 obj\n  << /Type /Pages\n     /Kids [3 0 R]\n     /Count 1\n     /MediaBox [0 0 300 144]\n  >>\nendobj\n\n3 0 obj\n  <<  /Type /Page\n      /Parent 2 0 R\n      /Resources\n       << /Font\n           << /F1\n               << /Type /Font\n                  /Subtype /Type1\n                  /BaseFont /Times-Roman\n               >>\n           >>\n       >>\n      /Contents 4 0 R\n  >>\nendobj\n\n4 0 obj\n  << /Length 55 >>\nstream\n  BT\n    /F1 18 Tf\n    0 0 Td\n    (Hello World) Tj\n  ET\nendstream\nendobj\n\nxref\n0 5\n0000000000 65535 f \n0000000018 00000 n \n0000000077 00000 n \n0000000178 00000 n \n0000000457 00000 n \ntrailer\n  <<  /Root 1 0 R\n      /Size 5\n  >>\nstartxref\n565\n%%EOF\n', 'binary');

async function login() {
  const r = await api('POST', '/api/auth/login', {
    body: { email: 'agent@hometownrealty.co.nz', password: 'admin123' },
    expectStatus: 200,
  });
  if (r.status !== 200) die('login failed: ' + JSON.stringify(r));
  return r.body.token;
}

async function createListing(token, payload) {
  const r = await api('POST', '/api/listings', { token, body: payload, expectStatus: 201 });
  log(`CREATE listing "${payload.address}" -> ${r.status}`, r.body);
  return r.body;
}

async function uploadImages(token, propertyId, count, label) {
  const fd = new FormData();
  for (let i = 0; i < count; i++) {
    const blob = new Blob([tinyJpeg], { type: 'image/jpeg' });
    fd.append('files', blob, `dogfood-${label}-${i}.jpg`);
  }
  const r = await api('POST', `/api/listings/${propertyId}/images`, { token, multipart: fd, expectStatus: 201 });
  log(`UPLOAD ${count} images to listing ${propertyId} -> ${r.status}`, r.body);
  return r.body;
}

async function uploadDoc(token, propertyId, kind, label) {
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('label', label);
  const blob = new Blob([TINY_PDF], { type: 'application/pdf' });
  fd.append('file', blob, `${label}.pdf`);
  const r = await api('POST', `/api/listings/${propertyId}/documents`, { token, multipart: fd, expectStatus: 201 });
  log(`UPLOAD doc "${label}" (${kind}) to listing ${propertyId} -> ${r.status}`, r.body);
  return r.body;
}

async function addOpenHome(token, propertyId, startISO, endISO) {
  const r = await api('POST', `/api/listings/${propertyId}/open-homes`, {
    token, body: { start_at: startISO, end_at: endISO }, expectStatus: 201,
  });
  log(`ADD open home to listing ${propertyId} (${startISO}) -> ${r.status}`, r.body);
  return r.body;
}

async function fetchListings(token) {
  const r = await api('GET', '/api/listings', { token, expectStatus: 200 });
  log('LIST all listings (agent)', r.body);
  return r.body;
}

async function fetchDetail(token, id) {
  const r = await api('GET', `/api/listings/${id}`, { token, expectStatus: 200 });
  log(`DETAIL listing ${id} (agent)`, r.body);
  return r.body;
}

async function fetchPublic(shortCode) {
  const r = await api('GET', `/api/listings/public/${shortCode}`, { expectStatus: 200 });
  log(`PUBLIC view of /${shortCode}`, r.body);
  return r.body;
}

async function submitLead(shortCode, body, expect = 201) {
  const r = await api('POST', `/api/listings/public/${shortCode}/lead`, { body, expectStatus: expect });
  log(`LEAD submission to /${shortCode} (intent=${body.intent || 'doc_request'})`, { status: r.status, body: r.body });
  return r.body;
}

async function tryDownload(leadId, docId, expect = 200) {
  const r = await fetch(`${BASE}/api/listings/download/${leadId}/${docId}`);
  const status = r.status;
  let bodyInfo;
  if (r.headers.get('content-type')?.includes('application/pdf') || status === 200) {
    bodyInfo = `binary, ${r.headers.get('content-length') || '?'} bytes, content-disposition=${r.headers.get('content-disposition')}`;
  } else {
    const text = await r.text();
    try { bodyInfo = JSON.parse(text); } catch { bodyInfo = text; }
  }
  log(`DOWNLOAD lead=${leadId} doc=${docId} -> ${status} (expected ${expect})`, bodyInfo);
}

async function main() {
  console.log('Starting dogfood run...');
  const token = await login();
  log('Logged in', { tokenPrefix: token.slice(0, 24) + '…' });

  // ---- LISTING 1 — happy path Mt Eden villa
  const listing1 = await createListing(token, {
    address: '12 Mt Eden Road',
    suburb: 'Mt Eden',
    city: 'Auckland',
    description: 'Charming 1920s weatherboard villa with original character features. Renovated kitchen and bathrooms, north-facing deck, walking distance to Mt Eden village shops and trains.',
    asking_price: 'By Negotiation',
    bedrooms: 4,
    bathrooms: 2,
    floor_area: 180,
    land_area: 506,
    status: 'active',
    latitude: -36.8744,
    longitude: 174.7619,
    legal_description: 'Lot 12 DP 1234',
    land_area_m2: 506.5,
    parcel_titles: ['NA1234/56', 'NA7890/12'],
    tenure_type: 'freehold',
    year_built: 1925,
    construction_type: 'weatherboard',
    chattels: 'Fixed floor coverings, light fittings, stove, dishwasher, rangehood, heat pump, curtains, blinds, garage door opener',
    rates_annual: '$3,450',
    capital_value: '$2,100,000',
    matterport_url: 'https://my.matterport.com/show/?m=Lr8sFm6t5pT',
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    floor_plan_url: 'https://example.com/floorplan.pdf',
    sale_method: 'by_negotiation',
  });

  await uploadImages(token, listing1.id, 4, 'mteden');
  await uploadDoc(token, listing1.id, 'lim', 'LIM Report — 12 Mt Eden Rd');
  await uploadDoc(token, listing1.id, 'title', 'Title — NA1234/56');
  await uploadDoc(token, listing1.id, 'builders_report', 'Builders Inspection — Mar 2026');

  const now = Date.now();
  const sat = new Date(now + 3 * 24 * 60 * 60 * 1000); sat.setHours(11, 0, 0, 0);
  const satEnd = new Date(sat.getTime() + 30 * 60 * 1000);
  const sun = new Date(now + 4 * 24 * 60 * 60 * 1000); sun.setHours(13, 0, 0, 0);
  const sunEnd = new Date(sun.getTime() + 30 * 60 * 1000);
  await addOpenHome(token, listing1.id, sat.toISOString(), satEnd.toISOString());
  await addOpenHome(token, listing1.id, sun.toISOString(), sunEnd.toISOString());

  // ---- LISTING 2 — auction, minimum fields
  const auctionDeadline = new Date(now + 21 * 24 * 60 * 60 * 1000); // 3 weeks
  const listing2 = await createListing(token, {
    address: '88 Newton Street',
    suburb: 'Newton',
    city: 'Auckland',
    description: 'Going to auction.',
    sale_method: 'auction',
    sale_deadline_at: auctionDeadline.toISOString(),
    bedrooms: 3,
    bathrooms: 1,
  });
  // No images, no docs, no open homes — to test empty states

  // ---- LISTING 3 — edge cases
  const longDesc = ('Lorem ipsum dolor sit amet, consectetur adipiscing elit. ').repeat(70).slice(0, 4900);
  const listing3 = await createListing(token, {
    address: "O'Connell's place — 7/123 Mountain Road",
    suburb: 'Remuera',
    city: 'Auckland',
    description: longDesc,
    asking_price: '$0',  // edge: zero / non-numeric in price field
    bedrooms: 1,
    bathrooms: 1,
    floor_area: 0,
    land_area: 0,
    tenure_type: 'leasehold',
    chattels: 'Stove (gas) 🔥, Dishwasher (Bosch) — "as is", curtains/blinds, <script>alert(1)</script>',
    rates_annual: '$0',
    capital_value: '',
    sale_method: 'price',
    year_built: 2026,
  });

  await uploadImages(token, listing3.id, 1, 'edge');
  // Hero from external URL fallback test: NO images uploaded, set hero_image_url instead — wait we already uploaded one.
  // Let's also test on listing 2 by setting hero_image_url via PUT after the fact.

  await api('PUT', `/api/listings/${listing2.id}`, {
    token, body: { hero_image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200' },
  });
  log('Set hero_image_url on listing 2 (no real images)', { id: listing2.id });

  // ---- AGENT INSPECTION
  await fetchListings(token);
  const detail1 = await fetchDetail(token, listing1.id);
  const detail2 = await fetchDetail(token, listing2.id);
  const detail3 = await fetchDetail(token, listing3.id);

  // ---- BUYER SIDE
  const pub1 = await fetchPublic(listing1.short_code);
  const pub2 = await fetchPublic(listing2.short_code);
  const pub3 = await fetchPublic(listing3.short_code);

  // ---- LEAD SUBMISSIONS
  const lead1Doc = await submitLead(listing1.short_code, {
    name: 'Alice Buyer', email: 'alice@example.com', phone: '+64 21 123 4567', intent: 'doc_request',
  });
  const lead1Reg = await submitLead(listing1.short_code, {
    name: 'Bob Browser', email: 'bob@example.com', phone: '', intent: 'register_interest',
  });

  // Edge: missing email
  await submitLead(listing1.short_code, { name: 'Ned NoEmail' }, 400);
  // Edge: missing name
  await submitLead(listing1.short_code, { email: 'noname@example.com' }, 400);
  // Edge: bad intent
  await submitLead(listing1.short_code, { name: 'X', email: 'x@example.com', intent: 'spam_me' }, 400);
  // Edge: XSS-y name
  await submitLead(listing1.short_code, {
    name: '<script>alert(1)</script>', email: 'xss@example.com', intent: 'register_interest',
  });
  // Edge: lead on listing with no docs (auction)
  const lead2Doc = await submitLead(listing2.short_code, {
    name: 'Carol Auction', email: 'carol@example.com', intent: 'doc_request',
  });

  // ---- DOWNLOADS
  if (lead1Doc?.lead_id && pub1.documents?.length) {
    await tryDownload(lead1Doc.lead_id, pub1.documents[0].id, 200);
    // Try lead from listing 1 against doc from listing 1 (should work)
    // Try cross-listing: lead 1 + listing 3's doc would fail since no docs on l3 yet, but try a non-existent doc
    await tryDownload(lead1Doc.lead_id, 99999, 404);
    // register_interest lead also gets a lead_id — does that work for download too? (probably YES — bug?)
    if (lead1Reg?.lead_id) {
      await tryDownload(lead1Reg.lead_id, pub1.documents[0].id, 200);
    }
  }

  // ---- DUMP RESULT
  const summary = {
    listings_created: [listing1, listing2, listing3].map(l => ({ id: l.id, code: l.short_code, address: l.address })),
    public_pages_keys: {
      listing1: Object.keys(pub1),
      listing2: Object.keys(pub2),
      listing3: Object.keys(pub3),
    },
    listing2_pub_documents: pub2.documents,
    listing2_pub_images: pub2.images,
  };
  log('SUMMARY', summary);

  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'dogfood-output.json'),
    JSON.stringify({ runs: LOG }, null, 2)
  );
  console.log('\nDogfood log written to scripts/dogfood-output.json');
}

main().catch(err => { console.error(err); process.exit(1); });
