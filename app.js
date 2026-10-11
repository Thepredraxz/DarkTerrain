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
  A:       { color: '#d62828', fillColor: '#d62828', fillOpacity: 0.45, weight: 2 }, // red
  B:       { color: '#1d3557', fillColor: '#1d3557', fillOpacity: 0.45, weight: 2 }, // blue
  neutral: { color: '#888888', fillColor: '#888888', fillOpacity: 0.40, weight: 2 }, // grey
  front:   { color: '#d62828', fillColor: '#d62828', fillOpacity: 0.9, weight: 4 }  // red line
};

// Current drawing mode: 'A' (red), 'neutral' (grey), 'front' (red line)
let currentMode = 'A';

function getDrawStyle() {
  if (currentMode === 'front') {
    return { color: '#d62828', weight: 4, opacity: 0.9 };
  }
  const s = SIDE_COLORS[currentMode];
  return { color: s.color, fillColor: s.fillColor, fillOpacity: s.fillOpacity, weight: 2 };
}

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
      shapeOptions: getDrawStyle()
    },
    polyline: {
      shapeOptions: getDrawStyle()
    },
    rectangle: false,
    circle: false,
    circlemarker: false,
    marker: false
  }
});
map.addControl(drawControl);

// Re-apply style when mode changes
function refreshDrawStyles() {
  const style = getDrawStyle();
  drawControl.options.draw.polygon.shapeOptions = style;
  drawControl.options.draw.polyline.shapeOptions = style;
}

// ---------- Mode buttons (custom control) ----------
const modeControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd: function() {
    const div = L.DomUtil.create('div', 'mode-control');
    div.style.cssText = 'background:#1a1a1a;padding:6px;border-radius:8px;display:flex;flex-direction:column;gap:4px;margin-top:10px;';
    div.innerHTML = `
      <button class="mode-btn" data-mode="A" style="background:#d62828;color:#fff;border:none;padding:6px 10px;border-radius:5px;font-size:12px;cursor:pointer;">🔴 Red</button>
      <button class="mode-btn" data-mode="neutral" style="background:#888;color:#fff;border:none;padding:6px 10px;border-radius:5px;font-size:12px;cursor:pointer;">⚫ Grey</button>
      <button class="mode-btn" data-mode="front" style="background:#8b0000;color:#fff;border:none;padding:6px 10px;border-radius:5px;font-size:12px;cursor:pointer;">— Front</button>
    `;
    // prevent map interactions
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    // click handlers
    setTimeout(() => {
      div.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentMode = btn.getAttribute('data-mode');
          refreshDrawStyles();
          // highlight active
          div.querySelectorAll('.mode-btn').forEach(b => b.style.outline = 'none');
          btn.style.outline = '2px solid #ffcc00';
        });
      });
      // default highlight Red
      div.querySelector('[data-mode="A"]').style.outline = '2px solid #ffcc00';
    }, 0);

    return div;
  }
});
map.addControl(new modeControl());

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
      if (coords.length > 0) coords.push(coords[0]);
      // determine side by color
      const color = layer.options.color;
      let side = 'neutral';
      if (color === '#d62828') side = 'A';
      else if (color === '#1d3557') side = 'B';

      zones.push({
        name: 'Zone ' + (zones.length + 1),
        side: side,
        type: 'polygon',
        coords: coords
      });
    } else if (layer instanceof L.Polyline) {
      const latlngs = layer.getLatLngs();
      const coords = latlngs.map(p => [round(p.lat), round(p.lng)]);
      zones.push({
        name: 'Front line ' + (zones.length + 1),
        type: 'line',
        coords: coords,
        side: 'front'
      });
    }
  });

  const output = {
    date: datePicker.value,
    source: 'manual drawing',
    zones: zones
  };

  document.getElementById('exportText').value = JSON.stringify(output, null, 2);
  document.getElementById('copyStatus').textContent = '';
  document.getElementById('exportBox').style.display = 'block';
});

function round(n) {
  return Math.round(n * 10000) / 10000;
}

// ---------- Copy to clipboard ----------
document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = document.getElementById('exportText').value;
  const status = document.getElementById('copyStatus');

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = '✅ Copied! Now click "Open GitHub" and paste there.';
    status.style.color = '#2a7';
  } catch (err) {
    // fallback for old browsers
    const ta = document.getElementById('exportText');
    ta.select();
    document.execCommand('copy');
    status.textContent = '✅ Copied (fallback). Now open GitHub.';
    status.style.color = '#2a7';
  }
});

// ---------- Open GitHub edit page ----------
document.getElementById('openGithubBtn').addEventListener('click', () => {
  const date = datePicker.value;
  const url = `https://github.com/Thepredrazx/DarkTerrain/edit/main/data/${date}.json`;
  window.open(url, '_blank');
});
