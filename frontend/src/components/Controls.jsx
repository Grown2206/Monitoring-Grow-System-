import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Lightbulb, Wind, Droplet, Power, AlertTriangle } from 'lucide-react';

export default function Controls() {
  const { sendCommand } = useSocket();
  
  // Lokaler State für visuelles Feedback (bis echte Rückmeldung kommt)
  const [states, setStates] = useState({
    LIGHT: false,
    FAN_EXHAUST: false,
    FAN_INTAKE: false,
    HUMID: false
  });

  const toggle = (cmd) => {
    const newState = !states[cmd];
    setStates(prev => ({ ...prev, [cmd]: newState }));
    sendCommand(cmd, 0, newState); // ID 0 für globale Relais
  };

  const triggerPump = (id) => {
    sendCommand('PUMP', id, true);
    alert(`Pumpe ${id} für 5 Sekunden aktiviert!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Hardware Steuerung</h2>
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          <AlertTriangle size={16} />
          <span>Manuelle Eingriffe pausieren die Automatik</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hauptlicht */}
        <ControlCard 
          label="Hauptlicht (LED)" 
          isOn={states.LIGHT} 
          onClick={() => toggle('LIGHT')}
          icon={<Lightbulb className={states.LIGHT ? "text-yellow-400 fill-yellow-400" : "text-slate-500"} />}
          desc="Pin 18"
        />

        {/* Abluft */}
        <ControlCard 
          label="Abluft Ventilator" 
          isOn={states.FAN_EXHAUST} 
          onClick={() => toggle('FAN_EXHAUST')}
          icon={<Wind className={states.FAN_EXHAUST ? "text-blue-400 animate-spin" : "text-slate-500"} />}
          desc="Pin 19 (Oben)"
        />

        {/* Zuluft */}
        <ControlCard 
          label="Frischluft Zufuhr" 
          isOn={states.FAN_INTAKE} 
          onClick={() => toggle('FAN_INTAKE')}
          icon={<Wind className={states.FAN_INTAKE ? "text-emerald-400 animate-spin" : "text-slate-500"} />}
          desc="Pin 5 (Unten)"
        />

        {/* Luftbefeuchter */}
        <ControlCard 
          label="Luftbefeuchter" 
          isOn={states.HUMID} 
          onClick={() => toggle('HUMID')}
          icon={<Droplet className={states.HUMID ? "text-blue-300" : "text-slate-500"} />}
          desc="Pin 23"
        />
      </div>

      <h3 className="text-xl font-bold mt-8 mb-4">Bewässerung (Manuell)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PumpButton id={1} onClick={() => triggerPump(1)} label="Haupt-Pumpe (1-3)" />
        <PumpButton id={2} onClick={() => triggerPump(2)} label="Zusatz-Pumpe (4-6)" />
      </div>
    </div>
  );
}

// Kleine Hilfskomponenten für das Design
const ControlCard = ({ label, isOn, onClick, icon, desc }) => (
  <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
    isOn ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800'
  }`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-full ${isOn ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
        {icon}
      </div>
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
    </div>
    <button 
      onClick={onClick}
      className={`w-14 h-8 rounded-full transition-colors relative ${isOn ? 'bg-emerald-500' : 'bg-slate-700'}`}
    >
      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isOn ? 'translate-x-6' : ''}`} />
    </button>
  </div>
);

const PumpButton = ({ id, onClick, label }) => (
  <button 
    onClick={onClick}
    className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 p-4 rounded-xl flex items-center justify-center gap-3 text-blue-200 transition-all active:scale-95"
  >
    <Droplet size={24} />
    <span className="font-bold">{label}</span>
  </button>
);