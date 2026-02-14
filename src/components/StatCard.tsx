
import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-right">
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner"><Icon size={24} /></div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-slate-500 font-bold text-sm mb-1">{title}</p>
    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
  </div>
);
