import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tables } from '../database.types';
import { Plus, X, Calendar, MapPin, Target, CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react';
import { format, parseISO, getMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

type Activity = Tables<'branch_activities'>;

export const ActivitiesPage = ({ branchId }: { branchId?: string }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Activity>>({
        name: '', description: '', target_type: 'Quantitative', target_value: '', activity_date: '', location: '', status: 'Pending'
    });

    useEffect(() => {
        if (!branchId) return;
        fetchActivities();

        const channel = supabase.channel('activities_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'branch_activities' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setActivities(prev => [payload.new as Activity, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setActivities(prev => prev.map(a => a.id === payload.new.id ? payload.new as Activity : a));
                    } else if (payload.eventType === 'DELETE') {
                        setActivities(prev => prev.filter(a => a.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [branchId]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('branch_activities')
                .select('*')
                .eq('branch_id', branchId)
                .order('activity_date', { ascending: true });
            if (error) throw error;
            setActivities(data || []);
        } catch (error: any) {
            console.error('Error fetching activities:', error);
            showNotification('خطأ في تحميل الأنشطة: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddActivity = async () => {
        if (!formData.name || !formData.activity_date) {
            showNotification('يرجى ملء الاسم والتاريخ');
            return;
        }

        try {
            const { error } = await supabase.from('branch_activities').insert([formData as any]);
            if (error) throw error;
            showNotification('تم إضافة النشاط بنجاح');
            setIsModalOpen(false);
            setFormData({ name: '', description: '', target_type: 'Quantitative', target_value: '', activity_date: '', location: '', status: 'Pending' });
        } catch (error: any) {
            console.error('Error adding activity:', error);
            showNotification('خطأ في الإضافة: ' + error.message);
        }
    };

    const deleteActivity = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا النشاط؟')) return;
        try {
            const { error } = await supabase.from('branch_activities').delete().eq('id', id);
            if (error) throw error;
            showNotification('تم الحذف بنجاح');
        } catch (error: any) {
            showNotification('خطأ في الحذف: ' + error.message);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.from('branch_activities').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            showNotification('تم تحديث الحالة');
        } catch (error: any) {
            showNotification('خطأ في التحديث: ' + error.message);
        }
    }

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    // Group activities by month
    const groupedActivities = activities.reduce((acc, activity) => {
        const date = parseISO(activity.activity_date);
        const monthKey = format(date, 'MMMM yyyy', { locale: ar });
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(activity);
        return acc;
    }, {} as Record<string, Activity[]>);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Cairo'] text-right pb-20 relative">
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[60] flex items-center gap-3 animate-bounce">
                    <CheckCircle2 className="text-emerald-400" size={20} />
                    <span className="font-bold">{notification}</span>
                </div>
            )}

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">خطة الأنشطة السنوية</h1>
                    <p className="text-slate-500 text-sm font-bold">إدارة وتتبع الفعاليات والأهداف لكل فرع</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                    <Plus size={18} /> إضافة نشاط جديد
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
            ) : Object.keys(groupedActivities).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
                    <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
                    <p className="text-slate-400 font-bold">لا توجد أنشطة مخططة حالياً</p>
                </div>
            ) : (
                Object.entries(groupedActivities).map(([month, monthActivities]) => (
                    <div key={month} className="space-y-4">
                        <h3 className="text-xl font-black text-indigo-600 bg-indigo-50 px-6 py-2 rounded-2xl w-fit">{month}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {monthActivities.map(activity => (
                                <div key={activity.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-2 h-full ${activity.status === 'Completed' ? 'bg-emerald-500' :
                                        activity.status === 'Cancelled' ? 'bg-rose-500' : 'bg-amber-400'
                                        }`} />

                                    <div className="flex justify-between items-start mb-4 pr-4">
                                        <div>
                                            <h4 className="font-black text-slate-800 text-lg">{activity.name}</h4>
                                            <p className="text-slate-400 text-xs font-bold flex items-center gap-1 mt-1">
                                                <MapPin size={12} /> {activity.location || 'غير محدد'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-xl text-slate-500 font-mono text-xs font-bold">
                                            {format(parseISO(activity.activity_date), 'dd MMM', { locale: ar })}
                                        </div>
                                    </div>

                                    <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2 pr-4">
                                        {activity.description || 'لا يوجد وصف'}
                                    </p>

                                    <div className="bg-slate-50 rounded-xl p-3 mb-4 pr-4">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                                            <Target size={14} className="text-indigo-500" />
                                            <span>الهدف {activity.target_type === 'Quantitative' ? 'الكمي' : 'النوعي'}:</span>
                                        </div>
                                        <p className="text-indigo-600 font-black text-sm">{activity.target_value || '-'}</p>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 pr-4">
                                        <div className="flex gap-1">
                                            <button onClick={() => updateStatus(activity.id, 'Completed')} title="إكمال" className={`p-2 rounded-lg transition-colors ${activity.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}><CheckCircle2 size={18} /></button>
                                            <button onClick={() => updateStatus(activity.id, 'Pending')} title="قيد الانتظار" className={`p-2 rounded-lg transition-colors ${activity.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}><Loader2 size={18} /></button>
                                            <button onClick={() => updateStatus(activity.id, 'Cancelled')} title="إلغاء" className={`p-2 rounded-lg transition-colors ${activity.status === 'Cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}><XCircle size={18} /></button>
                                        </div>
                                        <button onClick={() => deleteActivity(activity.id)} className="text-slate-300 hover:text-rose-500 transition-colors text-xs font-bold">حذف</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <h3 className="text-xl font-black flex items-center gap-2"><Plus className="text-indigo-400" /> إضافة نشاط جديد</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="opacity-50 hover:opacity-100 transition-opacity" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">اسم النشاط</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">تاريخ النشاط</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={formData.activity_date} onChange={e => setFormData({ ...formData, activity_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">الموقع</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">وصف النشاط</label>
                                <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                    value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">نوع الهدف</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={formData.target_type || 'Quantitative'} onChange={e => setFormData({ ...formData, target_type: e.target.value as any })}>
                                        <option value="Quantitative">كمي (Quantitative)</option>
                                        <option value="Qualitative">نوعي (Qualitative)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">قيمة المستهدف</label>
                                    <input type="text" placeholder="مثال: 50 مشارك" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={formData.target_value || ''} onChange={e => setFormData({ ...formData, target_value: e.target.value })} />
                                </div>
                            </div>
                            <button onClick={handleAddActivity} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4">حفظ النشاط</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
