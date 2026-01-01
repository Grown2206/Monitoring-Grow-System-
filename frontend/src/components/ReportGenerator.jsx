import React from 'react';
import { Download, FileText } from 'lucide-react';

export default function ReportGenerator({ historyData, logs, plants }) {
  
  const generateCSV = () => {
    if (!historyData || historyData.length === 0) {
      alert("Keine Daten zum Exportieren vorhanden.");
      return;
    }

    // 1. CSV Header definieren
    const headers = [
      "Datum", "Uhrzeit", "Temperatur (°C)", "Luftfeuchte (%)", "VPD (kPa)", 
      "Licht (lx)", "Tank (Raw)", "CO2/Gas (Raw)", 
      "Boden 1", "Boden 2", "Boden 3", "Boden 4", "Boden 5", "Boden 6"
    ];

    // 2. Datenreihen erstellen
    const rows = historyData.map(entry => {
      const date = new Date(entry.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        entry.temp?.toFixed(2) || '',
        entry.humidity?.toFixed(2) || '',
        entry.vpd?.toFixed(2) || '',
        entry.lux || '',
        entry.tankLevel || '',
        entry.gasLevel || '',
        entry.soil1 || '',
        entry.soil2 || '',
        entry.soil3 || '',
        entry.soil4 || '',
        entry.soil5 || '',
        entry.soil6 || ''
      ].join(",");
    });

    // 3. Zusammenfügen
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.join("\n");

    // 4. Download auslösen
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `grow_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={generateCSV}
      className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 group"
      title="Daten als CSV exportieren"
    >
      <Download size={20} className="group-hover:animate-bounce" />
      <span className="hidden md:inline text-sm font-medium">Export</span>
    </button>
  );
}