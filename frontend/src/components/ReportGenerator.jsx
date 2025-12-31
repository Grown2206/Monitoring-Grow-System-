import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';

export default function ReportGenerator({ historyData, logs, plants }) {
  
  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // 1. Titel & Header
    doc.setFillColor(16, 185, 129); // Emerald Green
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("GrowMonitor - Status Bericht", 14, 13);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Erstellt am: ${today}`, 14, 30);

    // 2. Pflanzen Übersicht Tabelle
    doc.setFontSize(12);
    doc.text("Pflanzen Status", 14, 45);
    
    const plantRows = plants.map(p => [
      `Slot ${p.slotId}`, 
      p.name, 
      p.strain || '-', 
      p.stage, 
      p.germinatedAt ? new Date(p.germinatedAt).toLocaleDateString() : '-'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['ID', 'Name', 'Strain', 'Phase', 'Keimung']],
      body: plantRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    // 3. Klima Zusammenfassung (Letzte Messwerte)
    let finalY = doc.lastAutoTable.finalY + 15;
    doc.text("Klima & Umwelt (Letzte 24h)", 14, finalY);

    if (historyData.length > 0) {
      // Statistiken berechnen
      const temps = historyData.map(d => d.temp);
      const hums = historyData.map(d => d.humidity);
      const maxTemp = Math.max(...temps).toFixed(1);
      const minTemp = Math.min(...temps).toFixed(1);
      const avgHum = (hums.reduce((a,b)=>a+b,0)/hums.length).toFixed(1);

      const stats = [
        ['Max Temp', `${maxTemp} °C`],
        ['Min Temp', `${minTemp} °C`],
        ['Ø Luftfeuchte', `${avgHum} %`],
        ['Datensätze', historyData.length]
      ];

      autoTable(doc, {
        startY: finalY + 5,
        body: stats,
        theme: 'plain',
      });
    } else {
      doc.text("Keine historischen Daten verfügbar.", 14, finalY + 10);
    }

    // 4. Logs (Letzte 10)
    finalY = doc.lastAutoTable.finalY + 15;
    doc.text("System Protokoll (Auszug)", 14, finalY);

    const logRows = logs.slice(0, 15).map(l => [
      new Date(l.timestamp).toLocaleTimeString(),
      l.type.toUpperCase(),
      l.message
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Zeit', 'Typ', 'Nachricht']],
      body: logRows,
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 20 } }
    });

    // Save
    doc.save(`GrowReport_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <button 
      onClick={generatePDF}
      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded flex items-center gap-2 text-sm transition border border-slate-700"
    >
      <FileDown size={16} /> PDF Exportieren
    </button>
  );
}