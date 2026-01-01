import React, { useState, useEffect } from 'react';
import StatCard from './Dashboard/StatCard';
import LiveChart from './Dashboard/LiveChart';
import CameraFeed from './Dashboard/CameraFeed'; // Importieren
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { 
  Thermometer, Droplets, Sun, Activity, Wind, AlertCircle, 
  ArrowRight, CheckCircle2, Clock, Calendar, Leaf 
} from 'lucide-react';

export default function Dashboard({ changeTab }) {
  const { sensorData, isConnected } = useSocket();
  const [nextEvent, setNextEvent] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const events = await api.getEvents();
      const futureEvents = events
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (futureEvents.length > 0) setNextEvent(futureEvents[0]);

      const alerts = [];
      if (sensorData?.tankLevel < 1000) alerts.push({ type: 'warning', msg: 'Wassertank niedrig' });
      if (sensorData?.temp > 28) alerts.push({ type: 'error', msg: 'Temperatur kritisch' });
      setActiveAlerts(alerts);
    } catch (e) { console.error(e); }
  };

  const isTempOk = sensorData?.temp > 18 && sensorData?.temp < 28;
  const isHumOk = sensorData?.humidity > 40 && sensorData?.humidity < 70;
  const healthScore = (isConnected ? 50 : 0) + (isTempOk ? 25 : 0) + (isHumOk ? 25 : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Top Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl border border-slate-700/50 relative overflow-hidden shadow-2xl group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-1000"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-2">Hallo Grower! 🌱</h2>
            <p className="text-slate-400 mb-8 max-w-lg text-lg leading-relaxed">
              Systemstatus: <span className="text-emerald-400 font-bold">{healthScore}% Effizienz</span>. 
              Alles bereit für optimales Wachstum.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => changeTab('plants')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2">
                Pflanzen <ArrowRight size={20} />
              </button>
              <button onClick={() => changeTab('analytics')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl font-bold transition-all">
                Analyse
              </button>
            </div>
          </div>
        </div>

        {/* Health Card */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
           <div className="flex justify-between items-start z-10">
             <div>
               <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Status</h3>
               <div className={`text-sm font-bold flex items-center gap-2 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                 <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                 {isConnected ? 'Online' : 'Offline'}
               </div>
             </div>
             <div className="p-2 bg-slate-800 rounded-lg">
               {healthScore === 100 ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-amber-500" />}
             </div>
           </div>
           <div className="mt-6 z-10">
             <div className="flex items-end gap-2 mb-2">
               <span className="text-5xl font-black text-white">{healthScore}</span>
               <span className="text-xl text-slate-500 mb-1 font-bold">%</span>
             </div>
             <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
               <div className={`h-full rounded-full transition-all duration-1000 ${healthScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${healthScore}%` }}></div>
             </div>
           </div>
           <div className="mt-4 space-y-2 z-10">
             {activeAlerts.map((alert, idx) => (
               <div key={idx} className="text-xs px-2 py-1 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-2">
                 <AlertCircle size={12} /> {alert.msg}
               </div>
             ))}
             {activeAlerts.length === 0 && <div className="text-xs text-slate-500">Keine Warnungen</div>}
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Temperatur" value={sensorData?.temp?.toFixed(1) || '--'} unit="°C" icon={<Thermometer size={24} />} color="text-amber-400" bg="bg-amber-400/10" trend={+0.2} />
        <StatCard title="Luftfeuchte" value={sensorData?.humidity?.toFixed(1) || '--'} unit="%" icon={<Droplets size={24} />} color="text-blue-400" bg="bg-blue-400/10" trend={-1.5} />
        <StatCard title="Licht" value={sensorData?.lux?.toFixed(0) || '--'} unit="lx" icon={<Sun size={24} />} color="text-yellow-400" bg="bg-yellow-400/10" />
        <StatCard title="VPD" value="1.12" unit="kPa" icon={<Wind size={24} />} color="text-emerald-400" bg="bg-emerald-400/10" />
      </div>

      {/* Middle Section: Chart & Camera */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[450px]">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-lg"><Activity className="text-emerald-500" size={20} /> Klima Verlauf</h3>
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded">Live</span>
          </div>
          <div className="flex-1 w-full min-h-0 bg-slate-950/30 rounded-2xl border border-slate-800/50 p-2">
            <LiveChart />
          </div>
        </div>

        {/* NEU: Camera Feed Widget */}
        <div className="xl:col-span-1 h-full">
          <CameraFeed />
        </div>
      </div>

      {/* Next Task Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-1">
            <Calendar className="text-purple-500" size={20} /> Nächstes Event
          </h3>
          <p className="text-slate-400 text-sm">Behalte den Überblick über deine Aufgaben.</p>
        </div>
        
        {nextEvent ? (
          <div className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Leaf size={24}/></div>
            <div>
              <div className="font-bold text-white">{nextEvent.title}</div>
              <div className="text-xs text-slate-500">{new Date(nextEvent.date).toLocaleDateString()} • {nextEvent.type}</div>
            </div>
            <div className="ml-auto px-3 py-1 bg-slate-900 rounded-lg text-xs font-bold text-amber-400 border border-slate-800">Offen</div>
          </div>
        ) : (
          <button onClick={() => changeTab('calendar')} className="px-6 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors text-sm font-bold flex items-center gap-2">
            <Clock size={16} /> Aufgabe planen
          </button>
        )}
      </div>
    </div>
  );
}