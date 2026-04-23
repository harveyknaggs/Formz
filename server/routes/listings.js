const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { customAlphabet } = require('nanoid');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { publicFormLimiter } = require('../middleware/rateLimit');
const { uploadPropertyDoc, uploadPropertyImage } = require('../middleware/upload');
const { isValidEmail } = require('../utils/validators');
const { sendLeadNotification, sendDocPackToLead, sendRegisterInterestConfirmation } = require('../services/email');
const linz = require('../services/linz');
const { getNearbySchools } = require('../services/schools');
const { processPropertyImage, removeImageFiles } = require('../services/imagePipeline');
const { UPLOADS_DIR } = require('../config/paths');

const router = express.Router();

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 5);

const ALLOWED_KINDS = ['lim', 'title', 'builders_report', 'other'];
const ALLOWED_STATUS = ['active', 'draft', 'sold', 'withdrawn'];
const UPDATABLE_FIELDS = ['address', 'suburb', 'city', 'description', 'asking_price', 'bedrooms', 'bathrooms', 'floor_area', 'land_area', 'status', 'hero_image_url', 'latitude', 'longitude', 'legal_description', 'land_area_m2', 'parcel_titles', 'tenure_type', 'year_built', 'construction_type', 'chattels', 'rates_annual', 'capital_value', 'matterport_url', 'youtube_url', 'floor_plan_url', 'sale_method', 'sale_deadline_at'];
const ALLOWED_TENURES = ['freehold', 'leasehold', 'cross_lease', 'unit_title', 'unknown'];
const ALLOWED_SALE_METHODS = ['price', 'by_negotiation', 'auction', 'tender', 'deadline_sale'];
const ALLOWED_CONSTRUCTION = ['weatherboard', 'brick', 'plaster', 'mixed', 'other'];
const ALLOWED_LEAD_INTENTS = ['doc_request', 'register_interest'];

async function generateUniqueShortCode(db) {
  for (let i = 0; i < 10; i++) {
    const code = nanoid();
    const existing = await db.prepare('SELECT id FROM properties WHERE short_code = ?').get(code);
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique short code after 10 attempts');
}

function asString(v, max) {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (max && trimmed.length > max) return undefined;
  return trimmed;
}

function asInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
}

function asCoord(v, min, max) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

function asFloat(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function asParcelTitles(v) {
  if (v === undefined || v === null || v === '') return null;
  if (Array.isArray(v)) {
    const joined = v.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean).join(', ');
    if (joined.length > 500) return undefined;
    return joined || null;
  }
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (trimmed.length > 500) return undefined;
  return trimmed || null;
}

function asTenure(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  if (!ALLOWED_TENURES.includes(v)) return undefined;
  return v;
}

function asEnum(v, allowed) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  if (!allowed.includes(v)) return undefined;
  return v;
}

function asYear(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  const currentYear = new Date().getFullYear();
  if (n < 1800 || n > currentYear + 5) return undefined;
  return n;
}

