// DarkTerrain - daily war map
// Map initialization
const map = L.map('map', {
  zoomControl: true,
  attributionControl: true
}).setView([48.5, 37.5], 7);

// Dark tile layer (CartoDB Dark Matter - free)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Layer for zones
const zonesLayer = L.layerGroup().addTo(map);

// Colors for different sides
const SIDE_COLORS = {
  A: { color: '#e63946', fillColor: '#e63946', fillOpacity: 0.35, weight: 2 },
  B: { color: '#457b9d', fillColor: '#457b9d', fillOpacity: 0.35, weight: 2 },
  neutral: { color: '#888', fillColor: '#888', fillOpacity: 0.2, weight: 2 }
};

// Load data for a specific date
async function loadDay(date) {
  zonesLayer.clearLayers();
  const info = document.getElementById('info');
  info.textContent = 'Loading ' + date + '...';

  try {
    const res = await fetch('data/' + date + '.json');
    if (!res.ok) throw new Error('No data for ' + date);

    const data = await res.json();

    data.zones.forEach(zone => {
      const style = SIDE_COLORS[zone.side] || SIDE_COLORS.neutral;
      L.polygon(zone.coords, style)
        .bindPopup(
          '<b>' + zone.name + '</b><br>' +
          'Side: ' + (zone.side || 'unknown') +
          (zone.note ? '<br><i>' + zone.note + '</i>' : '')
        )
        .addTo(zonesLayer);
    });

    info.textContent =
      'Zones: ' + data.zones.length +
      ' | Date: ' + date +
      (data.source ? ' | Source: ' + data.source : '');

  } catch (err) {
    info.textContent = 'Error: ' + err.message;
  }
}

// Date picker handler
document.getElementById('datePicker').addEventListener('change', (e) => {
  loadDay(e.target.value);
});

// Initial load
loadDay('2026-10-11');
