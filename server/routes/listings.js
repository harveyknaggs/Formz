const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { customAlphabet } = require('nanoid');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { publicFormLimiter } = require('../middleware/rateLimit');
const { uploadPropertyDoc } = require('../middleware/upload');
const { isValidEmail } = require('../utils/validators');
const { sendLeadNotification, sendDocPackToLead } = require('../services/email');
const { UPLOADS_DIR } = require('../config/paths');

const router = express.Router();

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 5);

const ALLOWED_KINDS = ['lim', 'title', 'builders_report', 'other'];
const ALLOWED_STATUS = ['active', 'draft', 'sold', 'withdrawn'];
const UPDATABLE_FIELDS = ['address', 'suburb', 'city', 'description', 'asking_price', 'bedrooms', 'bathrooms', 'floor_area', 'land_area', 'status', 'hero_image_url'];

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

  const shortCode = await generateUniqueShortCode(db);

  const result = await db.prepare(`
    INSERT INTO properties (agent_id, short_code, address, suburb, city, description, asking_price, bedrooms, bathrooms, floor_area, land_area, status, hero_image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.agent.id, shortCode, address, suburb, city, description, askingPrice, bedrooms, bathrooms, floorArea, landArea, status, heroImageUrl);

  const row = await db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Listing not found' });

  const property = await db.prepare('SELECT * FROM properties WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
  if (!property) return res.status(404).json({ error: 'Listing not found' });

  const documents = await db.prepare('SELECT id, property_id, kind, label, file_path, mime_type, file_size, uploaded_at FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC').all(id);
  const leads = await db.prepare('SELECT id, property_id, name, email, phone, ip, user_agent, created_at FROM property_leads WHERE property_id = ? ORDER BY created_at DESC').all(id);

  res.json({ ...property, documents, leads });
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

  for (const [field, max] of [['suburb', 120], ['city', 120], ['description', 5000], ['asking_price', 60], ['hero_image_url', 500]]) {
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

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUS.includes(body.status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUS.join(', ')}` });
    }
    updates.status = body.status;
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
  await db.prepare('DELETE FROM properties WHERE id = ?').run(id);

  const propDir = path.join(UPLOADS_DIR, 'properties', existing.short_code);
  try {
    fs.rmSync(propDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Failed to remove property files at', propDir, '-', err.message);
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

router.get('/public/:shortCode', publicFormLimiter, async (req, res) => {
  const db = getDb();
  const code = req.params.shortCode;
  if (typeof code !== 'string' || !/^[a-z0-9]{3,12}$/.test(code)) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const property = await db.prepare(`
    SELECT p.id, p.short_code, p.address, p.suburb, p.city, p.description, p.asking_price,
           p.bedrooms, p.bathrooms, p.floor_area, p.land_area, p.hero_image_url, p.status,
           a.name AS agent_name
    FROM properties p
    JOIN agents a ON a.id = p.agent_id
    WHERE p.short_code = ?
  `).get(code);

  if (!property || property.status !== 'active') return res.status(404).json({ error: 'Listing not found' });

  const documents = await db.prepare('SELECT id, kind, label FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC').all(property.id);

  const { status, ...publicProperty } = property;
  res.json({ ...publicProperty, documents });
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

  const ip = req.ip;
  const userAgent = (req.get('User-Agent') || '').slice(0, 500);

  const result = await db.prepare(`
    INSERT INTO property_leads (property_id, agent_id, name, email, phone, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(property.id, property.agent_id, name, email, phone, ip, userAgent);

  const leadId = result.lastInsertRowid;
  const lead = { id: leadId, name, email, phone };
  const documents = await db.prepare('SELECT id, kind, label FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC').all(property.id);

  if (property.agent_email) {
    sendLeadNotification({
      agentId: property.agent_id,
      to: property.agent_email,
      agentName: property.agent_name,
      property,
      lead
    }).catch(err => console.error('sendLeadNotification failed:', err.message));
  }

  sendDocPackToLead({
    to: email,
    leadName: name,
    property,
    documents,
    leadId
  }).catch(err => console.error('sendDocPackToLead failed:', err.message));

  res.status(201).json({ message: 'Thanks — check your email for the documents.', lead_id: leadId });
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