function asIsoTimestamp(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM property_documents WHERE property_id = p.id) AS document_count,
      (SELECT COUNT(*) FROM property_leads WHERE property_id = p.id) AS lead_count
    FROM properties p
    WHERE p.agent_id = ?
    ORDER BY p.created_at DESC
  `).all(req.agent.id);
  res.json(rows);
});

router.post('/', authenticate, async (req, res) => {
  const db = getDb();
  const body = req.body || {};

  const address = asString(body.address, 200);
  if (!address) return res.status(400).json({ error: 'address is required and must be 200 characters or fewer' });
  if (address === undefined) return res.status(400).json({ error: 'address is invalid' });

  const suburb = asString(body.suburb, 120);
  if (suburb === undefined) return res.status(400).json({ error: 'suburb must be a string up to 120 characters' });

  const city = asString(body.city, 120);
  if (city === undefined) return res.status(400).json({ error: 'city must be a string up to 120 characters' });

  const description = asString(body.description, 5000);
  if (description === undefined) return res.status(400).json({ error: 'description must be a string up to 5000 characters' });

  const askingPrice = asString(body.asking_price, 60);
  if (askingPrice === undefined) return res.status(400).json({ error: 'asking_price must be a string up to 60 characters' });

  const bedrooms = asInt(body.bedrooms);
  if (bedrooms === undefined) return res.status(400).json({ error: 'bedrooms must be a non-negative integer' });

  const bathrooms = asInt(body.bathrooms);
  if (bathrooms === undefined) return res.status(400).json({ error: 'bathrooms must be a non-negative integer' });

  const floorArea = asInt(body.floor_area);
  if (floorArea === undefined) return res.status(400).json({ error: 'floor_area must be a non-negative integer' });

  const landArea = asInt(body.land_area);
  if (landArea === undefined) return res.status(400).json({ error: 'land_area must be a non-negative integer' });

  let status = 'active';
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUS.includes(body.status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUS.join(', ')}` });
    }
    status = body.status;
  }

  const heroImageUrl = asString(body.hero_image_url, 500);
  if (heroImageUrl === undefined) return res.status(400).json({ error: 'hero_image_url must be a string up to 500 characters' });

  const latitude = asCoord(body.latitude, -90, 90);
  if (latitude === undefined) return res.status(400).json({ error: 'latitude must be a number between -90 and 90' });

  const longitude = asCoord(body.longitude, -180, 180);
  if (longitude === undefined) return res.status(400).json({ error: 'longitude must be a number between -180 and 180' });

  const legalDescription = asString(body.legal_description, 500);
  if (legalDescription === undefined) return res.status(400).json({ error: 'legal_description must be a string up to 500 characters' });

  const landAreaM2 = asFloat(body.land_area_m2);
  if (landAreaM2 === undefined) return res.status(400).json({ error: 'land_area_m2 must be a non-negative number' });

  const parcelTitles = asParcelTitles(body.parcel_titles);
  if (parcelTitles === undefined) return res.status(400).json({ error: 'parcel_titles must be a string or array of strings (max 500 chars joined)' });

  const tenureType = asTenure(body.tenure_type);
  if (tenureType === undefined) return res.status(400).json({ error: `tenure_type must be one of: ${ALLOWED_TENURES.join(', ')}` });

  const yearBuilt = asYear(body.year_built);
  if (yearBuilt === undefined) return res.status(400).json({ error: 'year_built must be a year between 1800 and 5 years from now' });

  const constructionType = asEnum(body.construction_type, ALLOWED_CONSTRUCTION);
  if (constructionType === undefined) return res.status(400).json({ error: `construction_type must be one of: ${ALLOWED_CONSTRUCTION.join(', ')}` });

  const chattels = asString(body.chattels, 2000);
  if (chattels === undefined) return res.status(400).json({ error: 'chattels must be a string up to 2000 characters' });

  const ratesAnnual = asString(body.rates_annual, 60);
  if (ratesAnnual === undefined) return res.status(400).json({ error: 'rates_annual must be a string up to 60 characters' });

  const capitalValue = asString(body.capital_value, 60);
  if (capitalValue === undefined) return res.status(400).json({ error: 'capital_value must be a string up to 60 characters' });

  const matterportUrl = asString(body.matterport_url, 500);
  if (matterportUrl === undefined) return res.status(400).json({ error: 'matterport_url must be a string up to 500 characters' });

  const youtubeUrl = asString(body.youtube_url, 500);
  if (youtubeUrl === undefined) return res.status(400).json({ error: 'youtube_url must be a string up to 500 characters' });

  const floorPlanUrl = asString(body.floor_plan_url, 500);
  if (floorPlanUrl === undefined) return res.status(400).json({ error: 'floor_plan_url must be a string up to 500 characters' });

  const saleMethod = asEnum(body.sale_method, ALLOWED_SALE_METHODS);
  if (saleMethod === undefined) return res.status(400).json({ error: `sale_method must be one of: ${ALLOWED_SALE_METHODS.join(', ')}` });

  const saleDeadlineAt = asIsoTimestamp(body.sale_deadline_at);
  if (saleDeadlineAt === undefined) return res.status(400).json({ error: 'sale_deadline_at must be an ISO 8601 date/time' });

  const shortCode = await generateUniqueShortCode(db);

  const result = await db.prepare(`
    INSERT INTO properties (agent_id, short_code, address, suburb, city, description, asking_price, bedrooms, bathrooms, floor_area, land_area, status, hero_image_url, latitude, longitude, legal_description, land_area_m2, parcel_titles, tenure_type, year_built, construction_type, chattels, rates_annual, capital_value, matterport_url, youtube_url, floor_plan_url, sale_method, sale_deadline_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.agent.id, shortCode, address, suburb, city, description, askingPrice, bedrooms, bathrooms, floorArea, landArea, status, heroImageUrl, latitude, longitude, legalDescription, landAreaM2, parcelTitles, tenureType, yearBuilt, constructionType, chattels, ratesAnnual, capitalValue, matterportUrl, youtubeUrl, floorPlanUrl, saleMethod, saleDeadlineAt);

  const row = await db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.get('/address-search', authenticate, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 3) return res.status(400).json({ error: 'q must be at least 3 characters', results: [] });

  try {
    const results = await linz.searchAddresses(q, 8);
    res.json({ results });
  } catch (err) {
    if (err instanceof linz.LinzNotConfiguredError) {
      return res.status(503).json({ error: 'Address lookup is not configured', results: [] });
    }
    if (err instanceof linz.LinzApiError) {
      console.error('LINZ address-search failed:', err.status, err.message);
      return res.status(502).json({ error: 'Address lookup temporarily unavailable', results: [] });
    }
    console.error('LINZ address-search error:', err.message);
    res.status(502).json({ error: 'Address lookup temporarily unavailable', results: [] });
  }
});

router.get('/address-details', authenticate, async (req, res) => {
  const lat = Number(req.query.latitude);
  const lng = Number(req.query.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return res.status(400).json({ error: 'latitude must be a number between -90 and 90' });
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ error: 'longitude must be a number between -180 and 180' });

  const emptyParcel = { legal_description: null, land_area_m2: null, titles: null, title_references: [], tenure_type: null };
  try {
    const parcel = await linz.getParcelForPoint(lat, lng);
    if (!parcel) return res.json(emptyParcel);
    res.json(parcel);
  } catch (err) {
    if (err instanceof linz.LinzNotConfiguredError) {
      return res.status(503).json({ error: 'Address lookup is not configured', ...emptyParcel });
    }
    if (err instanceof linz.LinzApiError) {
      console.error('LINZ address-details failed:', err.status, err.message);
      return res.status(502).json({ error: 'Address lookup temporarily unavailable', ...emptyParcel });
    }
    console.error('LINZ address-details error:', err.message);
    res.status(502).json({ error: 'Address lookup temporarily unavailable', ...emptyParcel });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Listing not found' });

  const property = await db.prepare('SELECT * FROM properties WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
  if (!property) return res.status(404).json({ error: 'Listing not found' });

  const documents = await db.prepare('SELECT id, property_id, kind, label, file_path, mime_type, file_size, uploaded_at FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC').all(id);
  const leads = await db.prepare('SELECT id, property_id, name, email, phone, ip, user_agent, created_at FROM property_leads WHERE property_id = ? ORDER BY created_at DESC').all(id);
  const images = await db.prepare('SELECT id, url, thumb_url, alt, sort_order, width, height, is_hero FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC').all(id);
  const open_homes = await db.prepare('SELECT id, property_id, start_at, end_at, created_at FROM property_open_homes WHERE property_id = ? ORDER BY start_at ASC').all(id);

  res.json({ ...property, documents, leads, images, open_homes });
});

router.put('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Listing not found' });

  const existing = await db.prepare('SELECT * FROM properties WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Listing not found' });

  const body = req.body || {};
  const updates = {};

  if (body.address !== undefined) {
    const v = asString(body.address, 200);
    if (!v) return res.status(400).json({ error: 'address is required and must be 200 characters or fewer' });
    if (v === undefined) return res.status(400).json({ error: 'address is invalid' });
    updates.address = v;
  }

  for (const [field, max] of [['suburb', 120], ['city', 120], ['description', 5000], ['asking_price', 60], ['hero_image_url', 500], ['legal_description', 500]]) {
    if (body[field] !== undefined) {
      const v = asString(body[field], max);
      if (v === undefined) return res.status(400).json({ error: `${field} must be a string up to ${max} characters` });
      updates[field] = v;
    }
  }

  for (const field of ['bedrooms', 'bathrooms', 'floor_area', 'land_area']) {
    if (body[field] !== undefined) {
      const v = asInt(body[field]);
      if (v === undefined) return res.status(400).json({ error: `${field} must be a non-negative integer` });
      updates[field] = v;
    }
  }

  for (const [field, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
    if (body[field] !== undefined) {
      const v = asCoord(body[field], min, max);
      if (v === undefined) return res.status(400).json({ error: `${field} must be a number between ${min} and ${max}` });
      updates[field] = v;
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUS.includes(body.status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUS.join(', ')}` });
    }
    updates.status = body.status;
  }

  if (body.land_area_m2 !== undefined) {
    const v = asFloat(body.land_area_m2);
    if (v === undefined) return res.status(400).json({ error: 'land_area_m2 must be a non-negative number' });
    updates.land_area_m2 = v;
  }

  if (body.parcel_titles !== undefined) {
    const v = asParcelTitles(body.parcel_titles);
    if (v === undefined) return res.status(400).json({ error: 'parcel_titles must be a string or array of strings (max 500 chars joined)' });
    updates.parcel_titles = v;
  }

  if (body.tenure_type !== undefined) {
    const v = asTenure(body.tenure_type);
    if (v === undefined) return res.status(400).json({ error: `tenure_type must be one of: ${ALLOWED_TENURES.join(', ')}` });
    updates.tenure_type = v;
  }

  if (body.year_built !== undefined) {
    const v = asYear(body.year_built);
    if (v === undefined) return res.status(400).json({ error: 'year_built must be a year between 1800 and 5 years from now' });
    updates.year_built = v;
  }

  if (body.construction_type !== undefined) {
    const v = asEnum(body.construction_type, ALLOWED_CONSTRUCTION);
    if (v === undefined) return res.status(400).json({ error: `construction_type must be one of: ${ALLOWED_CONSTRUCTION.join(', ')}` });
    updates.construction_type = v;
  }

  for (const [field, max] of [['chattels', 2000], ['rates_annual', 60], ['capital_value', 60], ['matterport_url', 500], ['youtube_url', 500], ['floor_plan_url', 500]]) {
    if (body[field] !== undefined) {
      const v = asString(body[field], max);
      if (v === undefined) return res.status(400).json({ error: `${field} must be a string up to ${max} characters` });
      updates[field] = v;
    }
  }

  if (body.sale_method !== undefined) {
    const v = asEnum(body.sale_method, ALLOWED_SALE_METHODS);
    if (v === undefined) return res.status(400).json({ error: `sale_method must be one of: ${ALLOWED_SALE_METHODS.join(', ')}` });
    updates.sale_method = v;
  }

  if (body.sale_deadline_at !== undefined) {
    const v = asIsoTimestamp(body.sale_deadline_at);
    if (v === undefined) return res.status(400).json({ error: 'sale_deadline_at must be an ISO 8601 date/time' });
    updates.sale_deadline_at = v;
  }

  const keys = Object.keys(updates).filter(k => UPDATABLE_FIELDS.includes(k));
  if (keys.length === 0) return res.status(400).json({ error: 'No updatable fields provided' });

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => updates[k]);
  await db.prepare(`UPDATE properties SET ${setClause} WHERE id = ?`).run(...values, id);

  const row = await db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Listing not found' });

  const existing = await db.prepare('SELECT * FROM properties WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Listing not found' });

  await db.prepare('DELETE FROM property_leads WHERE property_id = ?').run(id);
  await db.prepare('DELETE FROM property_documents WHERE property_id = ?').run(id);
  await db.prepare('DELETE FROM property_images WHERE property_id = ?').run(id);
  await db.prepare('DELETE FROM property_open_homes WHERE property_id = ?').run(id);
  await db.prepare('DELETE FROM properties WHERE id = ?').run(id);

  const propDir = path.join(UPLOADS_DIR, 'properties', existing.short_code);
  const imagesDir = path.join(UPLOADS_DIR, 'property-images', existing.short_code);
  for (const dir of [propDir, imagesDir]) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to remove property files at', dir, '-', err.message);
    }
  }

  res.json({ message: 'Listing deleted' });
});

