// ==============================
// Imports Firebase (CDN ES Modules)
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } 
from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ==============================
// Configuration Firebase
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyB3ld4LJXEoT8cm9CiEgnadXPG_ElEfYfo",
  authDomain: "gpstracker-1728b.firebaseapp.com",
  databaseURL: "https://gpstracker-1728b-default-rtdb.firebaseio.com",
  projectId: "gpstracker-1728b",
  storageBucket: "gpstracker-1728b.firebasestorage.app",
  messagingSenderId: "162917371145",
  appId: "1:162917371145:web:ace94076f2d7036d30d7d8",
  measurementId: "G-V1KVBEJN72"
};

// ==============================
// Initialisation Firebase
// ==============================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==============================
// Paramètres généraux
// ==============================
const settings = {
  updateFrequency: 10000, // 10 secondes
  historySize: 10,
  timeFormat: '24',
  tempUnit: 'celsius',
  thresholds: {
    nitrogen: { min: 150, max: 350 },
    phosphorus: { min: 2500, max: 4000 },
    salinity: { min: 0.2, max: 1.0 }
  }
};

// ==============================
// Utils
// ==============================
function formatTime(timestamp, format = '24') {
  const date = new Date(timestamp);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  minutes = minutes < 10 ? '0' + minutes : minutes;

  if (format === '12') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return `${hours}:${minutes}`;
}

function convertTemp(value, unit) {
  return unit === 'fahrenheit' ? (value * 9/5) + 32 : value;
}

function updateValue(elementId, value, unit) {
  const element = document.getElementById(elementId);
  if (element && value !== undefined && value !== null) {
    element.textContent = value + unit;
  }
}

function hideLoadingIndicators() {
  document.querySelectorAll('.loading').forEach(el => {
    el.style.display = 'none';
  });
}

// ==============================
// Navigation
// ==============================
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
    link.classList.add('active');

    const sectionId = link.getAttribute('data-section') + '-section';
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
  });
});

// ==============================
// Références Firebase
// ==============================
const npkRef = ref(db, "/npk_last");
const historyRef = query(ref(db, '/npk_data'), orderByChild('timestamp'), limitToLast(10));

// ==============================
// Historique
// ==============================
function updateHistory(data) {
  const npHistory = document.getElementById('np-history');
  const kphHistory = document.getElementById('kph-history');
  const otherHistory = document.getElementById('other-history');

  npHistory.innerHTML = '';
  kphHistory.innerHTML = '';
  otherHistory.innerHTML = '';

  const sortedData = Object.values(data).sort((a, b) => b.timestamp - a.timestamp).slice(0, settings.historySize);

  sortedData.forEach(item => {
    const time = formatTime(item.timestamp, settings.timeFormat);

    const npRow = `<tr><td>${time}</td><td>${item.nitrogen || '-'}</td><td>${item.phosphorus || '-'}</td></tr>`;
    const kphRow = `<tr><td>${time}</td><td>${item.potassium || '-'}</td><td>${item.pH || '-'}</td></tr>`;
    const otherRow = `<tr><td>${time}</td><td>${item.conductivity || '-'}</td><td>${item.salinity || '-'}</td></tr>`;

    npHistory.insertAdjacentHTML('beforeend', npRow);
    kphHistory.insertAdjacentHTML('beforeend', kphRow);
    otherHistory.insertAdjacentHTML('beforeend', otherRow);
  });
}

// ==============================
// Vérification des alertes
// ==============================
function checkAlerts(data) {
  const alerts = [];
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (data.salinity > settings.thresholds.salinity.max) {
    alerts.push({
      type: 'danger',
      title: 'Niveau de salinité critique',
      message: `Le niveau de salinité (${data.salinity} g/L) dépasse le seuil critique.`,
      time: now
    });
  }

  if (data.phosphorus < settings.thresholds.phosphorus.min) {
    alerts.push({
      type: 'warning',
      title: 'Phosphore faible',
      message: `Le phosphore (${data.phosphorus} mg/kg) est sous le seuil minimal.`,
      time: now
    });
  }

  if (data.nitrogen > settings.thresholds.nitrogen.max) {
    alerts.push({
      type: 'warning',
      title: 'Azote élevé',
      message: `L’azote (${data.nitrogen} mg/kg) dépasse le seuil maximal.`,
      time: now
    });
  }

  return alerts;
}

function displayAlerts(alerts) {
  const activeAlerts = document.getElementById('active-alerts');
  activeAlerts.innerHTML = '';

  if (alerts.length === 0) {
    activeAlerts.innerHTML = `<li class="alert-item">
      <div class="alert-icon"><i class="fas fa-check-circle" style="color: var(--success);"></i></div>
      <div class="alert-content">
        <h4>Aucune alerte active</h4>
        <p>Tous les paramètres sont normaux</p>
        <div class="alert-time">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div></li>`;
    return;
  }

  alerts.forEach(alert => {
    activeAlerts.insertAdjacentHTML('beforeend', `
      <li class="alert-item">
        <div class="alert-icon">
          <i class="fas fa-exclamation-circle" style="color: ${alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)'}"></i>
        </div>
        <div class="alert-content">
          <h4>${alert.title}</h4>
          <p>${alert.message}</p>
          <div class="alert-time">Aujourd'hui, ${alert.time}</div>
        </div>
      </li>
    `);
  });
}

// ==============================
// Listener Firebase
// ==============================
onValue(npkRef, snapshot => {
  const data = snapshot.val();
  if (data) {
    updateValue("nitrogen", data.nitrogen, " mg/kg");
    updateValue("phosphorus", data.phosphorus, " mg/kg");
    updateValue("potassium", data.potassium, " mg/kg");
    updateValue("ph", data.pH, "");
    updateValue("conductivity", data.conductivity, " mS/cm");
    updateValue("salinity", data.salinity, " g/L");
    updateValue("tds", data.TDS, " ppm");
    updateValue("temperature", convertTemp(data.temperature, settings.tempUnit), settings.tempUnit === 'celsius' ? '°C' : '°F');

    const alerts = checkAlerts(data);
    displayAlerts(alerts);

    hideLoadingIndicators();
  }
});

onValue(historyRef, snapshot => {
  const data = snapshot.val();
  if (data) updateHistory(data);
});

// ==============================
// IA Assistant (OpenAI)
// ==============================
const openaiApiKey = "TON_API_KEY_ICI";

document.getElementById('ai-submit').addEventListener('click', async () => {
  const input = document.getElementById('ai-question');
  const question = input.value.trim();
  if (!question) return;

  const recList = document.getElementById('recommendations-list');
  recList.innerHTML = '<li>Réponse en cours...</li>';

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Tu es un assistant agricole en français, précis et clair." },
          { role: "user", content: question }
        ]
      })
    });

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content || "Aucune réponse obtenue.";
    recList.innerHTML = `<li>${answer}</li>`;
  } catch (err) {
    recList.innerHTML = '<li>Erreur lors de la requête à l’IA.</li>';
    console.error(err);
  }
});

document.getElementById('ai-question').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('ai-submit').click();
  }
});
