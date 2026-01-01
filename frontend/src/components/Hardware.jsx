import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  Cpu, Wifi, Thermometer, Droplets, Database, Server, RefreshCw, 
  Settings, CheckCircle2, AlertTriangle, XCircle, Activity, Sprout 
} from 'lucide-react';

const SensorStatus = ({ name, value, status, type }) => (
  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-all">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        {type === 'temp' && <Thermometer size={18} />}
        {type === 'water' && <Droplets size={18} />}
        {type === 'soil' && <Sprout size={18} />}
        {type === 'system' && <Cpu size={18} />}
      </div>
      <div>
        <div className="text-sm font-bold text-slate-200">{name}</div>
        <div className="text-xs text-slate-500 font-mono">ID: {Math.random().toString(16).substr(2, 6).toUpperCase()}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-mono font-bold text-white">{value}</div>
      <div className={`text-[10px] uppercase font-bold tracking-wider ${status === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
        {status === 'ok' ? 'Online' : 'Fehler'}
      </div>
    </div>
  </div>
);

export default function Hardware() {
  const { sensorData, isConnected } = useSocket();
  const [calibrating, setCalibrating] = useState(false);

  const handleCalibrate = () => {
    setCalibrating(true);
    setTimeout(() => setCalibrating(false), 3000);
  };

  // Helper um sicherzustellen, dass Werte existieren
  const getVal = (val, fixed = 0, suffix = '') => {
    if (val === undefined || val === null) return '--';
    return typeof val === 'number' ? val.toFixed(fixed) + suffix : val;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="text-blue-500" /> System & Hardware
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Status aller angeschlossenen Module und ESP32 Diagnose.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">ESP32 Uptime</div>
            <div className="font-mono text-emerald-400 font-bold">--:--:--</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">Verbindung</div>
            <div className={`font-mono font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Aktiv' : 'Getrennt'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sensor Liste */}
        <div className="space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2 mb-4">
            <Activity size={18} className="text-emerald-500" /> Hauptsensoren
          </h3>
          
          <SensorStatus 
            name="SHT31 (Luft)" 
            type="temp" 
            value={`${getVal(sensorData?.temp, 1, '°C')} / ${getVal(sensorData?.humidity, 1, '%')}`} 
            status={sensorData?.temp ? 'ok' : 'error'} 
          />
          <SensorStatus 
            name="BH1750 (Licht)" 
            type="system" 
            value={`${getVal(sensorData?.lux, 0, ' lx')}`} 
            status={sensorData?.lux >= 0 ? 'ok' : 'error'} 
          />
          <SensorStatus 
            name="Wasserstand (Tank)" 
            type="water" 
            value={`${getVal(sensorData?.tankLevel, 0)} Raw`} 
            status={sensorData?.tankLevel > 0 ? 'ok' : 'error'} 
          />
          <SensorStatus 
            name="MQ-135 (CO2/Gas)" 
            type="system" 
            value={`${getVal(sensorData?.gasLevel, 0)} Raw`} 
            status={sensorData?.gasLevel > 0 ? 'ok' : 'error'} 
          />

          {/* NEU: Bodenfeuchtesensoren */}
          <div className="pt-4 mt-6 border-t border-slate-800">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Sprout size={18} className="text-emerald-500" /> Bodenfeuchtigkeit (Kapazitiv)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const val = sensorData?.soil?.[index];
                // Status OK wenn Wert > 0 und plausibel (ADC max 4095)
                const isOk = val > 0 && val <= 4095;
                return (
                  <SensorStatus 
                    key={index}
                    name={`Sensor ${index + 1}`} 
                    type="soil" 
                    value={`${getVal(val, 0)} Raw`} 
                    status={isOk ? 'ok' : 'error'} 
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* System Diagnose */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-white font-bold flex items-center gap-2 mb-6">
              <Server size={18} className="text-purple-500" /> Backend Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">MQTT Broker</span>
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={16} /> test.mosquitto.org
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Datenbank (MongoDB)</span>
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={16} /> Verbunden
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">WebSocket</span>
                <span className={`flex items-center gap-2 font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isConnected ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                  {isConnected ? 'Verbunden' : 'Getrennt'}
                </span>
              </div>
            </div>
          </div>

          {/* Kalibrierung */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Settings size={18} className="text-slate-400" /> Sensor Kalibrierung
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Zum Kalibrieren der Bodenfeuchtesensoren: Sensoren erst komplett trocknen, dann Wert speichern. Danach in Wasser stellen und erneut messen.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={handleCalibrate}
                disabled={calibrating}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                {calibrating ? <RefreshCw className="animate-spin" size={16}/> : 'Jetzt Kalibrieren'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}