async function propertyOwnershipCheck(req, res, next) {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Listing not found' });
  const property = await db.prepare('SELECT * FROM properties WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
  if (!property) return res.status(404).json({ error: 'Listing not found' });
  req.property = property;
  next();
}

router.post('/:id/documents', authenticate, propertyOwnershipCheck, (req, res, next) => {
  uploadPropertyDoc.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.message || 'Upload failed';
      if (msg === 'Only PDF files are allowed') return res.status(400).json({ error: msg });
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File exceeds 20 MB limit' });
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, async (req, res) => {
  const db = getDb();
  const property = req.property;

  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'file is required' });

  const body = req.body || {};
  let kind = 'other';
  if (body.kind !== undefined && body.kind !== '') {
    if (typeof body.kind !== 'string' || !ALLOWED_KINDS.includes(body.kind)) {
      return res.status(400).json({ error: `kind must be one of: ${ALLOWED_KINDS.join(', ')}` });
    }
    kind = body.kind;
  }

  const label = asString(body.label, 120);
  if (!label) return res.status(400).json({ error: 'label is required and must be 120 characters or fewer' });
  if (label === undefined) return res.status(400).json({ error: 'label is invalid' });

  const dir = path.join(UPLOADS_DIR, 'properties', property.short_code);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.pdf`;
  const absolutePath = path.join(dir, filename);
  fs.writeFileSync(absolutePath, req.file.buffer);

  const relativePath = path.posix.join('properties', property.short_code, filename);

  const result = await db.prepare(`
    INSERT INTO property_documents (property_id, kind, label, file_path, mime_type, file_size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(property.id, kind, label, relativePath, req.file.mimetype, req.file.size);

  const row = await db.prepare('SELECT * FROM property_documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.delete('/:id/documents/:docId', authenticate, async (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const docId = parseInt(req.params.docId);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(docId) || docId <= 0) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = await db.prepare(`
    SELECT d.* FROM property_documents d
    JOIN properties p ON p.id = d.property_id
    WHERE d.id = ? AND p.id = ? AND p.agent_id = ?
  `).get(docId, id, req.agent.id);

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  await db.prepare('DELETE FROM property_documents WHERE id = ?').run(docId);

  try {
    const abs = path.join(UPLOADS_DIR, doc.file_path);
    fs.rmSync(abs, { force: true });
  } catch (err) {
    console.error('Failed to remove file', doc.file_path, '-', err.message);
  }

  res.json({ message: 'Document deleted' });
});

router.post('/:id/open-homes', authenticate, propertyOwnershipCheck, async (req, res) => {
  const db = getDb();
  const property = req.property;
  const body = req.body || {};

  const startAt = asIsoTimestamp(body.start_at);
  if (!startAt) return res.status(400).json({ error: 'start_at is required and must be a valid ISO 8601 date/time' });
  if (startAt === undefined) return res.status(400).json({ error: 'start_at is invalid' });

  const endAt = asIsoTimestamp(body.end_at);
  if (!endAt) return res.status(400).json({ error: 'end_at is required and must be a valid ISO 8601 date/time' });
  if (endAt === undefined) return res.status(400).json({ error: 'end_at is invalid' });

  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return res.status(400).json({ error: 'end_at must be after start_at' });
  }

  const result = await db.prepare(`
    INSERT INTO property_open_homes (property_id, start_at, end_at)
    VALUES (?, ?, ?)
  `).run(property.id, startAt, endAt);

  const row = await db.prepare('SELECT id, property_id, start_at, end_at, created_at FROM property_open_homes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.delete('/:id/open-homes/:openHomeId', authenticate, propertyOwnershipCheck, async (req, res) => {
  const db = getDb();
  const property = req.property;
  const openHomeId = parseInt(req.params.openHomeId);
  if (!Number.isInteger(openHomeId) || openHomeId <= 0) return res.status(404).json({ error: 'Open home not found' });

  const row = await db.prepare('SELECT id FROM property_open_homes WHERE id = ? AND property_id = ?').get(openHomeId, property.id);
  if (!row) return res.status(404).json({ error: 'Open home not found' });

  await db.prepare('DELETE FROM property_open_homes WHERE id = ?').run(openHomeId);
  res.json({ message: 'Open home deleted' });
});

router.post('/:id/images', authenticate, propertyOwnershipCheck, (req, res, next) => {
  uploadPropertyImage.array('files', 20)(req, res, (err) => {
    if (err) {
      const msg = err.message || 'Upload failed';
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Each image must be 12 MB or less' });
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, async (req, res) => {
  const db = getDb();
  const property = req.property;
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length === 0) return res.status(400).json({ error: 'At least one image is required' });

  const existing = await db.prepare('SELECT COUNT(*) AS n FROM property_images WHERE property_id = ?').get(property.id);
  let nextSort = (existing?.n ?? 0);

  const created = [];
  for (const file of files) {
    try {
      const processed = await processPropertyImage(file.buffer, { shortCode: property.short_code });
      const isHero = nextSort === 0 ? 1 : 0;
      const result = await db.prepare(`
        INSERT INTO property_images (property_id, url, thumb_url, width, height, sort_order, is_hero)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        property.id,
        processed.url,
        processed.thumb_url,
        processed.width,
        processed.height,
        nextSort,
        isHero
      );
      const row = await db.prepare('SELECT id, url, thumb_url, alt, sort_order, width, height, is_hero FROM property_images WHERE id = ?').get(result.lastInsertRowid);
      created.push(row);
      nextSort += 1;
    } catch (err) {
      console.error('Image processing failed:', err.message);
      return res.status(400).json({ error: `Could not process image "${file.originalname}": ${err.message}` });
    }
  }

  res.status(201).json(created);
});

