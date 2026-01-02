/**
 * API Utility - Wrapper für fetch mit automatischer Auth-Header Injection
 *
 * Usage:
 * import { api } from './utils/api';
 *
 * // GET Request
 * const data = await api.get('/plants');
 *
 * // POST Request
 * const result = await api.post('/plants', { name: 'Tomato', slotId: 1 });
 *
 * // PUT Request
 * const updated = await api.put('/plants/1', { name: 'Updated Name' });
 *
 * // DELETE Request
 * await api.delete('/plants/1');
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper: Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Helper: Throw error if response not OK
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP Error ${response.status}`);
  }
  return response.json();
};

// API Object mit CRUD-Methoden
export const api = {
  // GET Request
  get: async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      ...options
    });

    return handleResponse(response);
  },

  // POST Request
  post: async (endpoint, body, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...options
    });

    return handleResponse(response);
  },

  // PUT Request
  put: async (endpoint, body, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      ...options
    });

    return handleResponse(response);
  },

  // DELETE Request
  delete: async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      ...options
    });

    return handleResponse(response);
  }
};

// Spezifische API-Funktionen für häufig genutzte Endpoints
export const plantsAPI = {
  getAll: () => api.get('/plants'),
  update: (slotId, data) => api.put(`/plants/${slotId}`, data)
};

export const dataAPI = {
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/history${query ? `?${query}` : ''}`);
  },
  getLogs: () => api.get('/logs')
};

export const recipesAPI = {
  getAll: () => api.get('/recipes'),
  getById: (id) => api.get(`/recipes/${id}`),
  create: (recipe) => api.post('/recipes', recipe),
  update: (id, recipe) => api.put(`/recipes/${id}`, recipe),
  delete: (id) => api.delete(`/recipes/${id}`),
  use: (id) => api.post(`/recipes/${id}/use`),
  like: (id) => api.post(`/recipes/${id}/like`)
};

export const weatherAPI = {
  getCurrent: () => api.get('/weather/current'),
  getForecast: () => api.get('/weather/forecast'),
  getRecommendations: () => api.get('/weather/recommendations')
};

export const analyticsAPI = {
  getAnomalies: () => api.get('/analytics/anomalies'),
  getPredictions: () => api.get('/analytics/predictions'),
  getOptimizations: () => api.get('/analytics/optimizations')
};

export const controlsAPI = {
  setRelay: (relay, state) => api.post('/controls/relay', { relay, state }),
  setFanPWM: (value) => api.post('/controls/fan-pwm', { value }),
  setLightPWM: (value) => api.post('/controls/light-pwm', { value }),
  setLightEnable: (enabled) => api.post('/controls/light-enable', { enabled }),
  getDeviceState: () => api.get('/controls/device-state'),
  rebootSystem: () => api.post('/system/reboot'),
  resetSystem: () => api.post('/system/reset')
};

export const settingsAPI = {
  getAutomation: () => api.get('/settings/automation'),
  setAutomation: (config) => api.post('/settings/automation', config),
  getWebhook: () => api.get('/settings/webhook'),
  setWebhook: (url) => api.post('/settings/webhook', { url })
};

export const notificationsAPI = {
  subscribe: (subscription) => api.post('/notifications/subscribe', subscription),
  unsubscribe: (endpoint) => api.post('/notifications/unsubscribe', { endpoint }),
  sendTest: () => api.post('/notifications/test'),
  getPublicKey: () => api.get('/notifications/public-key'),
  getStats: () => api.get('/notifications/stats'),
  cleanup: () => api.post('/notifications/cleanup')
};

export const calendarAPI = {
  getEvents: () => api.get('/calendar'),
  createEvent: (event) => api.post('/calendar', event),
  deleteEvent: (id) => api.delete(`/calendar/${id}`)
};

export const aiAPI = {
  consult: (message) => api.post('/ai/consult', { message })
};

export const nutrientsAPI = {
  // Schedules
  getSchedules: () => api.get('/nutrients/schedules'),
  getSchedule: (id) => api.get(`/nutrients/schedules/${id}`),
  createSchedule: (data) => api.post('/nutrients/schedules', data),
  updateSchedule: (id, data) => api.put(`/nutrients/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/nutrients/schedules/${id}`),
  toggleSchedule: (id) => api.post(`/nutrients/schedules/${id}/toggle`),

  // Dosierung
  manualDose: (waterVolume_liters, ml_per_liter, notes) =>
    api.post('/nutrients/dose', { waterVolume_liters, ml_per_liter, notes }),

  // Reservoir
  getReservoir: () => api.get('/nutrients/reservoir'),
  refillReservoir: (pumpId, volume_ml) =>
    api.put('/nutrients/reservoir/refill', { pumpId, volume_ml }),
  waterChange: () => api.put('/nutrients/reservoir/water-change'),

  // Logs & Stats
  getLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/nutrients/logs${query ? `?${query}` : ''}`);
  },
  getStats: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/nutrients/stats?${params.toString()}`);
  },

  // Kalibrierung
  calibrateSensor: (sensor, referenceValue, measuredValue) =>
    api.post('/nutrients/calibrate', { sensor, referenceValue, measuredValue })
};
