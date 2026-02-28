
import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, TrendingUp, AlertTriangle, ArrowDown, ArrowUp, RefreshCcw, Coffee, Printer, Trash2, Plus, X, Edit, Save } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export const InventoryPanel = ({ branchId }: { branchId?: string }) => {
    const [activeCategory, setActiveCategory] = useState<'all' | 'kitchen' | 'office'>('all');
    const [stockItems, setStockItems] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'مطبخ وبوفيه',
        stock: 0,
        min_stock: 0,
        unit: 'وحدة',
        price: 0
    });
    const [adding, setAdding] = useState(false);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchInventory();
        fetchLogs();
    }, [branchId]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            let query = supabase.from('inventory').select('*');
            if (branchId) query = query.eq('branch_id', branchId);
            
            const { data, error } = await query;
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
            let query = supabase.from('inventory_logs')
                .select('*, inventory(name)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (branchId) query = query.eq('branch_id', branchId);
            
            const { data, error } = await query;
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

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const { error } = await supabase.from('inventory').insert([{
                ...newItem,
                branch_id: branchId || null
            }]);
            if (error) throw error;
            setIsAddModalOpen(false);
            setNewItem({ name: '', category: 'مطبخ وبوفيه', stock: 0, min_stock: 0, unit: 'وحدة', price: 0 });
            fetchInventory();
        } catch (error: any) {
            alert('حدث خطأ أثناء إضافة الصنف: ' + error.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteItem = async (id: string, name: string) => {
        if (!window.confirm(`هل أنت متأكد من حذف ${name}؟`)) return;
        try {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (error) throw error;
            fetchInventory();
        } catch (error: any) {
            alert('حدث خطأ أثناء الحذف: ' + error.message);
        }
    };

    const handleEditClick = (item: any) => {
        setEditingItem({ ...item });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { id, created_at, ...updateData } = editingItem;
            const { error } = await supabase.from('inventory').update(updateData).eq('id', id);
            if (error) throw error;
            setIsEditModalOpen(false);
            setEditingItem(null);
            fetchInventory();
        } catch (error: any) {
            alert('حدث خطأ أثناء التحديث: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

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
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="البحث في المخزن..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-10 pl-6 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={20} /> إضافة صنف
                </button>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-white rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">إضافة صنف جديد</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">اسم الصنف</label>
                                <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">التصنيف</label>
                                <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3">
                                    <option value="مطبخ وبوفيه">مطبخ وبوفيه</option>
                                    <option value="أدوات مكتبية">أدوات مكتبية</option>
                                    <option value="أخرى">أخرى</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الرصيد الافتتاحي</label>
                                    <input required type="number" min="0" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الحد الأدنى</label>
                                    <input required type="number" min="0" value={newItem.min_stock} onChange={e => setNewItem({ ...newItem, min_stock: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الوحدة</label>
                                    <input required type="text" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">السعر (لكافتريا)</label>
                                    <input required type="number" min="0" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                            </div>
                            <button type="submit" disabled={adding} className="w-full bg-indigo-600 text-white rounded-xl py-4 font-bold disabled:opacity-50 mt-4 shadow-lg shadow-indigo-500/20">
                                {adding ? 'جاري الإضافة...' : 'إضافة إلى المخزن'}
                            </button>
                        </form>
                    </Card>
                </div>
            )}

            {isEditModalOpen && editingItem && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-white rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">تعديل صنف</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">اسم الصنف</label>
                                <input required type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">التصنيف</label>
                                <select value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3">
                                    <option value="مطبخ وبوفيه">مطبخ وبوفيه</option>
                                    <option value="أدوات مكتبية">أدوات مكتبية</option>
                                    <option value="أخرى">أخرى</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الرصيد الافتتاحي</label>
                                    <input required type="number" min="0" value={editingItem.stock} onChange={e => setEditingItem({ ...editingItem, stock: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الحد الأدنى</label>
                                    <input required type="number" min="0" value={editingItem.min_stock} onChange={e => setEditingItem({ ...editingItem, min_stock: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الوحدة</label>
                                    <input required type="text" value={editingItem.unit} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">السعر (لكافتريا)</label>
                                    <input required type="number" min="0" value={editingItem.price || 0} onChange={e => setEditingItem({ ...editingItem, price: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                            </div>
                            <button type="submit" disabled={updating} className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold disabled:opacity-50 mt-4 flex justify-center items-center gap-2 shadow-lg shadow-slate-900/20">
                                {updating ? 'جاري التحديث...' : <><Save size={18} /> حفظ التعديلات</>}
                            </button>
                        </form>
                    </Card>
                </div>
            )}

            {/* Inventory Table */}
            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="px-8 py-6">إسم الصنف</th>
                            <th className="px-6 py-6">التصنيف</th>
                            <th className="px-6 py-6 text-center">الرصيد الحالي</th>
                            <th className="px-6 py-6 text-center">السعر</th>
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
                                <td className="px-6 py-6 text-center">
                                    <span className="font-bold text-emerald-600">{item.price || 0}</span>
                                    <span className="text-[10px] text-slate-400 mr-1">EGP</span>
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
                                        <button onClick={() => handleEditClick(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.id, item.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100">
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
