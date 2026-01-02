import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useTheme, colors as importedColors } from '../theme'; // Umbenannt für Safety-Merge
import ReportGenerator from './ReportGenerator';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, Brush, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import {
  Calculator, Zap, Coins, Clock, AlertTriangle, RefreshCw, Activity,
  ThermometerSun, Droplets, TrendingUp, TrendingDown, Minus, Download,
  Share2, FileText, Calendar, Target, Award, Leaf, Sun, CloudRain,
  Wind, Gauge, BarChart3, PieChart, Grid3x3, Sparkles, Brain, Flame
} from 'lucide-react';

// ==================== SAFETY COLORS FIX ====================
// Verhindert den Absturz "Cannot read properties of undefined (reading '500')"
// Falls eine Farbe im Theme fehlt, wird dieser Standardwert genutzt.
const FALLBACK_COLORS = {
  emerald: { 400: '#34d399', 500: '#10b981' },
  red: { 200: '#fecaca', 400: '#f87171', 500: '#ef4444' },
  amber: { 400: '#fbbf24', 500: '#f59e0b' },
  blue: { 400: '#60a5fa', 500: '#3b82f6' },
  purple: { 400: '#c084fc', 500: '#a855f7' },
  yellow: { 500: '#eab308' },
  pink: { 500: '#ec4899' },
  slate: { 500: '#64748b' },
};

// Merge: Priorisiere importierte Farben, fülle Lücken mit Fallback auf
const colors = { ...FALLBACK_COLORS, ...(importedColors || {}) };

// Hilfsfunktion für sicheren Farbzugriff
const getSafeColor = (colorName, weight) => {
  return colors?.[colorName]?.[weight] || '#888888'; 
};
// ===========================================================


// ==================== SUB-KOMPONENTEN ====================