router.put('/:id/images/reorder', authenticate, propertyOwnershipCheck, async (req, res) => {
  const db = getDb();
  const property = req.property;
  const order = Array.isArray(req.body?.order) ? req.body.order.map(n => parseInt(n)).filter(n => Number.isInteger(n) && n > 0) : [];
  if (order.length === 0) return res.status(400).json({ error: 'order must be a non-empty array of image ids' });

  const rows = await db.prepare('SELECT id FROM property_images WHERE property_id = ?').all(property.id);
  const owned = new Set(rows.map(r => r.id));
  for (const id of order) {
    if (!owned.has(id)) return res.status(400).json({ error: `Image ${id} does not belong to this listing` });
  }

  for (let i = 0; i < order.length; i++) {
    await db.prepare('UPDATE property_images SET sort_order = ? WHERE id = ? AND property_id = ?').run(i, order[i], property.id);
  }

  const images = await db.prepare('SELECT id, url, thumb_url, alt, sort_order, width, height, is_hero FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC').all(property.id);
  res.json(images);
});

router.put('/:id/images/:imageId/hero', authenticate, propertyOwnershipCheck, async (req, res) => {
  const db = getDb();
  const property = req.property;
  const imageId = parseInt(req.params.imageId);
  if (!Number.isInteger(imageId) || imageId <= 0) return res.status(404).json({ error: 'Image not found' });

  const image = await db.prepare('SELECT * FROM property_images WHERE id = ? AND property_id = ?').get(imageId, property.id);
  if (!image) return res.status(404).json({ error: 'Image not found' });

  await db.prepare('UPDATE property_images SET is_hero = 0 WHERE property_id = ?').run(property.id);
  await db.prepare('UPDATE property_images SET is_hero = 1 WHERE id = ? AND property_id = ?').run(imageId, property.id);

  const images = await db.prepare('SELECT id, url, thumb_url, alt, sort_order, width, height, is_hero FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC').all(property.id);
  res.json(images);
});

