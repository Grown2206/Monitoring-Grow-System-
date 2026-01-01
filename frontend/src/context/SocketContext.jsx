import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    temp: 0, humidity: 0, lux: 0, tankLevel: 0, gasLevel: 0, 
    soil: [0,0,0,0,0,0]
  });

  useEffect(() => {
    // Automatische Erkennung der Backend-URL
    // Wenn Frontend auf localhost:5173 läuft, suche Backend auf localhost:3000
    const backendUrl = `http://${window.location.hostname}:3000`;
    
    console.log("Verbinde zu Backend:", backendUrl);

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'], // Versuche beide Methoden
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log("✅ Socket verbunden mit ID:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log("❌ Socket getrennt");
      setIsConnected(false);
    });

    newSocket.on('sensorData', (data) => {
      // console.log("Neue Sensordaten:", data); // Debugging
      setSensorData(prev => ({ ...prev, ...data }));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, sensorData }}>
      {children}
    </SocketContext.Provider>
  );
};