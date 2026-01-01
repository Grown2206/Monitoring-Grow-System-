import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PlantCard from './Plants/PlantCard';
import { Plus, Filter, Sprout, Flower2 } from 'lucide-react';

export default function Plants() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, veg, bloom

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const data = await api.getPlants();
      setPlants(data);
    } catch (error) {
      console.error("Fehler beim Laden der Pflanzen:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = plants.filter(p => {
    if (filter === 'all') return true;
    // Annahme: p.stage könnte 'Keimling', 'Wachstum', 'Blüte' sein
    // Dies müsste im Backend Model oder beim Speichern definiert werden
    return true; 
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white">Deine Pflanzen</h2>
          <p className="text-sm text-slate-400">Verwalte bis zu 6 Slots in deinem System</p>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-slate-900 rounded-lg p-1 flex border border-slate-800">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filter === 'all' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Alle
            </button>
            <button 
              onClick={() => setFilter('veg')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filter === 'veg' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Wachstum
            </button>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all shadow-lg shadow-emerald-900/40">
            <Plus size={18} /> <span className="hidden sm:inline">Neue Pflanze</span>
          </button>
        </div>
      </div>

      {/* Cycle Progress Summary (New QoL Feature) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-4">
           <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
             <Sprout size={24} />
           </div>
           <div>
             <div className="text-sm text-slate-400">Durchschn. Veg-Phase</div>
             <div className="text-lg font-bold text-slate-200">Tag 18 <span className="text-xs font-normal text-slate-500">/ 30</span></div>
             <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
               <div className="bg-emerald-500 h-full rounded-full" style={{width: '60%'}}></div>
             </div>
           </div>
        </div>
        <div className="bg-gradient-to-r from-purple-900/40 to-slate-900 border border-purple-500/20 p-4 rounded-xl flex items-center gap-4">
           <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
             <Flower2 size={24} />
           </div>
           <div>
             <div className="text-sm text-slate-400">Ernte Prognose</div>
             <div className="text-lg font-bold text-slate-200">in 45 Tagen</div>
             <div className="text-xs text-slate-500">ca. 15. März</div>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 animate-pulse">
          Lade Pflanzendaten...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <PlantCard key={plant.slotId} plant={plant} onUpdate={loadPlants} />
          ))}
          
          {/* Empty State Cards if less than 6 */}
          {[...Array(6 - filteredPlants.length)].map((_, i) => (
             <div key={`empty-${i}`} className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-600 min-h-[300px] hover:border-slate-700 hover:bg-slate-800/20 transition-all cursor-pointer group">
               <Plus className="mb-2 group-hover:scale-110 transition-transform" size={32} />
               <span className="font-medium">Leerer Slot</span>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}