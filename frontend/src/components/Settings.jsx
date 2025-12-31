import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, Thermometer, Droplet, Trash2, Webhook, Check, Cpu, Sun, Clock, Wind, CloudRain } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { api } from '../services/api';

export default function Settings() {
  const { showAlert } = useAlert();
  
  // --- STATE: LOKALE EINSTELLUNGEN (Browser) ---
  const [localSettings, setLocalSettings] = useState({
    roomName: 'Grow Zelt 1',
    tempMin: 18, tempMax: 28,
    humMin: 40, humMax: 70,
    tankMin: 500, // Standard Warn-Grenze für Tank (Raw Wert)
    notifications: true,
  });

  // --- STATE: SERVER AUTOMATION CONFIG (Backend) ---
  const [autoConfig, setAutoConfig] = useState({
    lightStartHour: 6, lightDuration: 18,
    dryThreshold: 30, cooldownMinutes: 60,
    vpdMin: 0.8, vpdMax: 1.2
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  // Laden beim Start
  useEffect(() => {
    // 1. Lokale Settings laden
    const saved = localStorage.getItem('grow_settings');
    if (saved) setLocalSettings(JSON.parse(saved));

    // 2. Webhook & Automation vom Backend laden
    const loadBackendData = async () => {
      try {
        const [whData, acData] = await Promise.all([
           fetch(`http://${window.location.hostname}:3000/api/settings/webhook`).then(r => r.json()),
           api.getAutoConfig()
        ]);
        setWebhookUrl(whData.url || '');
        setAutoConfig(acData);
      } catch (e) {
        console.error("Ladefehler", e);
      }
    };
    loadBackendData();
  }, []);

  // Handler
  const handleLocalChange = (key, value) => setLocalSettings(prev => ({ ...prev, [key]: value }));
  const handleAutoChange = (key, value) => setAutoConfig(prev => ({ ...prev, [key]: parseFloat(value) }));

  // SPEICHERN
  const saveAll = async () => {
    try {
      // 1. Lokal
      localStorage.setItem('grow_settings', JSON.stringify(localSettings));
      window.dispatchEvent(new Event('settings-changed'));

      // 2. Server Automation
      await api.updateAutoConfig(autoConfig);

      showAlert('Alle Einstellungen (Lokal & Server) gespeichert!', 'success');
    } catch (e) {
      showAlert('Fehler beim Speichern auf dem Server', 'error');
    }
  };

  const saveWebhook = async () => {
    try {
      await fetch(`http://${window.location.hostname}:3000/api/settings/webhook`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ url: webhookUrl })
      });
      showAlert('Webhook gespeichert & Testnachricht gesendet!', 'success');
    } catch (e) {
      showAlert('Fehler beim Speichern des Webhooks', 'error');
    }
  };

  const resetApp = () => {
    if(confirm("Lokal gespeicherte Einstellungen zurücksetzen?")) {
      localStorage.removeItem('grow_settings');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">Einstellungen</h2>
        <button onClick={saveAll} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/20">
          <Save size={18} /> Alles Speichern
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- TEIL 1: SERVER AUTOMATISIERUNG --- */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-2">
             <Cpu size={20}/> <h3 className="font-bold text-lg">System Automatisierung (Server)</h3>
          </div>
          <p className="text-xs text-slate-500">Diese Einstellungen steuern direkt die Logik auf dem Backend/ESP32.</p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
             {/* Licht */}
             <div>
                <h4 className="font-bold text-sm text-yellow-500 flex items-center gap-2 mb-3"><Sun size={16}/> Beleuchtung</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs text-slate-400 block mb-1">Startzeit (Stunde)</label>
                      <input type="number" min="0" max="23" value={autoConfig.lightStartHour} onChange={e => handleAutoChange('lightStartHour', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm"/>
                   </div>
                   <div>
                      <label className="text-xs text-slate-400 block mb-1">Dauer (Stunden)</label>
                      <input type="number" min="1" max="24" value={autoConfig.lightDuration} onChange={e => handleAutoChange('lightDuration', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm"/>
                   </div>
                </div>
             </div>

             {/* Bewässerung */}
             <div>
                <h4 className="font-bold text-sm text-blue-400 flex items-center gap-2 mb-3"><Droplet size={16}/> Auto-Bewässerung</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs text-slate-400 block mb-1">Start ab Feuchte (%)</label>
                      <input type="number" min="0" max="100" value={autoConfig.dryThreshold} onChange={e => handleAutoChange('dryThreshold', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm"/>
                   </div>
                   <div>
                      <label className="text-xs text-slate-400 block mb-1">Cooldown (Minuten)</label>
                      <input type="number" min="10" max="360" value={autoConfig.cooldownMinutes} onChange={e => handleAutoChange('cooldownMinutes', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm"/>
                   </div>
                </div>
             </div>

             {/* Klima VPD */}
             <div>
                <h4 className="font-bold text-sm text-purple-400 flex items-center gap-2 mb-3"><Wind size={16}/> Klima / Lüfter (VPD Ziel)</h4>
                <div className="flex items-center gap-4">
                   <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">Min VPD (kPa)</label>
                      <input type="number" step="0.1" value={autoConfig.vpdMin} onChange={e => handleAutoChange('vpdMin', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm"/>
                   </div>
                   <span className="text-slate-600 pt-4">-</span>
                   <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">Max VPD (kPa)</label>
                      <input type="number" step="0.1" value={autoConfig.vpdMax} onChange={e => handleAutoChange('vpdMax', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm"/>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- TEIL 2: LOKALE WARNUNGEN & WEBHOOK --- */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-amber-400 border-b border-slate-800 pb-2">
             <Bell size={20}/> <h3 className="font-bold text-lg">Warnungen & Benachrichtigungen</h3>
          </div>
          <p className="text-xs text-slate-500">Lokale Einstellungen für Browser-Popups und externe Dienste.</p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            
            {/* Safe Zone Slider */}
            <div>
               <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Shield size={14}/> Temperatur Safe-Zone</label>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-amber-400 font-mono">{localSettings.tempMin}°C - {localSettings.tempMax}°C</span>
               </div>
               <div className="flex gap-4 items-center">
                  <input type="range" min="10" max="40" value={localSettings.tempMin} onChange={e => handleLocalChange('tempMin', parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                  <input type="range" min="15" max="50" value={localSettings.tempMax} onChange={e => handleLocalChange('tempMax', parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"/>
               </div>
            </div>

            <div>
               <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Shield size={14}/> Luftfeuchte Safe-Zone</label>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-blue-400 font-mono">{localSettings.humMin}% - {localSettings.humMax}%</span>
               </div>
               <div className="flex gap-4 items-center">
                  <input type="range" min="0" max="100" value={localSettings.humMin} onChange={e => handleLocalChange('humMin', parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500"/>
                  <input type="range" min="0" max="100" value={localSettings.humMax} onChange={e => handleLocalChange('humMax', parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
               </div>
            </div>

            {/* Wassertank Warnung */}
            <div>
               <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><CloudRain size={14}/> Wassertank Warnung (Raw)</label>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-blue-400 font-mono">&lt; {localSettings.tankMin || 500}</span>
               </div>
               <div className="flex gap-4 items-center">
                  <input type="range" min="0" max="4095" step="50" value={localSettings.tankMin || 500} onChange={e => handleLocalChange('tankMin', parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
               </div>
               <p className="text-[10px] text-slate-500 mt-1">Legt fest, ab welchem Rohwert (0-4095) gewarnt wird (z.B. 500 = fast leer).</p>
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div>
                <div className="font-medium text-slate-200">Browser Popups</div>
                <div className="text-xs text-slate-500">Visuelle Alarme auf diesem Gerät</div>
              </div>
              <button onClick={() => handleLocalChange('notifications', !localSettings.notifications)} className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.notifications ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.notifications ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {/* Webhook */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
               <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Webhook size={14}/> Discord / Slack Webhook</label>
               <div className="flex gap-2">
                  <input type="text" placeholder="https://..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none focus:border-indigo-500" />
                  <button onClick={saveWebhook} className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded text-white"><Check size={16} /></button>
               </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4 mt-6">
                <button onClick={resetApp} className="text-xs text-red-300 hover:text-red-200 flex items-center gap-2"><Trash2 size={12}/> Lokale App-Einstellungen zurücksetzen</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}