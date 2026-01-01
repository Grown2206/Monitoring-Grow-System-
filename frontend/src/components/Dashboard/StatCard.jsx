import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, unit, icon, color, trend, bg, avg, className }) {
  // Wenn className übergeben wird, nutzen wir diesen für den Container, sonst Standard
  const containerClass = className || "bg-slate-900 border border-slate-800 hover:border-slate-700";

  return (
    <div className={`${containerClass} p-4 rounded-xl shadow-lg transition-colors flex flex-col justify-between h-full`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${bg || 'bg-slate-800'}`}>
          <div className={color || 'text-slate-200'}>{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 
            trend < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {trend > 0 ? <TrendingUp size={12} className="mr-1"/> : 
             trend < 0 ? <TrendingDown size={12} className="mr-1"/> : 
             <Minus size={12} className="mr-1"/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 opacity-80">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>
        
        {avg && (
          <div className="mt-2 text-xs text-slate-500 font-mono border-t border-white/10 pt-2 flex items-center justify-between">
            <span>Ø 4h:</span>
            <span className="text-slate-300 font-bold">{avg} {unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}