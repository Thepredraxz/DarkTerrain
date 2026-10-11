// ============================================
// DarkTerrain - daily war map with editor
// ============================================

// ---------- Map init ----------
const map = L.map('map', {
  zoomControl: true
}).setView([48.5, 37.5], 6);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

// ---------- Layers ----------
const zonesLayer = L.layerGroup().addTo(map);       // loaded zones
const drawnLayer = new L.FeatureGroup().addTo(map); // user drawings

// ---------- Colors ----------
const SIDE_COLORS = {
  A:       { color: '#d62828', fillColor: '#d62828', fillOpacity: 0.45, weight: 2 },
  B:       { color: '#1d3557', fillColor: '#1d3557', fillOpacity: 0.45, weight: 2 },
  neutral: { color: '#888888', fillColor: '#888888', fillOpacity: 0.30, weight: 2 }
};

// ---------- Draw controls ----------
const drawControl = new L.Control.Draw({
  position: 'topleft',
  edit: {
    featureGroup: drawnLayer,
    remove: true
  },
  draw: {
    polygon: {
      allowIntersection: false,
      shapeOptions: { color: '#ffcc00', weight: 2, fillOpacity: 0.3 }
    },
    polyline: {
      shapeOptions: { color: '#ffcc00', weight: 3 }
    },
    rectangle: false,
    circle: false,
    circlemarker: false,
    marker: false
  }
});
map.addControl(drawControl);

// ---------- Helpers ----------
function getToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------- Load data for a date ----------
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

      if (zone.type === 'line') {
        // front line
        L.polyline(zone.coords, { color: '#ffcc00', weight: 3 })
          .bindTooltip(zone.name || 'Front line', { sticky: true })
          .addTo(zonesLayer);
      } else {
        // polygon zone
        L.polygon(zone.coords, style)
          .bindTooltip(zone.name || zone.side || 'Zone', { sticky: true })
          .addTo(zonesLayer);
      }
    });

    info.textContent =
      'Zones: ' + data.zones.length +
      ' | Date: ' + date +
      (data.source ? ' | Source: ' + data.source : '');

  } catch (err) {
    info.textContent = 'Error: ' + err.message;
  }
}

// ---------- Auto date ----------
const today = getToday();
const datePicker = document.getElementById('datePicker');
datePicker.value = today;
datePicker.max = today;
datePicker.min = '2022-02-24';

datePicker.addEventListener('change', (e) => loadDay(e.target.value));

// ---------- Initial load ----------
loadDay(today);

// ---------- Export drawings ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  const features = drawnLayer.getLayers();
  const zones = [];

  features.forEach(layer => {
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0];
      const coords = latlngs.map(p => [round(p.lat), round(p.lng)]);
      // close ring
      if (coords.length > 0) coords.push(coords[0]);
      zones.push({
        name: 'Zone ' + (zones.length + 1),
        side: 'neutral',
        type: 'polygon',
        coords: coords
      });
    } else if (layer instanceof L.Polyline) {
      const latlngs = layer.getLatLngs();
      const coords = latlngs.map(p => [round(p.lat), round(p.lng)]);
      zones.push({
        name: 'Front line ' + (zones.length + 1),
        type: 'line',
        coords: coords
      });
    }
  });

  const output = {
    date: datePicker.value,
    source: 'manual drawing',
    zones: zones
  };

  document.getElementById('exportText').value = JSON.stringify(output, null, 2);
  document.getElementById('exportBox').style.display = 'block';
});

function round(n) {
  return Math.round(n * 10000) / 10000;
}
