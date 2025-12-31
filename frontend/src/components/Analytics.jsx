import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import ReportGenerator from './ReportGenerator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Calculator, Zap, Coins, Clock, AlertTriangle } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [powerConfig, setPowerConfig] = useState({
    price: 0.35, watts: 250, hours: 18
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      setError(null);
      const [history, logData, plantData] = await Promise.all([
        api.getHistory(),
        api.getLogs(),
        api.getPlants()
      ]);
      
      console.log("Rohdaten Historie:", history); // Debugging im Browser F12

      if (!Array.isArray(history)) {
        throw new Error("API hat kein Array zurückgegeben");
      }

      // ROBUSTE DATENVERARBEITUNG
      const formatted = history
        .filter(entry => entry && entry.readings) // Nur Einträge mit Messwerten
        .map(entry => {
          const r = entry.readings;
          const soil = Array.isArray(r.soilMoisture) ? r.soilMoisture : [0,0,0,0,0,0];

          return {
            temp: typeof r.temp === 'number' ? r.temp : 0,
            humidity: typeof r.humidity === 'number' ? r.humidity : 0,
            lux: typeof r.lux === 'number' ? r.lux : 0,
            tankLevel: typeof r.tankLevel === 'number' ? r.tankLevel : 0,
            gasLevel: typeof r.gasLevel === 'number' ? r.gasLevel : 0,
            soil1: soil[0] || 0,
            soil2: soil[1] || 0,
            soil3: soil[2] || 0,
            soil4: soil[3] || 0,
            soil5: soil[4] || 0,
            soil6: soil[5] || 0,
            // Zeit formatieren
            time: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '??:??',
            originalTimestamp: entry.timestamp // Für Sortierung
          };
        })
        .sort((a, b) => new Date(a.originalTimestamp) - new Date(b.originalTimestamp)); // Chronologisch sortieren

      console.log("Verarbeitete Daten für Charts:", formatted); // Debugging

      setData(formatted);
      setLogs(logData || []);
      setPlants(plantData || []);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const kwhPerDay = (powerConfig.watts / 1000) * powerConfig.hours;
  const costDay = kwhPerDay * powerConfig.price;
  const costMonth = costDay * 30;
  const costCycle = costDay * 100;

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Lade Daten...</div>;

  if (error) return (
    <div className="p-8 text-center text-red-400 bg-slate-900 rounded-xl border border-red-900 m-4">
      <AlertTriangle className="mx-auto mb-2" />
      <h3 className="font-bold">Fehler beim Laden</h3>
      <p className="text-sm">{error}</p>
      <button onClick={loadAllData} className="mt-4 bg-slate-800 px-4 py-2 rounded">Erneut versuchen</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Daten & Finanzen</h2>
        <div className="flex gap-2">
           <ReportGenerator historyData={data} logs={logs} plants={plants} />
           <button onClick={loadAllData} className="text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700">Refresh</button>
        </div>
      </div>
      
      {/* 1. Klima Chart */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-slate-300">Klima Umgebung</h3>
          <div className="h-64 w-full">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} unit="°C" domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperatur" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="Luftfeuchte" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <p>Keine Klimadaten vorhanden.</p>
                <p className="text-xs mt-2">Warte auf ESP32 Sendung...</p>
              </div>
            )}
          </div>
      </div>

      {/* 2. Licht Chart */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-slate-300">Lichtintensität</h3>
        <div className="h-64 w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLux" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} unit=" lx" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Legend />
                <Area type="monotone" dataKey="lux" name="Helligkeit" stroke="#facc15" fillOpacity={1} fill="url(#colorLux)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-slate-500">Warte auf Daten...</div>
          )}
        </div>
      </div>

      {/* 3. Bodenfeuchtigkeit */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-slate-300">Bodenfeuchtigkeit</h3>
        <div className="h-64 w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Legend />
                <Line type="monotone" dataKey="soil1" name="Pflanze 1" stroke="#10b981" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="soil2" name="Pflanze 2" stroke="#34d399" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="soil3" name="Pflanze 3" stroke="#6ee7b7" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="soil4" name="Pflanze 4" stroke="#059669" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="soil5" name="Pflanze 5" stroke="#047857" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="soil6" name="Pflanze 6" stroke="#065f46" dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-slate-500">Warte auf Daten...</div>
          )}
        </div>
      </div>

      {/* 4. Tank & Gas */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-slate-300">Ressourcen & Luftqualität</h3>
        <div className="h-64 w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} domain={[0, 4095]} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} domain={[0, 4095]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="tankLevel" name="Wassertank" stroke="#3b82f6" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="gasLevel" name="Gas/CO2" stroke="#a855f7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-slate-500">Warte auf Daten...</div>
          )}
        </div>
      </div>

      {/* Stromkosten Rechner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Calculator /></div>
          <div>
            <h3 className="text-xl font-bold text-slate-200">Stromkosten Rechner</h3>
            <p className="text-xs text-slate-500">Kalkuliere deine Betriebskosten in Echtzeit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Strompreis (€/kWh)</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded px-3 py-2">
                <Coins size={16} className="text-slate-500"/>
                <input type="number" step="0.01" value={powerConfig.price} onChange={e => setPowerConfig({...powerConfig, price: parseFloat(e.target.value)})} className="bg-transparent outline-none w-full font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Leistung (Watt)</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded px-3 py-2">
                <Zap size={16} className="text-yellow-500"/>
                <input type="number" value={powerConfig.watts} onChange={e => setPowerConfig({...powerConfig, watts: parseFloat(e.target.value)})} className="bg-transparent outline-none w-full font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Lichtstunden / Tag</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded px-3 py-2">
                <Clock size={16} className="text-blue-500"/>
                <input type="number" value={powerConfig.hours} onChange={e => setPowerConfig({...powerConfig, hours: parseFloat(e.target.value)})} className="bg-transparent outline-none w-full font-mono text-sm" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CostCard label="Täglich" value={costDay.toFixed(2)} sub={`${kwhPerDay.toFixed(1)} kWh`} color="slate" />
            <CostCard label="Monatlich" value={costMonth.toFixed(2)} sub="Prognose" color="blue" />
            <CostCard label="Pro Grow (100 Tage)" value={costCycle.toFixed(2)} sub="Totaler Zyklus" color="emerald" highlight={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

const CostCard = ({ label, value, sub, color, highlight }) => (
  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
    highlight ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-950 border-slate-800'
  }`}>
    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</div>
    <div>
      <div className={`text-3xl font-bold mb-1 ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>
        {value}€
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  </div>
);