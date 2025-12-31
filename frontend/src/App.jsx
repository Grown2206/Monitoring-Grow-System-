import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { AlertProvider } from './context/AlertContext'; // <--- NEU
import Dashboard from './components/Dashboard';
import Plants from './components/Plants';
import Controls from './components/Controls';
import Analytics from './components/Analytics';
import CalendarView from './components/CalendarView';
import Hardware from './components/Hardware';
import AIConsultant from './components/AIConsultant';
import Settings from './components/Settings'; // <--- NEU
import { LayoutDashboard, Sprout, Settings as SettingsIcon, BarChart3, Calendar, Cpu, Bot, Sliders } from 'lucide-react';

const StatusBadge = () => {
  const { isConnected } = useSocket();
  return (
    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
      isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
      {isConnected ? 'ONLINE' : 'OFFLINE'}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AlertProvider> {/* <--- WICHTIG: Ganz außen */}
      <SocketProvider>
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row">
          
          <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex md:flex-col justify-between p-4 sticky top-0 z-50">
            <div className="flex items-center gap-3 mb-0 md:mb-8">
              <Sprout className="text-emerald-500" size={28} />
              <span className="font-bold text-lg hidden md:inline">GrowMonitor</span>
            </div>

            <nav className="flex md:flex-col gap-2 w-full md:w-auto overflow-x-auto md:overflow-visible justify-center md:justify-start">
              <NavBtn id="dashboard" active={activeTab} set={setActiveTab} icon={<LayoutDashboard size={20} />} label="Übersicht" />
              <NavBtn id="plants" active={activeTab} set={setActiveTab} icon={<Sprout size={20} />} label="Pflanzen" />
              <NavBtn id="calendar" active={activeTab} set={setActiveTab} icon={<Calendar size={20} />} label="Kalender" />
              <NavBtn id="ai" active={activeTab} set={setActiveTab} icon={<Bot size={20} />} label="AI Consultant" />
              <NavBtn id="analytics" active={activeTab} set={setActiveTab} icon={<BarChart3 size={20} />} label="Historie" />
              <NavBtn id="hardware" active={activeTab} set={setActiveTab} icon={<Cpu size={20} />} label="System" />
              <NavBtn id="controls" active={activeTab} set={setActiveTab} icon={<Sliders size={20} />} label="Steuerung" />
              <div className="md:mt-4 md:border-t md:border-slate-800 md:pt-4">
                 <NavBtn id="settings" active={activeTab} set={setActiveTab} icon={<SettingsIcon size={20} />} label="Einstellungen" /> {/* <--- NEU */}
              </div>
            </nav>
            
            <div className="hidden md:block mt-auto pt-4 border-t border-slate-800">
              <StatusBadge />
            </div>
          </aside>

          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="md:hidden flex justify-end mb-4">
              <StatusBadge />
            </div>

            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'plants' && <Plants />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'ai' && <AIConsultant />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'hardware' && <Hardware />}
            {activeTab === 'controls' && <Controls />}
            {activeTab === 'settings' && <Settings />} {/* <--- NEU */}
          </main>
        </div>
      </SocketProvider>
    </AlertProvider>
  );
}

const NavBtn = ({ id, active, set, icon, label }) => (
  <button 
    onClick={() => set(id)}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${
      active === id ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'text-slate-400 hover:bg-slate-800'
    }`}
  >
    {icon}
    <span className="hidden md:inline font-medium">{label}</span>
  </button>
);