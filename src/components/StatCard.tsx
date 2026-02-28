
import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="glass group rounded-[2rem] p-6 text-right relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/20 transition-colors duration-500" />
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-white/50 border border-white rounded-2xl text-indigo-600 shadow-sm group-hover:scale-110 group-hover:rotate-3 group-hover:bg-indigo-50 transition-all duration-300">
        <Icon size={26} className="drop-shadow-sm" />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 ${trend > 0 ? 'bg-emerald-50/80 text-emerald-600 border-emerald-100' : 'bg-rose-50/80 text-rose-600 border-rose-100'}`}>
          {trend > 0 ? <ArrowUpRight size={14} className="animate-bounce" style={{ animationDuration: '3s' }} /> : <ArrowDownLeft size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-slate-500 font-bold text-[15px] mb-2">{title}</p>
    <h3 className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-violet-500 transition-all duration-300">
      {value}
    </h3>
  </div>
);
