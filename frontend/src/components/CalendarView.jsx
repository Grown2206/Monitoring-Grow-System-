import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Calendar, Plus, Trash2, Sprout, Wand2, CalendarCheck } from 'lucide-react';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [plants, setPlants] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'other' });
  
  // Wizard State
  const [wizard, setWizard] = useState({ type: 'nutrient', weeks: 8, interval: 7, start: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [evData, plData] = await Promise.all([api.getEvents(), api.getPlants()]);
    setEvents(evData);
    setPlants(plData);
  };

  const addEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    await api.createEvent(newEvent);
    setNewEvent({ title: '', date: '', type: 'other' });
    loadData();
  };

  const deleteEvent = async (id) => {
    if(!confirm("Löschen?")) return;
    await api.deleteEvent(id);
    loadData();
  };

  // --- Düngeplan Generator ---
  const generatePlan = async () => {
    if(!confirm(`Möchtest du wirklich einen Plan für ${wizard.weeks} Wochen erstellen?`)) return;

    const startDate = new Date(wizard.start);
    const promises = [];

    for (let i = 0; i < wizard.weeks; i++) {
       const eventDate = new Date(startDate);
       eventDate.setDate(startDate.getDate() + (i * wizard.interval));
       
       const title = wizard.type === 'nutrient' ? `Düngen (Woche ${i+1})` : `Gießen Check`;
       
       promises.push(api.createEvent({
          title: title,
          date: eventDate.toISOString().split('T')[0],
          type: wizard.type,
          description: "Automatisch generiert"
       }));
    }

    await Promise.all(promises);
    alert(`${wizard.weeks} Events wurden erstellt!`);
    loadData();
  };

  const getDaysOld = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.abs(new Date() - new Date(dateStr));
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); 
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Calendar /> Grow Kalender & Planung
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LINKS: Tools */}
        <div className="space-y-6">
          
          {/* 1. Quick Add */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <h3 className="font-bold mb-4 text-slate-300">Einzelnes Event</h3>
            <form onSubmit={addEvent} className="space-y-3">
              <input 
                type="text" placeholder="Titel (z.B. Umtopfen)" 
                value={newEvent.title}
                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm outline-none focus:border-emerald-500"
              />
              <input 
                type="date" 
                value={newEvent.date}
                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none"
              />
              <select 
                value={newEvent.type}
                onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm outline-none"
              >
                <option value="other">Sonstiges</option>
                <option value="water">Gießen</option>
                <option value="nutrient">Düngen</option>
                <option value="check">Kontrolle</option>
              </select>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 py-2 rounded text-sm font-bold flex justify-center items-center gap-2 text-slate-300">
                <Plus size={16} /> Hinzufügen
              </button>
            </form>
          </div>

          {/* 2. Plan Generator (Wizard) - NEU */}
          <div className="bg-gradient-to-br from-purple-900/20 to-slate-900 border border-purple-500/20 p-5 rounded-xl">
            <h3 className="font-bold mb-4 text-purple-300 flex items-center gap-2"><Wand2 size={16}/> Plan Generator</h3>
            <div className="space-y-3">
               <div>
                  <label className="text-xs text-slate-500 block mb-1">Typ</label>
                  <select value={wizard.type} onChange={e => setWizard({...wizard, type: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm outline-none">
                     <option value="nutrient">Düngeplan</option>
                     <option value="water">Gieß-Erinnerung</option>
                  </select>
               </div>
               <div className="flex gap-2">
                  <div className="flex-1">
                     <label className="text-xs text-slate-500 block mb-1">Dauer (Wochen)</label>
                     <input type="number" value={wizard.weeks} onChange={e => setWizard({...wizard, weeks: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm outline-none" />
                  </div>
                  <div className="flex-1">
                     <label className="text-xs text-slate-500 block mb-1">Intervall (Tage)</label>
                     <input type="number" value={wizard.interval} onChange={e => setWizard({...wizard, interval: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm outline-none" />
                  </div>
               </div>
               <button onClick={generatePlan} className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded text-sm font-bold flex justify-center items-center gap-2 mt-2 shadow-lg shadow-purple-900/20">
                  <CalendarCheck size={16} /> Plan Erstellen
               </button>
            </div>
          </div>

          {/* 3. Pflanzen Alter */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <h3 className="font-bold mb-4 text-slate-300 flex items-center gap-2"><Sprout size={16}/> Aktueller Zyklus</h3>
            <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {plants.filter(p => p.germinatedAt).map(p => (
                <div key={p.slotId} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2 last:border-0">
                  <div>
                    <div className="font-medium text-emerald-400">{p.name}</div>
                    <div className="text-xs text-slate-500">{new Date(p.germinatedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs">
                    Tag {getDaysOld(p.germinatedAt)}
                  </div>
                </div>
              ))}
              {plants.filter(p => p.germinatedAt).length === 0 && (
                <div className="text-xs text-slate-500 text-center py-2">Keine aktiven Pflanzen mit Keimdatum.</div>
              )}
            </div>
          </div>
        </div>

        {/* RECHTS: Event Liste */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl overflow-hidden flex flex-col h-[600px]">
          <h3 className="font-bold mb-4 text-slate-300">Geplante Events</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {events.length === 0 ? <div className="text-center text-slate-500 mt-20 flex flex-col items-center gap-2"><Calendar size={32} className="opacity-20"/>Keine Events geplant.</div> : events.map(ev => (
              <div key={ev._id} className="flex gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-600 transition group items-center">
                <div className="flex flex-col items-center justify-center bg-slate-900 w-16 h-16 rounded border border-slate-800 shrink-0">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">{new Date(ev.date).toLocaleString('de', { month: 'short' })}</span>
                  <span className="text-xl font-bold text-slate-200">{new Date(ev.date).getDate()}</span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-slate-200">{ev.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                      ev.type === 'water' ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' :
                      ev.type === 'nutrient' ? 'bg-purple-900/30 text-purple-400 border border-purple-900/50' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {ev.type}
                    </span>
                    {ev.description && <span className="text-xs text-slate-500 truncate max-w-[200px] hidden sm:block">- {ev.description}</span>}
                  </div>
                </div>

                <button onClick={() => deleteEvent(ev._id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded transition">
                  <Trash2 size={18}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}