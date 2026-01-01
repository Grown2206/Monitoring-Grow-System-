import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PlantCard from './Plants/PlantCard';
import { Plus, Sprout, Flower2, Leaf } from 'lucide-react';
// NEU: Socket importieren
import { useSocket } from '../context/SocketContext';

export default function Plants() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  
  // NEU: Live-Sensordaten holen
  const { sensorData } = useSocket();

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const data = await api.getPlants();
      const fullSlots = Array.from({ length: 6 }, (_, i) => {
        const existing = data.find(p => p.slotId === i + 1);
        return existing || { slotId: i + 1, stage: 'Leer', name: '', strain: '' };
      });
      setPlants(fullSlots);
    } catch (error) {
      console.error("Fehler beim Laden der Pflanzen:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = plants.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'veg') return p.stage === 'Vegetation' || p.stage === 'Keimling';
    if (filter === 'bloom') return p.stage === 'Blüte';
    return true; 
  });

  const activeCount = plants.filter(p => p.stage !== 'Leer' && p.stage !== 'Geerntet').length;
  const bloomCount = plants.filter(p => p.stage === 'Blüte').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
             <Leaf className="text-emerald-500" /> Grow Management
          </h2>
          <p className="text-slate-400 mt-2 max-w-lg">
            Verwalte deine Ladies. Dokumentiere Wachstum, Blütephase und Zucht-Details für maximalen Ertrag.
          </p>
        </div>

        <div className="flex gap-4 relative z-10">
           <div className="text-center px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="text-2xl font-bold text-white">{activeCount}</div>
              <div className="text-xs text-slate-500 uppercase">Aktiv</div>
           </div>
           <div className="text-center px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="text-2xl font-bold text-purple-400">{bloomCount}</div>
              <div className="text-xs text-purple-500/70 uppercase">Blüte</div>
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'all' ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'}`}
        >
          Alle Pflanzen
        </button>
        <button 
          onClick={() => setFilter('veg')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'veg' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-emerald-500/50'}`}
        >
          <Sprout size={16}/> Wachstum
        </button>
        <button 
          onClick={() => setFilter('bloom')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'bloom' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-purple-500/50'}`}
        >
          <Flower2 size={16}/> Blüte
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {[1,2,3].map(i => (
             <div key={i} className="h-[350px] bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800"></div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <PlantCard 
              key={plant.slotId} 
              plant={plant} 
              onUpdate={loadPlants} 
              // NEU: Live-Wert übergeben (Array Index ist slotId - 1)
              // sensorData.soil sollte ein Array [val1, val2, ...] sein
              moistureRaw={sensorData?.soil?.[plant.slotId - 1]} 
            />
          ))}
        </div>
      )}
    </div>
  );
}