router.delete('/:id/images/:imageId', authenticate, propertyOwnershipCheck, async (req, res) => {
  const db = getDb();
  const property = req.property;
  const imageId = parseInt(req.params.imageId);
  if (!Number.isInteger(imageId) || imageId <= 0) return res.status(404).json({ error: 'Image not found' });

  const image = await db.prepare('SELECT * FROM property_images WHERE id = ? AND property_id = ?').get(imageId, property.id);
  if (!image) return res.status(404).json({ error: 'Image not found' });

  await db.prepare('DELETE FROM property_images WHERE id = ?').run(imageId);
  removeImageFiles(image);

  if (image.is_hero) {
    const nextHero = await db.prepare('SELECT id FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1').get(property.id);
    if (nextHero) {
      await db.prepare('UPDATE property_images SET is_hero = 1 WHERE id = ?').run(nextHero.id);
    }
  }

  res.json({ message: 'Image deleted' });
});

router.get('/public/:shortCode', publicFormLimiter, async (req, res) => {
  const db = getDb();
  const code = req.params.shortCode;
  if (typeof code !== 'string' || !/^[a-z0-9]{3,12}$/.test(code)) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const property = await db.prepare(`
    SELECT p.id, p.short_code, p.address, p.suburb, p.city, p.description, p.asking_price,
           p.bedrooms, p.bathrooms, p.floor_area, p.land_area, p.hero_image_url, p.status,
           p.latitude, p.longitude, p.legal_description,
           p.land_area_m2, p.parcel_titles, p.tenure_type,
           p.year_built, p.construction_type, p.chattels, p.rates_annual, p.capital_value,
           p.matterport_url, p.youtube_url, p.floor_plan_url, p.sale_method, p.sale_deadline_at,
           a.name AS agent_name, a.email AS agent_email, a.phone AS agent_phone
    FROM properties p
    JOIN agents a ON a.id = p.agent_id
    WHERE p.short_code = ?
  `).get(code);

  if (!property || property.status !== 'active') return res.status(404).json({ error: 'Listing not found' });

  const documents = await db.prepare('SELECT id, kind, label FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC').all(property.id);

  let images = await db.prepare('SELECT id, url, thumb_url, alt, sort_order, width, height, is_hero FROM property_images WHERE property_id = ? ORDER BY is_hero DESC, sort_order ASC, id ASC').all(property.id);

  if (images.length === 0 && property.hero_image_url) {
    images = [{
      id: null,
      url: property.hero_image_url,
      thumb_url: property.hero_image_url,
      alt: null,
      sort_order: 0,
      width: null,
      height: null,
      is_hero: 1,
    }];
  }

  let nearby_schools = [];
  if (property.latitude != null && property.longitude != null) {
    try {
      nearby_schools = getNearbySchools(property.latitude, property.longitude);
    } catch (err) {
      console.error('Nearby schools lookup failed:', err.message);
    }
  }

  const open_homes = await db.prepare(`
    SELECT id, start_at, end_at
    FROM property_open_homes
    WHERE property_id = ? AND end_at > CURRENT_TIMESTAMP
    ORDER BY start_at ASC
  `).all(property.id);

  const { status, ...publicProperty } = property;
  res.json({ ...publicProperty, documents, images, nearby_schools, open_homes });
});

