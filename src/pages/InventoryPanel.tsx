
import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, TrendingUp, AlertTriangle, ArrowDown, ArrowUp, RefreshCcw, Coffee, Printer, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui';
import { supabase } from '../lib/supabase';

export const InventoryPanel = ({ branchId }: { branchId?: string }) => {
    const [activeCategory, setActiveCategory] = useState<'all' | 'kitchen' | 'office'>('all');
    const [stockItems, setStockItems] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (branchId) {
            fetchInventory();
            fetchLogs();
        }
    }, [branchId]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('branch_id', branchId);
            if (error) throw error;
            setStockItems(data || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('inventory_logs')
                .select('*, inventory(name)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    const filteredItems = stockItems.filter(item => {
        if (activeCategory === 'all') return true;
        if (activeCategory === 'kitchen') return item.category === 'مطبخ وبوفيه';
        if (activeCategory === 'office') return item.category === 'أدوات مكتبية';
        return true;
    });

    const lowStockCount = stockItems.filter(item => item.stock <= (item.min_stock || 0)).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Cairo'] text-right">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-6 flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
                        <Package size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي الأصناف</p>
                        <p className="text-3xl font-black text-slate-900">{stockItems.length}</p>
                    </div>
                </Card>

                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-6 flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">أصناف تحتاج طلب</p>
                        <p className="text-3xl font-black text-rose-600 font-mono">{lowStockCount}</p>
                    </div>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white p-6 flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 text-emerald-400 rounded-3xl flex items-center justify-center">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black opacity-60 uppercase tracking-widest text-right">قيمة المخزون التقريبية</p>
                        <p className="text-3xl font-black">{stockItems.reduce((acc, item) => acc + (item.stock * (item.price || 0)), 0).toLocaleString()} <span className="text-sm">EGP</span></p>
                    </div>
                </Card>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-wrap justify-between items-center gap-6">
                <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeCategory === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        الكل
                    </button>
                    <button
                        onClick={() => setActiveCategory('kitchen')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeCategory === 'kitchen' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        المطبخ والكاترينج
                    </button>
                    <button
                        onClick={() => setActiveCategory('office')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeCategory === 'office' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        الأدوات المكتبية
                    </button>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="البحث في المخزن..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-14 pl-6 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Inventory Table */}
            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="px-8 py-6">إسم الصنف</th>
                            <th className="px-6 py-6">التصنيف</th>
                            <th className="px-6 py-6 text-center">الرصيد الحالي</th>
                            <th className="px-6 py-6 text-center">الحالة</th>
                            <th className="px-6 py-6">آخر توريد</th>
                            <th className="px-8 py-6 text-left">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </td>
                            </tr>
                        ) : filteredItems.length > 0 ? filteredItems.map(item => (
                            <tr key={item.id} className="group hover:bg-slate-50 transition-all font-bold">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.category === 'مطبخ وبوفيه' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {item.category === 'مطبخ وبوفيه' ? <Coffee size={18} /> : <Printer size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-slate-800">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-black">وحدة القياس: {item.unit}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <Badge className={`${item.category === 'مطبخ وبوفيه' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'} rounded-lg px-3 py-1 font-black text-[10px]`}>
                                        {item.category || 'غير مصنف'}
                                    </Badge>
                                </td>
                                <td className="px-6 py-6 text-center">
                                    <span className={`text-lg font-black ${item.stock <= (item.min_stock || 0) ? 'text-rose-600' : 'text-slate-700'}`}>
                                        {item.stock}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mr-1">{item.unit}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${item.stock <= (item.min_stock || 0) ? 'bg-rose-500' :
                                                    item.stock <= (item.min_stock || 0) * 2 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${Math.min(100, (item.stock / ((item.min_stock || 1) * 4)) * 100)}%` }}
                                            ></div>
                                        </div>
                                        {item.stock <= (item.min_stock || 0) && (
                                            <span className="text-[10px] font-black text-rose-500 animate-pulse">مخزون منخفض!</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-slate-400 text-xs text-center font-mono">
                                    {item.last_restock ? new Date(item.last_restock).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-8 py-6 text-left">
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100">
                                            <RefreshCcw size={16} />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-slate-300 font-bold">
                                    لا توجد أصناف مسجلة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {/* Activity Log */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-black flex items-center gap-2 text-indigo-600">
                            <RefreshCcw size={16} /> سجل حركة المخزن (آخر 10 عمليات)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {logs.length > 0 ? logs.map(log => (
                                <div key={log.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-4 text-right">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'Supply' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {log.type === 'Supply' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">
                                                {log.type === 'Supply' ? 'توريد' : 'صرف'} {log.inventory?.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(log.created_at).toLocaleString('ar-EG')} {log.notes ? `| ${log.notes}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-black font-mono ${log.type === 'Supply' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {log.type === 'Supply' ? '+' : '-'}{log.quantity}
                                    </span>
                                </div>
                            )) : (
                                <div className="p-10 text-center text-slate-300 font-bold">لا توجد حركات مسجلة</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
