
import React, { useState } from 'react';
import { ChevronDown, Bell } from 'lucide-react';
import { Campus } from '../types';

export const Header = ({ currentCampus, setCampus, branches }: { currentCampus: Campus, setCampus: (c: Campus) => void, branches: Campus[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colorMap: Record<string, string> = { blue: 'bg-blue-500', indigo: 'bg-indigo-500' };
  return (
    <header className="h-24 glass border-b border-white/50 flex items-center justify-between px-10 sticky top-0 z-40 font-['Cairo'] transition-all duration-300">
      <div className="flex items-center gap-6">
        <div className="relative text-right">
          <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 px-5 py-2.5 bg-white/50 hover:bg-white/80 border border-slate-200/60 rounded-2xl transition-all duration-300 shadow-sm hover:shadow group">
            <div className={`relative w-3.5 h-3.5 flex items-center justify-center`}>
              <div className={`absolute inset-0 rounded-full ${colorMap[currentCampus.color] || 'bg-blue-500'} opacity-40 animate-ping`}></div>
              <div className={`w-2 h-2 rounded-full ${colorMap[currentCampus.color] || 'bg-blue-500'} shadow-sm relative z-10`}></div>
            </div>
            <span className="font-bold text-sm text-slate-700">{currentCampus.name}</span>
            <ChevronDown size={16} className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute top-full mt-3 right-0 w-64 glass rounded-[1.5rem] shadow-2xl border border-white/60 p-2 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
              {branches.map((c) => (
                <button 
                  key={c.id} 
                  onClick={() => { setCampus(c); setIsOpen(false); }} 
                  className="w-full text-right px-4 py-3 rounded-2xl hover:bg-indigo-50 flex items-center justify-between group transition-all duration-200"
                >
                  <span className={`font-bold text-[13px] ${currentCampus.id === c.id ? 'text-indigo-600' : 'text-slate-600 group-hover:text-indigo-900'}`}>
                    {c.name}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${colorMap[c.color] || 'bg-blue-500'} scale-75 group-hover:scale-100 transition-transform`}></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative p-2.5 text-slate-400 hover:text-indigo-600 transition-colors bg-white/50 hover:bg-white rounded-xl border border-slate-200/50 shadow-sm hover:shadow">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-white"></span>
        </button>
        <div className="h-8 w-px bg-slate-200"></div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-800">أدمن خالد</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campus Manager</p>
        </div>
        <div className="relative group cursor-pointer hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
          <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-xl border-2 border-white shadow-xl">
            خ
          </div>
        </div>
      </div>
    </header>
  );
};
