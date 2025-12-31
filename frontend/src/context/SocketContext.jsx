import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAlert } from './AlertContext'; // <--- WICHTIG: Import

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { showAlert } = useAlert(); // <--- WICHTIG: Hook nutzen
  
  // Settings im Ref halten, damit wir im WebSocket Callback immer Zugriff auf aktuelle Werte haben
  const settingsRef = useRef({
    tempMin: 18, tempMax: 28, humMin: 40, humMax: 70, notifications: true
  });

  const [sensorData, setSensorData] = useState({
    temp: 0,
    humidity: 0,
    lux: 0,
    tank: 0,
    gas: 0,
    soil: [0, 0, 0, 0, 0, 0]
  });

  // Settings laden & auf Änderungen hören
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('grow_settings');
      if (saved) settingsRef.current = JSON.parse(saved);
    };
    loadSettings();
    window.addEventListener('settings-changed', loadSettings);
    return () => window.removeEventListener('settings-changed', loadSettings);
  }, []);

  // Alarm Cooldowns (damit man nicht zugespamt wird)
  const lastAlert = useRef({ temp: 0, hum: 0, tank: 0 });

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:3000`);

    ws.onopen = () => {
      setIsConnected(true);
      showAlert('Verbindung zum Grow-System hergestellt.', 'success', 3000);
    };

    ws.onclose = () => {
      setIsConnected(false);
      showAlert('Verbindung verloren! Prüfe Server.', 'error', 0); // 0 = Bleibt stehen
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'sensor_update') {
          setSensorData(msg.data);
          checkAlerts(msg.data); // <--- Prüfen!
        }
      } catch (e) {
        console.error("Parse Error", e);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [showAlert]); // showAlert als dependency

  // Die Überwachungs-Logik
  const checkAlerts = (data) => {
    const s = settingsRef.current;
    if (!s.notifications) return;
    const now = Date.now();
    const COOLDOWN = 5 * 60 * 1000; // Nur alle 5 Min warnen

    // Temp Check
    if (data.temp > s.tempMax && now - lastAlert.current.temp > COOLDOWN) {
      showAlert(`🔥 HITZE ALARM: ${data.temp}°C (Limit: ${s.tempMax}°C)`, 'error');
      lastAlert.current.temp = now;
    } else if (data.temp < s.tempMin && now - lastAlert.current.temp > COOLDOWN) {
      showAlert(`❄️ KÄLTE ALARM: ${data.temp}°C (Limit: ${s.tempMin}°C)`, 'warning');
      lastAlert.current.temp = now;
    }

    // Tank Check (Hardcoded Grenzwert < 500 für Demo)
    if (data.tank < 500 && data.tank > 10 && now - lastAlert.current.tank > COOLDOWN) {
      showAlert(`💧 Wassertank fast leer!`, 'warning');
      lastAlert.current.tank = now;
    }
  };

  const sendCommand = (command, id = 0, state = true) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ command, id, state }));
    }
  };

  return (
    <SocketContext.Provider value={{ isConnected, sensorData, sendCommand }}>
      {children}
    </SocketContext.Provider>
  );
};