
import React, { useState } from 'react';
import { ChevronDown, Bell } from 'lucide-react';
import { Campus } from '../types';
import { CAMPUSES } from '../mockData';

export const Header = ({ currentCampus, setCampus }: { currentCampus: Campus, setCampus: (c: Campus) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colorMap: Record<string, string> = { blue: 'bg-blue-500', indigo: 'bg-indigo-500' };
  return (
    <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40 font-['Cairo']">
      <div className="flex items-center gap-6">
        <div className="relative text-right">
          <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white transition-all shadow-sm">
            <div className={`w-3 h-3 rounded-full ${colorMap[currentCampus.color]} shadow-sm animate-pulse`}></div>
            <span className="font-black text-sm text-slate-700">{currentCampus.name}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <div className="absolute top-full mt-4 right-0 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-200">
              {CAMPUSES.map((c) => (
                <button key={c.id} onClick={() => { setCampus(c); setIsOpen(false); }} className="w-full text-right px-4 py-3 rounded-2xl hover:bg-slate-50 flex items-center justify-between group transition-colors">
                  <span className={`font-bold text-sm ${currentCampus.id === c.id ? 'text-indigo-600' : 'text-slate-600'}`}>{c.name}</span>
                  <div className={`w-2 h-2 rounded-full ${colorMap[c.color]}`}></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
         <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-800">أدمن خالد</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campus Manager</p>
         </div>
         <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">خ</div>
      </div>
    </header>
  );
};
