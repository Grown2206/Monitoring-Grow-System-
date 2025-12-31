import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { 
  Cpu, Wifi, Activity, Terminal, RefreshCw, Save, 
  Download, Power, Sliders, AlertTriangle, Database, 
  Server, ShieldAlert, FileText 
} from 'lucide-react';

export default function Hardware() {
  const { isConnected, sendCommand } = useSocket();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, error, warning
  
  // Lokale Einstellungen (würden im echten System vom Backend geladen)
  const [config, setConfig] = useState({
    targetIp: window.location.hostname,
    wsPort: 3000,
    dryThreshold: 30, // %
    cooldown: 60, // Minuten
    tempOffset: 0.0,
    maintenanceMode: false
  });

  // Erweiterte ESP Stats (Mockup für UI Demonstration)
  const espStats = {
    uptime: "4d 12h 30m",
    signalStrength: -58, // dBm
    freeHeap: 142000, // Bytes
    cpuFreq: "240 MHz",
    version: "v1.2.0-beta",
    dbSize: "4.2 MB"
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (e) {
      console.error("Log Error", e);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const saveConfig = () => {
    // Hier würde man die Config ans Backend senden
    // api.updateConfig(config)...
    alert("Einstellungen gespeichert! (Simulation)");
  };

  const downloadLogs = () => {
    const content = JSON.stringify(logs, null, 2);
    const blob = new Blob([content], { type: 'text/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grow-system-logs-${new Date().toISOString()}.json`;
    a.click();
  };

  const rebootEsp = () => {
    if(confirm("ESP32 wirklich neu starten? Die Verbindung wird kurzzeitig unterbrochen.")) {
      sendCommand("REBOOT", 0, true);
    }
  };

  // Hilfsfunktion: dBm zu Prozent
  const getWifiQuality = (dbm) => {
    if(dbm <= -100) return 0;
    if(dbm >= -50) return 100;
    return 2 * (dbm + 100);
  };

  const filteredLogs = logs.filter(l => filter === 'all' || l.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Server /> Hardware & Administration
        </h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SPALTE 1: System Status & Ressourcen */}
        <div className="space-y-6">
          {/* Hauptstatus Karte */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-blue-400"/> System Ressourcen
            </h3>
            
            <div className="space-y-4">
              <StatRow 
                label="WiFi Signal" 
                value={`${getWifiQuality(espStats.signalStrength)}% (${espStats.signalStrength} dBm)`} 
                icon={<Wifi size={14}/>} 
                barValue={getWifiQuality(espStats.signalStrength)}
                barColor="bg-emerald-500"
              />
              <StatRow 
                label="Free Heap (RAM)" 
                value={`${(espStats.freeHeap / 1024).toFixed(1)} KB`} 
                icon={<Database size={14}/>} 
                barValue={60} // Demo Wert
                barColor="bg-blue-500"
              />
              <StatRow 
                label="CPU Frequenz" 
                value={espStats.cpuFreq} 
                icon={<Cpu size={14}/>} 
              />
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 mt-2">
                <span className="text-xs text-slate-500">Uptime: {espStats.uptime}</span>
                <span className="text-xs text-slate-500">FW: {espStats.version}</span>
              </div>
            </div>
          </div>

          {/* Admin Aktionen */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400"/> Admin Aktionen
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={rebootEsp} className="bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-300 p-3 rounded-lg text-xs font-bold flex flex-col items-center gap-2 transition">
                <Power size={20} /> ESP Neustart
              </button>
              <button 
                onClick={() => handleConfigChange('maintenanceMode', !config.maintenanceMode)}
                className={`${config.maintenanceMode ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'} hover:opacity-90 p-3 rounded-lg text-xs font-bold flex flex-col items-center gap-2 transition`}
              >
                <AlertTriangle size={20} /> {config.maintenanceMode ? 'Wartung Aktiv' : 'Wartungsmodus'}
              </button>
            </div>
            
            {/* Verbindungseinstellungen */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Backend Verbindung</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={config.targetIp}
                  onChange={(e) => handleConfigChange('targetIp', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-full font-mono"
                />
                <input 
                  type="text" 
                  value={config.wsPort}
                  onChange={(e) => handleConfigChange('wsPort', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-16 text-center font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SPALTE 2: Konfiguration & Kalibrierung */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-300 flex items-center gap-2">
                <Sliders size={18} className="text-emerald-400"/> System Konfiguration
              </h3>
              <button onClick={saveConfig} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                <Save size={14}/> Speichern
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Automatik Einstellungen */}
              <div className="space-y-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-800 pb-2">Automatik Regeln</h4>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Trockenheit Schwellwert</span>
                    <span className="font-mono text-emerald-400">{config.dryThreshold}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={config.dryThreshold}
                    onChange={(e) => handleConfigChange('dryThreshold', e.target.value)}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Unterhalb dieses Wertes wird die Bewässerung aktiviert.</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Gieß-Cooldown</span>
                    <span className="font-mono text-blue-400">{config.cooldown} Min</span>
                  </div>
                  <input 
                    type="range" min="15" max="240" step="15"
                    value={config.cooldown}
                    onChange={(e) => handleConfigChange('cooldown', e.target.value)}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Wartezeit zwischen zwei Bewässerungsvorgängen.</p>
                </div>
              </div>

              {/* Kalibrierung */}
              <div className="space-y-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-800 pb-2">Sensor Kalibrierung</h4>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Temp. Offset</span>
                  <div className="flex items-center gap-2">
                     <input 
                      type="number" step="0.1"
                      value={config.tempOffset}
                      onChange={(e) => handleConfigChange('tempOffset', e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded w-16 px-2 py-1 text-right text-sm font-mono"
                    />
                    <span className="text-xs text-slate-500">°C</span>
                  </div>
                </div>
                
                <div className="bg-amber-900/10 border border-amber-900/30 p-3 rounded-lg mt-4">
                  <div className="flex items-start gap-2">
                    <Database size={14} className="text-amber-500 mt-0.5"/>
                    <div>
                      <div className="text-xs font-bold text-amber-500">Datenbank</div>
                      <div className="text-[10px] text-amber-200/70">Größe: {espStats.dbSize} • {logs.length} Log-Einträge</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SYSTEM LOGS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[400px]">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-3">
                <h3 className="font-bold flex items-center gap-2 text-sm text-slate-300">
                  <Terminal size={16} className="text-slate-400"/> System Protokoll
                </h3>
                
                {/* Filter */}
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <FilterBtn label="Alle" active={filter === 'all'} onClick={() => setFilter('all')} />
                  <FilterBtn label="Errors" active={filter === 'error'} onClick={() => setFilter('error')} />
                  <FilterBtn label="Warn" active={filter === 'warning'} onClick={() => setFilter('warning')} />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={downloadLogs} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 p-1.5 rounded" title="Download CSV">
                  <Download size={14} />
                </button>
                <button onClick={loadLogs} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 p-1.5 rounded" title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 font-mono text-sm space-y-1 bg-black/40 custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 p-10 text-center flex flex-col items-center gap-2">
                  <FileText size={24} className="opacity-20"/>
                  Keine Logs gefunden.
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 hover:bg-slate-800/50 p-1.5 rounded border-b border-white/5 last:border-0 group transition">
                    <span className="text-slate-600 shrink-0 text-[10px] pt-0.5 w-16">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`shrink-0 w-16 text-center text-[9px] uppercase font-bold rounded px-1 py-0.5 h-fit ${
                      log.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                      log.type === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                      log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-slate-300 break-all text-xs">
                      <span className="text-slate-500 mr-2 font-bold">[{log.source}]</span>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hilfs-Komponenten
const StatRow = ({ label, value, icon, barValue, barColor }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <div className="text-xs text-slate-400 flex items-center gap-1.5">{icon} {label}</div>
      <div className="font-mono text-sm font-bold text-slate-200">{value}</div>
    </div>
    {barValue !== undefined && (
      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${barValue}%` }}></div>
      </div>
    )}
  </div>
);

const FilterBtn = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1 text-[10px] rounded-md transition ${active ? 'bg-slate-700 text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {label}
  </button>
);