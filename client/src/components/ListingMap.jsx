export default function ListingMap({ latitude, longitude, address }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const offset = 0.004;
  const bbox = [lng - offset, lat - offset * 0.6, lng + offset, lat + offset * 0.6].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
  const fullLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Location</h2>
        <a
          href={fullLink}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Open larger map ↗
        </a>
      </div>
      <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
        <iframe
          title={`Map for ${address || 'listing'}`}
          className="w-full h-full border-0"
          loading="lazy"
          src={src}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">© OpenStreetMap contributors</p>
    </div>
  );
}
