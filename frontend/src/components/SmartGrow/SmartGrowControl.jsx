import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import { quickActionsAPI } from '../../utils/api';
import {
  Zap, Sparkles, Target, TrendingUp, AlertTriangle, CheckCircle2,
  Droplets, Thermometer, Sun, Wind, Beaker, Clock, Play, Pause,
  Settings, ArrowRight, Lightbulb, Activity, BarChart3, Cpu,
  ChevronRight, BookOpen, Calendar, Bot, Octagon
} from 'lucide-react';

const SmartGrowControl = () => {
  const { currentTheme } = useTheme();
  const { sensorData } = useSocket();
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('vegetative');
  const [autoMode, setAutoMode] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState([]);

  // Load active recipe and phase
  useEffect(() => {
    const savedRecipe = localStorage.getItem('active-grow-recipe');
    if (savedRecipe) {
      setActiveRecipe(JSON.parse(savedRecipe));
    }

    // Generate AI recommendations based on current status
    generateAIRecommendations();
  }, [sensorData]);

  const generateAIRecommendations = () => {
    const recommendations = [];

    // Temperature check
    if (sensorData?.temp > 28) {
      recommendations.push({
        type: 'warning',
        icon: <Thermometer size={16} />,
        title: 'Temperatur zu hoch',
        message: 'Erhöhe Lüfter auf 100% oder aktiviere Klimaanlage',
        action: () => quickAction('fan', 100)
      });
    }

    // Humidity check
    if (sensorData?.humidity < 40) {
      recommendations.push({
        type: 'info',
        icon: <Droplets size={16} />,
        title: 'Luftfeuchtigkeit niedrig',
        message: 'Aktiviere Luftbefeuchter für optimales VPD',
        action: () => quickAction('humidifier', 'on')
      });
    }

    // VPD optimization
    const temp = sensorData?.temp || 24;
    const rh = sensorData?.humidity || 50;
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const vpd = svp * (1 - rh / 100);

    if (vpd > 1.5) {
      recommendations.push({
        type: 'tip',
        icon: <Wind size={16} />,
        title: 'VPD nicht optimal',
        message: `VPD: ${vpd.toFixed(2)} kPa - Ziel: 0.8-1.2 kPa`,
        action: () => quickAction('vpd-optimize', vpd)
      });
    }

    // Nutrient schedule check
    if (activeRecipe) {
      recommendations.push({
        type: 'success',
        icon: <Beaker size={16} />,
        title: 'Nährstoff-Dosierung anstehend',
        message: `Nächste Dosierung in 2 Stunden (${activeRecipe.name})`,
        action: () => window.location.hash = '#nutrients'
      });
    }

    setAiRecommendations(recommendations);
  };

  const quickAction = async (action, value) => {
    try {
      let response;

      switch (action) {
        case 'fan':
          response = await quickActionsAPI.setFan(value);
          console.log(`✅ Lüfter auf ${value}% gesetzt`);
          break;

        case 'light':
          response = await quickActionsAPI.setLight(value);
          console.log(`✅ Licht ${value === 'toggle' ? 'umgeschaltet' : value === 'on' ? 'eingeschaltet' : 'ausgeschaltet'}`);
          break;

        case 'humidifier':
          response = await quickActionsAPI.setHumidifier(value);
          console.log(`✅ Luftbefeuchter ${value === 'on' ? 'eingeschaltet' : 'ausgeschaltet'}`);
          break;

        case 'vpd-optimize':
          const temp = sensorData?.temp || 24;
          const rh = sensorData?.humidity || 50;
          const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
          const currentVPD = svp * (1 - rh / 100);
          const targetVPD = { min: 0.8, max: 1.2 };

          response = await quickActionsAPI.optimizeVPD(currentVPD, targetVPD);
          console.log(`✅ VPD optimiert: ${currentVPD.toFixed(2)} kPa`);
          break;

        case 'nutrients':
          response = await quickActionsAPI.doseNutrients(value || 30);
          console.log(`✅ Nährstoff-Dosierung gestartet (${value || 30}s)`);
          break;

        case 'emergency-stop':
          response = await quickActionsAPI.emergencyStop();
          console.log(`🚨 NOT-AUS aktiviert - Alle Systeme gestoppt`);
          break;

        default:
          console.log(`Quick Action: ${action} = ${value}`);
      }

      if (response?.data) {
        // Optional: Show success notification
        console.log('Response:', response.data);
      }
    } catch (error) {
      console.error(`❌ Quick Action Fehler (${action}):`, error);
      // Optional: Show error notification
    }
  };

  const activateRecipe = (recipe) => {
    setActiveRecipe(recipe);
    localStorage.setItem('active-grow-recipe', JSON.stringify(recipe));

    // Generate automation rules from recipe
    generateAutomationFromRecipe(recipe);
  };

  const generateAutomationFromRecipe = (recipe) => {
    // Get existing rules
    const existingRules = JSON.parse(localStorage.getItem('automation-rules') || '[]');

    // Generate rules based on recipe
    const newRules = [];

    // Light schedule rule
    if (recipe.lightSchedule) {
      newRules.push({
        id: Date.now() + 1,
        name: `${recipe.name} - Licht Schedule`,
        enabled: true,
        conditions: [],
        actions: [{ type: 'set-light', value: 'on' }],
        logic: 'AND',
        schedule: {
          type: 'daily',
          time: recipe.lightSchedule.on || '06:00',
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        },
        lastTriggered: null,
        triggerCount: 0,
        priority: 'high',
        source: 'recipe'
      });

      newRules.push({
        id: Date.now() + 2,
        name: `${recipe.name} - Licht aus`,
        enabled: true,
        conditions: [],
        actions: [{ type: 'set-light', value: 'off' }],
        logic: 'AND',
        schedule: {
          type: 'daily',
          time: recipe.lightSchedule.off || '00:00',
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        },
        lastTriggered: null,
        triggerCount: 0,
        priority: 'high',
        source: 'recipe'
      });
    }

    // Temperature control
    if (recipe.targetTemp) {
      newRules.push({
        id: Date.now() + 3,
        name: `${recipe.name} - Temperatur Control`,
        enabled: true,
        conditions: [
          { sensor: 'temperature', operator: '>', value: recipe.targetTemp.max, unit: '°C' }
        ],
        actions: [{ type: 'set-fan', value: 100 }],
        logic: 'AND',
        schedule: null,
        lastTriggered: null,
        triggerCount: 0,
        priority: 'high',
        source: 'recipe'
      });
    }

    // VPD control
    if (recipe.targetVPD) {
      newRules.push({
        id: Date.now() + 4,
        name: `${recipe.name} - VPD Optimization`,
        enabled: true,
        conditions: [
          { sensor: 'vpd', operator: '>', value: recipe.targetVPD.max, unit: 'kPa' }
        ],
        actions: [
          { type: 'set-humidifier', value: 'on' },
          { type: 'set-fan', value: 70 }
        ],
        logic: 'AND',
        schedule: null,
        lastTriggered: null,
        triggerCount: 0,
        priority: 'medium',
        source: 'recipe'
      });
    }

    // Remove old recipe-generated rules
    const filteredRules = existingRules.filter(r => r.source !== 'recipe');

    // Add new rules
    const updatedRules = [...filteredRules, ...newRules];
    localStorage.setItem('automation-rules', JSON.stringify(updatedRules));

    console.log(`Generated ${newRules.length} automation rules from recipe`);
  };

  // Sample recipes
  const sampleRecipes = [
    {
      id: 1,
      name: 'Auto Flower Fast',
      phase: 'full-cycle',
      duration: 70,
      lightSchedule: { on: '06:00', off: '00:00', hours: 18 },
      targetTemp: { min: 22, max: 26 },
      targetHumidity: { min: 50, max: 65 },
      targetVPD: { min: 0.8, max: 1.2 },
      nutrients: {
        week1: { n: 200, p: 100, k: 150 },
        week2: { n: 250, p: 150, k: 200 },
        week3: { n: 300, p: 200, k: 250 }
      }
    },
    {
      id: 2,
      name: 'Photoperiod High Yield',
      phase: 'vegetative',
      duration: 90,
      lightSchedule: { on: '06:00', off: '00:00', hours: 18 },
      targetTemp: { min: 23, max: 27 },
      targetHumidity: { min: 55, max: 70 },
      targetVPD: { min: 0.8, max: 1.0 },
      nutrients: {
        week1: { n: 150, p: 80, k: 120 },
        week2: { n: 200, p: 120, k: 160 }
      }
    },
    {
      id: 3,
      name: 'Low Stress Training',
      phase: 'vegetative',
      duration: 60,
      lightSchedule: { on: '08:00', off: '02:00', hours: 18 },
      targetTemp: { min: 22, max: 26 },
      targetHumidity: { min: 50, max: 60 },
      targetVPD: { min: 0.9, max: 1.1 },
      nutrients: {
        week1: { n: 180, p: 90, k: 140 },
        week2: { n: 220, p: 130, k: 180 }
      }
    }
  ];

  // Get current status
  const temp = sensorData?.temp || 0;
  const humidity = sensorData?.humidity || 0;
  const lux = sensorData?.lux || 0;

  // Calculate VPD
  const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  const vpd = svp * (1 - humidity / 100);

  // Status indicators
  const tempStatus = temp >= 22 && temp <= 28 ? 'good' : temp > 28 ? 'warning' : 'cold';
  const humidityStatus = humidity >= 40 && humidity <= 70 ? 'good' : 'warning';
  const vpdStatus = vpd >= 0.8 && vpd <= 1.5 ? 'good' : 'warning';

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'cold': return '#3b82f6';
      default: return '#64748b';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div
        className="rounded-xl border p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.bg.card}, ${currentTheme.bg.hover})`,
          borderColor: currentTheme.border.default
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentTheme.accent.color }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-3 rounded-xl"
              style={{
                backgroundColor: currentTheme.accent.color + '20',
                color: currentTheme.accent.color
              }}
            >
              <Sparkles size={32} />
            </div>
            <div>
              <h1
                className="text-3xl font-bold mb-1"
                style={{ color: currentTheme.text.primary }}
              >
                Smart Grow Control Center
              </h1>
              <p
                className="text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                Zentrale Steuerung mit AI-gestützter Automation
              </p>
            </div>
          </div>

          {activeRecipe && (
            <div
              className="mt-4 p-4 rounded-lg border flex items-center justify-between"
              style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.accent.color + '40'
              }}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={20} style={{ color: currentTheme.accent.color }} />
                <div>
                  <div
                    className="font-medium"
                    style={{ color: currentTheme.text.primary }}
                  >
                    Aktives Rezept: {activeRecipe.name}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: currentTheme.text.muted }}
                  >
                    {activeRecipe.duration} Tage • {activeRecipe.phase}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoMode(!autoMode)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    autoMode ? 'brightness-110' : ''
                  }`}
                  style={{
                    backgroundColor: autoMode ? currentTheme.accent.color : currentTheme.bg.main,
                    color: autoMode ? 'white' : currentTheme.text.secondary
                  }}
                >
                  {autoMode ? <Play size={16} /> : <Pause size={16} />}
                  {autoMode ? 'Auto' : 'Manuell'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Temperatur"
          value={temp.toFixed(1)}
          unit="°C"
          target={activeRecipe ? `${activeRecipe.targetTemp.min}-${activeRecipe.targetTemp.max}` : '22-28'}
          status={tempStatus}
          icon={<Thermometer size={20} />}
          theme={currentTheme}
        />
        <StatusCard
          title="Luftfeuchtigkeit"
          value={humidity.toFixed(1)}
          unit="%"
          target={activeRecipe ? `${activeRecipe.targetHumidity.min}-${activeRecipe.targetHumidity.max}` : '40-70'}
          status={humidityStatus}
          icon={<Droplets size={20} />}
          theme={currentTheme}
        />
        <StatusCard
          title="VPD"
          value={vpd.toFixed(2)}
          unit="kPa"
          target={activeRecipe ? `${activeRecipe.targetVPD.min}-${activeRecipe.targetVPD.max}` : '0.8-1.5'}
          status={vpdStatus}
          icon={<Wind size={20} />}
          theme={currentTheme}
        />
        <StatusCard
          title="Licht"
          value={(lux / 1000).toFixed(1)}
          unit="klx"
          target="30-50"
          status="good"
          icon={<Sun size={20} />}
          theme={currentTheme}
        />
      </div>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Bot size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              AI Empfehlungen
            </h3>
          </div>
          <div className="space-y-3">
            {aiRecommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                recommendation={rec}
                theme={currentTheme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recipe Selection */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} style={{ color: currentTheme.accent.color }} />
          <h3
            className="text-lg font-bold"
            style={{ color: currentTheme.text.primary }}
          >
            Grow Plan Wizard
          </h3>
        </div>
        <p
          className="text-sm mb-4"
          style={{ color: currentTheme.text.secondary }}
        >
          Wähle ein Rezept und alle Automation Rules werden automatisch konfiguriert
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isActive={activeRecipe?.id === recipe.id}
              onActivate={() => activateRecipe(recipe)}
              theme={currentTheme}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionBtn
              label="Lüfter Max"
              icon={<Wind size={18} />}
              onClick={() => quickAction('fan', 100)}
              theme={currentTheme}
            />
            <QuickActionBtn
              label="Licht Toggle"
              icon={<Sun size={18} />}
              onClick={() => quickAction('light', 'toggle')}
              theme={currentTheme}
            />
            <QuickActionBtn
              label="VPD Optimieren"
              icon={<Droplets size={18} />}
              onClick={() => quickAction('vpd-optimize')}
              theme={currentTheme}
            />
            <QuickActionBtn
              label="Nährstoffe"
              icon={<Beaker size={18} />}
              onClick={() => quickAction('nutrients', 30)}
              theme={currentTheme}
            />
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={() => {
              if (window.confirm('⚠️ NOT-AUS: Alle Systeme werden gestoppt! Fortfahren?')) {
                quickAction('emergency-stop');
              }
            }}
            className="w-full mt-4 p-4 rounded-lg border-2 flex items-center justify-center gap-3 transition-all hover:brightness-110 font-bold"
            style={{
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              color: '#ffffff'
            }}
          >
            <Octagon size={20} />
            <span>NOT-AUS</span>
          </button>
        </div>

        {/* System Stats */}
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              System Performance
            </h3>
          </div>
          <div className="space-y-3">
            <StatRow
              label="Automation Rules"
              value="5 aktiv"
              icon={<Zap size={16} />}
              theme={currentTheme}
            />
            <StatRow
              label="Heute ausgeführt"
              value="12 Aktionen"
              icon={<Activity size={16} />}
              theme={currentTheme}
            />
            <StatRow
              label="System Uptime"
              value="3d 14h"
              icon={<Cpu size={16} />}
              theme={currentTheme}
            />
            <StatRow
              label="Nächste Wartung"
              value="in 5 Tagen"
              icon={<Clock size={16} />}
              theme={currentTheme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Card Component
const StatusCard = ({ title, value, unit, target, status, icon, theme }) => {
  const statusColor = status === 'good' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#3b82f6';

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div style={{ color: statusColor }}>{icon}</div>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      <div className="mb-1">
        <span
          className="text-2xl font-bold"
          style={{ color: theme.text.primary }}
        >
          {value}
        </span>
        <span
          className="text-sm ml-1"
          style={{ color: theme.text.muted }}
        >
          {unit}
        </span>
      </div>
      <div
        className="text-xs mb-2"
        style={{ color: theme.text.secondary }}
      >
        {title}
      </div>
      <div
        className="text-xs"
        style={{ color: theme.text.muted }}
      >
        Ziel: {target} {unit}
      </div>
    </div>
  );
};

// Recommendation Card
const RecommendationCard = ({ recommendation, theme }) => {
  const typeColors = {
    warning: '#f59e0b',
    info: '#3b82f6',
    tip: '#8b5cf6',
    success: '#10b981'
  };

  const color = typeColors[recommendation.type] || '#64748b';

  return (
    <div
      className="p-4 rounded-lg border flex items-start gap-3"
      style={{
        backgroundColor: theme.bg.hover,
        borderColor: color + '40'
      }}
    >
      <div style={{ color }}>{recommendation.icon}</div>
      <div className="flex-1">
        <div
          className="font-medium mb-1"
          style={{ color: theme.text.primary }}
        >
          {recommendation.title}
        </div>
        <div
          className="text-sm"
          style={{ color: theme.text.secondary }}
        >
          {recommendation.message}
        </div>
      </div>
      {recommendation.action && (
        <button
          onClick={recommendation.action}
          className="px-3 py-1 rounded text-xs font-medium transition-all hover:brightness-110"
          style={{
            backgroundColor: color + '20',
            color: color
          }}
        >
          Fix
        </button>
      )}
    </div>
  );
};

// Recipe Card
const RecipeCard = ({ recipe, isActive, onActivate, theme }) => {
  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer transition-all ${
        isActive ? 'ring-2' : ''
      }`}
      style={{
        backgroundColor: isActive ? theme.accent.color + '10' : theme.bg.hover,
        borderColor: isActive ? theme.accent.color : theme.border.light,
        ringColor: theme.accent.color
      }}
      onClick={onActivate}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="font-medium"
          style={{ color: theme.text.primary }}
        >
          {recipe.name}
        </div>
        {isActive && (
          <CheckCircle2 size={16} style={{ color: theme.accent.color }} />
        )}
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span style={{ color: theme.text.muted }}>Dauer</span>
          <span style={{ color: theme.text.secondary }}>{recipe.duration} Tage</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: theme.text.muted }}>Licht</span>
          <span style={{ color: theme.text.secondary }}>{recipe.lightSchedule.hours}h</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: theme.text.muted }}>Phase</span>
          <span style={{ color: theme.text.secondary }}>{recipe.phase}</span>
        </div>
      </div>
      {!isActive && (
        <button
          className="w-full mt-3 px-3 py-2 rounded text-sm font-medium transition-all hover:brightness-110"
          style={{
            backgroundColor: theme.accent.color + '20',
            color: theme.accent.color
          }}
        >
          Aktivieren
        </button>
      )}
    </div>
  );
};

// Quick Action Button
const QuickActionBtn = ({ label, icon, onClick, theme }) => {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg border flex flex-col items-center gap-2 transition-all hover:brightness-110"
      style={{
        backgroundColor: theme.bg.hover,
        borderColor: theme.border.light,
        color: theme.text.secondary
      }}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

// Stat Row
const StatRow = ({ label, value, icon, theme }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div style={{ color: theme.text.muted }}>{icon}</div>
        <span
          className="text-sm"
          style={{ color: theme.text.secondary }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: theme.text.primary }}
      >
        {value}
      </span>
    </div>
  );
};

export default SmartGrowControl;
