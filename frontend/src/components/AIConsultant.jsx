import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { Bot, Sparkles, Send, BrainCircuit, Leaf, AlertCircle } from 'lucide-react';

export default function AIConsultant() {
  const { sensorData } = useSocket();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState([]);
  
  // Status beim Laden
  useEffect(() => {
    api.getPlants().then(setPlants).catch(console.error);
  }, []);

  const startAnalysis = async () => {
    setLoading(true);
    setResponse(null);

    try {
      // Wir sammeln alle relevanten Daten für den "Kontext" der KI
      const logs = await api.getLogs();
      
      const contextData = {
        sensorData,
        plants,
        logs: logs.slice(0, 10) // Nur die letzten 10 Logs
      };

      const result = await api.getConsultation(contextData);
      setResponse(result.analysis);
    } catch (error) {
      setResponse("❌ Fehler bei der Verbindung zum AI Core: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          <Bot className="text-purple-400" /> Grow-AI Consultant
        </h2>
        <div className="text-xs text-slate-500 border border-slate-800 rounded-full px-3 py-1 flex items-center gap-2">
          <BrainCircuit size={14} /> Powered by Gemini
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0"></div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar z-10 space-y-6">
          
          {/* Intro Message */}
          {!response && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
              <div className="bg-slate-800 p-6 rounded-full animate-pulse">
                <Sparkles size={48} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">System bereit zur Analyse</h3>
              <p className="text-slate-400 max-w-md">
                Ich analysiere deine Sensordaten, Pflanzenphasen und System-Logs, 
                um dir professionelle Optimierungsvorschläge zu geben.
              </p>
              <button 
                onClick={startAnalysis}
                className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <BrainCircuit size={20} /> Jetzt Analysieren
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot size={24} className="text-purple-400 animate-bounce" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h4 className="font-bold text-slate-200">Verarbeite Telemetrie...</h4>
                <div className="text-xs text-slate-500 font-mono space-y-1">
                  <p>Lade Sensordaten... OK</p>
                  <p>Prüfe Pflanzenphasen... OK</p>
                  <p>Generiere Optimierungsstrategie...</p>
                </div>
              </div>
            </div>
          )}

          {/* Result View */}
          {response && (
            <div className="animate-in slide-in-from-bottom-10 duration-500">
              <div className="flex gap-4 mb-6">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <Bot size={20} className="text-white" />
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl rounded-tl-none p-6 text-slate-200 shadow-xl backdrop-blur-sm w-full">
                  <div className="prose prose-invert prose-sm max-w-none">
                    {/* Markdown Rendering Simulation (Simple replacement for bold/lists) */}
                    {response.split('\n').map((line, i) => (
                      <div key={i} className={`
                        ${line.startsWith('###') ? 'text-lg font-bold text-purple-300 mt-4 mb-2' : ''}
                        ${line.startsWith('**') ? 'font-bold text-white mt-2' : ''}
                        ${line.startsWith('*') || line.startsWith('-') ? 'pl-4 border-l-2 border-purple-500/30 my-1' : ''}
                      `}>
                        {line.replace(/[*#]/g, '')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button onClick={startAnalysis} className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition">
                  <RefreshCw size={14} /> Neu analysieren
                </button>
                <button className="text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 px-4 py-2 rounded-lg flex items-center gap-2 transition">
                  <Leaf size={14} /> Empfehlungen anwenden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Icon Import für Refresh (wurde oben vergessen)
import { RefreshCw } from 'lucide-react';