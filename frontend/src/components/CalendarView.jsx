import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ChevronLeft, ChevronRight, Plus, Droplets, FlaskConical, 
  Scissors, Sprout, Flower2, Calendar as CalIcon, Trash2, X, Moon 
} from 'lucide-react';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State für neue Events
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'water', // water, nutrient, training, note
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, plantsData] = await Promise.all([
        api.getEvents(),
        api.getPlants()
      ]);
      setEvents(eventsData || []);
      setPlants(plantsData || []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- KALENDER LOGIK ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    // Anpassung für Montag als Wochenstart (Europa)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    return { days, firstDay: adjustedFirstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title) return;
    try {
      await api.createEvent(newEvent);
      setShowAddModal(false);
      setNewEvent({ ...newEvent, title: '' });
      loadData(); // Refresh
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (confirm('Event löschen?')) {
      await api.deleteEvent(id);
      loadData();
    }
  };

  // --- DATEN ZUSAMMENFÜHREN ---
  const getEventsForDay = (day) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    let dailyEvents = [];

    // 1. Manuelle Events aus DB
    const dbEvents = events.filter(e => e.date && e.date.startsWith(dateStr));
    dailyEvents = [...dailyEvents, ...dbEvents];

    // 2. Automatische Pflanzen-Events (Sync)
    plants.forEach(plant => {
      if (plant.stage === 'Leer') return;

      // Gepflanzt
      if (plant.plantedDate && plant.plantedDate.startsWith(dateStr)) {
        dailyEvents.push({ id: `p-${plant.slotId}-start`, title: `Start: ${plant.name}`, type: 'lifecycle', icon: <Sprout size={12}/> });
      }
      // Blüte Start
      if (plant.bloomDate && plant.bloomDate.startsWith(dateStr)) {
        dailyEvents.push({ id: `p-${plant.slotId}-bloom`, title: `Blüte: ${plant.name}`, type: 'bloom', icon: <Flower2 size={12}/> });
      }
      // Ernte (Geplant)
      if (plant.harvestDate && plant.harvestDate.startsWith(dateStr)) {
        dailyEvents.push({ id: `p-${plant.slotId}-harv`, title: `Ernte: ${plant.name}`, type: 'harvest', icon: <Scissors size={12}/> });
      }
    });

    return dailyEvents;
  };

  // Hilfsfunktion für Event-Styling
  const getEventStyle = (type) => {
    switch(type) {
      case 'water': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'nutrient': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'training': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'lifecycle': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'bloom': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'harvest': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CalIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {monthNames[currentDate.getMonth()]} <span className="text-slate-500">{currentDate.getFullYear()}</span>
            </h2>
            <p className="text-xs text-slate-400">Grow Planer & Historie</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-medium text-slate-300 hover:text-white">Heute</button>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
        </div>

        <button 
          onClick={() => {
            setNewEvent({ ...newEvent, date: new Date().toISOString().split('T')[0] });
            setShowAddModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-emerald-900/20 transition-all mt-4 md:mt-0"
        >
          <Plus size={18} /> Eintrag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Hauptkalender Grid */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Wochentage */}
          <div className="grid grid-cols-7 mb-4">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="text-center text-slate-500 text-sm font-bold uppercase tracking-wider">{day}</div>
            ))}
          </div>

          {/* Tage Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Leere Zellen für Offset */}
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-950/30 rounded-xl border border-slate-800/30 opacity-50"></div>
            ))}

            {/* Tage des Monats */}
            {[...Array(days)].map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

              return (
                <div 
                  key={day} 
                  onClick={() => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    setNewEvent({ ...newEvent, date: d.toISOString().split('T')[0] });
                    setShowAddModal(true);
                  }}
                  className={`
                    relative h-24 md:h-32 p-2 rounded-xl border transition-all cursor-pointer group hover:border-slate-600
                    ${isToday ? 'bg-slate-800/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>
                      {day}
                    </span>
                    {/* Mondphase Mockup (zufällig für Demo, müsste berechnet werden) */}
                    {day % 14 === 0 && <Moon size={12} className="text-slate-600 opacity-50" />}
                  </div>
                  
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-[70%] custom-scrollbar">
                    {dayEvents.map((evt, idx) => (
                      <div key={idx} className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${getEventStyle(evt.type)}`}>
                        {evt.icon}
                        <span>{evt.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add Hint on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px] rounded-xl">
                    <Plus className="text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Nächste Events & Legende */}
        <div className="space-y-6">
          
          {/* Info Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Droplets className="text-blue-400" size={18} /> Nächste Aufgaben
            </h3>
            
            {/* Hier würde man eigentlich filtern nach Events in der Zukunft */}
            <div className="space-y-3">
               <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                 <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Droplets size={16}/></div>
                 <div>
                   <div className="text-sm font-bold text-slate-200">Gießen prüfen</div>
                   <div className="text-xs text-slate-500">Täglich empfohlen</div>
                 </div>
               </div>
               <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                 <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><FlaskConical size={16}/></div>
                 <div>
                   <div className="text-sm font-bold text-slate-200">Düngeschema</div>
                   <div className="text-xs text-slate-500">Woche 3: Veg Mix</div>
                 </div>
               </div>
            </div>
          </div>

          {/* Legende */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
            <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Legende</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Pflanzen Zyklus</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Bewässerung</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Nährstoffe</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Training (LST/HST)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Ernte</div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal zum Hinzufügen */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Neuer Eintrag</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Titel</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                  placeholder="z.B. Gießen mit CalMag"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Datum</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Typ</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none appearance-none"
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                  >
                    <option value="water">💧 Gießen</option>
                    <option value="nutrient">🧪 Düngen</option>
                    <option value="training">✂️ Training</option>
                    <option value="note">📝 Notiz</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleAddEvent}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-emerald-900/20 transition-all"
              >
                Eintrag speichern
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}