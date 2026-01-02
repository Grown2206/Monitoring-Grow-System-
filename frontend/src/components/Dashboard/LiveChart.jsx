import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { colors } from '../../theme';

export default function LiveChart({ theme }) {
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

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: theme.text.muted }}>
        Warte auf Daten...
      </div>
    );
  }

  const accentColor = theme.accent.color;
  const humidityColor = colors.blue[400];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={humidityColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={humidityColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.components.chartGrid}
          vertical={false}
          opacity={0.3}
        />
        <XAxis dataKey="time" hide />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.components.tooltip.bg,
            borderColor: theme.components.tooltip.border,
            borderRadius: '8px',
            fontSize: '12px'
          }}
          itemStyle={{ color: theme.text.primary }}
        />
        <Area
          type="monotone"
          dataKey="temp"
          stroke={accentColor}
          fillOpacity={1}
          fill="url(#colorTemp)"
          strokeWidth={2}
          name="Temperatur"
        />
        <Area
          type="monotone"
          dataKey="humidity"
          stroke={humidityColor}
          fillOpacity={1}
          fill="url(#colorHum)"
          strokeWidth={2}
          name="Luftfeuchte"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}