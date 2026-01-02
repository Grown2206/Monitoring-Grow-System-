import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';

export default function LiveChart({ accentColor = '#fbbf24' }) { // Standard: Amber
  const [data, setData] = useState([]);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.getHistory();
      const history = response?.data || response || [];
      const formatted = history.map(entry => ({
        time: new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        temp: entry.readings?.temp || 0,
        humidity: entry.readings?.humidity || 0
      })).slice(-20); 
      setData(formatted);
    } catch (e) {
      console.error("Chart Error", e);
    }
  };

  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-sm">Warte auf Daten...</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
        <XAxis dataKey="time" hide />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        {/* Nutze die AccentColor für Temperatur */}
        <Area type="monotone" dataKey="temp" stroke={accentColor} fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
        <Area type="monotone" dataKey="humidity" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHum)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}