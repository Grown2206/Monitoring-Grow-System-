import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { controlsAPI } from '../utils/api';
import { useTheme, colors } from '../theme';
import {
  Lock, Unlock, AlertTriangle, Power, Zap, Wind, Droplets, Lightbulb,
  Timer, ShieldAlert, Wrench, Leaf, Activity, History, Sun, Moon, Clock,
  Settings, Play, Pause, RotateCw, TrendingUp, Gauge, Droplet, Fan,
  Calendar, Sliders, Thermometer, Target, Zap as Lightning, Plus, Minus,
  Save, BarChart3, Flame, Snowflake, CloudRain, Brain
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// ==================== SAFETY COLORS FIX ====================
const FALLBACK_COLORS = {
  emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
  red: { 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
  amber: { 400: '#fbbf24', 500: '#f59e0b' },
  yellow: { 400: '#facc15', 500: '#eab308' },
  blue: { 400: '#60a5fa', 500: '#3b82f6' },
  purple: { 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7' },
  cyan: { 400: '#22d3ee' },
  orange: { 400: '#fb923c' },
  slate: { 500: '#64748b' },
};

// Hilfsfunktion für sicheren Farbzugriff
const getSafeColor = (colorName, weight) => {
  return importedColors?.[colorName]?.[weight] || FALLBACK_COLORS?.[colorName]?.[weight] || '#888888';
};
// ===========================================================


// ==================== KOMPONENTEN ====================

// Activity Log Item
const LogItem = ({ timestamp, message, type, theme }) => (
  <div className="flex items-start gap-3 py-2 border-b last:border-0 text-sm" style={{ borderColor: `${theme.border.default}50` }}>
    <span className="font-mono text-xs mt-0.5" style={{ color: theme.text.muted }}>{timestamp}</span>
    <span className="font-medium" style={{ color: type === 'error' ? getSafeColor('red', 400) : theme.text.secondary }}>{message}</span>
  </div>
);

// Device Card mit erweiterten Features
const DeviceCard = ({
  id, label, subLabel, isOn, onToggle, disabled, icon: Icon, iconColor, iconBg,
  watts, runtime, health = 100, dimLevel, onDimChange, supportsDim, theme
}) => {
  const activeGlow = isOn && iconColor ? `0 0 20px ${iconColor}40` : 'none';

  return (
    <div
      className="relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 group"
      style={{
        backgroundColor: isOn ? theme.bg.card : theme.bg.main,
        borderColor: isOn ? iconColor : theme.border.default,
        boxShadow: activeGlow,
        opacity: disabled ? 0.5 : 1
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl transition-all duration-300"
            style={{
              backgroundColor: isOn ? `${iconColor}20` : theme.bg.hover,
              color: isOn ? iconColor : theme.text.muted
            }}
          >
            {Icon ? <Icon size={24} /> : <Power size={24} />}
          </div>
          <div>
            <h4 className="font-bold" style={{ color: theme.text.primary }}>{label}</h4>
            <p className="text-xs" style={{ color: theme.text.muted }}>{subLabel}</p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          disabled={disabled}
          className="relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none"
          style={{
            backgroundColor: isOn ? getSafeColor('emerald', 600) : theme.bg.hover,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          <span
            className="absolute top-1 left-1 w-5 h-5 rounded-full shadow-sm transition-transform duration-300"
            style={{
              backgroundColor: '#ffffff',
              transform: isOn ? 'translateX(20px)' : 'translateX(0)'
            }}
          />
        </button>
      </div>

      {/* Dimmer Control */}
      {supportsDim && isOn && (
        <div className="pt-3 border-t" style={{ borderColor: `${theme.border.default}50` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: theme.text.secondary }}>Helligkeit</span>
            <span className="text-xs font-mono" style={{ color: iconColor }}>{dimLevel}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={dimLevel}
            onChange={(e) => onDimChange && onDimChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${iconColor} 0%, ${iconColor} ${dimLevel}%, ${theme.bg.hover} ${dimLevel}%, ${theme.bg.hover} 100%)`
            }}
          />
        </div>
      )}

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-xs pt-3 border-t" style={{ borderColor: `${theme.border.default}50` }}>
        <div className="flex items-center gap-1" style={{ color: theme.text.muted }}>
          <Zap size={12} />
          <span>{isOn ? watts : 0} W</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: theme.text.muted }}>
          <Clock size={12} />
          <span>{isOn && runtime ? `${runtime} min` : 'Standby'}</span>
        </div>
        {/* Health Indicator */}
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: health > 80 ? getSafeColor('emerald', 500) : health > 50 ? getSafeColor('amber', 500) : getSafeColor('red', 500) }}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
            {health}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Scene Preset Card
const SceneCard = ({ icon: Icon, title, description, isActive, onClick, theme, color }) => (
  <button
    onClick={onClick}
    className="p-4 rounded-xl border transition-all text-left group relative overflow-hidden"
    style={{
      backgroundColor: isActive ? `${color}10` : theme.bg.card,
      borderColor: isActive ? color : theme.border.default
    }}
  >
    <div className="relative z-10">
      <Icon size={24} className="mb-2 transition-transform group-hover:scale-110" style={{ color }} />
      <div className="font-bold mb-1" style={{ color: theme.text.primary }}>{title}</div>
      <div className="text-xs" style={{ color: theme.text.muted }}>{description}</div>
    </div>
    {isActive && (
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
    )}
  </button>
);

// Schedule Entry
const ScheduleEntry = ({ time, action, enabled, onToggle, theme }) => (
  <div
    className="flex items-center justify-between p-3 rounded-lg border"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: theme.border.default
    }}
  >
    <div className="flex items-center gap-3">
      <Clock size={16} style={{ color: theme.accent.color }} />
      <div>
        <div className="font-mono font-bold" style={{ color: theme.text.primary }}>{time}</div>
        <div className="text-xs" style={{ color: theme.text.muted }}>{action}</div>
      </div>
    </div>
    <button
      onClick={onToggle}
      className="w-10 h-6 rounded-full transition-colors"
      style={{ backgroundColor: enabled ? getSafeColor('emerald', 600) : theme.bg.hover }}
    >
      <span
        className="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-1 ml-1"
        style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  </div>
);

// Power Monitor Chart
const PowerChart = ({ data, theme }) => (
  <div className="h-48">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={getSafeColor('yellow', 400)} stopOpacity={0.3} />
            <stop offset="95%" stopColor={getSafeColor('yellow', 400)} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} opacity={0.3} />
        <XAxis dataKey="time" stroke={theme.text.muted} fontSize={10} hide />
        <YAxis stroke={theme.text.muted} fontSize={10} width={40} unit="W" />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default,
            borderRadius: '8px'
          }}
          itemStyle={{ color: theme.text.primary }}
        />
        <Area type="monotone" dataKey="watts" stroke={getSafeColor('yellow', 400)} fill="url(#powerGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// PWM Control Card
const PWMControl = ({ icon: Icon, label, subLabel, value, onChange, rpm, color, theme }) => (
  <div
    className="p-5 rounded-2xl border transition-all"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: value > 0 ? color : theme.border.default,
      boxShadow: value > 0 ? `0 0 20px ${color}20` : 'none'
    }}
  >
    <div className="flex items-center gap-3 mb-4">
      <div
        className="p-3 rounded-xl"
        style={{
          backgroundColor: value > 0 ? `${color}20` : theme.bg.hover,
          color: value > 0 ? color : theme.text.muted
        }}
      >
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold" style={{ color: theme.text.primary }}>{label}</h4>
        <p className="text-xs" style={{ color: theme.text.muted }}>{subLabel}</p>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold" style={{ color }}>{value}%</div>
        {rpm !== undefined && (
          <div className="text-xs font-mono" style={{ color: theme.text.muted }}>{rpm} RPM</div>
        )}
      </div>
    </div>

    <div className="space-y-2">
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, ${theme.bg.hover} ${value}%, ${theme.bg.hover} 100%)`
        }}
      />
      <div className="flex justify-between text-xs font-mono" style={{ color: theme.text.muted }}>
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>

    {/* Voltage Indicator (for 0-10V) */}
    <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs" style={{ borderColor: `${theme.border.default}50` }}>
      <span style={{ color: theme.text.muted }}>Output Voltage:</span>
      <span className="font-mono font-bold" style={{ color }}>{(value / 10).toFixed(1)}V</span>
    </div>
  </div>
);

// RJ11 Light Control Card
const RJ11LightControl = ({ enabled, pwm, onToggle, onPWMChange, theme }) => (
  <div
    className="p-5 rounded-2xl border transition-all"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: enabled ? colors.amber[400] : theme.border.default,
      boxShadow: enabled ? `0 0 20px ${colors.amber[400]}20` : 'none'
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div
          className="p-3 rounded-xl"
          style={{
            backgroundColor: enabled ? `${colors.amber[400]}20` : theme.bg.hover,
            color: enabled ? colors.amber[400] : theme.text.muted
          }}
        >
          <Lightbulb size={24} />
        </div>
        <div>
          <h4 className="font-bold" style={{ color: theme.text.primary }}>RJ11 Grow Light</h4>
          <p className="text-xs" style={{ color: theme.text.muted }}>PWM Dimming via RJ11</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="w-12 h-7 rounded-full transition-colors"
        style={{ backgroundColor: enabled ? colors.emerald[600] : theme.bg.hover }}
      >
        <span
          className="block w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-1 ml-1"
          style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>

    {enabled && (
      <>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: theme.text.secondary }}>Light Intensity</span>
            <span className="text-xl font-bold font-mono" style={{ color: colors.amber[400] }}>{pwm}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={pwm}
            onChange={(e) => onPWMChange(parseInt(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.amber[400]} 0%, ${colors.amber[400]} ${pwm}%, ${theme.bg.hover} ${pwm}%, ${theme.bg.hover} 100%)`
            }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map(preset => (
            <button
              key={preset}
              onClick={() => onPWMChange(preset)}
              className="py-2 px-3 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: pwm === preset ? `${colors.amber[400]}20` : theme.bg.hover,
                color: pwm === preset ? colors.amber[400] : theme.text.muted,
                borderWidth: '1px',
                borderColor: pwm === preset ? colors.amber[400] : 'transparent'
              }}
            >
              {preset}%
            </button>
          ))}
        </div>
      </>
    )}
  </div>
);

// ==================== HAUPT KOMPONENTE ====================

export default function Controls() {
  const { isConnected, socket, sensorData } = useSocket();
  const { showAlert } = useAlert();
  const { currentTheme } = useTheme();
  const theme = currentTheme;

  // State
  const [safetyLocked, setSafetyLocked] = useState(true);
  const [logs, setLogs] = useState([]);
  const [activeScene, setActiveScene] = useState(null);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);

  // Relais State mit erweiterten Infos
  const [devices, setDevices] = useState({
    light: { on: false, dimLevel: 100, runtime: 0, health: 100 },
    fan_exhaust: { on: false, runtime: 0, health: 95 },
    fan_circulation: { on: false, runtime: 0, health: 100 },
    pump_main: { on: false, runtime: 0, health: 90 },
    heater: { on: false, runtime: 0, health: 100 },
    dehumidifier: { on: false, runtime: 0, health: 85 }
  });

  // PWM State (0-100%)
  const [fanPWM, setFanPWM] = useState(0);
  const [lightPWM, setLightPWM] = useState(0);
  const [lightRJ11Enabled, setLightRJ11Enabled] = useState(false);
  const [fanRPM, setFanRPM] = useState(0);

  // Automation Rules
  const [automation, setAutomation] = useState({
    tempControl: { enabled: true, target: 24, range: 2 },
    humidityControl: { enabled: true, target: 60, range: 10 },
    vpdControl: { enabled: false, target: 1.0, range: 0.2 },
    autoWatering: { enabled: true, threshold: 30, duration: 5 }
  });

  // Schedules
  const [schedules, setSchedules] = useState([
    { id: 1, time: '06:00', action: 'Licht AN (Sunrise)', enabled: true },
    { id: 2, time: '08:00', action: 'Bewässerung Start', enabled: true },
    { id: 3, time: '12:00', action: 'Umluft Boost', enabled: true },
    { id: 4, time: '18:00', action: 'Licht Dimmen 50%', enabled: false },
    { id: 5, time: '22:00', action: 'Licht AUS (Sunset)', enabled: true }
  ]);

  // Power Monitor Data (Mock)
  const [powerHistory, setPowerHistory] = useState([]);

  const [maintenanceMode, setMaintenanceMode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Cycle Info
  const cycleInfo = { start: 6, end: 22, current: new Date().getHours() };
  const isDay = cycleInfo.current >= cycleInfo.start && cycleInfo.current < cycleInfo.end;

  useEffect(() => {
    if (socket) {
      socket.on('relayUpdate', (data) => {
        // Update device states
      });
    }
    addLog("System verbunden. Automation aktiv.");

    // Power history mock
    const interval = setInterval(() => {
      const totalWatts = calculateTotalPower();
      setPowerHistory(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          watts: totalWatts
        }];
        return newData.slice(-20); // Keep last 20 points
      });
    }, 10000);

    return () => {
      if (socket) socket.off('relayUpdate');
      clearInterval(interval);
    };
  }, [socket]);

  // Runtime Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key].on) {
            updated[key].runtime += 1;
          } else {
            updated[key].runtime = 0;
          }
        });
        return updated;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Automation Engine
  useEffect(() => {
    if (!automation.tempControl.enabled && !automation.humidityControl.enabled) return;

    const interval = setInterval(() => {
      if (!sensorData) return;

      // Temperature Control
      if (automation.tempControl.enabled) {
        const { target, range } = automation.tempControl;
        if (sensorData.temp > target + range && !devices.fan_exhaust.on) {
          toggleDevice('fan_exhaust');
          addLog(`Auto: Abluft AN (Temp ${sensorData.temp}°C)`);
        } else if (sensorData.temp < target - range && devices.fan_exhaust.on) {
          toggleDevice('fan_exhaust');
          addLog(`Auto: Abluft AUS (Temp ${sensorData.temp}°C)`);
        }
      }

      // Humidity Control
      if (automation.humidityControl.enabled) {
        const { target, range } = automation.humidityControl;
        if (sensorData.humidity > target + range && !devices.dehumidifier.on) {
          toggleDevice('dehumidifier');
          addLog(`Auto: Entfeuchter AN (RLF ${sensorData.humidity}%)`);
        } else if (sensorData.humidity < target - range && devices.dehumidifier.on) {
          toggleDevice('dehumidifier');
          addLog(`Auto: Entfeuchter AUS (RLF ${sensorData.humidity}%)`);
        }
      }
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [automation, sensorData, devices]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 8));
  };

  const toggleDevice = (key) => {
    if (safetyLocked && !activeScene) return;

    setDevices(prev => ({
      ...prev,
      [key]: { ...prev[key], on: !prev[key].on }
    }));

    const newState = !devices[key].on;
    api.toggleRelay(key, newState).catch(err => {
      console.error(err);
      addLog(`Fehler: ${getLabel(key)}`, 'error');
    });
    addLog(`${getLabel(key)} ${newState ? 'EIN' : 'AUS'}`);
  };

  const setDimLevel = (level) => {
    setDevices(prev => ({
      ...prev,
      light: { ...prev.light, dimLevel: level }
    }));
    addLog(`Licht Helligkeit: ${level}%`);
  };

  // PWM Handler
  const handleFanPWMChange = async (value) => {
    setFanPWM(value);
    try {
      await controlsAPI.setFanPWM(value);
      addLog(`Fan PWM gesetzt: ${value}%`);
    } catch (err) {
      console.error('Fan PWM Fehler:', err);
      showAlert('Fan PWM konnte nicht gesetzt werden', 'error');
    }
  };

  const handleLightPWMChange = async (value) => {
    setLightPWM(value);
    try {
      await controlsAPI.setLightPWM(value);
      addLog(`Light PWM gesetzt: ${value}%`);
    } catch (err) {
      console.error('Light PWM Fehler:', err);
      showAlert('Light PWM konnte nicht gesetzt werden', 'error');
    }
  };

  const handleLightRJ11Toggle = async () => {
    const newState = !lightRJ11Enabled;
    setLightRJ11Enabled(newState);
    try {
      await controlsAPI.setLightEnable(newState);
      addLog(`RJ11 Light ${newState ? 'aktiviert' : 'deaktiviert'}`);
    } catch (err) {
      console.error('RJ11 Enable Fehler:', err);
      showAlert('RJ11 Light konnte nicht geschaltet werden', 'error');
    }
  };

  const activateScene = (scene) => {
    setActiveScene(scene);
    setSafetyLocked(false);

    const scenes = {
      veg: { light: true, fan_exhaust: true, fan_circulation: true, dimLevel: 80 },
      bloom: { light: true, fan_exhaust: true, fan_circulation: false, dimLevel: 100 },
      dry: { light: false, fan_exhaust: true, fan_circulation: false, heater: true },
      maintenance: { light: true, fan_exhaust: true, dimLevel: 50 }
    };

    const config = scenes[scene];
    if (!config) return;

    Object.keys(devices).forEach(key => {
      if (config[key] !== undefined) {
        setDevices(prev => ({
          ...prev,
          [key]: { ...prev[key], on: config[key] }
        }));
      }
    });

    if (config.dimLevel) setDimLevel(config.dimLevel);
    addLog(`Szene aktiviert: ${scene.toUpperCase()}`, 'info');
    showAlert(`Szene "${scene}" wurde aktiviert`, 'success');
  };

  const emergencyStop = () => {
    if (confirm("NOT-AUS: Alle Geräte werden sofort abgeschaltet!")) {
      Object.keys(devices).forEach(key => {
        setDevices(prev => ({
          ...prev,
          [key]: { ...prev[key], on: false }
        }));
        api.toggleRelay(key, false).catch(err => console.error(err));
      });
      setSafetyLocked(true);
      setActiveScene(null);
      addLog("NOT-AUS AUSGELÖST!", 'error');
      showAlert("NOT-AUS AUSGELÖST!", "error");
    }
  };

  const toggleSchedule = (id) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const getLabel = (key) => {
    const labels = {
      light: 'Hauptlicht',
      fan_exhaust: 'Abluft',
      fan_circulation: 'Umluft',
      pump_main: 'Bewässerung',
      heater: 'Heizung',
      dehumidifier: 'Entfeuchter'
    };
    return labels[key] || key;
  };

  const calculateTotalPower = () => {
    const powerMap = {
      light: devices.light.on ? (200 * devices.light.dimLevel / 100) : 0,
      fan_exhaust: devices.fan_exhaust.on ? 35 : 0,
      fan_circulation: devices.fan_circulation.on ? 15 : 0,
      pump_main: devices.pump_main.on ? 50 : 0,
      heater: devices.heater.on ? 150 : 0,
      dehumidifier: devices.dehumidifier.on ? 250 : 0
    };
    return Object.values(powerMap).reduce((a, b) => a + b, 0);
  };

  const totalWatts = calculateTotalPower();

  const systemHealth = Object.values(devices).reduce((sum, dev) => sum + dev.health, 0) / Object.keys(devices).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Top Status Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Cycle Status */}
        <div
          className="lg:col-span-2 p-6 rounded-2xl border shadow-xl relative overflow-hidden flex items-center justify-between"
          style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
        >
          <div className="z-10">
            <div className="flex items-center gap-2 text-sm mb-1 font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
              {isDay ? <Sun size={16} style={{ color: getSafeColor('yellow', 400) }} /> : <Moon size={16} style={{ color: getSafeColor('blue', 400) }} />}
              Aktueller Zyklus
            </div>
            <div className="text-2xl font-bold" style={{ color: theme.text.primary }}>
              {isDay ? 'Tagphase' : 'Nachtphase'} <span className="text-lg font-normal" style={{ color: theme.text.muted }}>(Stunde {cycleInfo.current})</span>
            </div>
            <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(cycleInfo.current / 24) * 100}%`,
                  backgroundColor: isDay ? getSafeColor('yellow', 400) : getSafeColor('blue', 500)
                }}
              />
            </div>
          </div>
          <div
            className="absolute right-0 top-0 w-32 h-full opacity-10 pointer-events-none"
            style={{
              background: `linear-gradient(to left, ${isDay ? getSafeColor('yellow', 500) : getSafeColor('blue', 500)}, transparent)`
            }}
          />
        </div>

        {/* Power Monitor */}
        <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
          <div className="flex items-center gap-2 text-sm mb-1 font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
            <Lightning size={16} style={{ color: getSafeColor('yellow', 500) }} />
            Live Power
          </div>
          <div className="text-3xl font-mono font-bold flex items-center gap-2" style={{ color: getSafeColor('yellow', 400) }}>
            {totalWatts} <span className="text-sm" style={{ color: theme.text.muted }}>W</span>
          </div>
          <div className="text-xs mt-1" style={{ color: theme.text.muted }}>
            {(totalWatts / 1000 * 24 * 0.35).toFixed(2)}€ / Tag
          </div>
        </div>

        {/* System Health */}
        <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
          <div className="flex items-center gap-2 text-sm mb-1 font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
            <Activity size={16} style={{ color: getSafeColor('emerald', 500) }} />
            System Health
          </div>
          <div className="text-3xl font-mono font-bold flex items-center gap-2" style={{ color: getSafeColor('emerald', 400) }}>
            {systemHealth.toFixed(0)} <span className="text-sm" style={{ color: theme.text.muted }}>%</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'animate-pulse' : ''}`} style={{ backgroundColor: isConnected ? getSafeColor('emerald', 500) : getSafeColor('red', 500) }} />
            <span className="text-xs" style={{ color: theme.text.muted }}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="border p-4 rounded-xl flex items-center gap-3 animate-pulse" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: getSafeColor('red', 200) }}>
          <AlertTriangle />
          <span className="font-bold text-sm">System offline. Befehle werden nicht ausgeführt!</span>
        </div>
      )}

      {/* Scene Presets */}
      <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
            <Target size={20} style={{ color: theme.accent.color }} /> Szenen-Presets
          </h3>
          {activeScene && (
            <button onClick={() => { setActiveScene(null); setSafetyLocked(true); }} className="text-xs px-3 py-1 rounded-lg border" style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default, color: theme.text.secondary }}>
              Szene beenden
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SceneCard icon={Leaf} title="Vegetativ" description="18h Licht, 80% Dim" isActive={activeScene === 'veg'} onClick={() => activateScene('veg')} theme={theme} color={getSafeColor('emerald', 500)} />
          <SceneCard icon={Flame} title="Blüte" description="12h Licht, 100% Dim" isActive={activeScene === 'bloom'} onClick={() => activateScene('bloom')} theme={theme} color={getSafeColor('purple', 500)} />
          <SceneCard icon={Wind} title="Trocknung" description="Nur Ventilation" isActive={activeScene === 'dry'} onClick={() => activateScene('dry')} theme={theme} color={getSafeColor('amber', 500)} />
          <SceneCard icon={Wrench} title="Wartung" description="Arbeitslicht 50%" isActive={activeScene === 'maintenance'} onClick={() => activateScene('maintenance')} theme={theme} color={getSafeColor('blue', 500)} />
        </div>
      </div>

      {/* Tabs: Geräte / Automation / Schedules */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: theme.border.default }}>
        <button onClick={() => { setShowAutomation(false); setShowSchedules(false); }} className={`px-4 py-2 rounded-t-lg font-medium transition-all ${!showAutomation && !showSchedules ? 'border-b-2' : ''}`} style={{ color: !showAutomation && !showSchedules ? theme.accent.color : theme.text.muted, borderColor: theme.accent.color }}>
          Geräte
        </button>
        <button onClick={() => { setShowAutomation(true); setShowSchedules(false); }} className={`px-4 py-2 rounded-t-lg font-medium transition-all ${showAutomation ? 'border-b-2' : ''}`} style={{ color: showAutomation ? theme.accent.color : theme.text.muted, borderColor: theme.accent.color }}>
          Automation
        </button>
        <button onClick={() => { setShowAutomation(false); setShowSchedules(true); }} className={`px-4 py-2 rounded-t-lg font-medium transition-all ${showSchedules ? 'border-b-2' : ''}`} style={{ color: showSchedules ? theme.accent.color : theme.text.muted, borderColor: theme.accent.color }}>
          Zeitpläne
        </button>
      </div>

      {/* Content based on active tab */}
      {!showAutomation && !showSchedules && (
        <>
          {/* Safety Lock */}
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ backgroundColor: safetyLocked ? theme.bg.card : 'rgba(239, 68, 68, 0.1)', borderColor: safetyLocked ? theme.border.default : 'rgba(239, 68, 68, 0.3)' }}>
            <div className="flex items-center gap-3">
              {safetyLocked ? <Lock size={24} style={{ color: getSafeColor('emerald', 400) }} /> : <Unlock size={24} className="animate-pulse" style={{ color: getSafeColor('red', 400) }} />}
              <div>
                <h3 className="font-bold" style={{ color: theme.text.primary }}>{safetyLocked ? 'Steuerung Gesichert' : 'Manuelle Kontrolle Aktiv'}</h3>
                <p className="text-xs" style={{ color: theme.text.muted }}>
                  {safetyLocked ? 'Entsperren um Geräte manuell zu steuern' : 'Vorsicht! Direkte Gerätesteuerung möglich'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSafetyLocked(!safetyLocked)}
              className="px-4 py-2 rounded-lg text-sm font-bold border transition-colors"
              style={{
                backgroundColor: safetyLocked ? theme.bg.hover : getSafeColor('red', 600),
                borderColor: safetyLocked ? theme.border.default : 'transparent',
                color: safetyLocked ? theme.text.secondary : '#ffffff'
              }}
            >
              {safetyLocked ? 'Entsperren' : 'Sperren'}
            </button>
          </div>

          {/* Device Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <DeviceCard
              id="light"
              label="Hauptlicht"
              subLabel="Samsung LM301H LED"
              icon={Lightbulb}
              iconColor={getSafeColor('yellow', 400)}
              iconBg="rgba(250, 204, 21, 0.1)"
              watts={200}
              runtime={devices.light.runtime}
              health={devices.light.health}
              isOn={devices.light.on}
              onToggle={() => toggleDevice('light')}
              disabled={safetyLocked}
              supportsDim={true}
              dimLevel={devices.light.dimLevel}
              onDimChange={setDimLevel}
              theme={theme}
            />
            <DeviceCard
              id="fan_exhaust"
              label="Abluft"
              subLabel="AC Infinity CloudLine"
              icon={Fan}
              iconColor={getSafeColor('blue', 400)}
              iconBg="rgba(96, 165, 250, 0.1)"
              watts={35}
              runtime={devices.fan_exhaust.runtime}
              health={devices.fan_exhaust.health}
              isOn={devices.fan_exhaust.on}
              onToggle={() => toggleDevice('fan_exhaust')}
              disabled={safetyLocked}
              theme={theme}
            />
            <DeviceCard
              id="fan_circulation"
              label="Umluft"
              subLabel="Clip-On Ventilator"
              icon={Wind}
              iconColor={getSafeColor('cyan', 400)}
              iconBg="rgba(34, 211, 238, 0.1)"
              watts={15}
              runtime={devices.fan_circulation.runtime}
              health={devices.fan_circulation.health}
              isOn={devices.fan_circulation.on}
              onToggle={() => toggleDevice('fan_circulation')}
              disabled={safetyLocked}
              theme={theme}
            />
            <DeviceCard
              id="pump_main"
              label="Bewässerung"
              subLabel="Drip Irrigation System"
              icon={Droplets}
              iconColor={getSafeColor('emerald', 400)}
              iconBg="rgba(16, 185, 129, 0.1)"
              watts={50}
              runtime={devices.pump_main.runtime}
              health={devices.pump_main.health}
              isOn={devices.pump_main.on}
              onToggle={() => toggleDevice('pump_main')}
              disabled={safetyLocked}
              theme={theme}
            />
            <DeviceCard
              id="heater"
              label="Heizung"
              subLabel="Ceramic Heater"
              icon={Thermometer}
              iconColor={getSafeColor('red', 400)}
              iconBg="rgba(239, 68, 68, 0.1)"
              watts={150}
              runtime={devices.heater.runtime}
              health={devices.heater.health}
              isOn={devices.heater.on}
              onToggle={() => toggleDevice('heater')}
              disabled={safetyLocked}
              theme={theme}
            />
            <DeviceCard
              id="dehumidifier"
              label="Entfeuchter"
              subLabel="Dehumidifier Pro"
              icon={Droplet}
              iconColor={getSafeColor('orange', 400)}
              iconBg="rgba(251, 146, 60, 0.1)"
              watts={250}
              runtime={devices.dehumidifier.runtime}
              health={devices.dehumidifier.health}
              isOn={devices.dehumidifier.on}
              onToggle={() => toggleDevice('dehumidifier')}
              disabled={safetyLocked}
              theme={theme}
            />
          </div>

          {/* PWM STEUERUNG */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
              <Sliders size={24} style={{ color: theme.accent.color }} />
              PWM Steuerung (0-10V)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PWMControl
                icon={Fan}
                label="Abluftfilter PWM"
                subLabel="0-10V Steuerung + Tachometer"
                value={fanPWM}
                onChange={handleFanPWMChange}
                rpm={fanRPM}
                color={colors.blue[400]}
                theme={theme}
              />
              <RJ11LightControl
                enabled={lightRJ11Enabled}
                pwm={lightPWM}
                onToggle={handleLightRJ11Toggle}
                onPWMChange={handleLightPWMChange}
                theme={theme}
              />
            </div>
          </div>
        </>
      )}

      {showAutomation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Control */}
          <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                <Thermometer size={20} style={{ color: getSafeColor('amber', 500) }} /> Temperatur-Steuerung
              </h3>
              <button
                onClick={() => setAutomation(prev => ({ ...prev, tempControl: { ...prev.tempControl, enabled: !prev.tempControl.enabled } }))}
                className="w-10 h-6 rounded-full transition-colors"
                style={{ backgroundColor: automation.tempControl.enabled ? getSafeColor('emerald', 600) : theme.bg.hover }}
              >
                <span className="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-1 ml-1" style={{ transform: automation.tempControl.enabled ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Zieltemperatur: {automation.tempControl.target}°C</label>
                <input
                  type="range"
                  min="18"
                  max="30"
                  value={automation.tempControl.target}
                  onChange={(e) => setAutomation(prev => ({ ...prev, tempControl: { ...prev.tempControl, target: parseInt(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Toleranz: ±{automation.tempControl.range}°C</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={automation.tempControl.range}
                  onChange={(e) => setAutomation(prev => ({ ...prev, tempControl: { ...prev.tempControl, range: parseInt(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
                ✓ Abluft schaltet bei {automation.tempControl.target + automation.tempControl.range}°C EIN
              </div>
            </div>
          </div>

          {/* Humidity Control */}
          <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                <Droplets size={20} style={{ color: getSafeColor('blue', 500) }} /> Luftfeuchte-Steuerung
              </h3>
              <button
                onClick={() => setAutomation(prev => ({ ...prev, humidityControl: { ...prev.humidityControl, enabled: !prev.humidityControl.enabled } }))}
                className="w-10 h-6 rounded-full transition-colors"
                style={{ backgroundColor: automation.humidityControl.enabled ? getSafeColor('emerald', 600) : theme.bg.hover }}
              >
                <span className="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-1 ml-1" style={{ transform: automation.humidityControl.enabled ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Ziel-RLF: {automation.humidityControl.target}%</label>
                <input
                  type="range"
                  min="40"
                  max="80"
                  value={automation.humidityControl.target}
                  onChange={(e) => setAutomation(prev => ({ ...prev, humidityControl: { ...prev.humidityControl, target: parseInt(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Toleranz: ±{automation.humidityControl.range}%</label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={automation.humidityControl.range}
                  onChange={(e) => setAutomation(prev => ({ ...prev, humidityControl: { ...prev.humidityControl, range: parseInt(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
                ✓ Entfeuchter schaltet bei {automation.humidityControl.target + automation.humidityControl.range}% EIN
              </div>
            </div>
          </div>

          {/* VPD Control */}
          <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                <Brain size={20} style={{ color: getSafeColor('purple', 500) }} /> VPD-Steuerung (Pro)
              </h3>
              <button
                onClick={() => setAutomation(prev => ({ ...prev, vpdControl: { ...prev.vpdControl, enabled: !prev.vpdControl.enabled } }))}
                className="w-10 h-6 rounded-full transition-colors"
                style={{ backgroundColor: automation.vpdControl.enabled ? getSafeColor('emerald', 600) : theme.bg.hover }}
              >
                <span className="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-1 ml-1" style={{ transform: automation.vpdControl.enabled ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Ziel-VPD: {automation.vpdControl.target} kPa</label>
                <input
                  type="range"
                  min="0.4"
                  max="1.6"
                  step="0.1"
                  value={automation.vpdControl.target}
                  onChange={(e) => setAutomation(prev => ({ ...prev, vpdControl: { ...prev.vpdControl, target: parseFloat(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.2)', color: getSafeColor('purple', 300) }}>
                💡 VPD = Vapour Pressure Deficit<br />
                Optimaler Bereich: 0.8-1.2 kPa (Veg), 1.0-1.4 kPa (Bloom)
              </div>
            </div>
          </div>

          {/* Auto Watering */}
          <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                <CloudRain size={20} style={{ color: getSafeColor('emerald', 500) }} /> Auto-Bewässerung
              </h3>
              <button
                onClick={() => setAutomation(prev => ({ ...prev, autoWatering: { ...prev.autoWatering, enabled: !prev.autoWatering.enabled } }))}
                className="w-10 h-6 rounded-full transition-colors"
                style={{ backgroundColor: automation.autoWatering.enabled ? getSafeColor('emerald', 600) : theme.bg.hover }}
              >
                <span className="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-1 ml-1" style={{ transform: automation.autoWatering.enabled ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Auslöser: Bodenfeuchtigkeit unter {automation.autoWatering.threshold}%</label>
                <input
                  type="range"
                  min="20"
                  max="50"
                  value={automation.autoWatering.threshold}
                  onChange={(e) => setAutomation(prev => ({ ...prev, autoWatering: { ...prev.autoWatering, threshold: parseInt(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: theme.text.muted }}>Dauer: {automation.autoWatering.duration} Minuten</label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={automation.autoWatering.duration}
                  onChange={(e) => setAutomation(prev => ({ ...prev, autoWatering: { ...prev.autoWatering, duration: parseInt(e.target.value) } }))}
                  className="w-full"
                />
              </div>
              <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
                ✓ Bewässerung startet automatisch wenn Sensor unter {automation.autoWatering.threshold}% fällt
              </div>
            </div>
          </div>
        </div>
      )}

      {showSchedules && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
              <Calendar size={20} style={{ color: theme.accent.color }} /> Zeitgesteuerte Aktionen
            </h3>
            <button className="px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, color: theme.text.primary }}>
              <Plus size={16} /> Neuer Zeitplan
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map(schedule => (
              <ScheduleEntry
                key={schedule.id}
                time={schedule.time}
                action={schedule.action}
                enabled={schedule.enabled}
                onToggle={() => toggleSchedule(schedule.id)}
                theme={theme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Section: Power Graph & Logs & Emergency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Power Monitor Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
              <BarChart3 size={20} style={{ color: getSafeColor('yellow', 500) }} /> Power Monitor (Live)
            </h3>
            <div className="text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
              Letzte 20 Messungen
            </div>
          </div>
          <PowerChart data={powerHistory} theme={theme} />
        </div>

        {/* Activity Log */}
        <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
          <h3 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider" style={{ color: theme.text.primary }}>
            <History size={16} style={{ color: theme.text.muted }} /> Aktivitäten
          </h3>
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
            {logs.length === 0 && <div className="text-xs italic" style={{ color: theme.text.muted }}>Keine Aktivitäten</div>}
            {logs.map((log, idx) => (
              <LogItem key={idx} timestamp={log.time} message={log.msg} type={log.type} theme={theme} />
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Stop - Always visible */}
      <div className="p-6 rounded-2xl border shadow-xl flex items-center justify-between" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <div className="flex items-center gap-4">
          <ShieldAlert size={32} style={{ color: getSafeColor('red', 500) }} />
          <div>
            <h3 className="font-bold" style={{ color: getSafeColor('red', 200) }}>Notfall-Abschaltung</h3>
            <p className="text-xs" style={{ color: getSafeColor('red', 300) }}>Alle Geräte sofort ausschalten (Hardware NOT-AUS)</p>
          </div>
        </div>
        <button
          onClick={emergencyStop}
          className="px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 shadow-lg"
          style={{ backgroundColor: getSafeColor('red', 600), color: '#ffffff', boxShadow: `0 10px 20px rgba(239, 68, 68, 0.4)` }}
        >
          NOT-AUS
        </button>
      </div>
    </div>
  );
}