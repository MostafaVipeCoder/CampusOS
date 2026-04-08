import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, TrendingUp, AlertTriangle, ArrowDown, ArrowUp, RefreshCcw, Coffee, Cookie, Sparkles, Printer, Trash2, Plus, X, Edit, Save, Image as ImageIcon, Check } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Input, Modal } from '../components/ui';
import { supabase } from '../lib/supabase';

export const InventoryPanel = ({ branchId }: { branchId?: string }) => {
    const [activeCategory, setActiveCategory] = useState<'all' | 'drinks' | 'snacks' | 'office'>('all');
    const [stockItems, setStockItems] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'مشروبات',
        stock: 0,
        min_stock: 12,
        unit: 'كرتونة',
        price: 0, // This will store COST per piece
        pieces_per_unit: 1,
        selling_price: 0,
        image_url: ''
    });
    const [adding, setAdding] = useState(false);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // New states for "typing-friendly" numeric inputs
    const [boxCostStr, setBoxCostStr] = useState('');
    const [sellPriceStr, setSellPriceStr] = useState('');
    const [cartonQuantityStr, setCartonQuantityStr] = useState('0');
    const [editCartonQuantityStr, setEditCartonQuantityStr] = useState('0');
    
    // Inventory Audit / Reconciliation States
    const [isReconMode, setIsReconMode] = useState(false);
    const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
    const [isReconSubmitting, setIsReconSubmitting] = useState(false);
    
    // Financial Summary States
    const [itemSummary, setItemSummary] = useState<{
        totalRevenue: number,
        totalLossesQty: number,
        totalLossesVal: number,
        netProfit: number,
        lastAuditDate: string | null,
        daysInStock: number,
        avgSalesPerDay: number,
        entryDate: string | null,
        history: any[]
    } | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
    const [globalSummary, setGlobalSummary] = useState<{
        totalSalesRev: number,
        totalSalesQty: number,
        totalLossVal: number,
        totalLossQty: number
    }>({ totalSalesRev: 0, totalSalesQty: 0, totalLossVal: 0, totalLossQty: 0 });

    useEffect(() => {
        fetchInventory();
        fetchLogs();
    }, [branchId]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            let query = supabase.from('inventory').select('*, catering_items(is_active)');
            if (branchId) query = query.eq('branch_id', branchId);
            
            const { data: invData, error: invError } = await query;
            if (invError) throw invError;
            
            // Fetch total sold units from workspace_sessions orders JSONB
            const { data: sessionData, error: sessionError } = await supabase
                .from('workspace_sessions')
                .select('orders');
            
            const soldCounts: Record<string, number> = {};
            if (!sessionError && sessionData) {
                sessionData.forEach(session => {
                    const orders = session.orders;
                    if (Array.isArray(orders)) {
                        orders.forEach((order: any) => {
                            // In JSONB, IDs might be stored under 'id' or 'product_id'
                            const pid = order.id || order.product_id;
                            if (pid) {
                                soldCounts[pid] = (soldCounts[pid] || 0) + (Number(order.quantity) || 0);
                            }
                        });
                    }
                });
            }
            
            const mappedData = (invData || []).map(item => ({
                ...item,
                total_sold: soldCounts[item.id] || 0,
                selling_price: item.selling_price
            }));

            setStockItems(mappedData);

            // Fetch Branch-wide loss logs
            let lossQuery = supabase.from('inventory_logs').select('*').eq('type', 'loss');
            if (branchId) lossQuery = lossQuery.eq('branch_id', branchId);
            const { data: globalLossLogs } = await lossQuery;
            
            const totalLossQty = (globalLossLogs || []).reduce((sum, log) => sum + Math.abs(log.quantity), 0);
            const totalLossVal = (globalLossLogs || []).reduce((sum, log) => {
                const item = mappedData.find(i => i.id === log.inventory_id);
                return sum + (Math.abs(log.quantity) * (log.cost_per_piece || item?.price || 0));
            }, 0);

            const totalSalesQty = Object.values(soldCounts).reduce((a, b) => a + b, 0);
            const totalSalesRev = mappedData.reduce((sum, item) => sum + (item.total_sold * (item.selling_price || 0)), 0);

            setGlobalSummary({
                totalSalesRev,
                totalSalesQty,
                totalLossVal,
                totalLossQty
            });

        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            let query = supabase
                .from('inventory_logs')
                .select(`
                    *,
                    inventory:inventory_id(name)
                `)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (branchId) query = query.eq('branch_id', branchId);
            
            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if file is image
        if (!file.type.startsWith('image/')) {
            alert('يرجى اختيار ملف صور صالح');
            return;
        }

        try {
            // Use a temporary uploading state if possible, but for now we'll use loading
            setLoading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `inventory/${branchId || 'default'}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('inventory-images')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('inventory-images')
                .getPublicUrl(filePath);

            if (isEdit && editingItem) {
                setEditingItem({ ...editingItem, image_url: publicUrl });
            } else {
                setNewItem({ ...newItem, image_url: publicUrl });
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('حدث خطأ أثناء رفع الصورة');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = stockItems.filter(item => {
        const matchesCategory = activeCategory === 'all' || 
                                (activeCategory === 'drinks' && (item.category === 'مشروبات' || item.category === 'beverages')) ||
                                (activeCategory === 'snacks' && (item.category === 'سناكس' || item.category === 'snacks')) ||
                                (activeCategory === 'office' && item.category === 'أدوات مكتبية');
        
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesCategory && matchesSearch;
    });

    const lowStockCount = stockItems.filter(item => item.stock <= (item.min_stock || 0)).length;

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            // Rule 7: Automatically create corresponding expense record if initial stock > 0
            const cartonCost = newItem.price * (newItem.pieces_per_unit || 1);
            const totalCost = cartonCost * (newItem.stock / (newItem.pieces_per_unit || 1));

            const { data: newInv, error } = await supabase.from('inventory').insert([{
                name: newItem.name,
                category: newItem.category,
                stock: newItem.stock,
                min_stock: newItem.min_stock,
                unit: newItem.unit,
                price: Number(newItem.price) || 0, // COST per piece
                pieces_per_unit: Number(newItem.pieces_per_unit) || 1,
                selling_price: Number(newItem.selling_price) || 0,
                image_url: newItem.image_url || null,
                branch_id: branchId || null,
                last_restock: new Date().toISOString()
            }]).select().single();
            
            if (error) throw error;
            
            if (newInv) {
                // Rule 7: Auto-Expense
                if (totalCost > 0) {
                    await supabase.from('expenses').insert([{
                        category: (newItem.category === 'مشروبات' || newItem.category === 'سناكس') ? 'مطبخ وبوفيه' : 'أخرى',
                        amount: totalCost,
                        date: new Date().toISOString(),
                        note: `رصيد افتتاح لـ ${newItem.name.trim()} (${newItem.stock / newItem.pieces_per_unit} كرتونة)`,
                        payment_method: 'نقدًا (كاش)',
                        branch_id: branchId || null
                    }]);
                }

                // Rule 3: Selling Price (Independent) - Manual Sync
                const { error: caterError } = await supabase.from('catering_items').insert([{
                    inventory_id: newInv.id,
                    name: newItem.name,
                    price: Number(newItem.selling_price) || (Number(newItem.price) * 1.5),
                    branch_id: newInv.branch_id || branchId || null,
                    is_active: true,
                    category: newItem.category === 'مشروبات' ? 'beverages' : (newItem.category === 'سناكس' ? 'snacks' : 'office') // Sync category correctly
                }]);

                if (caterError) {
                    console.error('Catering sync error (Add):', caterError);
                }
            }
            
            setIsAddModalOpen(false);
            setNewItem({ name: '', category: 'مشروبات', stock: 0, min_stock: 12, unit: 'كرتونة', price: 0, pieces_per_unit: 1, selling_price: 0 });
            setBoxCostStr('');
            setSellPriceStr('');
            setCartonQuantityStr('0');
            fetchInventory();
            alert('تم إضافة الصنف وإعداد إحصائيات الأرباح بنجاح');
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

    const handleFinalizeReconciliation = async () => {
        const changedIds = Object.keys(physicalCounts);
        if (changedIds.length === 0) {
            setIsReconMode(false);
            return;
        }

        if (!window.confirm(`هل أنت متأكد من تحديث ${changedIds.length} صنف بناءً على الجرد الفعلي؟ سيتم تعديل المخزن وتسجيل الفرق.`)) return;

        setIsReconSubmitting(true);
        try {
            for (const id of changedIds) {
                const item = stockItems.find(i => i.id === id);
                if (!item) continue;

                const actual = physicalCounts[id];
                const diff = actual - item.stock;

                if (diff === 0) continue;

                // Update official stock
                const { error: invError } = await supabase
                    .from('inventory')
                    .update({ stock: actual })
                    .eq('id', id);

                if (invError) throw invError;

                // Log discrepancy with details (From X to Y)
                const { error: logError } = await supabase.from('inventory_logs').insert([{
                    inventory_id: id,
                    branch_id: branchId || null,
                    quantity: diff,
                    type: diff < 0 ? 'loss' : 'restock',
                    notes: `جرد فعلي: تعديل من ${item.stock} إلى ${actual} (الفرق: ${diff > 0 ? '+' : ''}${diff} قطعة)`,
                    cost_per_piece: item.price || 0
                }]);

                if (logError) throw logError;
            }

            setPhysicalCounts({});
            setIsReconMode(false);
            await fetchInventory();
            await fetchLogs();
            alert('تم اعتماد الجرد وتحديث المخزن بنجاح. يمكنك الآن رؤية تفاصيل العجز والخسائر في "سجل الرقابة" أسفل الصفحة.');
        } catch (err: any) {
            console.error(err);
            alert('خطأ أثناء تحديث الجرد: ' + err.message);
        } finally {
            setIsReconSubmitting(false);
        }
    };

    const handleEditClick = async (item: any) => {
        const itemCopy = { 
            ...item, 
            selling_price: item.selling_price || item.catering_items?.[0]?.price || 0,
            is_active: Array.isArray(item.catering_items) && item.catering_items.length > 0 ? item.catering_items[0].is_active : true
        };
        setEditingItem(itemCopy);
        setBoxCostStr((Number(itemCopy.price) * (itemCopy.pieces_per_unit || 1)).toString());
        setSellPriceStr((itemCopy.selling_price || 0).toString());
        setEditCartonQuantityStr((itemCopy.stock / (itemCopy.pieces_per_unit || 1)).toString());
        setIsEditModalOpen(true);
        fetchProductSummary(item.id, itemCopy);
    };

    const fetchProductSummary = async (itemId: string, itemData: any) => {
        try {
            // 1. Fetch all audit logs (loss and restock) for history timeline
            const { data: allLogs } = await supabase
                .from('inventory_logs')
                .select('*')
                .eq('inventory_id', itemId)
                .order('created_at', { ascending: false });
            
            const lossLogs = (allLogs || []).filter(log => log.type === 'loss');
            const totalLossQty = lossLogs.reduce((sum, log) => sum + Math.abs(log.quantity), 0);
            const totalLossVal = lossLogs.reduce((sum, log) => sum + (Math.abs(log.quantity) * (log.cost_per_piece || itemData.price || 0)), 0);
            
            const entryDateStr = itemData.last_restock || itemData.created_at;
            const entryDate = new Date(entryDateStr);
            const today = new Date();
            const timeDiff = today.getTime() - entryDate.getTime();
            const daysInStock = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
            
            const avgSalesPerDay = (itemData.total_sold || 0) / daysInStock;

            const totalRevenue = (itemData.total_sold || 0) * (itemData.selling_price || 0);
            const totalCost = (itemData.total_sold || 0) * (itemData.price || 0);
            const operationalProfit = totalRevenue - totalCost;

            setItemSummary({
                totalRevenue,
                totalLossesQty: totalLossQty,
                totalLossesVal: totalLossVal,
                netProfit: operationalProfit - totalLossVal,
                lastAuditDate: (allLogs || []).find(l => l.type === 'loss' || l.type === 'restock')?.created_at || null,
                daysInStock,
                avgSalesPerDay,
                entryDate: entryDateStr,
                history: (allLogs || []).filter(l => ['loss', 'restock', 'correction'].includes(l.type)).slice(0, 5)
            });
        } catch (err) {
            console.error('Error fetching item summary:', err);
        }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        
        const targetId = editingItem.id;
        const sellingPriceVal = Number(editingItem.selling_price) || 0;
        
        console.log("--- [UPDATE TRACE START] ---");
        console.log("Updating ID:", targetId);
        console.log("Proposed Price:", sellingPriceVal);

        try {
            const inventoryData = {
                name: editingItem.name,
                stock: Number(editingItem.stock),
                unit: editingItem.unit,
                min_stock: Number(editingItem.min_stock),
                category: editingItem.category,
                price: Number(editingItem.price),
                pieces_per_unit: Number(editingItem.pieces_per_unit) || 1,
                selling_price: sellingPriceVal,
                image_url: editingItem.image_url || null,
                last_restock: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('inventory')
                .update(inventoryData)
                .eq('id', targetId)
                .select();
            
            if (error) throw error;

            console.log("Updated DB row:", data?.[0]);

            // Sync with catering_items for compatibility
            const caterPayload = {
                name: editingItem.name,
                price: sellingPriceVal,
                category: editingItem.category === 'مشروبات' ? 'beverages' : (editingItem.category === 'سناكس' ? 'snacks' : 'office'),
                is_active: editingItem.is_active !== undefined ? editingItem.is_active : true
            };
            
            const { data: existCater } = await supabase.from('catering_items').select('id').eq('inventory_id', targetId).maybeSingle();
            if (existCater) {
                await supabase.from('catering_items').update(caterPayload).eq('id', existCater.id);
            } else {
                await supabase.from('catering_items').insert({
                    ...caterPayload,
                    inventory_id: targetId,
                    branch_id: branchId || null
                });
            }

            await fetchInventory();
            await fetchLogs();
            console.log("--- [UPDATE TRACE REFRESH COMPLETE] ---");
            setIsEditModalOpen(false);
            setEditingItem(null);
            setEditCartonQuantityStr('0');
            alert('تم حفظ البيانات والمزامنة مع إحصائيات الأرباح بنجاح');
        } catch (error: any) {
            console.error('Error updating item:', error);
            alert('خطأ أثناء التحديث: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Cairo'] text-right">
            {/* Global Financial Summary Section */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 w-[500px] h-[500px] bg-slate-50/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">إحصائيات الأداء المالي والفاقد</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Full Financial Branch Performance & Auditing Summary</p>
                    </div>
                    <div className="flex flex-wrap gap-4 md:gap-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <div className="text-center md:text-right md:border-l md:border-slate-200 md:pl-8">
                            <p className="text-[9px] font-black text-emerald-500 uppercase mb-2">إجمالي الإيرادات (المبيعات)</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 font-mono">{globalSummary.totalSalesRev.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                            </div>
                            <p className="text-[8px] text-slate-400 mt-1 font-bold">من {globalSummary.totalSalesQty} معاملة بيع</p>
                        </div>
                        <div className="text-center md:text-right md:border-l md:border-slate-200 md:pl-8">
                            <p className="text-[9px] font-black text-rose-500 uppercase mb-2">إجمالي العجز (الخسائر)</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-rose-600 font-mono">-{globalSummary.totalLossVal.toLocaleString()}</span>
                                <span className="text-[10px] text-rose-300 font-bold">EGP</span>
                            </div>
                            <p className="text-[8px] text-slate-400 mt-1 font-bold">نقص {globalSummary.totalLossQty} قطعة في الجرد</p>
                        </div>
                        <div className="text-center md:text-right">
                            <p className="text-[9px] font-black text-indigo-500 uppercase mb-2">صافي الربح التشغيلي</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-3xl font-black font-mono ${(globalSummary.totalSalesRev - globalSummary.totalLossVal) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {(globalSummary.totalSalesRev - globalSummary.totalLossVal).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                            </div>
                            <p className="text-[8px] text-slate-400 mt-1 font-bold">محسوب بعد خصم الفاقد</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-slate-100 transition-colors"></div>
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <ArrowDown size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي تكلفة المخزون</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl font-black text-slate-900">
                                    {stockItems.reduce((acc, item) => acc + (Number(item.stock) * (Number(item.price) || 0)), 0).toLocaleString()}
                                </p>
                                <span className="text-[10px] font-bold text-slate-400">EGP</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-rose-100 transition-colors"></div>
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
                            <ArrowUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">إيرادات البيع المتوقعة</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl font-black text-rose-600">
                                    {stockItems.reduce((acc, item) => acc + (Number(item.stock) * (Number(item.selling_price) || 0)), 0).toLocaleString()}
                                </p>
                                <span className="text-[10px] font-bold text-rose-300">EGP</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">صافي الربح المتوقع</p>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black">
                                    {(() => {
                                        const rev = stockItems.reduce((acc, item) => acc + (Number(item.stock) * (Number(item.selling_price) || 0)), 0);
                                        const cost = stockItems.reduce((acc, item) => acc + (Number(item.stock) * (Number(item.price) || 0)), 0);
                                        const profit = rev - cost;
                                        return rev > 0 ? ((profit / rev) * 100).toFixed(1) : 0;
                                    })()}% هامش
                                </Badge>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-black text-emerald-400 font-mono">
                                    {(
                                        stockItems.reduce((acc, item) => acc + (Number(item.stock) * (Number(item.selling_price) || 0)), 0) -
                                        stockItems.reduce((acc, item) => acc + (Number(item.stock) * (Number(item.price) || 0)), 0)
                                    ).toLocaleString()}
                                </p>
                                <span className="text-[10px] font-bold opacity-40">EGP</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
                    <div className="relative z-10 flex flex-col gap-3 text-right">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الأكثر مبيعاً</p>
                            {stockItems.length > 0 ? (
                                (() => {
                                    const bestSeller = [...stockItems].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))[0];
                                    return (
                                        <>
                                            <p className="text-sm font-black text-slate-900 truncate">{bestSeller.name}</p>
                                            <p className="text-[14px] font-bold text-indigo-500">{bestSeller.total_sold || 0} قطعة مباعة</p>
                                        </>
                                    );
                                })()
                            ) : (
                                <p className="text-sm font-black text-slate-300">لا توجد مبيعات</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-wrap justify-between items-center gap-6">
                <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeCategory === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Sparkles size={14} /> الكل
                    </button>
                    <button
                        onClick={() => setActiveCategory('drinks')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeCategory === 'drinks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Coffee size={14} /> المشروبات
                    </button>
                    <button
                        onClick={() => setActiveCategory('snacks')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeCategory === 'snacks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Cookie size={14} /> السناكس
                    </button>
                    <button
                        onClick={() => setActiveCategory('office')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeCategory === 'office' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Package size={14} /> الأدوات المكتبية
                    </button>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="البحث في المخزن..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-10 pl-6 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsReconMode(!isReconMode)}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-lg ${isReconMode ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-white border-2 border-slate-100 text-slate-700 hover:border-indigo-500'}`}
                    >
                        {isReconMode ? <X size={18} /> : <TrendingUp size={18} />}
                        {isReconMode ? 'إلغاء الجرد' : 'بدء جرد فعلي (تدريد)'}
                    </button>
                    {!isReconMode && (
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-slate-900 border-t-2 border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">
                            <Plus size={18} /> اضافة صنف جديد
                        </button>
                    )}
                    {isReconMode && (
                        <button 
                            onClick={handleFinalizeReconciliation}
                            disabled={isReconSubmitting || Object.keys(physicalCounts).length === 0}
                            className="flex items-center gap-2 bg-emerald-600 border-t-2 border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95 disabled:opacity-50"
                        >
                            {isReconSubmitting ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
                            اعتماد الجرد ({Object.keys(physicalCounts).length} تعديل)
                        </button>
                    )}
                </div>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
                {newItem && (
                <Card className="w-full bg-white rounded-[3rem] border-none shadow-none p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">إضافة صنف جديد</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-slate-600 mb-2">اسم الصنف</label>
                                    <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3" />
                                </div>
                                <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative group cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                        onChange={(e) => handleImageUpload(e, false)}
                                    />
                                    {newItem.image_url ? (
                                        <img src={newItem.image_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            {loading ? <RefreshCcw size={20} className="text-indigo-400 mx-auto animate-spin" /> : <ImageIcon size={20} className="text-slate-300 mx-auto" />}
                                            <p className="text-[8px] text-slate-400 mt-1 font-black">صورة</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                                        <Plus size={16} className="text-white" />
                                    </div>
                                </div>
                             </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">التصنيف</label>
                                    <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3">
                                        <option value="مشروبات">مشروبات</option>
                                        <option value="سناكس">سناكس</option>
                                        <option value="أدوات مكتبية">أدوات مكتبية</option>
                                        <option value="أخرى">أخرى</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-rose-400 mb-2 text-right italic">سعر البيع المعتمد (للقطعة)</label>
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        value={newItem.selling_price} 
                                        onChange={e => setNewItem({ ...newItem, selling_price: Number(e.target.value) })} 
                                        className="w-full border-2 border-rose-100 rounded-xl px-2 py-3 text-center text-sm font-black bg-rose-50/20 text-rose-600 outline-none focus:border-rose-500 transition-all font-mono" 
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2.5rem] space-y-4 border border-slate-100 shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-200 pb-2">بيانات التكلفة والكمية</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 text-right text-indigo-500 font-['Cairo']">سعر الكرتونة (شامل)</label>
                                        <input 
                                            required
                                            type="text"
                                            inputMode="decimal"
                                            value={boxCostStr} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = val.split('.');
                                                const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                setBoxCostStr(cleanVal);
                                                const boxCost = parseFloat(cleanVal) || 0;
                                                setNewItem({ ...newItem, price: boxCost / (newItem.pieces_per_unit || 1) });
                                            }} 
                                            className="w-full border-2 border-indigo-200 bg-white rounded-xl px-4 py-3 text-center font-black text-indigo-700 shadow-sm outline-none focus:border-indigo-500 transition-all font-mono" 
                                        />
                                        <div className="absolute -top-2 right-4 bg-indigo-500 text-white text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">المصدر المالي</div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 text-right text-rose-500 font-['Cairo']">سعر البيع (لليوزر)</label>
                                        <input 
                                            required
                                            type="text"
                                            inputMode="decimal"
                                            value={sellPriceStr} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = val.split('.');
                                                const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                setSellPriceStr(cleanVal);
                                                setNewItem({ ...newItem, selling_price: parseFloat(cleanVal) || 0 });
                                            }} 
                                            className="w-full border-2 border-rose-200 bg-white rounded-xl px-4 py-3 text-center font-black text-rose-700 shadow-sm outline-none focus:border-rose-500 transition-all font-mono" 
                                        />
                                        <div className="absolute -top-2 right-4 bg-rose-500 text-white text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">السعر الظاهر</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 text-right font-['Cairo']">التكلفة / قطعة (محسوبة)</label>
                                        <div className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl px-4 py-3 text-center font-bold text-slate-400 font-mono text-sm">
                                            {newItem.price.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 mb-1 text-center font-['Cairo']">قطع / {newItem.unit}</label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1" 
                                            value={newItem.pieces_per_unit} 
                                            onChange={e => {
                                                const ppu = Number(e.target.value);
                                                const currentCartons = newItem.stock / (newItem.pieces_per_unit || 1);
                                                setNewItem({ ...newItem, pieces_per_unit: ppu, stock: currentCartons * ppu });
                                            }} 
                                            className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-2 text-center text-xs font-black outline-none focus:border-indigo-500 transition-all font-mono" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 mb-1 text-center font-['Cairo']">عدد الكراتين</label>
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            value={cartonQuantityStr} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = val.split('.');
                                                const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                setCartonQuantityStr(cleanVal);
                                                const cartons = parseFloat(cleanVal) || 0;
                                                setNewItem({ ...newItem, stock: cartons * (newItem.pieces_per_unit || 1) });
                                            }} 
                                            className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-2 text-center text-xs font-black outline-none focus:border-indigo-500 transition-all font-mono" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 mb-1 text-center font-['Cairo']">الحد الأدنى</label>
                                        <input required type="number" value={newItem.min_stock} onChange={e => setNewItem({ ...newItem, min_stock: Number(e.target.value) })} className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-2 text-center text-xs font-black outline-none focus:border-indigo-500 transition-all font-mono" />
                                    </div>
                                </div>
                            </div>

                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2">رابط صورة المنتج (اختياري)</label>
                                <div className="relative">
                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="https://example.com/photo.png" 
                                        value={newItem.image_url || ''} 
                                        onChange={e => setNewItem({ ...newItem, image_url: e.target.value })} 
                                        className="w-full border-2 border-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs font-mono" 
                                    />
                                </div>
                             </div>

                            <div className="bg-emerald-600 text-white rounded-[2rem] p-5 shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl transition-transform group-hover:scale-150 duration-700"></div>
                                <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
                                    <div className="border-l border-white/10">
                                        <p className="text-[7px] font-black uppercase opacity-70 mb-1">صافي الربح/قطعة</p>
                                        <p className="text-sm font-black">+ {(newItem.selling_price - newItem.price).toFixed(2)}</p>
                                    </div>
                                    <div className="border-l border-white/10">
                                        <p className="text-[7px] font-black uppercase opacity-70 mb-1">الربح في {newItem.unit}</p>
                                        <p className="text-sm font-black">+ {((newItem.selling_price - newItem.price) * (newItem.pieces_per_unit || 1)).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[7px] font-black uppercase opacity-70 mb-1 font-['Cairo']">هامش الربح</p>
                                        <p className="text-sm font-black">
                                            {newItem.selling_price > 0 ? (((newItem.selling_price - newItem.price) / newItem.selling_price) * 100).toFixed(1) : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={adding} className="w-full bg-slate-900 border-t-2 border-white/10 text-white rounded-2xl py-4 font-black text-sm disabled:opacity-50 mt-4 shadow-2xl transition-all hover:bg-black active:scale-[0.98] font-['Cairo']">
                                {adding ? 'جاري المزامنة...' : 'تأكيد وحفظ في المخزن والمصروفات'}
                            </button>
                        </form>
                    </Card>
                )}
                </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                {editingItem && (
                <Card className="w-full bg-white rounded-[3rem] border-none shadow-none p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">إحصائيات وإدارة الصنف</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">منتج مرتبط بالمشتريات والمصروفات</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <div className="bg-slate-900 rounded-[1.75rem] p-5 text-white shadow-lg">
                                <p className="text-[10px] opacity-80 font-bold mb-1 text-slate-400">قيمة رأس المال (التكلفة)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black">{(editingItem.stock * (editingItem.price || 0)).toFixed(1)}</span>
                                    <span className="text-[10px] opacity-70">EGP</span>
                                </div>
                                <p className="text-[8px] text-slate-500 mt-2">السعر المدفوع فعلياً للبضاعة</p>
                            </div>

                            <div className="bg-indigo-600 rounded-[1.75rem] p-5 text-white shadow-lg shadow-indigo-500/20">
                                <p className="text-[10px] opacity-80 font-bold mb-1">القيمة السوقية (البيع)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black">{(editingItem.stock * (editingItem.selling_price || 0)).toFixed(1)}</span>
                                    <span className="text-[10px] opacity-70">EGP</span>
                                </div>
                                <p className="text-[8px] text-indigo-300 mt-2">إجمالي الدخل المتوقع عند البيع</p>
                            </div>
                        </div>

                        {itemSummary && (
                            <>
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 mb-4 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="text-right">
                                        <h3 className="text-lg font-black text-slate-900">تحليل الأداء المالي والفاقد</h3>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Financial Performance Summary</p>
                                    </div>
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                        <TrendingUp size={18} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase mb-1 text-center">الإيرادات</p>
                                        <p className="text-lg font-black text-indigo-600 text-center">{itemSummary.totalRevenue.toLocaleString()} <span className="text-[9px]">EGP</span></p>
                                        <p className="text-[7px] text-slate-500 font-bold mt-1 tracking-tighter text-center">من {editingItem.total_sold} مبيعات</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[8px] text-rose-500 font-black uppercase mb-1 text-center">إجمالي العجز</p>
                                        <p className="text-lg font-black text-rose-600 text-center">{itemSummary.totalLossesVal.toLocaleString()} <span className="text-[9px]">EGP</span></p>
                                        <p className="text-[7px] text-rose-400 font-bold mt-1 tracking-tighter text-center">نقص {itemSummary.totalLossesQty} قطعة</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl border shadow-sm text-center ${itemSummary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                        <p className={`text-[8px] font-black uppercase mb-1 ${itemSummary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>صافي الأرباح</p>
                                        <p className={`text-lg font-black ${itemSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{itemSummary.netProfit.toLocaleString()} <span className="text-[9px]">EGP</span></p>
                                        <p className="text-[7px] text-slate-500 font-bold mt-1 tracking-tighter text-center">بعد خصم الفاقد</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-white/60 p-4 rounded-2xl border border-slate-100">
                                    <div className="border-l border-slate-100 pl-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[9px] font-black text-slate-400">مدة التواجد</p>
                                            <Badge className="bg-slate-100 text-slate-500 border-none text-[8px]">{itemSummary.daysInStock} يوم</Badge>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-bold">دخل المخزن بتاريخ: {new Date(itemSummary.entryDate || '').toLocaleDateString('ar-EG')}</p>
                                    </div>
                                    <div className="pr-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[9px] font-black text-indigo-500">معدل البيع اليومي</p>
                                            <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px]">{itemSummary.avgSalesPerDay.toFixed(1)} قطعة/يوم</Badge>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-bold">معدل استهلاك من إجمالي المخزون</p>
                                    </div>
                                </div>
                            </div>
                            
                            {itemSummary.history.length > 0 && (
                                <div className="mb-8 px-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pr-2">آخر عمليات الجرد والتعديل</p>
                                    <div className="space-y-2">
                                        {itemSummary.history.map((log, lidx) => (
                                            <div key={lidx} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'loss' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                    <span className="text-[10px] text-slate-600 font-bold">{log.notes}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleDateString('ar-EG')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                        
                        <div className="bg-slate-50 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4 border border-slate-100 italic">
                             <div className="border-l border-slate-200 pr-2">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تاريخ آخر تزويد</p>
                                 <p className="text-sm font-black text-slate-700">{editingItem.last_restock ? new Date(editingItem.last_restock).toLocaleDateString('ar-EG') : 'لا يوجد'}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">مكسب {editingItem.unit || 'الكرتونة'}</p>
                                 <p className="text-lg font-black text-emerald-600">
                                     +{((editingItem.selling_price || 0) * (editingItem.pieces_per_unit || 1) - ((editingItem.price || 0) * (editingItem.pieces_per_unit || 1))).toFixed(2)} EGP
                                 </p>
                                 <p className="text-[8px] text-slate-400 font-bold">بناءً على تكلفة كرتونة = {(editingItem.price * (editingItem.pieces_per_unit || 1)).toFixed(2)}</p>
                             </div>
                        </div>

                        <form onSubmit={handleUpdateItem} className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">اسم الصنف المعروض</label>
                                        <input required type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-bold focus:border-indigo-500 outline-none transition-all" />
                                    </div>
                                    <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative group cursor-pointer shrink-0">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                            onChange={(e) => handleImageUpload(e, true)}
                                        />
                                        {editingItem.image_url ? (
                                            <img src={editingItem.image_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                {loading ? <RefreshCcw size={16} className="text-indigo-400 mx-auto animate-spin" /> : <ImageIcon size={16} className="text-slate-300 mx-auto" />}
                                                <p className="text-[8px] text-slate-400 mt-1 font-black">لا توجد صورة</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                                            <Edit size={14} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">التصنيف</label>
                                        <select value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 bg-white font-bold outline-none focus:border-indigo-500">
                                            <option value="مشروبات">مشروبات</option>
                                        <option value="سناكس">سناكس</option>
                                            <option value="أدوات مكتبية">أدوات مكتبية</option>
                                            <option value="أخرى">أخرى</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-rose-500 mb-2 px-1">سعر البيع (للقطعة)</label>
                                        <input 
                                            required 
                                            type="number" 
                                            step="0.01" 
                                            value={editingItem.selling_price} 
                                            onChange={e => setEditingItem({ ...editingItem, selling_price: Number(e.target.value) })} 
                                            className="w-full border-2 border-rose-100 rounded-xl px-4 py-3 text-center font-black text-rose-600 focus:border-rose-500 outline-none bg-rose-50/20 font-mono shadow-sm" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-inner">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-indigo-500 mb-1 text-right">سعر الكرتونة (شامل التكلفة)</label>
                                        <input 
                                            required
                                            type="text"
                                            inputMode="decimal"
                                            value={boxCostStr} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = val.split('.');
                                                const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                setBoxCostStr(cleanVal);
                                                const boxCost = parseFloat(cleanVal) || 0;
                                                setEditingItem({ ...editingItem, price: boxCost / (editingItem.pieces_per_unit || 1) });
                                            }} 
                                            className="w-full border-2 border-indigo-200 bg-white rounded-xl px-4 py-3 text-center font-black text-indigo-700 shadow-sm outline-none focus:border-indigo-500 transition-all font-mono" 
                                        />
                                        <div className="absolute -top-2 right-4 bg-indigo-500 text-white text-[7px] px-2 py-0.5 rounded-full font-black uppercase">التكلفة</div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-rose-500 mb-1 text-right">سعر البيع (لليوزر)</label>
                                        <input 
                                            required
                                            type="text"
                                            inputMode="decimal"
                                            value={sellPriceStr} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = val.split('.');
                                                const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                setSellPriceStr(cleanVal);
                                                setEditingItem({ ...editingItem, selling_price: parseFloat(cleanVal) || 0 });
                                            }} 
                                            className="w-full border-2 border-rose-200 bg-white rounded-xl px-4 py-3 text-center font-black text-rose-700 shadow-sm outline-none focus:border-rose-500 transition-all font-mono" 
                                        />
                                        <div className="absolute -top-2 right-4 bg-rose-500 text-white text-[7px] px-2 py-0.5 rounded-full font-black uppercase">الظاهر للمستخدم</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 text-right">التكلفة / قطعة (محسوبة)</label>
                                        <div className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl px-4 py-1.5 text-center font-bold text-slate-400 font-mono text-xs mt-1.5 opacity-80">
                                            {(editingItem.price || 0).toFixed(2)}
                                        </div>
                                    </div>
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 px-1">حالة المنتج</label>
                                        <button
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, is_active: !editingItem.is_active })}
                                            className={`w-full border-2 rounded-xl px-4 py-1.5 text-center font-bold text-xs mt-1.5 transition-all shadow-sm ${editingItem.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-rose-200 bg-rose-50 text-rose-600'}`}
                                        >
                                            {editingItem.is_active ? 'متاح للبيع' : 'موقوف / منتهي'}
                                        </button>
                                     </div>
                                 <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 px-1">رابط الصورة</label>
                                    <input 
                                        type="text" 
                                        value={editingItem.image_url || ''} 
                                        onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })} 
                                        placeholder="https://..." 
                                        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-[10px] font-mono outline-none focus:border-indigo-500 transition-all bg-white" 
                                    />
                                 </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 mb-1 text-center font-['Cairo']">قطع / {editingItem.unit || 'كرتونة'}</label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1" 
                                            value={editingItem.pieces_per_unit} 
                                            onChange={e => {
                                                const ppu = Number(e.target.value);
                                                const cartons = editingItem.stock / (editingItem.pieces_per_unit || 1);
                                                setEditingItem({ ...editingItem, pieces_per_unit: ppu, stock: cartons * ppu });
                                            }} 
                                            className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-1 text-center text-xs font-black outline-none focus:border-indigo-500 transition-all font-mono" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 mb-1 text-center font-['Cairo']">الكمية (كرتونة)</label>
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            value={editCartonQuantityStr} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = val.split('.');
                                                const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                setEditCartonQuantityStr(cleanVal);
                                                const cartons = parseFloat(cleanVal) || 0;
                                                setEditingItem({ ...editingItem, stock: cartons * (editingItem.pieces_per_unit || 1) });
                                            }} 
                                            className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-1 text-center text-xs font-black outline-none focus:border-indigo-500 transition-all font-mono" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 mb-1 text-center font-['Cairo']">الحد الأدنى</label>
                                        <input required type="number" value={editingItem.min_stock} onChange={e => setEditingItem({ ...editingItem, min_stock: Number(e.target.value) })} className="w-full border-b-2 border-slate-200 bg-transparent px-1 py-1 text-center text-xs font-black outline-none focus:border-indigo-500 transition-all font-mono" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900 border-t border-white/10 text-white rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16 blur-2xl transition-transform group-hover:scale-150 duration-1000"></div>
                                <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
                                    <div className="border-l border-white/5">
                                        <p className="text-[7px] font-black uppercase text-slate-500 mb-1 px-1">صافي الربح/قطعة</p>
                                        <p className="text-sm font-black text-emerald-400">+ {(editingItem.selling_price - (editingItem.price || 0)).toFixed(2)}</p>
                                    </div>
                                    <div className="border-l border-white/5">
                                        <p className="text-[7px] font-black uppercase text-slate-500 mb-1 px-1">الربح في {editingItem.unit || 'بالتة'}</p>
                                        <p className="text-sm font-black text-emerald-400">+ {((editingItem.selling_price - (editingItem.price || 0)) * (editingItem.pieces_per_unit || 1)).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[7px] font-black uppercase text-slate-400 mb-1">هامش الربح</p>
                                        <p className="text-sm font-black text-indigo-400">
                                            {editingItem.selling_price > 0 ? (((editingItem.selling_price - (editingItem.price || 0)) / editingItem.selling_price) * 100).toFixed(1) : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={updating} className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black text-md disabled:opacity-50 mt-4 flex justify-center items-center gap-2 shadow-xl shadow-indigo-500/30 transition-all hover:bg-indigo-700 active:scale-95 font-['Cairo']">
                                {updating ? 'جاري تحديث البيانات والمزامنة...' : <><Save size={18} /> حفظ التعديلات وإحصائيات الأرباح</>}
                            </button>
                        </form>
                    </Card>
                )}
            </Modal>

            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">
                            <th className="px-8 py-6 text-right">إسم الصنف</th>
                            {!isReconMode && <th className="px-6 py-6 text-center">إجمالي المبيعات</th>}
                            <th className="px-6 py-6 text-center">رصيد السيستم</th>
                            {isReconMode && <th className="px-6 py-6 text-center text-indigo-600 font-black">الجرد الفعلي</th>}
                            {isReconMode && <th className="px-6 py-6 text-center text-rose-600 font-black">العجز / الخسائر</th>}
                            {!isReconMode && <th className="px-6 py-6 text-center text-rose-600 font-black">سعر البيع</th>}
                            {!isReconMode && <th className="px-6 py-6 text-center">تحليل الربح</th>}
                            <th className="px-6 py-6">حالة المخزون</th>
                            <th className="px-8 py-6 text-left">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="py-40 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <RefreshCcw className="animate-spin text-indigo-500" size={40} />
                                        <p className="text-slate-400 font-black animate-pulse font-['Cairo']">جاري تحميل البيانات وتحليل المخزون...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredItems.length > 0 ? (
                            filteredItems.map((item, idx) => (
                                <tr 
                                    key={item.id} 
                                    className="group hover:bg-slate-50 border-b border-slate-50 transition-all font-['Cairo']"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            {(item.stock <= (item.min_stock || 0)) && !isReconMode && (
                                                <div className="absolute right-0 w-1 bg-rose-500 h-12 rounded-full"></div>
                                            )}
                                            <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm ${
                                                (item.category === 'مشروبات' || item.category === 'beverages') ? 'bg-blue-50 text-blue-600' : 
                                                (item.category === 'سناكس' || item.category === 'snacks') ? 'bg-amber-50 text-amber-600' : 
                                                'bg-rose-50 text-rose-600'
                                            }`}>
                                                {item.image_url && item.image_url.trim() !== '' ? (
                                                    <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    (item.category === 'مشروبات' || item.category === 'beverages') ? <Coffee size={20} /> : 
                                                    (item.category === 'سناكس' || item.category === 'snacks') ? <Cookie size={20} /> : 
                                                    <Package size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-slate-800 font-black text-sm">{item.name}</p>
                                                <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black mt-1 uppercase">
                                                    {item.category || 'عام'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            {!isReconMode ? (
                                                <div className="flex flex-col items-center bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100 shadow-sm transition-transform hover:scale-105" title="إجمالي مبيعات الصنف منذ البداية">
                                                    <span className="text-2xl font-black text-indigo-600 font-mono">
                                                        {item.total_sold || 0}
                                                    </span>
                                                    <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-0.5">قطعة مباعة</span>
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 flex flex-col gap-1 min-w-[120px]">
                                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">صافي المبيعات</p>
                                                    <p className="text-sm font-black text-emerald-700 font-mono">-{item.total_sold || 0}</p>
                                                    <p className="text-[8px] text-emerald-400 font-bold">تم خروجها من المخزن</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-6 text-center">
                                        <div className="flex flex-col items-center font-mono">
                                            {isReconMode ? (
                                                <div className="bg-slate-900 text-white p-3 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-1 min-w-[140px] relative overflow-hidden">
                                                    <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12 blur-xl"></div>
                                                    <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase relative z-10">
                                                        <span>الوارد (تاريخياً):</span>
                                                        <span className="text-white">{(item.stock + (item.total_sold || 0))}</span>
                                                    </div>
                                                    <div className="border-t border-white/5 mt-1 pt-1 flex justify-between items-center relative z-10">
                                                        <span className="text-[9px] font-black text-indigo-300">المفروض متبقي:</span>
                                                        <span className="text-lg font-black text-white">{item.stock}</span>
                                                    </div>
                                                    <p className="text-[7px] text-slate-500 font-bold mt-1 uppercase text-center">(الوارد - المباع)</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`text-2xl font-black ${item.stock <= (item.min_stock || 0) ? 'text-rose-600' : 'text-slate-900'}`}>
                                                            {item.stock}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold">قطعة</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[9px] text-slate-400 font-black">
                                                            ({Math.floor(item.stock / (item.pieces_per_unit || 1))} {item.unit || 'كرتونة'})
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {isReconMode && (
                                        <td className="px-6 py-6 text-center">
                                            <div className="relative group/recon">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-focus-within/recon:opacity-20 transition-all duration-500"></div>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    className="relative w-24 h-14 bg-white border-2 border-indigo-100 rounded-2xl text-center font-black text-indigo-600 text-xl outline-none focus:border-indigo-500 transition-all font-mono shadow-sm"
                                                    placeholder={item.stock.toString()}
                                                    value={physicalCounts[item.id] !== undefined ? physicalCounts[item.id] : ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                        setPhysicalCounts(prev => {
                                                            const next = { ...prev };
                                                            if (val === undefined) delete next[item.id];
                                                            else next[item.id] = val;
                                                            return next;
                                                        });
                                                    }}
                                                />
                                                <p className="text-[8px] text-slate-400 font-black mt-2 uppercase">العدد الفعلي الآن</p>
                                            </div>
                                        </td>
                                    )}

                                    {isReconMode && (
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                {physicalCounts[item.id] !== undefined ? (
                                                    (() => {
                                                        const diff = physicalCounts[item.id] - item.stock;
                                                        const isMissing = diff < 0;
                                                        const lossVal = Math.abs(diff) * (Number(item.price) || 0);

                                                        return (
                                                            <div className={`p-3 rounded-2xl border-2 animate-in zoom-in-95 duration-300 ${isMissing ? 'bg-rose-50 border-rose-100 text-rose-600' : diff > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                                                <div className="flex items-center gap-2 mb-1 justify-center">
                                                                    {isMissing ? <AlertTriangle size={14} /> : diff > 0 ? <Plus size={14} /> : <Check size={14} />}
                                                                    <p className="text-xs font-black">{diff === 0 ? 'لا عجز' : `${Math.abs(diff)} قطعة ${isMissing ? 'عجز' : 'زيادة'}`}</p>
                                                                </div>
                                                                {isMissing && (
                                                                    <div className="mt-1 pt-1 border-t border-rose-100 text-center">
                                                                        <p className="text-[10px] font-black font-mono">-{lossVal.toFixed(1)} EGP</p>
                                                                        <p className="text-[7px] uppercase font-bold opacity-60">خسارة مالية</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                                                        <span className="text-slate-200 font-bold text-xs font-mono">?</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}

                                    {!isReconMode && (
                                        <>
                                            <td className="px-6 py-6 text-center text-slate-500 font-black">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-indigo-600 font-mono">{Number(item.selling_price).toLocaleString()}</span>
                                                    <span className="text-[8px] text-slate-400 uppercase">بيع / قطعة</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="bg-emerald-500/10 text-emerald-600 rounded-xl px-4 py-1.5 border border-emerald-100 min-w-[120px]">
                                                        <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">هامش الربح</p>
                                                        <p className="text-sm font-black font-mono">
                                                            +{( (Number(item.selling_price) || 0) - (Number(item.price) || 0) ).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        </>
                                    )}

                                    <td className="px-6 py-6 font-['Cairo']">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${
                                                        item.stock <= (item.min_stock || 0) ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                                        item.stock <= (item.min_stock || 0) * 2 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (item.stock / ((item.min_stock || 1) * 4)) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <p className={`text-[9px] font-black uppercase tracking-tighter ${item.stock <= (item.min_stock || 0) ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                                                {item.stock <= (item.min_stock || 0) ? 'تحذير: وشك النفاذ' : 'المخزون آمن'}
                                            </p>
                                        </div>
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
                            ))
                        ) : (
                            <tr>
                                <td colSpan={10} className="py-20 text-center text-slate-300 font-bold font-['Cairo']">
                                    لا توجد أصناف مسجلة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {isReconMode && Object.keys(physicalCounts).length > 0 && (
                    <div className="bg-slate-900 text-white p-8 border-t border-slate-800 flex justify-between items-center animate-in slide-in-from-bottom-5">
                        <div>
                            <h4 className="text-sm font-black text-rose-400 mb-1">ملخص الجرد الحالي</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Reconciliation Preview</p>
                        </div>
                        <div className="flex gap-12">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">إجمالي العجز (قطع)</p>
                                <p className="text-2xl font-black text-rose-500 font-mono">
                                    {Object.entries(physicalCounts).reduce((sum, [id, val]) => {
                                        const item = stockItems.find(i => i.id === id);
                                        const currentStock = Number(item?.stock || 0);
                                        const physicalVal = Number(val || 0);
                                        const diff = physicalVal - currentStock;
                                        return diff < 0 ? sum + Math.abs(diff) : sum;
                                    }, 0)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">إجمالي الخسارة المالية</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-rose-500 font-mono">
                                        {Object.entries(physicalCounts).reduce((sum, [id, val]) => {
                                            const item = stockItems.find(i => i.id === id);
                                            const currentStock = Number(item?.stock || 0);
                                            const physicalVal = Number(val || 0);
                                            const itemPrice = Number(item?.price || 0);
                                            const diff = physicalVal - currentStock;
                                            return diff < 0 ? sum + (Math.abs(diff) * itemPrice) : sum;
                                        }, 0).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold">EGP</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleFinalizeReconciliation}
                                disabled={isReconSubmitting}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-xl shadow-rose-900/40 active:scale-95"
                            >
                                <Check size={18} /> اعتماد الجرد وتحديث المخزن
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Audit & Loss Intelligence Log */}
            <div className="grid grid-cols-1 gap-8">
                <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center py-6">
                        <CardTitle className="text-sm font-black flex items-center gap-2 text-rose-600">
                            <AlertTriangle size={18} /> سجل الرقابة والجرد (كاشف العجز والخسائر)
                        </CardTitle>
                        <Badge className="bg-rose-100 text-rose-600 border-none text-[10px] font-black uppercase">Audit Intelligence</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {logs.filter(l => ['loss', 'restock', 'correction'].includes(l.type || '') || (l.notes && l.notes.includes('جرد'))).length > 0 ? 
                             logs.filter(l => ['loss', 'restock', 'correction'].includes(l.type || '') || (l.notes && l.notes.includes('جرد'))).slice(0, 10).map(log => {
                                const isProfit = log.quantity > 0;
                                const impactVal = Math.abs(log.quantity) * (log.cost_per_piece || 0);
                                return (
                                    <div key={log.id} className={`p-6 flex justify-between items-center transition-all border-r-4 border-transparent ${isProfit ? 'hover:bg-emerald-50/30 hover:border-emerald-500' : 'hover:bg-rose-50/30 hover:border-rose-500'}`}>
                                        <div className="flex items-center gap-4 text-right">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {isProfit ? <ArrowUp size={20} /> : <TrendingUp size={20} className="rotate-180" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-slate-800">
                                                        {(log.inventory?.name || 'صنف غير معروف')}
                                                    </p>
                                                    <Badge className={`${isProfit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} text-[8px] font-black`}>
                                                        {Math.abs(log.quantity)} قطعة {isProfit ? 'زيادة' : 'عجز'}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold mt-1">
                                                    {log.notes}
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    {new Date(log.created_at).toLocaleString('ar-EG')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-left font-mono">
                                            <p className={`text-sm font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isProfit ? '+' : '-'}{impactVal.toFixed(1)} EGP
                                            </p>
                                            <p className="text-[8px] text-slate-400 font-bold tracking-tighter uppercase">{isProfit ? 'Asset Gain' : 'Total Asset Loss'}</p>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                        <Sparkles size={32} />
                                    </div>
                                    <div>
                                        <p className="text-slate-900 font-black">المخزن متزن بالكامل</p>
                                        <p className="text-xs text-slate-400 font-bold">لا يوجد عجز مسجل في آخر عمليات الجرد</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InventoryPanel;
