import React, { useState } from 'react';
import { Camera, Maximize2, RefreshCw, Power } from 'lucide-react';

export default function CameraFeed() {
  const [isOn, setIsOn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    // Simuliert Bild-Neuladen
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden group">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <h3 className="font-bold text-slate-200 flex items-center gap-2 text-lg">
          <Camera className="text-blue-500" size={20} /> 
          Zelt Kamera
        </h3>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full ${isOn ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
           <span className="text-xs text-slate-500 uppercase font-bold">{isOn ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Feed Area */}
      <div className="flex-1 bg-black rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-800">
        {isOn ? (
          <>
            {/* Hier würde später das echte <img src="stream_url" /> stehen */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-60"></div>
            
            {/* Simuliertes Bild (Platzhalter Pattern) */}
            <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
            }}></div>
            
            <div className="text-center z-10 p-6">
               <Camera size={48} className="text-slate-700 mx-auto mb-2 opacity-50" />
               <p className="text-slate-500 text-sm">Kein Signal von ESP32-CAM</p>
               <p className="text-xs text-slate-600 mt-1">IP-Stream URL in Einstellungen konfigurieren</p>
            </div>

            {/* Overlay Controls (Show on Hover) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
               <button onClick={handleRefresh} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                 <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </button>
               <div className="text-xs font-mono text-white/70">1920x1080 • 30fps</div>
               <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                 <Maximize2 size={16} />
               </button>
            </div>
          </>
        ) : (
          <div className="text-slate-600 flex flex-col items-center">
            <Power size={32} className="mb-2 opacity-50" />
            <span>Kamera ausgeschaltet</span>
          </div>
        )}
      </div>

      {/* Power Toggle Absolute */}
      <button 
        onClick={() => setIsOn(!isOn)}
        className={`absolute top-6 right-6 p-2 rounded-xl transition-all z-20 ${isOn ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'}`}
      >
        <Power size={18} />
      </button>
    </div>
  );
}