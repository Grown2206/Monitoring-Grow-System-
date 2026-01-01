import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { 
  Lock, Unlock, AlertTriangle, Power, Zap, Wind, Droplets, Lightbulb, 
  Timer, ShieldAlert, Wrench, Leaf, Activity, History, Sun, Moon, Clock 
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';

// --- Komponente: Activity Log Item ---
const LogItem = ({ timestamp, message, type }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-800/50 last:border-0 text-sm">
    <span className="text-slate-500 font-mono text-xs mt-0.5">{timestamp}</span>
    <span className={`font-medium ${type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>{message}</span>
  </div>
);

// --- Komponente: Device Card (Erweitert) ---
const DeviceCard = ({ 
  id, label, subLabel, isOn, onToggle, disabled, icon: Icon, color, warning, watts 
}) => {
  const [runtime, setRuntime] = useState(0);

  // Simulierter Laufzeit-Zähler wenn an
  useEffect(() => {
    let interval;
    if (isOn) {
      interval = setInterval(() => setRuntime(r => r + 1), 60000); // Update jede Minute
    } else {
      setRuntime(0);
    }
    return () => clearInterval(interval);
  }, [isOn]);

  const handleClick = () => {
    if (!isOn && warning && !disabled) {
      if (!window.confirm(`${label} wirklich einschalten? Sicherheitsprüfung!`)) return;
    }
    onToggle();
  };

  const activeClass = isOn 
    ? `bg-slate-800 border-${color ? color.split('-')[1] : 'emerald'}-500/50 shadow-lg` 
    : 'bg-slate-950 border-slate-800 opacity-90';

  return (
    <div className={`
      relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 group hover:border-slate-600
      ${activeClass}
      ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
    `}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl transition-colors duration-300 ${isOn ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-600'}`}>
            {Icon ? <Icon size={24} className={isOn ? color : ''} /> : <Power size={24} />}
          </div>
          <div>
            <h4 className="font-bold text-slate-100">{label}</h4>
            <p className="text-xs text-slate-500">{subLabel}</p>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`
            relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none 
            ${isOn ? 'bg-emerald-600' : 'bg-slate-700'}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-700/50 mt-1">
        <div className="flex items-center gap-1 text-slate-400">
          <Zap size={12} />
          <span>{isOn ? watts : 0} W</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Clock size={12} />
          <span>{isOn ? `${runtime} min` : 'Standby'}</span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isOn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
          {isOn ? 'Aktiv' : 'Aus'}
        </div>
      </div>
    </div>
  );
};

// --- Hauptkomponente Controls ---
export default function Controls() {
  const { isConnected, socket, sensorData } = useSocket();
  const { showAlert } = useAlert();
  const [safetyLocked, setSafetyLocked] = useState(true);
  const [logs, setLogs] = useState([]);
  
  // State für Relais
  const [relays, setRelays] = useState({
    light: false,
    fan_exhaust: false,
    fan_circulation: false,
    pump_main: false,
    pump_mix: false
  });

  // Wartungsmodus
  const [maintenanceMode, setMaintenanceMode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Zyklus Info (Mockup, müsste aus Settings kommen)
  const cycleInfo = { start: 6, end: 24, current: new Date().getHours() };
  const isDay = cycleInfo.current >= cycleInfo.start && cycleInfo.current < cycleInfo.end;

  useEffect(() => {
    // Initial Status
    if (socket) {
      socket.on('relayUpdate', (data) => {
        setRelays(prev => ({ ...prev, ...data }));
      });
    }
    // Mock Log laden
    addLog("System verbunden. Warte auf Befehle...");
    
    return () => {
      if (socket) socket.off('relayUpdate');
    };
  }, [socket]);

  // Timer
  useEffect(() => {
    let interval;
    if (maintenanceMode && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && maintenanceMode) {
      endMaintenance();
    }
    return () => clearInterval(interval);
  }, [maintenanceMode, timeLeft]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 5));
  };

  const toggleRelay = async (key) => {
    if (safetyLocked) return;
    const newState = !relays[key];
    setRelays(prev => ({ ...prev, [key]: newState })); 
    
    try {
      await api.toggleRelay(key, newState);
      addLog(`${getLabel(key)} ${newState ? 'eingeschaltet' : 'ausgeschaltet'}`);
      showAlert(`${getLabel(key)} ${newState ? 'eingeschaltet' : 'ausgeschaltet'}`, 'success');
    } catch (error) {
      console.error("[Frontend] Fehler beim Schalten:", error);
      setRelays(prev => ({ ...prev, [key]: !newState })); 
      addLog(`Fehler beim Schalten von ${getLabel(key)}`, 'error');
      showAlert("Fehler: Konnte Befehl nicht an Backend senden!", "error");
    }
  };

  const startMaintenance = (mode, durationMinutes) => {
    setMaintenanceMode(mode);
    setTimeLeft(durationMinutes * 60);
    setSafetyLocked(true);
    
    if (mode === 'watering') {
      api.toggleRelay('fan_circulation', false).catch(e => console.error(e));
      api.toggleRelay('pump_main', false).catch(e => console.error(e));
      setRelays(prev => ({ ...prev, fan_circulation: false, pump_main: false }));
      addLog("Wartung: Gieß-Modus gestartet");
      showAlert(`Gieß-Modus gestartet (${durationMinutes}min)`, 'success');
    } else if (mode === 'working') {
      api.toggleRelay('light', true).catch(e => console.error(e));
      api.toggleRelay('fan_exhaust', true).catch(e => console.error(e));
      setRelays(prev => ({ ...prev, light: true, fan_exhaust: true }));
      addLog("Wartung: Arbeitslicht aktiviert");
      showAlert(`Arbeitslicht aktiviert (${durationMinutes}min)`, 'success');
    }
  };

  const endMaintenance = () => {
    setMaintenanceMode(null);
    setTimeLeft(0);
    addLog("Wartungsmodus beendet");
    showAlert("Wartungsmodus beendet.", 'info');
  };

  const emergencyStop = () => {
    if (confirm("NOT-AUS: Alle Geräte werden sofort abgeschaltet. Fortfahren?")) {
      const allOff = {
        light: false, fan_exhaust: false, fan_circulation: false, pump_main: false, pump_mix: false
      };
      setRelays(allOff);
      setMaintenanceMode(null);
      setSafetyLocked(true);
      
      Object.keys(allOff).forEach(key => {
        api.toggleRelay(key, false).catch(err => console.error(err));
      });

      addLog("NOT-AUS AUSGELÖST!", 'error');
      showAlert("NOT-AUS AUSGELÖST!", "error");
    }
  };

  const getLabel = (key) => {
    const labels = {
      light: 'Hauptlicht', fan_exhaust: 'Abluft', fan_circulation: 'Umluft', pump_main: 'Bewässerung', pump_mix: 'Mixer'
    };
    return labels[key] || key;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Gesamtverbrauch berechnen
  const totalWatts = 
    (relays.light ? 200 : 0) + 
    (relays.fan_exhaust ? 35 : 0) + 
    (relays.fan_circulation ? 15 : 0) + 
    (relays.pump_main ? 50 : 0) + 
    (relays.pump_mix ? 10 : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Top Status Bar: Zyklus & Gesamtverbrauch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden flex items-center justify-between">
           <div className="z-10">
             <div className="flex items-center gap-2 text-slate-400 text-sm mb-1 font-bold uppercase tracking-wider">
               {isDay ? <Sun size={16} className="text-yellow-400"/> : <Moon size={16} className="text-blue-400"/>}
               Aktueller Zyklus
             </div>
             <div className="text-2xl font-bold text-white">
               {isDay ? 'Tagphase' : 'Nachtphase'} <span className="text-slate-500 text-lg font-normal">(Stunde {cycleInfo.current})</span>
             </div>
             <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full ${isDay ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{width: `${(cycleInfo.current / 24) * 100}%`}}></div>
             </div>
           </div>
           
           <div className="hidden md:block z-10 text-right">
             <div className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Momentanverbrauch</div>
             <div className="text-3xl font-mono text-emerald-400 font-bold flex items-center justify-end gap-2">
               <Zap size={24} /> {totalWatts} <span className="text-sm text-slate-500">W</span>
             </div>
           </div>

           {/* Deko Background */}
           <div className={`absolute right-0 top-0 w-32 h-full opacity-10 bg-gradient-to-l ${isDay ? 'from-yellow-500' : 'from-blue-500'} to-transparent pointer-events-none`}></div>
        </div>

        {/* Safety Lock Status */}
        <div className={`
          p-6 rounded-2xl border flex flex-col justify-center items-center text-center transition-all shadow-lg
          ${safetyLocked 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-red-900/10 border-red-500/30 shadow-red-900/10'}
        `}>
          <div className={`p-3 rounded-full mb-3 ${safetyLocked ? 'bg-slate-800 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
            {safetyLocked ? <Lock size={24} /> : <Unlock size={24} />}
          </div>
          <h3 className={`font-bold ${safetyLocked ? 'text-slate-200' : 'text-red-400'}`}>
            {safetyLocked ? 'Steuerung Gesichert' : 'Manuelle Kontrolle'}
          </h3>
          <button 
            onClick={() => setSafetyLocked(!safetyLocked)}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${safetyLocked ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-red-600 text-white border-transparent hover:bg-red-700'}`}
          >
            {safetyLocked ? 'Zum Entsperren klicken' : 'Jetzt Sperren'}
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200 animate-pulse">
          <AlertTriangle />
          <span className="font-bold text-sm">System offline. Befehle werden nicht ausgeführt!</span>
        </div>
      )}

      {/* --- HAUPT STEUERUNG --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Beleuchtung */}
        <DeviceCard 
          id="light" label="Hauptlicht" subLabel="Samsung LM301H" 
          icon={Lightbulb} color="text-yellow-400" watts={200}
          isOn={relays.light} onToggle={() => toggleRelay('light')} disabled={safetyLocked}
        />

        {/* Klima (Abluft) */}
        <DeviceCard 
          id="fan_exhaust" label="Abluft" subLabel="Filter System" 
          icon={Wind} color="text-blue-400" watts={35}
          isOn={relays.fan_exhaust} onToggle={() => toggleRelay('fan_exhaust')} disabled={safetyLocked}
        />

        {/* Klima (Umluft) */}
        <DeviceCard 
          id="fan_circulation" label="Umluft" subLabel="Ventilator" 
          icon={Activity} color="text-cyan-400" watts={15}
          isOn={relays.fan_circulation} onToggle={() => toggleRelay('fan_circulation')} disabled={safetyLocked}
        />

        {/* Bewässerung */}
        <DeviceCard 
          id="pump_main" label="Bewässerung" subLabel="Drip System" 
          icon={Droplets} color="text-emerald-400" watts={50} warning={true}
          isOn={relays.pump_main} onToggle={() => toggleRelay('pump_main')} disabled={safetyLocked}
        />
      </div>

      {/* --- UNTERER BEREICH: LOGS & WARTUNG --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg lg:col-span-1">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <History size={16} className="text-slate-400" /> Aktivitäten
          </h3>
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.length === 0 && <div className="text-slate-600 text-xs italic">Keine Aktivitäten aufgezeichnet.</div>}
            {logs.map((log, idx) => (
              <LogItem key={idx} timestamp={log.time} message={log.msg} type={log.type} />
            ))}
          </div>
        </div>

        {/* Wartungs-Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
               <Wrench size={16} className="text-amber-500" /> Wartung & Szenarien
             </h3>
             {maintenanceMode && (
               <div className="flex items-center gap-2 text-amber-500 font-mono font-bold bg-amber-500/10 px-3 py-1 rounded-lg">
                 <Timer size={14} /> {formatTime(timeLeft)}
               </div>
             )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => startMaintenance('watering', 15)} 
              disabled={maintenanceMode !== null} 
              className="bg-slate-950 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-left transition-colors group disabled:opacity-50"
            >
              <Droplets className="mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-slate-200">Gieß-Modus</div>
              <div className="text-xs text-slate-500 mt-1">Pumpen AUS (15min)</div>
            </button>

            <button 
              onClick={() => startMaintenance('working', 30)} 
              disabled={maintenanceMode !== null} 
              className="bg-slate-950 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-left transition-colors group disabled:opacity-50"
            >
              <Leaf className="mb-2 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-slate-200">Arbeiten</div>
              <div className="text-xs text-slate-500 mt-1">Licht AN (30min)</div>
            </button>

            <button 
              onClick={emergencyStop} 
              className="bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 p-4 rounded-xl text-left transition-colors group"
            >
              <ShieldAlert className="mb-2 text-red-500 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-red-200">Not-Aus</div>
              <div className="text-xs text-red-400 mt-1">Alles SOFORT aus</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}