import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudRain, CloudSun, Sun, Wind, Droplets, MapPin, 
  ArrowUpRight, ArrowDownRight, Snowflake, CloudLightning 
} from 'lucide-react';

// Mapping von WMO Wetter-Codes zu Icons und Text
const getWeatherInfo = (code) => {
  if (code === 0) return { icon: Sun, label: 'Klar', color: 'text-yellow-400' };
  if (code >= 1 && code <= 3) return { icon: CloudSun, label: 'Bewölkt', color: 'text-slate-300' };
  if (code >= 45 && code <= 48) return { icon: Cloud, label: 'Nebel', color: 'text-slate-400' };
  if (code >= 51 && code <= 67) return { icon: CloudRain, label: 'Regen', color: 'text-blue-400' };
  if (code >= 71 && code <= 77) return { icon: Snowflake, label: 'Schnee', color: 'text-cyan-200' };
  if (code >= 95) return { icon: CloudLightning, label: 'Gewitter', color: 'text-purple-400' };
  return { icon: Cloud, label: 'Unbekannt', color: 'text-slate-400' };
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Standort wird ermittelt...');
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Standort holen
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(fetchWeather, (err) => {
        console.error("Geo-Fehler:", err);
        // Fallback: Berlin
        fetchWeather({ coords: { latitude: 52.52, longitude: 13.405 } }, "Berlin (Fallback)");
      });
    } else {
      fetchWeather({ coords: { latitude: 52.52, longitude: 13.405 } }, "Berlin (Fallback)");
    }
  }, []);

  const fetchWeather = async (position, fallbackName) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      // 2. Ortsnamen holen (Reverse Geocoding via Open-Meteo)
      if (!fallbackName) {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/get?latitude=${lat}&longitude=${lon}&count=1&language=de&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results[0]) {
          setLocationName(geoData.results[0].name);
        } else {
          setLocationName("Lokaler Standort");
        }
      } else {
        setLocationName(fallbackName);
      }

      // 3. Wetterdaten holen (Live + Forecast)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      console.error(err);
      setError("Wetterdaten nicht verfügbar");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-full bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-center animate-pulse"><Sun className="text-slate-700 animate-spin" /></div>;
  if (error) return <div className="h-full bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-center text-red-400 text-sm">{error}</div>;

  const currentInfo = getWeatherInfo(weather.current.weather_code);
  const CurrentIcon = currentInfo.icon;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-full relative overflow-hidden group">
      
      {/* Hintergrund Effekt */}
      <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-${currentInfo.color.split('-')[1]}-500/20 to-transparent rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none`}></div>

      {/* Header: Ort & Aktuell */}
      <div className="z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">
              <MapPin size={12} /> {locationName}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white">{Math.round(weather.current.temperature_2m)}°</span>
              <div className="text-sm font-medium text-slate-300">
                <div>{currentInfo.label}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1"><Wind size={10}/> {weather.current.wind_speed_10m} km/h</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`p-3 rounded-2xl bg-slate-950/50 border border-slate-700/50 shadow-sm ${currentInfo.color}`}>
            <CurrentIcon size={32} />
          </div>
        </div>

        {/* Zusatzdaten */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-300 text-xs font-medium">
            <Droplets size={14} />
            {weather.current.relative_humidity_2m}% RLF
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium">
            <span className="text-emerald-400 flex items-center"><ArrowUpRight size={12}/> {Math.round(weather.daily.temperature_2m_max[0])}°</span>
            <span className="w-px h-3 bg-slate-600"></span>
            <span className="text-blue-400 flex items-center"><ArrowDownRight size={12}/> {Math.round(weather.daily.temperature_2m_min[0])}°</span>
          </div>
        </div>
      </div>

      {/* 3-Tage Forecast */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-700/50 pt-4 z-10">
        {[1, 2, 3].map((dayIndex) => {
          const date = new Date();
          date.setDate(date.getDate() + dayIndex);
          const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
          const code = weather.daily.weather_code[dayIndex];
          const info = getWeatherInfo(code);
          const DayIcon = info.icon;
          const max = Math.round(weather.daily.temperature_2m_max[dayIndex]);
          const min = Math.round(weather.daily.temperature_2m_min[dayIndex]);

          return (
            <div key={dayIndex} className="text-center group/day hover:bg-slate-800/50 rounded-xl p-2 transition-colors">
              <div className="text-xs text-slate-500 font-medium mb-1">{dayName}</div>
              <DayIcon size={20} className={`mx-auto mb-1 ${info.color}`} />
              <div className="text-xs font-bold text-slate-200">{max}° <span className="text-slate-500 font-normal">/ {min}°</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}