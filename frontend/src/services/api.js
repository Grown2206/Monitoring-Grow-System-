const API_URL = `http://${window.location.hostname}:3000/api`;

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Fehler');
  }
  return response.json();
};

export const api = {
  // Pflanzen
  getPlants: () => fetch(`${API_URL}/plants`).then(handleResponse),
  updatePlant: (slotId, data) => fetch(`${API_URL}/plants/${slotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  // Historie & Logs
  getHistory: () => fetch(`${API_URL}/history`).then(handleResponse),
  getLogs: () => fetch(`${API_URL}/logs`).then(handleResponse),

  // Kalender
  getEvents: () => fetch(`${API_URL}/calendar`).then(handleResponse),
  createEvent: (data) => fetch(`${API_URL}/calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  deleteEvent: (id) => fetch(`${API_URL}/calendar/${id}`, {
    method: 'DELETE'
  }).then(handleResponse),

  // AI Consultant
  getConsultation: (contextData) => fetch(`${API_URL}/ai/consult`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contextData)
  }).then(handleResponse),

  // Automation & Config
  getAutoConfig: () => fetch(`${API_URL}/settings/automation`).then(handleResponse),
  updateAutoConfig: (data) => fetch(`${API_URL}/settings/automation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  // Webhooks (Benachrichtigungen)
  getWebhook: () => fetch(`${API_URL}/settings/webhook`).then(handleResponse),
  updateWebhook: (url) => fetch(`${API_URL}/settings/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  }).then(handleResponse),

  // System Befehle
  systemReboot: () => fetch(`${API_URL}/system/reboot`, { method: 'POST' }).then(handleResponse),
  systemReset: () => fetch(`${API_URL}/system/reset`, { method: 'POST' }).then(handleResponse),

  // NEU: Relais schalten (Wichtig fŸr Controls.jsx)
  toggleRelay: (relayKey, state) => fetch(`${API_URL}/controls/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relay: relayKey, state: state })
  }).then(handleResponse),
};