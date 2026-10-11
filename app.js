// ============================================
// DarkTerrain - daily war map
// Auto-loads today's date
// ============================================

// ---------- Map initialization ----------
const map = L.map('map', {
  zoomControl: true,
  attributionControl: true
}).setView([50.1, 36.2], 10);

// Dark tile layer (free, no API key needed)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

// ---------- Layers ----------
const zonesLayer = L.layerGroup().addTo(map);

// ---------- Side colors ----------
const SIDE_COLORS = {
  A:       { color: '#d62828', fillColor: '#d62828', fillOpacity: 0.45, weight: 2 },
  B:       { color: '#1d3557', fillColor: '#1d3557', fillOpacity: 0.45, weight: 2 },
  neutral: { color: '#888888', fillColor: '#888888', fillOpacity: 0.20, weight: 2 }
};

// ---------- Helpers ----------

// Today's date in YYYY-MM-DD (local timezone)
function getToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------- Load data for a specific date ----------
async function loadDay(date) {
  zonesLayer.clearLayers();
  const info = document.getElementById('info');
  info.textContent = 'Loading ' + date + '...';

  try {
    const res = await fetch('data/' + date + '.json');
    if (!res.ok) throw new Error('No data for ' + date);

    const data = await res.json();

    if (!data.zones || data.zones.length === 0) {
      info.textContent = 'No zones for ' + date;
      return;
    }

    data.zones.forEach(zone => {
      const style = SIDE_COLORS[zone.side] || SIDE_COLORS.neutral;
      const popup =
        '<b>' + zone.name + '</b><br>' +
        'Side: ' + (zone.side || 'unknown') +
        (zone.note ? '<br><i>' + zone.note + '</i>' : '');

      L.polygon(zone.coords, style)
        .bindPopup(popup)
        .addTo(zonesLayer);
    });

    info.textContent =
      'Zones: ' + data.zones.length +
      ' | Date: ' + date +
      (data.source ? ' | Source: ' + data.source : '');

  } catch (err) {
    info.textContent = 'Error: ' + err.message;
    console.warn(err);
  }
}

// ---------- Auto date setup ----------
const today = getToday();

const datePicker = document.getElementById('datePicker');
datePicker.value = today;
datePicker.max = today;            // can't pick future dates
datePicker.min = '2022-02-24';     // adjust to your earliest data

// ---------- Date picker handler ----------
datePicker.addEventListener('change', (e) => {
  loadDay(e.target.value);
});

// ---------- Initial load ----------
loadDay(today);
