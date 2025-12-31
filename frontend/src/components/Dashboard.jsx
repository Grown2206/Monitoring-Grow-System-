import React from 'react';
import { useSocket } from '../context/SocketContext';
import { calculateVPD, calculateDewPoint, calculateDLI, getVPDStatus } from '../utils/growMath';
import { Thermometer, Droplet, Wind, Lightbulb, Gauge, CloudRain, Sun } from 'lucide-react';

export default function Dashboard() {
  const { sensorData } = useSocket();

  // Berechnete Werte
  const vpd = calculateVPD(sensorData.temp, sensorData.humidity);
  const dewPoint = calculateDewPoint(sensorData.temp, sensorData.humidity);
  const dli = calculateDLI(sensorData.lux, 18); // Annahme: 18h Licht
  const vpdStatus = getVPDStatus(vpd, 'vegetative'); // Könnte man später aus Pflanzen-Phase holen

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Cockpit</h2>
          <p className="text-xs text-slate-400">Live-Metriken & Umweltanalyse</p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-xs text-slate-500">Letztes Update</div>
          <div className="font-mono text-emerald-400">Live via WebSocket</div>
        </div>
      </div>

      {/* 1. Haupt-Klima (Große Karten) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Temperatur */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Thermometer size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Thermometer size={20}/></div>
            <span className="text-slate-400 font-medium">Temperatur</span>
          </div>
          <div className="text-4xl font-bold text-slate-100 mb-1">{sensorData.temp.toFixed(1)}°C</div>
          <div className="text-xs text-slate-500">Ideal: 22 - 28°C</div>
        </div>

        {/* Luftfeuchte */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Droplet size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Droplet size={20}/></div>
            <span className="text-slate-400 font-medium">RLF (Luftfeuchte)</span>
          </div>
          <div className="text-4xl font-bold text-slate-100 mb-1">{sensorData.humidity.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">Taupunkt: {dewPoint}°C</div>
        </div>

        {/* VPD (Der Profi-Wert) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group ring-1 ring-slate-700">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Gauge size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-${vpdStatus.color}-500/10 text-${vpdStatus.color}-500`}>
              <Gauge size={20}/>
            </div>
            <span className="text-slate-400 font-medium">VPD (Dampfdruck)</span>
          </div>
          <div className="flex items-end gap-3 mb-1">
            <div className="text-4xl font-bold text-slate-100">{vpd}</div>
            <div className="text-sm font-bold text-slate-400 mb-1.5">kPa</div>
          </div>
          <div className={`text-xs font-bold px-2 py-0.5 rounded w-fit bg-${vpdStatus.color}-500/20 text-${vpdStatus.color}-400`}>
            {vpdStatus.label}
          </div>
        </div>
      </div>

      {/* 2. Sekundär-Werte & Licht */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Sun className="text-yellow-400" />} 
          label="Lichtintensität" 
          value={sensorData.lux.toFixed(0)} 
          unit="lx"
          sub={`DLI: ~${dli} mol`}
        />
        <StatCard 
          icon={<Wind className="text-slate-400" />} 
          label="CO2 / Luftqualität" 
          value={sensorData.gas} 
          unit="ppm"
          sub="Sensor Raw"
        />
         <StatCard 
          icon={<CloudRain className="text-blue-300" />} 
          label="Tank Inhalt" 
          value={sensorData.tank} 
          unit=""
          sub="Analog Wert"
        />
        <StatCard 
          icon={<Gauge className="text-purple-400" />} 
          label="Lüfter Status" 
          value="Auto" 
          unit=""
          sub="Keine Aktivität"
        />
      </div>

      {/* 3. Bodenfeuchtigkeit Übersicht */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-300 flex items-center gap-2">
            <Droplet className="text-emerald-500" size={20}/> Wurzelzone (6 Pflanzen)
          </h3>
          <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded">Ziel: 40-60%</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sensorData.soil.map((val, i) => {
            const isCritical = val < 30;
            return (
              <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                <div 
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 opacity-20 ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ height: `${val}%` }}
                />
                <span className="text-xs text-slate-400 font-bold z-10">TOPF {i + 1}</span>
                <span className={`text-2xl font-bold z-10 ${isCritical ? 'text-red-400' : 'text-emerald-400'}`}>
                  {val}%
                </span>
                {isCritical && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ icon, label, value, unit, sub }) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-2 hover:border-slate-700 transition">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-800">{icon}</div>
      <span className="text-xs text-slate-400 font-bold uppercase">{label}</span>
    </div>
    <div>
      <div className="text-2xl font-bold text-slate-200">
        {value} <span className="text-xs text-slate-500 font-normal">{unit}</span>
      </div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  </div>
);