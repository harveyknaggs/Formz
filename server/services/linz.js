class LinzNotConfiguredError extends Error {
  constructor(message = 'LINZ_API_KEY is not set') {
    super(message);
    this.name = 'LinzNotConfiguredError';
  }
}

class LinzApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'LinzApiError';
    this.status = status;
  }
}

const BASE_HOST = 'https://data.linz.govt.nz';
const ADDRESS_LAYER = 'layer-105689';
const PARCEL_LAYER = 'layer-50804';
const TITLE_LAYER = 'layer-50806';

function normalizeTenureType(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.includes('fee simple')) return 'freehold';
  if (s.includes('cross lease')) return 'cross_lease';
  if (s.includes('unit title') || s.includes('stratum')) return 'unit_title';
  if (s.includes('leasehold') || s.includes('lease')) return 'leasehold';
  return 'unknown';
}

function requireKey() {
  const key = process.env.LINZ_API_KEY;
  if (!key) throw new LinzNotConfiguredError();
  return key;
}

function buildWfsUrl(key, params) {
  const qs = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    outputFormat: 'json',
    ...params,
  }).toString();
  return `${BASE_HOST}/services;key=${encodeURIComponent(key)}/wfs?${qs}`;
}

async function wfsFetch(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (err) {
    throw new LinzApiError(`LINZ network error: ${err.message}`, 0);
  }
  if (!res.ok) {
    throw new LinzApiError(`LINZ returned HTTP ${res.status}`, res.status);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new LinzApiError(`LINZ returned invalid JSON: ${err.message}`, res.status);
  }
}

async function searchAddresses(query, limit = 10) {
  const key = requireKey();
  if (typeof query !== 'string' || !query.trim()) return [];

  const safe = query.trim().replace(/'/g, "''");
  const cql = `full_address_ascii ILIKE '${safe}%'`;

  const url = buildWfsUrl(key, {
    typeNames: ADDRESS_LAYER,
    count: String(Math.max(1, Math.min(50, limit))),
    cql_filter: cql,
  });

  const data = await wfsFetch(url);
  const features = Array.isArray(data && data.features) ? data.features : [];

  return features.map((f) => {
    const p = f.properties || {};
    const coords = (f.geometry && Array.isArray(f.geometry.coordinates)) ? f.geometry.coordinates : [null, null];
    return {
      linz_id: f.id || null,
      full_address: p.full_address || p.full_address_ascii || null,
      suburb: p.suburb_locality || null,
      city: p.town_city || null,
      postcode: p.postcode || null,
      latitude: typeof coords[1] === 'number' ? coords[1] : null,
      longitude: typeof coords[0] === 'number' ? coords[0] : null,
    };
  });
}

async function lookupTitleTenure(titleRef) {
  const key = requireKey();
  if (typeof titleRef !== 'string' || !titleRef.trim()) return null;
  const safe = titleRef.trim().replace(/'/g, "''");
  const url = buildWfsUrl(key, {
    typeNames: TITLE_LAYER,
    count: '1',
    cql_filter: `title_no='${safe}'`,
  });
  try {
    const data = await wfsFetch(url);
    const features = Array.isArray(data && data.features) ? data.features : [];
    if (features.length === 0) return null;
    const p = features[0].properties || {};
    return p.type || p.estate_type || p.title_type || null;
  } catch (err) {
    console.warn('LINZ title tenure lookup failed:', err.message);
    return null;
  }
}

async function getParcelForPoint(latitude, longitude) {
  const key = requireKey();
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cql = `CONTAINS(shape, POINT(${lng} ${lat}))`;

  const url = buildWfsUrl(key, {
    typeNames: PARCEL_LAYER,
    count: '1',
    cql_filter: cql,
  });

  const data = await wfsFetch(url);
  const features = Array.isArray(data && data.features) ? data.features : [];
  if (features.length === 0) return null;

  const p = features[0].properties || {};
  const legal_description = typeof p.appellation === 'string' && p.appellation.trim() ? p.appellation.trim() : null;

  let land_area_m2 = null;
  if (Number.isFinite(Number(p.shape_area))) land_area_m2 = Math.round(Number(p.shape_area));
  else if (Number.isFinite(Number(p.survey_area))) land_area_m2 = Math.round(Number(p.survey_area));

  const titlesStr = typeof p.titles === 'string' && p.titles.trim() ? p.titles.trim() : null;
  const title_references = titlesStr
    ? titlesStr.split(/[,;]\s*/).map(s => s.trim()).filter(Boolean)
    : [];

  let tenure_type = null;
  if (title_references.length > 0) {
    const rawType = await lookupTitleTenure(title_references[0]);
    tenure_type = normalizeTenureType(rawType);
  }

  return {
    legal_description,
    land_area_m2,
    titles: titlesStr,
    title_references,
    tenure_type,
  };
}

module.exports = {
  searchAddresses,
  getParcelForPoint,
  lookupTitleTenure,
  LinzNotConfiguredError,
  LinzApiError,
  isConfigured: () => !!process.env.LINZ_API_KEY,
};
