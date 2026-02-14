
import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, X, CheckCircle2, Clock, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';

export const SubscriptionsPanel = ({ branchId }: { branchId?: string }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (branchId) fetchSubscriptions();
  }, [branchId]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .select('*, customers(full_name, code)')
      .eq('branch_id', branchId);

    if (data) {
      const formatted: Subscription[] = (data as any[]).map(s => ({
        id: s.id,
        name: s.customers?.full_name || 'عميل غير معروف',
        code: s.customers?.code || '---',
        type: s.type,
        price: s.price || 0,
        paid: s.paid || 0,
        remaining: s.remaining || 0,
        startDate: s.start_date || '',
        endDate: s.end_date || '',
        daysLeft: Math.ceil((new Date(s.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)),
        totalHours: s.total_hours || 40,
        usedHours: s.used_hours || 0,
        status: (s.status as any) || 'Active'
      }));
      setSubscriptions(formatted);
    }
    setLoading(false);
  };

  // Package Options for Quick Select
  const PACKAGES = [
    { name: '40 Hours', hours: 40, price: 1000 },
    { name: '80 Hours', hours: 80, price: 1800 },
    { name: '100 Hours', hours: 100, price: 2200 },
  ];

  // Auto-update price when hours change (if matches preset, otherwise default rate 25)
  // But we want to allow manual override, so we only update if it was a user interaction that *triggered* a preset selection?
  // Simpler: Just rely on the user to check/edit the price if custom.
  // Or: when hours change, set a suggested price.

  const handlePresetSelect = (pkg: typeof PACKAGES[0]) => {
    setFormData(prev => ({
      ...prev,
      hours: pkg.hours,
      basePrice: pkg.price,
      discount: 0
    }));
  };

  const handleHoursChange = (val: number) => {
    // If it matches a preset, use that price. Else use 25 EGP/hr
    const preset = PACKAGES.find(p => p.hours === val);
    const suggestedPrice = preset ? preset.price : val * 25;
    setFormData(prev => ({ ...prev, hours: val, basePrice: suggestedPrice }));
  };

  const handleAddSubscription = async () => {
    if (formData.hours < 40) {
      alert('الحد الأدنى للساعات هو 40 ساعة');
      return;
    }

    // 1. Find Customer by Code
    const { data: customer } = await (supabase as any)
      .from('customers')
      .select('id, full_name')
      .eq('code', formData.code)
      .single();

    if (!customer) {
      alert('كود العميل غير صحيح');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const finalPrice = Math.max(0, formData.basePrice - formData.discount);

    const { error } = await (supabase as any).from('subscriptions').insert({
      branch_id: branchId,
      customer_id: customer.id,
      type: `${formData.hours} Hours Package`,
      price: finalPrice,
      paid: finalPrice,
      remaining: 0,
      start_date: formData.startDate,
      end_date: end.toISOString().split('T')[0],
      total_hours: formData.hours,
      used_hours: 0,
      status: 'Active'
    });

    if (error) alert(error.message);
    else {
      setIsModalOpen(false);
      setNotification('تم تفعيل الاشتراك بنجاح');
      setTimeout(() => setNotification(null), 3000);
      fetchSubscriptions();
      setFormData({ code: '', hours: 40, basePrice: 1000, discount: 0, startDate: new Date().toISOString().split('T')[0] });
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    hours: 40,
    basePrice: 1000,
    discount: 0,
    startDate: new Date().toISOString().split('T')[0],
  });

  // Helper: Calculate Progress Color
  const getProgressColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage > 90) return 'bg-rose-500';
    if (percentage > 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Cairo'] text-right pb-20 relative">

      {/* Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[60] flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="text-emerald-400" />
          <span className="font-bold">{notification}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold text-xs mb-2 uppercase tracking-widest">إجمالي الاشتراكات النشطة</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-black text-slate-800">{subscriptions.filter(s => s.status === 'Active').length}</h3>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black">نشط</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold text-xs mb-2 uppercase tracking-widest">الساعات المستهلكة (إجمالي)</p>
          <h3 className="text-3xl font-black text-indigo-600">{subscriptions.reduce((acc, curr) => acc + curr.usedHours, 0)} <span className="text-sm text-slate-400">ساعة</span></h3>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
          <p className="text-slate-400 font-bold text-xs mb-2 uppercase tracking-widest">إيرادات الاشتراكات</p>
          <h3 className="text-3xl font-black">{subscriptions.reduce((acc, curr) => acc + curr.paid, 0).toLocaleString()} <span className="text-base font-bold text-slate-500">EGP</span></h3>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-800">تتبع الباقات والساعات</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-1"
          >
            <Plus size={18} /> اشتراك جديد
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">العميل</th>
                <th className="px-6 py-6 w-1/3">تفاصيل الباقة</th>
                <th className="px-6 py-6">الصلاحية</th>
                <th className="px-6 py-6 text-center">الحالة</th>
                <th className="px-8 py-6">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {subscriptions.map((sub) => {
                const isHourlyExhausted = sub.usedHours >= sub.totalHours;
                return (
                  <tr key={sub.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-8 py-6">
                      <p className="text-slate-800 font-black">{sub.name}</p>
                      <p className="text-[10px] text-indigo-500 font-mono tracking-widest bg-indigo-50 inline-block px-1.5 rounded mt-1">{sub.code}</p>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-700">{sub.type}</span>
                          <span className="text-slate-400 font-mono">{sub.usedHours} / {sub.totalHours} h</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(sub.usedHours, sub.totalHours)}`}
                            style={{ width: `${(sub.usedHours / sub.totalHours) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600"><CalendarDays size={14} /> ينتهي: {sub.endDate}</span>
                        <span className={`flex items-center gap-1.5 font-bold ${sub.daysLeft < 5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          <Clock size={14} /> باقي {sub.daysLeft} يوم
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${isHourlyExhausted ? 'bg-slate-100 text-slate-400' :
                        sub.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                        {isHourlyExhausted ? 'مستهلكة' : sub.status === 'Active' ? 'نشط' : 'منتهي'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><Edit3 size={16} /></button>
                        <button className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- NEW SUBSCRIPTION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">اشتراك جديد</h3>
                <p className="text-slate-400 text-sm font-bold mt-1">إضافة باقة ساعات لعميل</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="text-slate-400" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">كود العميل</label>
                <input
                  type="text"
                  placeholder="C-000"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-2 mr-1">سيتم جلب اسم العميل ورقم هاتفه تلقائياً</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">نوع الباقة (ساعات)</label>

                {/* Presets */}
                <div className="flex gap-2 mb-4">
                  {PACKAGES.map(pkg => (
                    <button
                      key={pkg.name}
                      onClick={() => handlePresetSelect(pkg)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.hours === pkg.hours && formData.basePrice === pkg.price
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                      {pkg.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">عدد الساعات</label>
                    <input
                      type="number"
                      min="40"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                      value={formData.hours}
                      onChange={(e) => handleHoursChange(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">سعر الباقة (EGP)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Discount Section */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">الخصومات</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full bg-rose-50 border-2 border-rose-100 rounded-2xl px-5 py-3 text-sm font-black text-rose-600 outline-none focus:border-rose-300 transition-all"
                    placeholder="قيمة الخصم"
                    value={formData.discount || ''}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 text-xs font-bold">EGP</span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                <span className="text-xs font-bold text-slate-500">الإجمالي النهائي</span>
                <span className="text-xl font-black text-indigo-600">
                  {Math.max(0, formData.basePrice - formData.discount).toLocaleString()} EGP
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">تاريخ البدء</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <button
                onClick={handleAddSubscription}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 mt-4"
              >
                تفعيل الاشتراك
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
