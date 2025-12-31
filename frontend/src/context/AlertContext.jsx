import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Funktion zum Erstellen eines Alarms
  // type: 'success', 'error', 'warning', 'info'
  const showAlert = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);

    // Auto-Remove
    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }
  }, []);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      
      {/* Toast Container (Fixed Overlay) */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {alerts.map(alert => (
          <div 
            key={alert.id}
            className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 ${
              alert.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-100' :
              alert.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-100' :
              alert.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100' :
              'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="mt-1">
              {alert.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
              {alert.type === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
              {alert.type === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
              {alert.type === 'info' && <Info size={18} className="text-blue-500" />}
            </div>
            <div className="flex-1 text-sm font-medium">{alert.message}</div>
            <button onClick={() => removeAlert(alert.id)} className="opacity-50 hover:opacity-100 transition">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};