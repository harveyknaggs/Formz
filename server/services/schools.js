const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'nz-schools.json');
const EARTH_RADIUS_KM = 6371;

let schools = [];
try {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) schools = parsed;
} catch (err) {
  console.error(`schools.js: failed to load ${DATA_PATH}: ${err.message}`);
  schools = [];
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function getNearbySchools(lat, lng, radiusKm = 3, limit = 5) {
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return [];

  const within = [];
  for (const s of schools) {
    const d = haversineKm(latN, lngN, s.latitude, s.longitude);
    if (d <= radiusKm) within.push({ school: s, d });
  }
  within.sort((a, b) => a.d - b.d);
  return within.slice(0, Math.max(0, limit)).map(({ school, d }) => ({
    name: school.name,
    type: school.type,
    distance_km: Math.round(d * 10) / 10,
  }));
}

module.exports = { getNearbySchools };