router.post('/public/:shortCode/lead', publicFormLimiter, async (req, res) => {
  const db = getDb();
  const code = req.params.shortCode;
  if (typeof code !== 'string' || !/^[a-z0-9]{3,12}$/.test(code)) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const property = await db.prepare(`
    SELECT p.*, a.name AS agent_name, a.email AS agent_email
    FROM properties p JOIN agents a ON a.id = p.agent_id
    WHERE p.short_code = ?
  `).get(code);

  if (!property || property.status !== 'active') return res.status(404).json({ error: 'Listing not found' });

  const body = req.body || {};
  const name = asString(body.name, 100);
  if (!name) return res.status(400).json({ error: 'name is required and must be 100 characters or fewer' });
  if (name === undefined) return res.status(400).json({ error: 'name is invalid' });

  if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  const email = body.email.trim();

  let phone = null;
  if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
    if (typeof body.phone !== 'string') return res.status(400).json({ error: 'phone must be a string' });
    const p = body.phone.trim();
    if (p.length > 40) return res.status(400).json({ error: 'phone must be 40 characters or fewer' });
    phone = p || null;
  }

  let intent = 'doc_request';
  if (body.intent !== undefined && body.intent !== null && body.intent !== '') {
    if (typeof body.intent !== 'string' || !ALLOWED_LEAD_INTENTS.includes(body.intent)) {
      return res.status(400).json({ error: `intent must be one of: ${ALLOWED_LEAD_INTENTS.join(', ')}` });
    }
    intent = body.intent;
  }

  const ip = req.ip;
  const userAgent = (req.get('User-Agent') || '').slice(0, 500);

  const result = await db.prepare(`
    INSERT INTO property_leads (property_id, agent_id, name, email, phone, ip, user_agent, intent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(property.id, property.agent_id, name, email, phone, ip, userAgent, intent);

  const leadId = result.lastInsertRowid;
  const lead = { id: leadId, name, email, phone, intent };

  if (property.agent_email) {
    sendLeadNotification({
      agentId: property.agent_id,
      to: property.agent_email,
      agentName: property.agent_name,
      property,
      lead
    }).catch(err => console.error('sendLeadNotification failed:', err.message));
  }

  if (intent === 'register_interest') {
    sendRegisterInterestConfirmation({
      agentId: property.agent_id,
      to: email,
      leadName: name,
      property,
    }).catch(err => console.error('sendRegisterInterestConfirmation failed:', err.message));

    return res.status(201).json({
      message: "Thanks — we'll let you know about open homes and price changes.",
      lead_id: leadId,
      intent,
    });
  }

  const documents = await db.prepare('SELECT id, kind, label FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC').all(property.id);

  sendDocPackToLead({
    agentId: property.agent_id,
    to: email,
    leadName: name,
    property,
    documents,
    leadId
  }).catch(err => console.error('sendDocPackToLead failed:', err.message));

  res.status(201).json({ message: 'Thanks — check your email for the documents.', lead_id: leadId, intent });
});

router.get('/download/:leadId/:docId', async (req, res) => {
  const db = getDb();
  const leadId = parseInt(req.params.leadId);
  const docId = parseInt(req.params.docId);

  const notFound = () => res.status(404).json({ error: 'Not found' });
  if (!Number.isInteger(leadId) || leadId <= 0 || !Number.isInteger(docId) || docId <= 0) return notFound();

  const lead = await db.prepare('SELECT * FROM property_leads WHERE id = ?').get(leadId);
  if (!lead) return notFound();

  const doc = await db.prepare('SELECT * FROM property_documents WHERE id = ?').get(docId);
  if (!doc) return notFound();

  if (doc.property_id !== lead.property_id) return notFound();

  const createdAt = new Date(lead.created_at);
  if (Number.isNaN(createdAt.getTime())) return notFound();
  const ageMs = Date.now() - createdAt.getTime();
  if (ageMs > 30 * 24 * 60 * 60 * 1000 || ageMs < 0) return notFound();

  const absolute = path.resolve(path.join(UPLOADS_DIR, doc.file_path));
  if (!absolute.startsWith(UPLOADS_DIR + path.sep) && absolute !== UPLOADS_DIR) return notFound();
  if (!fs.existsSync(absolute)) return notFound();

  const safeLabel = (doc.label || 'document').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 100) || 'document';
  res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeLabel}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(absolute);
});

module.exports = router;
