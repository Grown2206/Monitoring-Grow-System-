import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { AlertProvider, useAlert } from './context/AlertContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './theme';
import Dashboard from './components/Dashboard';
import Plants from './components/Plants';
import Controls from './components/Controls';
import Analytics from './components/Analytics';
import CalendarView from './components/CalendarView';
import Hardware from './components/Hardware';
import AIConsultant from './components/AIConsultant';
import Settings from './components/Settings';
import GrowRecipes from './components/GrowRecipes';
import Login from './components/Auth/Login';
import {
  LayoutDashboard, Sprout, Settings as SettingsIcon, BarChart3,
  Calendar, Cpu, Bot, Sliders, Bell, Menu, X, Leaf, BookOpen, LogOut, Loader
} from 'lucide-react';

// Erweiterte Status-Badge Komponente
const StatusBadge = () => {
  const { isConnected } = useSocket();
  return (
    <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border shadow-sm transition-all duration-300 ${
      isConnected 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' 
        : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10'
    }`}>
      <span className={`relative flex h-2.5 w-2.5`}>
        {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
      </span>
      {isConnected ? 'SYSTEM ONLINE' : 'VERBINDUNG GETRENNT'}
    </div>
  );
};

// Haupt-Navigation Button
const NavBtn = ({ id, active, set, icon, label, mobile = false }) => (
  <button 
    onClick={() => set(id)}
    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full ${
      active === id 
        ? 'bg-gradient-to-r from-emerald-600/20 to-emerald-600/5 text-emerald-400 border-l-4 border-emerald-500' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <div className={`${active === id ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
      {icon}
    </div>
    <span className={`font-medium ${mobile ? 'block' : 'hidden md:inline'}`}>{label}</span>
    {active === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 hidden md:block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
  </button>
);

// Header mit Benachrichtigungen
const TopBar = ({ title, toggleSidebar }) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <StatusBadge />
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
        </button>
      </div>
    </header>
  );
};

// Haupt-App mit Auth-Check
function AppContent() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading State während Token-Validierung
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Lade Sitzung...</p>
        </div>
      </div>
    );
  }

  // Login ist jetzt OPTIONAL - App funktioniert auch ohne Login
  // Kommentiert aus damit App OHNE Login funktioniert
  // if (!isAuthenticated) {
  //   return <Login onSuccess={() => setActiveTab('dashboard')} />;
  // }

  const getPageTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'System Übersicht';
      case 'plants': return 'Pflanzen Management';
      case 'recipes': return 'Grow-Rezepte';
      case 'calendar': return 'Grow Kalender';
      case 'analytics': return 'Daten & Analyse';
      case 'controls': return 'Manuelle Steuerung';
      case 'settings': return 'Einstellungen';
      case 'hardware': return 'System Status';
      case 'ai': return 'AI Consultant';
      default: return 'GrowMonitor';
    }
  };

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Übersicht' },
    { id: 'plants', icon: <Sprout size={20} />, label: 'Pflanzen' },
    { id: 'recipes', icon: <BookOpen size={20} />, label: 'Rezepte' },
    { id: 'calendar', icon: <Calendar size={20} />, label: 'Kalender' },
    { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Historie' },
    { id: 'controls', icon: <Sliders size={20} />, label: 'Steuerung' },
    { id: 'ai', icon: <Bot size={20} />, label: 'AI Consultant' },
    { id: 'hardware', icon: <Cpu size={20} />, label: 'System' },
    { id: 'settings', icon: <SettingsIcon size={20} />, label: 'Einstellungen' },
  ];

  // Eingeloggt -> Normale App
  return (
    <SocketProvider>
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden selection:bg-emerald-500/30">
          
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 
            transform transition-transform duration-300 ease-in-out flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-lg shadow-lg shadow-emerald-900/20">
                  <Leaf className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-white leading-none">GrowMonitor</h2>
                  <span className="text-xs text-emerald-500 font-medium tracking-wider">PRO SYSTEM</span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500">
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">Hauptmenü</div>
              {navItems.slice(0, 6).map(item => (
                <NavBtn key={item.id} {...item} active={activeTab} set={(id) => {setActiveTab(id); setSidebarOpen(false);}} />
              ))}

              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Tools & System</div>
              {navItems.slice(6).map(item => (
                <NavBtn key={item.id} {...item} active={activeTab} set={(id) => {setActiveTab(id); setSidebarOpen(false);}} />
              ))}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-2">
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white uppercase">
                  {user?.username?.substring(0, 2) || 'GM'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-slate-200 truncate">{user?.username || 'User'}</div>
                  <div className="text-xs text-slate-500 truncate">v2.1.0 Stable</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-96 bg-emerald-900/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
            
            <TopBar title={getPageTitle()} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'dashboard' && <Dashboard changeTab={setActiveTab} />}
                {activeTab === 'plants' && <Plants />}
                {activeTab === 'recipes' && <GrowRecipes />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'ai' && <AIConsultant />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'hardware' && <Hardware />}
                {activeTab === 'controls' && <Controls />}
                {activeTab === 'settings' && <Settings />}
              </div>
            </main>
          </div>
        </div>
    </SocketProvider>
  );
}

// Wrapper mit Providern
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}