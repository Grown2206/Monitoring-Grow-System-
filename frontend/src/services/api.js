/**
 * Legacy API wrapper - leitet zur neuen utils/api.js mit Auth-Support weiter
 * Diese Datei wird nur noch für Backwards-Compatibility behalten
 */

import {
  api as newApi,
  plantsAPI,
  dataAPI,
  calendarAPI,
  aiAPI,
  settingsAPI,
  controlsAPI,
  nutrientsAPI
} from '../utils/api';

// Alte API-Methoden (für Backwards-Compatibility)
export const api = {
  // Pflanzen
  getPlants: () => plantsAPI.getAll(),
  updatePlant: (slotId, data) => plantsAPI.update(slotId, data),

  // Historie & Logs
  getHistory: (params) => dataAPI.getHistory(params),
  getLogs: () => dataAPI.getLogs(),

  // Kalender
  getEvents: () => calendarAPI.getEvents(),
  createEvent: (data) => calendarAPI.createEvent(data),
  deleteEvent: (id) => calendarAPI.deleteEvent(id),

  // AI Consultant
  getConsultation: (contextData) => aiAPI.consult(contextData.message || contextData),

  // Automation & Config
  getAutoConfig: () => settingsAPI.getAutomation(),
  updateAutoConfig: (data) => settingsAPI.setAutomation(data),

  // Webhooks
  getWebhook: () => settingsAPI.getWebhook(),
  updateWebhook: (url) => settingsAPI.setWebhook(url),

  // System Befehle
  systemReboot: () => controlsAPI.rebootSystem(),
  systemReset: () => controlsAPI.resetSystem(),

  // Relais schalten
  toggleRelay: (relayKey, state) => controlsAPI.setRelay(relayKey, state),

  // Nährstoffe
  getNutrientSchedules: () => nutrientsAPI.getSchedules(),
  createNutrientSchedule: (data) => nutrientsAPI.createSchedule(data),
  manualDose: (waterVolume, mlPerLiter, notes) => nutrientsAPI.manualDose(waterVolume, mlPerLiter, notes),
  getNutrientReservoir: () => nutrientsAPI.getReservoir(),
  getNutrientLogs: (params) => nutrientsAPI.getLogs(params),
  getNutrientStats: (startDate, endDate) => nutrientsAPI.getStats(startDate, endDate),
};

// Default export für neue Komponenten (VPD, Sensors, Timelapse)
export default newApi;
