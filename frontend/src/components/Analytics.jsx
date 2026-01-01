import React, { useEffect, useState, useMemo } from 'react';
// Die Importe wurden auf den absoluten Standard zurückgesetzt (ohne .js/.jsx Endungen), um die Auflösungsprobleme zu beheben.
import { api } from '../services/api';
import ReportGenerator from './ReportGenerator';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, Brush 
} from 'recharts';
import { Calculator, Zap, Coins, Clock, AlertTriangle, RefreshCw, Activity, ThermometerSun, Droplets } from 'lucide-react';

export default function Analytics() {
  const [rawData, setRawData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Einstellungen
  const [timeRange, setTimeRange] = useState(24); // Stunden
  const [powerConfig, setPowerConfig] = useState({
    price: 0.35, watts: 250, hours: 18
  });

  // Sichtbare Sensoren (Toggle State)
  const [visibility, setVisibility] = useState({
    temp: true,
    humidity: true,
    vpd: false, // Standardmäßig aus, für Profis zuschaltbar
    lux: true,
    soil1: true, soil2: true, soil3: true, soil4: true, soil5: true, soil6: true,
    tank: true,
    gas: false
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 60000); // Alle 60s aktualisieren
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      setError(null);
      const [history, logData, plantData] = await Promise.all([
        api.getHistory(),
        api.getLogs(),
        api.getPlants()
      ]);
      
      if (!Array.isArray(history)) throw new Error("Ungültiges Datenformat vom Server");

      // Rohdaten aufbereiten
      const processed = history
        .filter(entry => entry && entry.readings)
        .map(entry => {
          const r = entry.readings;
          const soil = Array.isArray(r.soilMoisture) ? r.soilMoisture : [0,0,0,0,0,0];
          
          // VPD Berechnung (grob)
          // SVP = 0.61078 * exp(17.27 * T / (T + 237.3))
          // VPD = SVP * (1 - RH/100)
          const T = r.temp || 0;
          const RH = r.humidity || 0;
          const SVP = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
          const VPD = SVP * (1 - RH / 100);

          return {
            timestamp: new Date(entry.timestamp).getTime(),
            dateStr: new Date(entry.timestamp).toLocaleString(),
            timeStr: new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            temp: typeof r.temp === 'number' ? r.temp : null,
            humidity: typeof r.humidity === 'number' ? r.humidity : null,
            vpd: VPD > 0 ? parseFloat(VPD.toFixed(2)) : 0,
            lux: typeof r.lux === 'number' ? r.lux : null,
            tankLevel: typeof r.tankLevel === 'number' ? r.tankLevel : null,
            gasLevel: typeof r.gasLevel === 'number' ? r.gasLevel : null,
            soil1: soil[0] || null,
            soil2: soil[1] || null,
            soil3: soil[2] || null,
            soil4: soil[3] || null,
            soil5: soil[4] || null,
            soil6: soil[5] || null,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      setRawData(processed);
      setLogs(logData || []);
      setPlants(plantData || []);
    } catch (error) {
      console.error("Fehler:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- DATEN FILTERN & GLÄTTEN ---
  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];

    const now = Date.now();
    const cutoff = now - (timeRange * 60 * 60 * 1000);
    
    // 1. Zeitfilter
    const filtered = rawData.filter(d => d.timestamp > cutoff);

    // 2. Downsampling (Performance: Max ~300 Punkte anzeigen)
    // Wenn wir 10.000 Punkte haben, nehmen wir nur jeden 33. Punkt
    const maxPoints = 300;
    if (filtered.length <= maxPoints) return filtered;

    const step = Math.ceil(filtered.length / maxPoints);
    return filtered.filter((_, index) => index % step === 0);
  }, [rawData, timeRange]);

  // Toggle Funktion für Legende
  const toggleLine = (key) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Stromkosten Rechner
  const kwhPerDay = (powerConfig.watts / 1000) * powerConfig.hours;
  const costDay = kwhPerDay * powerConfig.price;
  const costMonth = costDay * 30;
  const costCycle = costDay * 100; // ~3 Monate Grow

  const TimeButton = ({ hours, label }) => (
    <button
      onClick={() => setTimeRange(hours)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        timeRange === hours 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  if (error) return (
    <div className="p-8 text-center bg-red-900/10 border border-red-900/50 rounded-xl text-red-400 m-4">
      <AlertTriangle className="mx-auto mb-2" size={32} />
      <h3 className="font-bold mb-2">Verbindungsfehler</h3>
      <p className="text-sm mb-4">{error}</p>
      <button onClick={loadAllData} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-sm transition-colors">
        Erneut versuchen
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-emerald-500" /> Daten & Analyse
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {rawData.length} Messpunkte geladen • Zeige letzte {timeRange} Stunden
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
           <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
             <TimeButton hours={1} label="1h" />
             <TimeButton hours={3} label="3h" />
             <TimeButton hours={6} label="6h" />
             <TimeButton hours={12} label="12h" />
             <TimeButton hours={24} label="24h" />
           </div>
           
           <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block"></div>

           <div className="flex gap-2">
             <ReportGenerator historyData={rawData} logs={logs} plants={plants} />
             <button 
               onClick={loadAllData} 
               className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors"
               title="Aktualisieren"
             >
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
           </div>
        </div>
      </div>

      {loading && rawData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse">Lade Diagramme...</div>
      ) : (
        <>
          {/* CHART 1: Klima & VPD */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6 px-2">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <ThermometerSun className="text-amber-400" size={20} /> Klima & VPD
              </h3>
              <div className="flex gap-2 text-xs">
                <button onClick={() => toggleLine('temp')} className={`px-2 py-1 rounded border ${visibility.temp ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'border-slate-700 text-slate-500 opacity-50'}`}>Temp</button>
                <button onClick={() => toggleLine('humidity')} className={`px-2 py-1 rounded border ${visibility.humidity ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'border-slate-700 text-slate-500 opacity-50'}`}>RLF</button>
                <button onClick={() => toggleLine('vpd')} className={`px-2 py-1 rounded border ${visibility.vpd ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'border-slate-700 text-slate-500 opacity-50'}`}>VPD</button>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradHum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="timeStr" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickMargin={10} 
                    minTickGap={30}
                  />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} unit="°C" />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} domain={[0, 100]} unit="%" />
                  {visibility.vpd && <YAxis yAxisId="vpd" orientation="right" stroke="#10b981" fontSize={12} domain={[0, 3]} unit=" kPa" hide />}
                  
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                  />
                  
                  {visibility.temp && (
                    <Area yAxisId="left" type="monotone" dataKey="temp" name="Temperatur" stroke="#fbbf24" fill="url(#gradTemp)" strokeWidth={2} />
                  )}
                  {visibility.humidity && (
                    <Area yAxisId="right" type="monotone" dataKey="humidity" name="Luftfeuchte" stroke="#3b82f6" fill="url(#gradHum)" strokeWidth={2} />
                  )}
                  {visibility.vpd && (
                    <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  )}
                  
                  <Brush dataKey="timeStr" height={30} stroke="#475569" fill="#1e293b" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 2: Bodenfeuchtigkeit */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-2 gap-4">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <Droplets className="text-emerald-500" size={20} /> Bodenfeuchtigkeit
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {[1,2,3,4,5,6].map(id => (
                  <button 
                    key={id} 
                    onClick={() => toggleLine(`soil${id}`)} 
                    className={`px-3 py-1 rounded-full border transition-all ${
                      visibility[`soil${id}`] 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                    }`}
                  >
                    Pflanze {id}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="timeStr" stroke="#64748b" fontSize={12} minTickGap={30} />
                  <YAxis stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  
                  {/* Wir definieren Farben für 6 Linien */}
                  {[
                    { id: 1, color: '#10b981' }, // Emerald
                    { id: 2, color: '#3b82f6' }, // Blue
                    { id: 3, color: '#8b5cf6' }, // Violet
                    { id: 4, color: '#f59e0b' }, // Amber
                    { id: 5, color: '#ec4899' }, // Pink
                    { id: 6, color: '#64748b' }, // Slate
                  ].map(p => (
                    visibility[`soil${p.id}`] && (
                      <Line 
                        key={p.id} 
                        type="monotone" 
                        dataKey={`soil${p.id}`} 
                        name={`Pflanze ${p.id}`} 
                        stroke={p.color} 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    )
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 3: Ressourcen & Licht (Kombiniert) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Licht Chart */}
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
               <h3 className="font-bold text-slate-200 mb-4 text-sm uppercase tracking-wider">Lichtintensität (Lux)</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                     <defs>
                       <linearGradient id="gradLux" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                     <XAxis dataKey="timeStr" hide />
                     <YAxis stroke="#94a3b8" fontSize={10} width={40} />
                     <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                     <Area type="monotone" dataKey="lux" stroke="#facc15" fill="url(#gradLux)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>

             {/* Tank Level Chart */}
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
               <h3 className="font-bold text-slate-200 mb-4 text-sm uppercase tracking-wider">Wassertank</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                     <defs>
                       <linearGradient id="gradTank" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                     <XAxis dataKey="timeStr" hide />
                     <YAxis stroke="#94a3b8" fontSize={10} width={40} domain={[0, 4095]} />
                     <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                     <Area type="monotone" dataKey="tankLevel" stroke="#0ea5e9" fill="url(#gradTank)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

          {/* Stromkosten Rechner (Verbessertes Design) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/20"><Calculator size={24} /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-200">Stromkosten Kalkulator</h3>
                <p className="text-xs text-slate-500">Live Berechnung basierend auf deiner Konfiguration</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-5 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Strompreis (€/kWh)</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition-colors">
                    <Coins size={16} className="text-slate-500"/>
                    <input type="number" step="0.01" value={powerConfig.price} onChange={e => setPowerConfig({...powerConfig, price: parseFloat(e.target.value)})} className="bg-transparent outline-none w-full font-mono text-sm text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Leistung (Watt)</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition-colors">
                    <Zap size={16} className="text-yellow-500"/>
                    <input type="number" value={powerConfig.watts} onChange={e => setPowerConfig({...powerConfig, watts: parseFloat(e.target.value)})} className="bg-transparent outline-none w-full font-mono text-sm text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Lichtstunden / Tag</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition-colors">
                    <Clock size={16} className="text-blue-500"/>
                    <input type="number" value={powerConfig.hours} onChange={e => setPowerConfig({...powerConfig, hours: parseFloat(e.target.value)})} className="bg-transparent outline-none w-full font-mono text-sm text-white" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CostCard label="Täglich" value={costDay.toFixed(2)} sub={`${kwhPerDay.toFixed(1)} kWh`} />
                <CostCard label="Monatlich" value={costMonth.toFixed(2)} sub="Prognose (30 Tage)" highlight="blue" />
                <CostCard label="Pro Grow (Zyklus)" value={costCycle.toFixed(2)} sub="ca. 100 Tage" highlight="emerald" big />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CostCard = ({ label, value, sub, highlight, big }) => {
  const colors = {
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    default: 'border-slate-800 bg-slate-950 text-slate-200'
  };
  
  const style = highlight ? colors[highlight] : colors.default;

  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${style}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">{label}</div>
      <div>
        <div className={`font-bold mb-1 ${big ? 'text-4xl' : 'text-3xl'}`}>
          {value}€
        </div>
        <div className="text-xs opacity-60">{sub}</div>
      </div>
    </div>
  );
};