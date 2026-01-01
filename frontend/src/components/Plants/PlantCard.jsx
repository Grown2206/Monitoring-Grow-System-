import React, { useState } from 'react';
import { 
  Droplets, Calendar, Edit2, Save, X, Sprout, Flower2, 
  Ruler, Activity, Beaker, Timer 
} from 'lucide-react';
import { api } from '../../services/api';

export default function PlantCard({ plant, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...plant });

  // Hilfsfunktion: Tage berechnen
  const getDaysSince = (date) => {
    if (!date) return 0;
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const daysOld = getDaysSince(plant.germinationDate || plant.plantedDate);
  const daysInBloom = plant.bloomDate ? getDaysSince(plant.bloomDate) : 0;

  const handleSave = async () => {
    try {
      await api.updatePlant(plant.slotId, formData);
      setIsEditing(false);
      onUpdate(); // Liste neu laden
    } catch (e) {
      console.error("Fehler beim Speichern:", e);
      alert("Fehler beim Speichern der Pflanze.");
    }
  };

  // --- BEARBEITUNGS-MODUS ---
  if (isEditing) {
    return (
      <div className="bg-slate-900 border border-emerald-500/50 p-6 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-4 right-4 flex gap-2">
           <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
        </div>
        
        <h3 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">
          <Edit2 size={18} /> Pflanze bearbeiten (Slot {plant.slotId})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basis Infos */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Name</label>
              <input 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="z.B. Northern Lights #1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Sorte (Strain)</label>
              <input 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.strain} onChange={e => setFormData({...formData, strain: e.target.value})} 
                placeholder="z.B. OG Kush"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Breeder (Züchter)</label>
              <input 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.breeder} onChange={e => setFormData({...formData, breeder: e.target.value})} 
                placeholder="z.B. RQS"
              />
            </div>
             <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Typ</label>
              <select 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Feminized">Feminized (Photoperiodisch)</option>
                <option value="Autoflower">Autoflower</option>
                <option value="Regular">Regular</option>
                <option value="CBD">CBD</option>
              </select>
            </div>
          </div>

          {/* Status & Datum */}
          <div className="space-y-3">
             <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Aktuelle Phase</label>
              <select 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}
              >
                <option value="Leer">-- Leer --</option>
                <option value="Keimling">Keimling</option>
                <option value="Vegetation">Vegetation</option>
                <option value="Blüte">Blüte</option>
                <option value="Trocknen">Trocknen</option>
                <option value="Geerntet">Geerntet</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Keimdatum</label>
                <input 
                  type="date"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-xs"
                  value={formData.germinationDate ? formData.germinationDate.split('T')[0] : ''} 
                  onChange={e => setFormData({...formData, germinationDate: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Blütestart</label>
                <input 
                  type="date"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-xs"
                  value={formData.bloomDate ? formData.bloomDate.split('T')[0] : ''} 
                  onChange={e => setFormData({...formData, bloomDate: e.target.value})} 
                />
              </div>
            </div>

             <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Höhe (cm)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                    value={formData.height} onChange={e => setFormData({...formData, height: parseInt(e.target.value)})} 
                  />
               </div>
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Gesundheit %</label>
                  <input 
                    type="number" max="100" min="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                    value={formData.health} onChange={e => setFormData({...formData, health: parseInt(e.target.value)})} 
                  />
               </div>
             </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-800">
           <label className="text-xs text-slate-500 uppercase font-bold">Notizen</label>
           <textarea 
             className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-sm h-20"
             value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
             placeholder="Düngeschema, Probleme, Beobachtungen..."
           />
        </div>

        <button onClick={handleSave} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
          <Save size={20} /> Änderungen Speichern
        </button>
      </div>
    );
  }

  // --- ANSICHTS-MODUS ---
  const isEmpty = plant.stage === 'Leer';

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-300 group
      ${isEmpty 
        ? 'bg-slate-900/50 border-slate-800 border-dashed hover:border-slate-700 hover:bg-slate-800/50' 
        : 'bg-slate-900 border-slate-800 hover:border-emerald-500/30 shadow-lg hover:shadow-emerald-900/10'}
    `}>
      
      {/* Edit Button (nur sichtbar bei Hover oder Mobile) */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => { setFormData({...plant}); setIsEditing(true); }}
          className="p-2 bg-slate-800/80 backdrop-blur text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-lg border border-slate-700"
        >
          <Edit2 size={16} />
        </button>
      </div>

      {isEmpty ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-600 cursor-pointer" onClick={() => setIsEditing(true)}>
          <div className="p-4 rounded-full bg-slate-800/50 mb-4 group-hover:scale-110 transition-transform">
             <Sprout size={32} />
          </div>
          <h3 className="font-medium text-lg">Slot {plant.slotId} Leer</h3>
          <p className="text-sm">Klicken zum Bepflanzen</p>
        </div>
      ) : (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center shadow-lg
              ${plant.stage === 'Blüte' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}
            `}>
              {plant.stage === 'Blüte' ? <Flower2 size={24} /> : <Sprout size={24} />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {plant.type} • {plant.breeder}
              </div>
              <h3 className="text-xl font-bold text-white leading-none mb-1">{plant.name}</h3>
              <div className="text-sm text-emerald-400 font-medium">{plant.strain}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
               <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                 <Timer size={14} /> Alter
               </div>
               <div className="font-mono font-bold text-slate-200">
                 {daysOld} <span className="text-xs font-normal text-slate-500">Tage</span>
               </div>
             </div>
             
             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
               <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                 {plant.stage === 'Blüte' ? <Flower2 size={14} className="text-purple-400"/> : <Sprout size={14} className="text-emerald-400"/>} Phase
               </div>
               <div className="font-bold text-slate-200 truncate">
                 {plant.stage} {plant.stage === 'Blüte' && <span className="text-xs text-purple-400 ml-1">(Tag {daysInBloom})</span>}
               </div>
             </div>

             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
               <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                 <Ruler size={14} /> Höhe
               </div>
               <div className="font-mono font-bold text-slate-200">
                 {plant.height} <span className="text-xs font-normal text-slate-500">cm</span>
               </div>
             </div>

             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
               <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                 <Activity size={14} /> Vitalität
               </div>
               <div className={`font-bold ${plant.health > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                 {plant.health}%
               </div>
             </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
             <div className="flex justify-between text-xs text-slate-500 mb-2">
               <span>Fortschritt (Geschätzt)</span>
               <span>~85 Tage total</span>
             </div>
             <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${plant.stage === 'Blüte' ? 'bg-purple-500' : 'bg-emerald-500'}`} 
                  style={{width: `${Math.min((daysOld / 85) * 100, 100)}%`}}
                ></div>
             </div>
          </div>

          {/* Notes Preview (if any) */}
          {plant.notes && (
            <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg text-xs text-slate-400 italic truncate">
              "{plant.notes}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}