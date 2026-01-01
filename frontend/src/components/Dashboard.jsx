import React, { useState, useEffect } from 'react';
import StatCard from './Dashboard/StatCard';
import LiveChart from './Dashboard/LiveChart';
import CameraFeed from './Dashboard/CameraFeed'; 
import WeatherWidget from './Dashboard/WeatherWidget';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { 
  Thermometer, Droplets, Sun, Activity, Wind, AlertCircle, 
  ArrowRight, CheckCircle2, Clock, Calendar, Leaf, Palette, ChevronDown
} from 'lucide-react';

// --- Logo Komponente ---
const Logo = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-8 h-8 ${className}`}>
    <path d="M12.378 1.602a.75.75 0 00-.756 0C11.622 1.602 3 7.122 3 14.25A9 9 0 0012 23.25a9 9 0 009-9c0-7.128-8.622-12.648-8.622-12.648zM12 21.75A7.5 7.5 0 014.5 14.25c0-5.8 6.058-10.3 7.5-11.304 1.442 1.004 7.5 5.504 7.5 11.304A7.5 7.5 0 0112 21.75z" opacity="0.5"/>
    <path d="M12 6.75a.75.75 0 00-.75.75v9a.75.75 0 001.5 0v-9a.75.75 0 00-.75-.75z" />
    <path d="M12 13.5a.75.75 0 00-.53.22l-2.25 2.25a.75.75 0 101.06 1.06L12 15.31l1.72 1.72a.75.75 0 101.06-1.06l-2.25-2.25a.75.75 0 00-.53-.22z" />
  </svg>
);

// --- Themen Definitionen ---
const themes = {
  dark: {
    name: 'Standard Dark',
    bgMain: 'bg-slate-950',
    bgCard: 'bg-slate-900',
    border: 'border-slate-800',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-400',
    accent: 'emerald',
    welcomeGradient: 'from-slate-900 to-slate-800',
    logoColor: 'text-emerald-500',
  },
  forest: {
    name: 'Forest Green',
    bgMain: 'bg-green-950',
    bgCard: 'bg-green-900',
    border: 'border-green-800',
    textPrimary: 'text-green-50',
    textSecondary: 'text-green-300',
    accent: 'lime',
    welcomeGradient: 'from-green-900 to-green-800',
    logoColor: 'text-lime-500',
  },
  ocean: {
    name: 'Deep Ocean',
    bgMain: 'bg-blue-950',
    bgCard: 'bg-blue-900',
    border: 'border-blue-800',
    textPrimary: 'text-blue-50',
    textSecondary: 'text-blue-300',
    accent: 'cyan',
    welcomeGradient: 'from-blue-900 to-blue-800',
    logoColor: 'text-cyan-500',
  },
};

export default function Dashboard({ changeTab }) {
  const { sensorData, isConnected } = useSocket();
  const [nextEvent, setNextEvent] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [averages, setAverages] = useState({ temp: null, humidity: null, lux: null, vpd: null });
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const theme = themes[currentTheme];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [events, history] = await Promise.all([
        api.getEvents(),
        api.getHistory()
      ]);

      const futureEvents = events
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (futureEvents.length > 0) setNextEvent(futureEvents[0]);

      const alerts = [];
      if (sensorData?.tankLevel < 1000) alerts.push({ type: 'warning', msg: 'Wassertank niedrig' });
      if (sensorData?.temp > 28) alerts.push({ type: 'error', msg: 'Temperatur kritisch' });
      setActiveAlerts(alerts);

      if (Array.isArray(history) && history.length > 0) {
        const now = Date.now();
        const hours4 = 4 * 60 * 60 * 1000;
        const recentData = history.filter(d => new Date(d.timestamp).getTime() > (now - hours4));
        
        if (recentData.length > 0) {
          const sums = recentData.reduce((acc, curr) => {
            const r = curr.readings || {};
            const t = r.temp || 0;
            const rh = r.humidity || 0;
            const svp = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
            const vpd = svp * (1 - rh / 100);

            return {
              temp: acc.temp + (r.temp || 0),
              humidity: acc.humidity + (r.humidity || 0),
              lux: acc.lux + (r.lux || 0),
              vpd: acc.vpd + (vpd > 0 ? vpd : 0),
              count: acc.count + 1
            };
          }, { temp: 0, humidity: 0, lux: 0, vpd: 0, count: 0 });

          setAverages({
            temp: (sums.temp / sums.count).toFixed(1),
            humidity: (sums.humidity / sums.count).toFixed(1),
            lux: (sums.lux / sums.count).toFixed(0),
            vpd: (sums.vpd / sums.count).toFixed(2)
          });
        }
      }

    } catch (e) { 
      console.error("Dashboard Ladefehler:", e); 
    }
  };

  const isTempOk = sensorData?.temp > 18 && sensorData?.temp < 28;
  const isHumOk = sensorData?.humidity > 40 && sensorData?.humidity < 70;
  const healthScore = (isConnected ? 50 : 0) + (isTempOk ? 25 : 0) + (isHumOk ? 25 : 0);

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 pb-20 ${theme.bgMain} p-6 rounded-3xl`}>
      
      {/* Header mit Logo und Themenauswahl */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <Logo className={theme.logoColor} />
          <h1 className={`text-2xl font-bold ${theme.textPrimary} tracking-tight`}>GrowMonitor</h1>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${theme.bgCard} ${theme.border} border ${theme.textPrimary} hover:bg-opacity-80 transition-colors`}
          >
            <Palette size={18} className={theme.logoColor} />
            <span className="text-sm font-medium">{theme.name}</span>
            <ChevronDown size={16} className={`transition-transform ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isThemeMenuOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl ${theme.bgCard} ${theme.border} border z-50 overflow-hidden`}>
              {Object.entries(themes).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => { setCurrentTheme(key); setIsThemeMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2
                    ${currentTheme === key ? `${t.logoColor} bg-${t.accent}-500/10` : `${t.textPrimary} hover:bg-${t.accent}-500/5`}
                  `}
                >
                  <div className={`w-3 h-3 rounded-full bg-${t.accent}-500`}></div>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 bg-gradient-to-br ${theme.welcomeGradient} p-8 rounded-3xl border ${theme.border} border-opacity-50 relative overflow-hidden shadow-2xl group`}>
          <div className={`absolute top-0 right-0 w-80 h-80 bg-${theme.accent}-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-${theme.accent}-500/20 transition-colors duration-1000`}></div>
          <div className="relative z-10">
            <h2 className={`text-3xl font-bold ${theme.textPrimary} mb-2`}>Hallo Grower! 🌱</h2>
            <p className={`${theme.textSecondary} mb-8 max-w-lg text-lg leading-relaxed`}>
              Systemstatus: <span className={`text-${theme.accent}-400 font-bold`}>{healthScore}% Effizienz</span>. 
              Alles bereit für optimales Wachstum.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => changeTab('plants')} className={`bg-${theme.accent}-600 hover:bg-${theme.accent}-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-${theme.accent}-900/20 flex items-center gap-2`}>
                Pflanzen <ArrowRight size={20} />
              </button>
              <button onClick={() => changeTab('analytics')} className={`${theme.bgCard} hover:bg-${theme.border.split('-')[1]}-700 ${theme.textPrimary} px-6 py-3 rounded-xl font-bold transition-all border ${theme.border}`}>
                Analyse
              </button>
            </div>
          </div>
        </div>

        {/* Health Card */}
        <div className={`${theme.bgCard} p-6 rounded-3xl border ${theme.border} shadow-xl flex flex-col justify-between relative overflow-hidden`}>
           <div className="flex justify-between items-start z-10">
             <div>
               <h3 className={`${theme.textSecondary} font-bold text-xs uppercase tracking-widest mb-1`}>Status</h3>
               <div className={`text-sm font-bold flex items-center gap-2 ${isConnected ? `text-${theme.accent}-400` : 'text-red-400'}`}>
                 <span className={`w-2 h-2 rounded-full ${isConnected ? `bg-${theme.accent}-500 animate-pulse` : 'bg-red-500'}`}></span>
                 {isConnected ? 'Online' : 'Offline'}
               </div>
             </div>
             <div className={`p-2 rounded-lg ${theme.bgMain} border ${theme.border}`}>
               {healthScore === 100 ? <CheckCircle2 className={`text-${theme.accent}-500`} /> : <AlertCircle className="text-amber-500" />}
             </div>
           </div>
           <div className="mt-6 z-10">
             <div className="flex items-end gap-2 mb-2">
               <span className={`text-5xl font-black ${theme.textPrimary}`}>{healthScore}</span>
               <span className={`text-xl ${theme.textSecondary} mb-1 font-bold`}>%</span>
             </div>
             <div className={`w-full ${theme.bgMain} h-3 rounded-full overflow-hidden border ${theme.border}`}>
               <div className={`h-full rounded-full transition-all duration-1000 ${healthScore > 80 ? `bg-${theme.accent}-500` : 'bg-amber-500'}`} style={{ width: `${healthScore}%` }}></div>
             </div>
           </div>
           <div className="mt-4 space-y-2 z-10">
             {activeAlerts.map((alert, idx) => (
               <div key={idx} className="text-xs px-2 py-1 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-2">
                 <AlertCircle size={12} /> {alert.msg}
               </div>
             ))}
             {activeAlerts.length === 0 && <div className={`text-xs ${theme.textSecondary}`}>Keine Warnungen</div>}
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Temperatur" 
          value={sensorData?.temp?.toFixed(1) || '--'} 
          unit="°C" 
          icon={<Thermometer size={24} />} 
          color="text-amber-400" 
          bg="bg-amber-400/10 border-amber-400/20" 
          trend={+0.2}
          avg={averages.temp}
          className={`${theme.bgCard} border ${theme.border} hover:border-${theme.accent}-500/50`}
        />
        <StatCard 
          title="Luftfeuchte" 
          value={sensorData?.humidity?.toFixed(1) || '--'} 
          unit="%" 
          icon={<Droplets size={24} />} 
          color="text-blue-400" 
          bg="bg-blue-400/10 border-blue-400/20" 
          trend={-1.5}
          avg={averages.humidity}
          className={`${theme.bgCard} border ${theme.border} hover:border-${theme.accent}-500/50`}
        />
        <StatCard 
          title="Licht" 
          value={sensorData?.lux?.toFixed(0) || '--'} 
          unit="lx" 
          icon={<Sun size={24} />} 
          color="text-yellow-400" 
          bg="bg-yellow-400/10 border-yellow-400/20"
          avg={averages.lux}
          className={`${theme.bgCard} border ${theme.border} hover:border-${theme.accent}-500/50`}
        />
        <StatCard 
          title="VPD" 
          value="1.12" 
          unit="kPa" 
          icon={<Wind size={24} />} 
          color={`text-${theme.accent}-400`} 
          bg={`bg-${theme.accent}-400/10 border-${theme.accent}-400/20`}
          avg={averages.vpd}
          className={`${theme.bgCard} border ${theme.border} hover:border-${theme.accent}-500/50`}
        />
      </div>

      {/* Middle Section: Chart & Weather */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[450px]">
        {/* Live Chart Area */}
        <div className={`xl:col-span-2 ${theme.bgCard} border ${theme.border} rounded-3xl p-6 shadow-xl flex flex-col`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold ${theme.textPrimary} flex items-center gap-2 text-lg`}><Activity className={`text-${theme.accent}-500`} size={20} /> Klima Verlauf</h3>
            <span className={`text-xs text-${theme.accent}-400 font-bold uppercase tracking-wider bg-${theme.accent}-500/10 px-2 py-1 rounded`}>Live</span>
          </div>
          <div className={`flex-1 w-full min-h-0 bg-${theme.bgMain.split('-')[1]}-950/30 rounded-2xl border ${theme.border} border-opacity-50 p-2`}>
            {/* Chart mit Theme Farben */}
            <LiveChart accentColor={theme.accent === 'emerald' ? '#10b981' : theme.accent === 'lime' ? '#84cc16' : '#06b6d4'} />
          </div>
        </div>

        {/* Weather & Camera */}
        <div className="xl:col-span-1 h-full flex flex-col gap-6">
           <div className="flex-1 min-h-0">
             <WeatherWidget />
           </div>
           <div className="flex-1 min-h-0">
             <CameraFeed />
           </div>
        </div>
      </div>

      {/* Next Task Widget */}
      <div className={`${theme.bgCard} border ${theme.border} rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6`}>
        <div>
          <h3 className={`font-bold ${theme.textPrimary} flex items-center gap-2 mb-1`}>
            <Calendar className="text-purple-500" size={20} /> Nächstes Event
          </h3>
          <p className={`${theme.textSecondary} text-sm`}>Behalte den Überblick über deine Aufgaben.</p>
        </div>
        
        {nextEvent ? (
          <div className={`flex-1 ${theme.bgMain} border ${theme.border} p-4 rounded-2xl flex items-center gap-4 w-full md:w-auto`}>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><Leaf size={24}/></div>
            <div>
              <div className={`font-bold ${theme.textPrimary}`}>{nextEvent.title}</div>
              <div className={`text-xs ${theme.textSecondary}`}>{new Date(nextEvent.date).toLocaleDateString()} • {nextEvent.type}</div>
            </div>
            <div className={`ml-auto px-3 py-1 ${theme.bgCard} rounded-lg text-xs font-bold text-amber-400 border ${theme.border}`}>Offen</div>
          </div>
        ) : (
          <button onClick={() => changeTab('calendar')} className={`px-6 py-3 ${theme.bgMain} hover:bg-${theme.bgCard} border ${theme.border} rounded-xl ${theme.textSecondary} hover:${theme.textPrimary} transition-colors text-sm font-bold flex items-center gap-2`}>
            <Clock size={16} /> Aufgabe planen
          </button>
        )}
      </div>
    </div>
  );
}