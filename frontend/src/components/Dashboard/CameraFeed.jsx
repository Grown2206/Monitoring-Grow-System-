import React, { useState } from 'react';
import { Camera, Maximize2, RefreshCw, Power } from 'lucide-react';
import { colors } from '../../theme';

export default function CameraFeed({ theme }) {
  // Fallback theme für Backwards-Kompatibilität
  const defaultTheme = {
    bg: { card: '#0f172a', main: '#020617', hover: '#1e293b' },
    border: { default: '#1e293b' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b' }
  };
  const t = theme || defaultTheme;

  const [isOn, setIsOn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    // Simuliert Bild-Neuladen
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div
      className="rounded-3xl p-5 md:p-6 shadow-xl flex flex-col h-full relative overflow-hidden group border"
      style={{
        backgroundColor: t.bg.card,
        borderColor: t.border.default
      }}
    >

      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <h3
          className="font-bold flex items-center gap-2 text-base md:text-lg"
          style={{ color: t.text.primary }}
        >
          <Camera style={{ color: colors.blue[500] }} size={20} />
          Zelt Kamera
        </h3>
        <div className="flex items-center gap-2">
           <span
             className={`w-2 h-2 rounded-full ${isOn ? 'animate-pulse' : ''}`}
             style={{ backgroundColor: isOn ? colors.red[500] : t.border.default }}
           ></span>
           <span className="text-xs uppercase font-bold" style={{ color: t.text.muted }}>
             {isOn ? 'LIVE' : 'OFFLINE'}
           </span>
        </div>
      </div>

      {/* Feed Area */}
      <div
        className="flex-1 rounded-2xl relative overflow-hidden flex items-center justify-center border"
        style={{
          backgroundColor: '#000',
          borderColor: t.border.default
        }}
      >
        {isOn ? (
          <>
            {/* Hier würde später das echte <img src="stream_url" /> stehen */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-60"></div>

            {/* Simuliertes Bild (Platzhalter Pattern) */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(${t.border.default} 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            ></div>

            <div className="text-center z-10 p-6">
               <Camera size={48} className="mx-auto mb-2 opacity-50" style={{ color: t.border.default }} />
               <p className="text-sm" style={{ color: t.text.muted }}>
                 Kein Signal von ESP32-CAM
               </p>
               <p className="text-xs mt-1" style={{ color: t.border.default }}>
                 IP-Stream URL in Einstellungen konfigurieren
               </p>
            </div>

            {/* Overlay Controls (Show on Hover) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
               <button
                 onClick={handleRefresh}
                 className="p-2 rounded-full text-white transition-colors"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.1)'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
               >
                 <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </button>
               <div className="text-xs font-mono text-white/70">1920x1080 • 30fps</div>
               <button
                 className="p-2 rounded-full text-white transition-colors"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.1)'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
               >
                 <Maximize2 size={16} />
               </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center" style={{ color: t.text.muted }}>
            <Power size={32} className="mb-2 opacity-50" />
            <span>Kamera ausgeschaltet</span>
          </div>
        )}
      </div>

      {/* Power Toggle Absolute */}
      <button
        onClick={() => setIsOn(!isOn)}
        className="absolute top-5 md:top-6 right-5 md:right-6 p-2 rounded-xl transition-all z-20"
        style={{
          backgroundColor: isOn ? t.bg.hover : colors.blue[600],
          color: isOn ? t.text.secondary : '#ffffff',
          boxShadow: isOn ? 'none' : '0 10px 20px rgba(59, 130, 246, 0.5)'
        }}
        onMouseEnter={(e) => {
          if (isOn) e.currentTarget.style.color = t.text.primary;
        }}
        onMouseLeave={(e) => {
          if (isOn) e.currentTarget.style.color = t.text.secondary;
        }}
      >
        <Power size={18} />
      </button>
    </div>
  );
}
