import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Save, Bell, Wifi, Smartphone, Sliders, Shield, RefreshCw, Power, AlertTriangle, CloudOff } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import NotificationSettings from './NotificationSettings';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('automation');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  
  // States
  const [autoConfig, setAutoConfig] = useState({
    lightStart: "06:00",
    lightDuration: 18,
    tempTarget: 24,
    tempHysteresis: 2,
    pumpInterval: 4,
    pumpDuration: 30
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await api.getAutoConfig();
      if(config) setAutoConfig(config);
      
      const wh = await api.getWebhook(); 
      if(wh && wh.url) setWebhookUrl(wh.url);
    } catch (e) {
      console.error("Ladefehler:", e);
      // Fallback Werte setzen, damit die UI nicht leer bleibt
      showAlert("Konnte Einstellungen nicht laden. Offline Modus?", "warning");
    }
  };

  const handleSaveAutomation = async () => {
    setLoading(true);
    try {
      await api.updateAutoConfig(autoConfig);
      showAlert('Automatisierung gespeichert & an ESP gesendet!', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Fehler beim Speichern. Ist das Backend erreichbar?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = async () => {
    setLoading(true);
    try {
      await api.updateWebhook(webhookUrl);
      showAlert('Webhook URL aktualisiert', 'success');
    } catch (e) {
      showAlert('Fehler beim Speichern des Webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemAction = async (action) => {
    if(!window.confirm(`Möchtest du das System wirklich ${action === 'reboot' ? 'neu starten' : 'zurücksetzen'}?`)) return;
    
    try {
      if(action === 'reboot') await api.systemReboot();
      if(action === 'reset') await api.systemReset();
      showAlert(`Befehl "${action}" erfolgreich gesendet`, 'success');
    } catch (e) {
      showAlert(`Fehler beim Senden von ${action}`, 'error');
    }
  };

  const TabButton = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors font-medium whitespace-nowrap ${
        activeTab === id 
        ? 'border-emerald-500 text-emerald-400 bg-slate-800/30' 
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-w-4xl mx-auto mb-10">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="text-emerald-500" /> Systemeinstellungen
        </h2>
        <p className="text-slate-400 text-sm mt-1">Konfiguriere Automatisierung, Benachrichtigungen und Hardware.</p>
      </div>

      {/* Tabs - Scrollbar für mobile Ansicht */}
      <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950/50">
        <TabButton id="automation" icon={<RefreshCw size={18} />} label="Automatisierung" />
        <TabButton id="notifications" icon={<Bell size={18} />} label="Benachrichtigungen" />
        <TabButton id="network" icon={<Wifi size={18} />} label="Netzwerk" />
        <TabButton id="system" icon={<Shield size={18} />} label="System" />
      </div>

      <div className="p-6 min-h-[400px]">
        {/* --- AUTOMATION TAB --- */}
        {activeTab === 'automation' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section>
              <h3 className="text-emerald-400 font-semibold mb-4 uppercase text-xs tracking-wider">Beleuchtung & Zyklus</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm text-slate-400 mb-1">Startzeit (Licht an)</label>
                  <input 
                    type="time" 
                    value={autoConfig.lightStart || "06:00"}
                    onChange={(e) => setAutoConfig({...autoConfig, lightStart: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm text-slate-400 mb-1">Dauer: {autoConfig.lightDuration || 18} Stunden</label>
                  <input 
                    type="range" min="12" max="24" step="1"
                    value={autoConfig.lightDuration || 18}
                    onChange={(e) => setAutoConfig({...autoConfig, lightDuration: parseInt(e.target.value)})}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>12h (Blüte)</span>
                    <span>18h (Wachstum)</span>
                    <span>24h (Keimling)</span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-emerald-400 font-semibold mb-4 uppercase text-xs tracking-wider border-t border-slate-800 pt-6">Klimasteuerung</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm text-slate-400 mb-1">Zieltemperatur (°C)</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setAutoConfig({...autoConfig, tempTarget: (autoConfig.tempTarget || 24) - 1})} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold w-10">-</button>
                    <span className="flex-1 text-center font-bold text-xl text-white">{autoConfig.tempTarget || 24}°C</span>
                    <button onClick={() => setAutoConfig({...autoConfig, tempTarget: (autoConfig.tempTarget || 24) + 1})} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold w-10">+</button>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm text-slate-400 mb-1">Lüfter Hysterese (+/- °C)</label>
                  <input 
                    type="number" 
                    value={autoConfig.tempHysteresis || 2}
                    onChange={(e) => setAutoConfig({...autoConfig, tempHysteresis: parseFloat(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Temperaturschwankung bevor Lüfter schaltet</p>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-emerald-400 font-semibold mb-4 uppercase text-xs tracking-wider border-t border-slate-800 pt-6">Bewässerung (Auto-System)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm text-slate-400 mb-1">Intervall (Tage)</label>
                  <input 
                    type="number" 
                    value={autoConfig.pumpInterval || 2}
                    onChange={(e) => setAutoConfig({...autoConfig, pumpInterval: parseInt(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm text-slate-400 mb-1">Pumpdauer (Sekunden)</label>
                  <input 
                    type="number" 
                    value={autoConfig.pumpDuration || 30}
                    onChange={(e) => setAutoConfig({...autoConfig, pumpDuration: parseInt(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </section>

            <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
               <button 
                 onClick={handleSaveAutomation} 
                 disabled={loading} 
                 className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-emerald-900/20"
               >
                 {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                 <span>Einstellungen Speichern</span>
               </button>
            </div>
          </div>
        )}

        {/* --- NOTIFICATIONS TAB --- */}
        {activeTab === 'notifications' && (
           <div className="space-y-6 animate-in fade-in duration-300">
             {/* Push-Notifications (PWA) */}
             <NotificationSettings />

             {/* Webhook Integration (Discord, etc.) */}
             <div className="bg-slate-800 rounded-lg p-6">
               <div className="flex items-center gap-3 mb-4">
                 <Smartphone className="text-blue-400" />
                 <div>
                   <h3 className="font-semibold text-lg">Webhook Integration</h3>
                   <p className="text-sm text-slate-400">Verbinde externe Dienste (Discord, Slack, Telegram)</p>
                 </div>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="block text-sm text-slate-400 mb-2">Webhook URL</label>
                   <input
                     type="text"
                     value={webhookUrl}
                     onChange={(e) => setWebhookUrl(e.target.value)}
                     placeholder="https://discord.com/api/webhooks/..."
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none font-mono text-sm focus:border-emerald-500 transition-colors"
                   />
                   <p className="text-xs text-slate-500 mt-2">
                     POST-Anfragen werden bei kritischen Events gesendet (Temperatur, Gas, Wassermangel)
                   </p>
                 </div>

                 <div className="flex justify-end pt-2">
                   <button
                     onClick={handleSaveWebhook}
                     disabled={loading}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium disabled:opacity-50"
                   >
                     <Save size={18} /> Webhook Speichern
                   </button>
                 </div>
               </div>
             </div>
           </div>
        )}

        {/* --- NETWORK TAB --- */}
        {activeTab === 'network' && (
          <div className="text-center py-10 text-slate-500 animate-in fade-in duration-300">
            <Wifi size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">Netzwerk Status</h3>
            <p className="max-w-md mx-auto mb-6">Die WLAN Konfiguration ist fest auf dem ESP32 gespeichert (config.h oder im .ino Code).</p>
            
            <div className="inline-block bg-slate-950 p-6 rounded-xl border border-slate-800 text-left max-w-lg w-full">
              <div className="flex items-center gap-3 mb-4">
                 <CloudOff className="text-slate-500" />
                 <div>
                   <div className="text-sm font-bold text-slate-300">Verbindungs-Check</div>
                   <div className="text-xs text-slate-500">Prüfe, ob dein ESP32 Daten sendet</div>
                 </div>
              </div>
              <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                <li>ESP32 ist im gleichen 2.4GHz WLAN?</li>
                <li>MQTT Broker IP im ESP Code korrekt?</li>
                <li>Backend (dieser Server) läuft?</li>
              </ul>
            </div>
          </div>
        )}

         {/* --- SYSTEM TAB --- */}
         {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-red-500/20 rounded-full text-red-500"><AlertTriangle /></div>
                 <div>
                    <h4 className="font-bold text-red-400 text-lg">Gefahrenzone</h4>
                    <p className="text-sm text-slate-400 mb-6">Kritische Aktionen für die Hardware. Nur ausführen, wenn nötig.</p>
                    
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => handleSystemAction('reboot')}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors border border-slate-700 flex items-center gap-2 hover:border-red-500/50"
                      >
                        <Power size={18} /> ESP32 Neustarten
                      </button>
                      
                      <button 
                        onClick={() => handleSystemAction('reset')}
                        className="bg-red-900/20 hover:bg-red-900/40 text-red-300 border border-red-800/50 px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <RefreshCw size={18} /> Werkseinstellungen
                      </button>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="text-center text-xs text-slate-600 mt-8">
              System ID: GM-ESP32-V2 • Firmware: 2.1.0 • Backend: Node.js
            </div>
          </div>
        )}
      </div>
    </div>
  );
}