// Mini Stat Card
const MiniStatCard = ({ label, value, unit, trend, icon: Icon, iconColor, theme }) => (
  <div
    className="p-4 rounded-xl border transition-all hover:scale-105"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: theme.border.default
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${iconColor}20` }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      {trend !== undefined && (
        <div
          className="flex items-center gap-1 text-xs font-bold"
          style={{
            color: trend > 0 ? getSafeColor('emerald', 400) : trend < 0 ? getSafeColor('red', 400) : theme.text.muted
          }}
        >
          {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: theme.text.muted }}>
      {label}
    </div>
    <div className="flex items-baseline gap-1">
      <div className="text-2xl font-bold" style={{ color: theme.text.primary }}>{value}</div>
      <div className="text-sm" style={{ color: theme.text.muted }}>{unit}</div>
    </div>
  </div>
);

// DLI Card (Daily Light Integral)
const DLICard = ({ luxData, theme }) => {
  // DLI = (Average Lux × Hours of Light × 0.0036) / 1000
  // Simplified: avg lux over 18h light cycle
  const avgLux = luxData.length > 0
    ? luxData.reduce((sum, d) => sum + (d.lux || 0), 0) / luxData.length
    : 0;
  const hoursOfLight = 18; // Annahme
  const dli = (avgLux * hoursOfLight * 0.0036) / 1000;

  const getDLIRating = (dli) => {
    if (dli < 15) return { label: 'Niedrig', color: getSafeColor('red', 400), desc: 'Erhöhe Lichtintensität' };
    if (dli < 30) return { label: 'Optimal (Veg)', color: getSafeColor('emerald', 400), desc: 'Perfekt für Wachstum' };
    if (dli < 45) return { label: 'Optimal (Bloom)', color: getSafeColor('purple', 400), desc: 'Perfekt für Blüte' };
    return { label: 'Sehr Hoch', color: getSafeColor('amber', 400), desc: 'Risiko von Stress' };
  };

  const rating = getDLIRating(dli);

  return (
    <div
      className="p-6 rounded-2xl border shadow-xl relative overflow-hidden"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${rating.color}20` }}>
          <Sun size={24} style={{ color: rating.color }} />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: theme.text.primary }}>DLI Calculator</h3>
          <p className="text-xs" style={{ color: theme.text.muted }}>Daily Light Integral</p>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <div className="text-5xl font-black" style={{ color: rating.color }}>
          {dli.toFixed(1)}
        </div>
        <div className="text-xl mb-2 font-bold" style={{ color: theme.text.muted }}>mol/m²/d</div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${rating.color}20`, color: rating.color }}>
          {rating.label}
        </div>
        <div className="text-xs" style={{ color: theme.text.muted }}>{rating.desc}</div>
      </div>

      <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
        💡 Optimal: 15-30 (Veg), 30-45 (Bloom)
      </div>
    </div>
  );
};

// Anomaly Alert Card
const AnomalyCard = ({ anomalies, theme }) => {
  if (anomalies.length === 0) return null;

  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={20} style={{ color: getSafeColor('red', 400) }} />
        <h3 className="font-bold" style={{ color: getSafeColor('red', 200) }}>Anomalien erkannt</h3>
      </div>
      <div className="space-y-2">
        {anomalies.map((anom, idx) => (
          <div key={idx} className="text-xs p-2 rounded" style={{ backgroundColor: theme.bg.card, color: theme.text.secondary }}>
            • {anom.message} <span className="font-mono" style={{ color: getSafeColor('red', 400) }}>({anom.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Growth Tracker Card
const GrowthTrackerCard = ({ startDate, currentDay, estimatedHarvest, phase, theme }) => {
  const progress = (currentDay / estimatedHarvest) * 100;

  return (
    <div
      className="p-6 rounded-2xl border shadow-xl"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${theme.accent.color}20` }}>
          <Leaf size={24} style={{ color: theme.accent.color }} />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: theme.text.primary }}>Wachstums-Tracker</h3>
          <p className="text-xs" style={{ color: theme.text.muted }}>Phase: {phase}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: theme.text.muted }}>Tag {currentDay} von {estimatedHarvest}</span>
          <span className="text-sm font-bold" style={{ color: theme.accent.color }}>{progress.toFixed(0)}%</span>
        </div>

        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${theme.accent.color}, ${theme.accent.dark})`
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: theme.border.default }}>
          <div>
            <div className="text-xs" style={{ color: theme.text.muted }}>Start</div>
            <div className="font-mono text-sm" style={{ color: theme.text.primary }}>
              {new Date(startDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: theme.text.muted }}>Est. Ernte</div>
            <div className="font-mono text-sm" style={{ color: getSafeColor('emerald', 400) }}>
              {new Date(new Date(startDate).getTime() + estimatedHarvest * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Heatmap Component (24h Pattern)
const HeatmapChart = ({ data, metric, theme }) => {
  // Group data by hour (0-23)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = data.filter(d => {
      const h = new Date(d.timestamp).getHours();
      return h === hour;
    });

    const avg = hourData.length > 0
      ? hourData.reduce((sum, d) => sum + (d[metric] || 0), 0) / hourData.length
      : 0;

    return { hour, value: avg };
  });

  const maxValue = Math.max(...hourlyData.map(d => d.value));

  return (
    <div className="grid grid-cols-12 gap-1">
      {hourlyData.map((d, idx) => {
        const intensity = maxValue > 0 ? d.value / maxValue : 0;
        const color = intensity > 0.66 ? getSafeColor('red', 500) : intensity > 0.33 ? getSafeColor('amber', 500) : getSafeColor('emerald', 500);

        return (
          <div
            key={idx}
            className="aspect-square rounded flex items-center justify-center text-xs font-mono transition-all hover:scale-110"
            style={{
              backgroundColor: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
              color: intensity > 0.5 ? '#ffffff' : theme.text.muted
            }}
            title={`${d.hour}:00 - ${d.value.toFixed(1)}`}
          >
            {d.hour}
          </div>
        );
      })}
    </div>
  );
};

// ==================== HAUPT KOMPONENTE ====================

export default function Analytics() {
  const { currentTheme } = useTheme();
  const theme = currentTheme;

  const [rawData, setRawData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Settings
  const [timeRange, setTimeRange] = useState(24);
  const [activeView, setActiveView] = useState('overview'); // overview, advanced, heatmaps, insights
  const [powerConfig, setPowerConfig] = useState({
    price: 0.35,
    watts: 250,
    hours: 18
  });

  // Visibility toggles
  const [visibility, setVisibility] = useState({
    temp: true,
    humidity: true,
    vpd: false,
    lux: true,
    soil1: true, soil2: true, soil3: true, soil4: true, soil5: true, soil6: true,
    tank: true,
    gas: false
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      setError(null);
      // Safe catch falls API nicht da ist
      if (!api) throw new Error("API Service nicht verfügbar");
      
      const [historyRes, logData, plantData] = await Promise.all([
        api.getHistory().catch(e => []),
        api.getLogs().catch(e => []),
        api.getPlants().catch(e => [])
      ]);

      const history = historyRes?.data || historyRes || [];
      if (!Array.isArray(history)) {
        console.warn("History ist kein Array, verwende leeres Array");
        setRawData([]);
        setLoading(false);
        return;
      }

      const processed = history
        .filter(entry => entry && entry.readings)
        .map(entry => {
          const r = entry.readings;
          const soil = Array.isArray(r.soilMoisture) ? r.soilMoisture : [0, 0, 0, 0, 0, 0];

          const T = r.temp || 0;
          const RH = r.humidity || 0;
          // Magnus Formel
          const SVP = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
          const VPD = SVP * (1 - RH / 100);

          return {
            timestamp: new Date(entry.timestamp).getTime(),
            dateStr: new Date(entry.timestamp).toLocaleString(),
            timeStr: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      console.error("Fehler beim Laden:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Chart Data (filtered & downsampled)
  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];
    const now = Date.now();
    const cutoff = now - (timeRange * 60 * 60 * 1000);
    const filtered = rawData.filter(d => d.timestamp > cutoff);

    const maxPoints = 300;
    if (filtered.length <= maxPoints) return filtered;

    const step = Math.ceil(filtered.length / maxPoints);
    return filtered.filter((_, index) => index % step === 0);
  }, [rawData, timeRange]);

  // Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const calcStats = (key) => {
      const values = chartData.map(d => d[key]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) return { min: 0, max: 0, avg: 0 };
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    };

    return {
      temp: calcStats('temp'),
      humidity: calcStats('humidity'),
      vpd: calcStats('vpd'),
      lux: calcStats('lux')
    };
  }, [chartData]);

  // Anomaly Detection
  const anomalies = useMemo(() => {
    if (!stats) return [];
    const detected = [];

    if (stats.temp.max > 30) detected.push({ message: 'Temperatur zu hoch', value: `${stats.temp.max.toFixed(1)}°C` });
    if (stats.temp.min < 15) detected.push({ message: 'Temperatur zu niedrig', value: `${stats.temp.min.toFixed(1)}°C` });
    if (stats.humidity.max > 75) detected.push({ message: 'Luftfeuchte zu hoch', value: `${stats.humidity.max.toFixed(0)}%` });
    if (stats.humidity.min < 35) detected.push({ message: 'Luftfeuchte zu niedrig', value: `${stats.humidity.min.toFixed(0)}%` });
    if (stats.vpd.max > 1.6) detected.push({ message: 'VPD zu hoch (Stress)', value: `${stats.vpd.max.toFixed(2)} kPa` });

    return detected;
  }, [stats]);

  // Power Costs
  const kwhPerDay = (powerConfig.watts / 1000) * powerConfig.hours;
  const costDay = kwhPerDay * powerConfig.price;
  const costMonth = costDay * 30;
  const costCycle = costDay * 100;

  const toggleLine = (key) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const TimeButton = ({ hours, label }) => (
    <button
      onClick={() => setTimeRange(hours)}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
      style={{
        backgroundColor: timeRange === hours ? theme.accent.color : theme.bg.card,
        color: timeRange === hours ? '#ffffff' : theme.text.secondary,
        boxShadow: timeRange === hours ? `0 4px 12px rgba(${theme.accent.rgb}, 0.3)` : 'none'
      }}
    >
      {label}
    </button>
  );

  const ViewTab = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveView(id)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
      style={{
        backgroundColor: activeView === id ? `${theme.accent.color}20` : 'transparent',
        color: activeView === id ? theme.accent.color : theme.text.muted,
        borderBottom: activeView === id ? `2px solid ${theme.accent.color}` : '2px solid transparent'
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  if (error) return (
    <div className="p-8 text-center rounded-xl m-4 border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: getSafeColor('red', 400) }}>
      <AlertTriangle className="mx-auto mb-2" size={32} />
      <h3 className="font-bold mb-2">Verbindungsfehler</h3>
      <p className="text-sm mb-4">{error}</p>
      <button onClick={loadAllData} className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
        Erneut versuchen
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div
        className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-6 rounded-2xl border backdrop-blur-sm"
        style={{
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default
        }}
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
            <BarChart3 style={{ color: theme.accent.color }} /> Analytics & Insights
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
            {rawData.length} Messpunkte • Zeige letzte {timeRange}h
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex p-1 rounded-xl border" style={{ backgroundColor: theme.bg.main, borderColor: theme.border.default }}>
            <TimeButton hours={1} label="1h" />
            <TimeButton hours={3} label="3h" />
            <TimeButton hours={6} label="6h" />
            <TimeButton hours={12} label="12h" />
            <TimeButton hours={24} label="24h" />
            <TimeButton hours={72} label="3d" />
          </div>

          <div className="h-8 w-px" style={{ backgroundColor: theme.border.default }}></div>

          <div className="flex gap-2">
            <ReportGenerator historyData={rawData} logs={logs} plants={plants} />
            <button
              onClick={loadAllData}
              className="p-2.5 rounded-xl transition-colors"
              style={{
                backgroundColor: theme.bg.card,
                color: theme.text.muted
              }}
              title="Aktualisieren"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto" style={{ borderColor: theme.border.default }}>
        <ViewTab id="overview" label="Übersicht" icon={Grid3x3} />
        <ViewTab id="advanced" label="Erweitert" icon={Sparkles} />
        <ViewTab id="heatmaps" label="Heatmaps" icon={Flame} />
        <ViewTab id="insights" label="Insights" icon={Brain} />
      </div>

      {loading && rawData.length === 0 ? (
        <div className="h-64 flex items-center justify-center animate-pulse" style={{ color: theme.text.muted }}>
          Lade Diagramme...
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeView === 'overview' && (
            <>
              {/* Stats Cards Row */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MiniStatCard
                    label="Temp Ø"
                    value={stats.temp.avg.toFixed(1)}
                    unit="°C"
                    trend={(stats.temp.avg - 24) / 24 * 100}
                    icon={ThermometerSun}
                    iconColor={getSafeColor('amber', 500)}
                    theme={theme}
                  />
                  <MiniStatCard
                    label="RLF Ø"
                    value={stats.humidity.avg.toFixed(0)}
                    unit="%"
                    trend={(stats.humidity.avg - 60) / 60 * 100}
                    icon={Droplets}
                    iconColor={getSafeColor('blue', 500)}
                    theme={theme}
                  />
                  <MiniStatCard
                    label="VPD Ø"
                    value={stats.vpd.avg.toFixed(2)}
                    unit="kPa"
                    trend={undefined}
                    icon={Wind}
                    iconColor={getSafeColor('emerald', 500)}
                    theme={theme}
                  />
                  <MiniStatCard
                    label="Lux Ø"
                    value={stats.lux.avg.toFixed(0)}
                    unit="lx"
                    trend={undefined}
                    icon={Sun}
                    iconColor={getSafeColor('yellow', 500)}
                    theme={theme}
                  />
                </div>
              )}

              {/* Anomalies */}
              <AnomalyCard anomalies={anomalies} theme={theme} />

              {/* Main Climate Chart */}
              <div className="p-4 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <ThermometerSun style={{ color: getSafeColor('amber', 400) }} size={20} /> Klima & VPD
                  </h3>
                  <div className="flex gap-2 text-xs flex-wrap">
                    <button onClick={() => toggleLine('temp')} className="px-2 py-1 rounded border" style={{ backgroundColor: visibility.temp ? 'rgba(251, 191, 36, 0.2)' : theme.bg.hover, color: visibility.temp ? getSafeColor('amber', 400) : theme.text.muted, borderColor: visibility.temp ? 'rgba(251, 191, 36, 0.5)' : theme.border.default }}>Temp</button>
                    <button onClick={() => toggleLine('humidity')} className="px-2 py-1 rounded border" style={{ backgroundColor: visibility.humidity ? 'rgba(96, 165, 250, 0.2)' : theme.bg.hover, color: visibility.humidity ? getSafeColor('blue', 400) : theme.text.muted, borderColor: visibility.humidity ? 'rgba(96, 165, 250, 0.5)' : theme.border.default }}>RLF</button>
                    <button onClick={() => toggleLine('vpd')} className="px-2 py-1 rounded border" style={{ backgroundColor: visibility.vpd ? 'rgba(16, 185, 129, 0.2)' : theme.bg.hover, color: visibility.vpd ? getSafeColor('emerald', 400) : theme.text.muted, borderColor: visibility.vpd ? 'rgba(16, 185, 129, 0.5)' : theme.border.default }}>VPD</button>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSafeColor('amber', 400)} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={getSafeColor('amber', 400)} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSafeColor('blue', 400)} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={getSafeColor('blue', 400)} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
                      <XAxis dataKey="timeStr" stroke={theme.text.muted} fontSize={12} tickMargin={10} minTickGap={30} />
                      <YAxis yAxisId="left" stroke={theme.text.muted} fontSize={12} domain={['auto', 'auto']} unit="°C" />
                      <YAxis yAxisId="right" orientation="right" stroke={theme.text.muted} fontSize={12} domain={[0, 100]} unit="%" />
                      {visibility.vpd && <YAxis yAxisId="vpd" orientation="right" stroke={getSafeColor('emerald', 500)} fontSize={12} domain={[0, 3]} unit=" kPa" hide />}
                      <Tooltip
                        contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }}
                        labelStyle={{ color: theme.text.muted, marginBottom: '0.5rem' }}
                      />
                      {visibility.temp && <Area yAxisId="left" type="monotone" dataKey="temp" name="Temperatur" stroke={getSafeColor('amber', 400)} fill="url(#gradTemp)" strokeWidth={2} />}
                      {visibility.humidity && <Area yAxisId="right" type="monotone" dataKey="humidity" name="Luftfeuchte" stroke={getSafeColor('blue', 400)} fill="url(#gradHum)" strokeWidth={2} />}
                      {visibility.vpd && <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke={getSafeColor('emerald', 500)} strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                      <Brush dataKey="timeStr" height={30} stroke={theme.border.default} fill={theme.bg.main} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Soil Moisture Chart */}
              <div className="p-4 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-2 gap-4">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Droplets style={{ color: getSafeColor('emerald', 500) }} size={20} /> Bodenfeuchtigkeit
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[1, 2, 3, 4, 5, 6].map(id => (
                      <button
                        key={id}
                        onClick={() => toggleLine(`soil${id}`)}
                        className="px-3 py-1 rounded-full border transition-all"
                        style={{
                          backgroundColor: visibility[`soil${id}`] ? 'rgba(16, 185, 129, 0.2)' : theme.bg.hover,
                          color: visibility[`soil${id}`] ? getSafeColor('emerald', 400) : theme.text.muted,
                          borderColor: visibility[`soil${id}`] ? 'rgba(16, 185, 129, 0.5)' : theme.border.default
                        }}
                      >
                        #{id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
                      <XAxis dataKey="timeStr" stroke={theme.text.muted} fontSize={12} minTickGap={30} />
                      <YAxis stroke={theme.text.muted} fontSize={12} unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }} />
                      {[
                        { id: 1, color: getSafeColor('emerald', 500) },
                        { id: 2, color: getSafeColor('blue', 500) },
                        { id: 3, color: getSafeColor('purple', 500) },
                        { id: 4, color: getSafeColor('amber', 500) },
                        { id: 5, color: getSafeColor('pink', 500) },
                        { id: 6, color: getSafeColor('slate', 500) },
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
            </>
          )}

          {/* ADVANCED TAB */}
          {activeView === 'advanced' && (
            <>
              {/* DLI + Growth Tracker */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DLICard luxData={chartData} theme={theme} />
                <GrowthTrackerCard
                  startDate="2025-01-01"
                  currentDay={35}
                  estimatedHarvest={100}
                  phase="Vegetativ"
                  theme={theme}
                />
              </div>

              {/* Correlation Chart (Temp vs Humidity) */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Target style={{ color: theme.accent.color }} size={20} /> Korrelation: Temp vs Luftfeuchte
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
                      <XAxis type="number" dataKey="temp" name="Temperatur" unit="°C" stroke={theme.text.muted} />
                      <YAxis type="number" dataKey="humidity" name="Luftfeuchte" unit="%" stroke={theme.text.muted} />
                      <ZAxis range={[20, 200]} />
                      <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }} cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Messwerte" data={chartData} fill={theme.accent.color} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart - Min/Max/Avg */}
              {stats && (
                <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                  <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <BarChart3 style={{ color: theme.accent.color }} size={20} /> Min / Avg / Max Vergleich
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Temp (°C)', min: stats.temp.min, avg: stats.temp.avg, max: stats.temp.max },
                          { name: 'RLF (%)', min: stats.humidity.min, avg: stats.humidity.avg, max: stats.humidity.max },
                          { name: 'VPD (kPa)', min: stats.vpd.min, avg: stats.vpd.avg, max: stats.vpd.max }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
                        <XAxis dataKey="name" stroke={theme.text.muted} />
                        <YAxis stroke={theme.text.muted} />
                        <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }} />
                        <Legend />
                        <Bar dataKey="min" fill={getSafeColor('blue', 500)} name="Minimum" />
                        <Bar dataKey="avg" fill={getSafeColor('emerald', 500)} name="Durchschnitt" />
                        <Bar dataKey="max" fill={getSafeColor('red', 500)} name="Maximum" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {/* HEATMAPS TAB */}
          {activeView === 'heatmaps' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Flame style={{ color: getSafeColor('red', 500) }} size={20} /> Temperatur - 24h Heatmap
                </h3>
                <HeatmapChart data={rawData} metric="temp" theme={theme} />
              </div>

              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <CloudRain style={{ color: getSafeColor('blue', 500) }} size={20} /> Luftfeuchte - 24h Heatmap
                </h3>
                <HeatmapChart data={rawData} metric="humidity" theme={theme} />
              </div>

              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Sun style={{ color: getSafeColor('yellow', 500) }} size={20} /> Licht - 24h Heatmap
                </h3>
                <HeatmapChart data={rawData} metric="lux" theme={theme} />
              </div>
            </div>
          )}

          {/* INSIGHTS TAB */}
          {activeView === 'insights' && (
            <>
              {/* Power Cost Calculator */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: `${getSafeColor('yellow', 500)}20` }}>
                    <Calculator size={24} style={{ color: getSafeColor('yellow', 500) }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: theme.text.primary }}>Stromkosten Kalkulator</h3>
                    <p className="text-xs" style={{ color: theme.text.muted }}>Live Berechnung basierend auf deiner Konfiguration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-5 p-4 rounded-xl border" style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}>
                    <div>
                      <label className="text-xs block mb-1 uppercase font-bold" style={{ color: theme.text.muted }}>Strompreis (€/kWh)</label>
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        <Coins size={16} style={{ color: theme.text.muted }} />
                        <input type="number" step="0.01" value={powerConfig.price} onChange={e => setPowerConfig({ ...powerConfig, price: parseFloat(e.target.value) })} className="bg-transparent outline-none w-full font-mono text-sm" style={{ color: theme.text.primary }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs block mb-1 uppercase font-bold" style={{ color: theme.text.muted }}>Leistung (Watt)</label>
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        <Zap size={16} style={{ color: getSafeColor('yellow', 500) }} />
                        <input type="number" value={powerConfig.watts} onChange={e => setPowerConfig({ ...powerConfig, watts: parseFloat(e.target.value) })} className="bg-transparent outline-none w-full font-mono text-sm" style={{ color: theme.text.primary }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs block mb-1 uppercase font-bold" style={{ color: theme.text.muted }}>Lichtstunden / Tag</label>
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        <Clock size={16} style={{ color: getSafeColor('blue', 500) }} />
                        <input type="number" value={powerConfig.hours} onChange={e => setPowerConfig({ ...powerConfig, hours: parseFloat(e.target.value) })} className="bg-transparent outline-none w-full font-mono text-sm" style={{ color: theme.text.primary }} />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl border transition-all hover:scale-105" style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: theme.text.muted }}>Täglich</div>
                      <div className="text-3xl font-bold mb-1" style={{ color: theme.text.primary }}>{costDay.toFixed(2)}€</div>
                      <div className="text-xs" style={{ color: theme.text.muted }}>{kwhPerDay.toFixed(1)} kWh</div>
                    </div>
                    <div className="p-5 rounded-2xl border transition-all hover:scale-105" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', borderColor: 'rgba(96, 165, 250, 0.3)', color: getSafeColor('blue', 400) }}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-2">Monatlich</div>
                      <div className="text-3xl font-bold mb-1">{costMonth.toFixed(2)}€</div>
                      <div className="text-xs opacity-60">Prognose (30 Tage)</div>
                    </div>
                    <div className="p-5 rounded-2xl border transition-all hover:scale-105" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: getSafeColor('emerald', 400) }}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-2">Pro Grow</div>
                      <div className="text-4xl font-bold mb-1">{costCycle.toFixed(2)}€</div>
                      <div className="text-xs opacity-60">ca. 100 Tage</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Score */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl border shadow-xl text-center" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <Award size={48} className="mx-auto mb-3" style={{ color: getSafeColor('emerald', 500) }} />
                    <h3 className="font-bold mb-2" style={{ color: theme.text.primary }}>Performance Score</h3>
                    <div className="text-5xl font-black mb-2" style={{ color: getSafeColor('emerald', 400) }}>92</div>
                    <div className="text-xs" style={{ color: theme.text.muted }}>Sehr gut!</div>
                  </div>

                  <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <Gauge size={24} className="mb-3" style={{ color: getSafeColor('blue', 500) }} />
                    <h3 className="font-bold mb-3" style={{ color: theme.text.primary }}>Klima Stabilität</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text.muted }}>Temperatur</span>
                        <span className="font-bold" style={{ color: getSafeColor('emerald', 400) }}>95%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text.muted }}>Luftfeuchte</span>
                        <span className="font-bold" style={{ color: getSafeColor('amber', 400) }}>87%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text.muted }}>VPD</span>
                        <span className="font-bold" style={{ color: getSafeColor('emerald', 400) }}>94%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <Target size={24} className="mb-3" style={{ color: getSafeColor('purple', 500) }} />
                    <h3 className="font-bold mb-3" style={{ color: theme.text.primary }}>Optimierungen</h3>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('emerald', 500)}20`, color: getSafeColor('emerald', 400) }}>
                        ✓ VPD im optimalen Bereich
                      </div>
                      <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('amber', 500)}20`, color: getSafeColor('amber', 400) }}>
                        ⚠ RLF könnte stabiler sein
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}