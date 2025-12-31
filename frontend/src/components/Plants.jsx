import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { Sprout, Droplet, Edit2, X, Save, Calendar, Clock, Search, Camera, Image as ImageIcon, QrCode, Printer, Link as LinkIcon } from 'lucide-react';

export default function Plants() {
  const { sensorData } = useSocket();
  const [plants, setPlants] = useState([]);
  const [editingPlant, setEditingPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI States für das Modal
  const [modalTab, setModalTab] = useState('info'); // 'info' oder 'qr'
  const [newImageUrl, setNewImageUrl] = useState('');

  // Simulation: Strain Datenbank
  const fetchStrainInfo = (strainName) => {
    const mockDB = {
      "Kush": { type: "Indica", weeks: 8, yield: "High" },
      "Haze": { type: "Sativa", weeks: 11, yield: "Medium" },
      "Skunk": { type: "Hybrid", weeks: 9, yield: "High" },
      "default": { type: "Hybrid", weeks: 9, yield: "Medium" }
    };

    const key = Object.keys(mockDB).find(k => strainName.includes(k)) || "default";
    const info = mockDB[key];

    alert(`🧬 Strain Datenbank Treffer!\nTyp: ${info.type}\nBlütezeit: ${info.weeks} Wochen\nErtrag: ${info.yield}`);
    
    setEditingPlant(prev => ({
      ...prev,
      type: info.type,
      notes: (prev.notes || "") + `\n[DB] ${info.weeks} Wochen Blüte, ${info.yield} Ertrag.`
    }));
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const data = await api.getPlants();
      setPlants(data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingPlant) return;
    try {
      await api.updatePlant(editingPlant.slotId, editingPlant);
      setPlants(plants.map(p => p.slotId === editingPlant.slotId ? editingPlant : p));
      setEditingPlant(null);
      setModalTab('info'); // Reset Tab
    } catch (error) {
      alert("Fehler beim Speichern: " + error.message);
    }
  };

  const addImageToGallery = () => {
    if (!newImageUrl) return;
    // Da wir kein echtes Array im Backend-Model für Bilder haben, speichern wir es im Notes-Feld als Hack oder erweitern das Model.
    // Hier simulieren wir es nur im UI State für die Session.
    alert("Bild-URL hinzugefügt (Simulation)");
    setNewImageUrl('');
  };

  const printLabel = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    printWindow.document.write(`
      <html>
        <body style="font-family: sans-serif; text-align: center; border: 2px solid black; padding: 20px; width: 300px; margin: auto;">
          <h1>${editingPlant.name}</h1>
          <h3>${editingPlant.strain}</h3>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GROW-PLANT-${editingPlant.slotId}" style="width:150px;"/>
          <p>Slot ID: ${editingPlant.slotId} | Type: ${editingPlant.type}</p>
          <p>Keimung: ${new Date(editingPlant.germinatedAt).toLocaleDateString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatDateForInput = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';
  const getDaysOld = (dateStr) => dateStr ? Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24)) : null;

  if (loading) return <div className="text-center p-10 text-slate-500">Lade Pflanzenprofile...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pflanzen Übersicht</h2>
        <span className="text-slate-500 text-sm">{plants.length} Slots aktiv</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plants.map((plant) => {
          const moisture = sensorData.soil[plant.slotId - 1] || 0;
          const isDry = moisture < 30;
          const daysOld = getDaysOld(plant.germinatedAt);

          return (
            <div key={plant.slotId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                    <Sprout size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plant.name}</h3>
                    <div className="text-xs text-slate-400">{plant.strain} (Slot {plant.slotId})</div>
                  </div>
                </div>
                {isDry && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20 animate-pulse">
                    Gießen!
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1"><Droplet size={14}/> Bodenfeuchte</span>
                    <span className={`font-mono font-bold ${isDry ? 'text-red-400' : 'text-emerald-400'}`}>{moisture}%</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full transition-all duration-1000 ${isDry ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${moisture}%` }} />
                  </div>
                </div>
                
                <div className="flex gap-2">
                   {daysOld !== null && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 flex-1">
                          <Clock size={12} /> Tag {daysOld}
                      </div>
                   )}
                   <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 flex-1 justify-center">
                      {plant.type || 'N/A'}
                   </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="text-xs text-slate-500">Status: <span className="text-emerald-400">{plant.stage}</span></div>
                <button onClick={() => { setEditingPlant(plant); setModalTab('info'); }} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded transition flex items-center gap-2">
                  <Edit2 size={12} /> Bearbeiten
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editingPlant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 p-0 rounded-2xl w-full max-w-lg shadow-2xl m-auto overflow-hidden">
            
            {/* Modal Header & Tabs */}
            <div className="bg-slate-950 border-b border-slate-800 p-4">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                     <Edit2 size={20}/> {editingPlant.name}
                  </h3>
                  <button onClick={() => setEditingPlant(null)} className="text-slate-400 hover:text-white"><X /></button>
               </div>
               <div className="flex gap-4 text-sm font-medium">
                  <button onClick={() => setModalTab('info')} className={`pb-2 border-b-2 transition ${modalTab === 'info' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                     Pflanzendaten
                  </button>
                  <button onClick={() => setModalTab('qr')} className={`pb-2 border-b-2 transition ${modalTab === 'qr' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                     Label & QR Code
                  </button>
               </div>
            </div>

            <div className="p-6">
            {modalTab === 'info' ? (
               /* TAB: INFO FORMULAR */
               <form onSubmit={handleSave} className="space-y-4 animate-in slide-in-from-left-5 duration-300">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                     <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Search size={12}/> Genetik Datenbank</h4>
                     <div className="flex gap-2">
                        <input type="text" placeholder="Sorte / Strain" value={editingPlant.strain} onChange={e => setEditingPlant({...editingPlant, strain: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-emerald-500 outline-none" />
                        <button type="button" onClick={() => fetchStrainInfo(editingPlant.strain)} className="bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 rounded hover:bg-blue-600/30 transition text-sm">Suchen</button>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-slate-400 mb-1">Name</label>
                     <input type="text" value={editingPlant.name} onChange={e => setEditingPlant({...editingPlant, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm focus:border-emerald-500 outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-slate-500 mb-1">Keimdatum</label>
                        <input type="date" value={formatDateForInput(editingPlant.germinatedAt)} onChange={e => setEditingPlant({...editingPlant, germinatedAt: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-emerald-500 outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs text-slate-500 mb-1">Phase</label>
                        <select value={editingPlant.stage} onChange={e => setEditingPlant({...editingPlant, stage: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-emerald-500 outline-none">
                           <option value="Keimling">Keimling</option>
                           <option value="Vegetation">Vegetation</option>
                           <option value="Blüte">Blüte</option>
                           <option value="Ernte">Ernte</option>
                        </select>
                     </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4">
                     <label className="block text-xs text-slate-500 mb-2 flex items-center gap-2"><ImageIcon size={12}/> Galerie (URLs)</label>
                     <div className="flex gap-2 mb-2">
                        <input type="text" placeholder="https://..." value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs outline-none" />
                        <button type="button" onClick={addImageToGallery} className="bg-slate-800 px-3 rounded border border-slate-700 hover:bg-slate-700"><LinkIcon size={14}/></button>
                     </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                     <button type="button" onClick={() => setEditingPlant(null)} className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">Abbrechen</button>
                     <button type="submit" className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 font-bold flex justify-center items-center gap-2 text-sm"><Save size={16} /> Speichern</button>
                  </div>
               </form>
            ) : (
               /* TAB: QR CODE & LABEL */
               <div className="space-y-6 animate-in slide-in-from-right-5 duration-300 flex flex-col items-center text-center">
                  <div className="bg-white p-4 rounded-lg shadow-xl">
                     <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GROW-PLANT-${editingPlant.slotId}`} 
                        alt="QR Code" 
                        className="w-48 h-48"
                     />
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-xl font-bold text-white">{editingPlant.name}</h4>
                     <p className="text-slate-400 font-mono text-xs">ID: {editingPlant.slotId} • {editingPlant.strain}</p>
                  </div>
                  
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-500 w-full text-left">
                     <p>Dieser QR Code enthält die einzigartige ID dieser Pflanze.</p>
                     <p className="mt-2">Klebe ihn an den Topf, um später:</p>
                     <ul className="list-disc list-inside mt-1 text-slate-400">
                        <li>Schnell das Pflanzenprofil zu öffnen</li>
                        <li>Notizen per Scan hinzuzufügen</li>
                        <li>Die Ernte zuzuordnen</li>
                     </ul>
                  </div>

                  <button onClick={printLabel} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold flex justify-center items-center gap-2 transition">
                     <Printer size={18} /> Label Drucken
                  </button>
               </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}