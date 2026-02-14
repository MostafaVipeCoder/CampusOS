
import React, { useState, useEffect } from 'react';
import { UserPlus, Zap, Search, Coffee, LogOut, ChevronDown, Plus, Minus, X, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

// Database Types (Simplified)
interface Visit {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  check_in: string;
  check_out: string | null;
  status: string;
  notes: string | null;
  discount_amount: number;
  base_fee: number;
  total_fee: number;
  customers?: { full_name: string; code: string } | null;
  services?: { name: string; base_price: number } | null;
  // Local derived properties for detailed view if needed, but we'll stick to joining
}

interface Service {
  id: string;
  name: string;
  base_price: number;
}

const sb = supabase as any;

export const DailyLog = ({ branchId }: { branchId?: string }) => {
  const [sessions, setSessions] = useState<Visit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cateringItems, setCateringItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & UI States
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'manual-login' | 'quick-booking' | 'hall-booking' | 'catering' | null>(null);

  // Forms
  const [manualForm, setManualForm] = useState({ code: '', serviceId: '' });
  const [quickForm, setQuickForm] = useState({ number: '', serviceId: '' });
  const [hallForm, setHallForm] = useState({ code: '', serviceId: '' });

  // 1. Helpers & Auth
  const getBranchId = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: emp } = await sb.from('employees').select('branch_id').eq('id', user.id).single();
    if (!emp?.branch_id) return null;
    return emp.branch_id;
  };

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      const branchId = await getBranchId();
      if (!branchId) return;

      fetchServices(branchId);
      fetchVisits(branchId);
      fetchCateringItems(branchId);

      // Realtime Subscription
      const channel = sb
        .channel('public:visits')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'visits'
        }, (payload: any) => {
          if (payload.new && payload.new.branch_id === branchId) {
            fetchVisits(branchId);
          } else if (payload.old) {
            fetchVisits(branchId);
          }
        })
        .subscribe();

      return () => { sb.removeChannel(channel); };
    };
    init();
  }, []);

  const fetchServices = async (branchId: string) => {
    const { data } = await sb
      .from('services')
      .select('id, name, base_price')
      .eq('branch_id', branchId)
      .eq('service_type', 'room')
      .eq('is_active', true);

    if (data) {
      setServices(data);
      if (data.length > 0) {
        const defaultId = data[0].id;
        setManualForm(prev => ({ ...prev, serviceId: defaultId }));
        setQuickForm(prev => ({ ...prev, serviceId: defaultId }));
        setHallForm(prev => ({ ...prev, serviceId: defaultId }));
      }
    }
  };

  const fetchCateringItems = async (branchId: string) => {
    const { data } = await sb.from('catering_items').select('*').eq('branch_id', branchId).eq('is_active', true);
    if (data) setCateringItems(data);
  };

  const fetchVisits = async (branchId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('visits')
      .select(`
        *,
        customers (full_name, code),
        services (name, base_price)
      `)
      .eq('branch_id', branchId)
      .or(`check_out.is.null,created_at.gte.${today}T00:00:00`)
      .order('check_in', { ascending: false });

    if (error) console.error('Error fetching visits:', error);
    else setSessions(data || []);
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleManualLogin = async () => {
    if (!manualForm.code) return;

    // 1. Find Customer
    const { data: customer, error: custError } = await sb
      .from('customers')
      .select('id, full_name, home_branch_id')
      .eq('code', manualForm.code)
      .single();

    if (custError || !customer) {
      alert('العميل غير موجود!');
      return;
    }

    // 2. Get Service Price
    const selectedService = services.find(s => s.id === manualForm.serviceId);
    const baseFee = selectedService ? selectedService.base_price : 0;

    // 3. Insert Visit
    const branchId = await getBranchId();
    if (!branchId) return;

    const { error } = await sb.from('visits').insert({
      customer_id: customer.id,
      branch_id: branchId,
      service_id: manualForm.serviceId,
      check_in: new Date().toISOString(),
      status: 'active',
      base_fee: baseFee,
      total_fee: baseFee // Initial total
    });

    if (error) alert(error.message);
    else {
      setManualForm({ ...manualForm, code: '' });
      setActiveModal(null);
      const bId = await getBranchId();
      if (bId) fetchVisits(bId); // Immediate refresh for "real-time" feel
    }
  };

  const handleQuickBooking = async () => {
    if (!quickForm.number) return;

    // Get Service Price
    const selectedService = services.find(s => s.id === quickForm.serviceId);
    const baseFee = selectedService ? selectedService.base_price : 0;

    // Insert Walk-in
    const branchId = await getBranchId();
    if (!branchId) return;

    const { error } = await sb.from('visits').insert({
      customer_id: null, // Walk-in
      branch_id: branchId,
      service_id: quickForm.serviceId,
      check_in: new Date().toISOString(),
      status: 'active',
      notes: `Walk-in #${quickForm.number}`,
      base_fee: baseFee,
      total_fee: baseFee
    });

    if (error) alert(error.message);
    else {
      setQuickForm({ ...quickForm, number: '' });
      setActiveModal(null);
      const bId = await getBranchId();
      if (bId) fetchVisits(bId); // Immediate refresh for "real-time" feel
    }
  };

  const handleAddOrder = async (cateringId: string) => {
    if (!selectedVisitId) return;
    const item = cateringItems.find(i => i.id === cateringId);
    if (!item) return;

    const { error } = await sb.from('visit_orders').insert({
      visit_id: selectedVisitId,
      catering_item_id: item.id,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price
    });

    if (!error) {
      const branchId = await getBranchId();
      if (branchId) fetchVisits(branchId);
      setActiveModal(null);
    } else {
      alert('خطأ في إضافة الطلب: ' + error.message);
    }
  };

  const handleCheckout = async (visitId: string) => {
    const { error } = await sb
      .from('visits')
      .update({
        check_out: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', visitId);

    if (error) alert('Error checking out: ' + error.message);
  };

  // --- HELPERS ---
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const diffHrs = (endTime - startTime) / (1000 * 60 * 60);
    return diffHrs.toFixed(1) + 'h';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Cairo'] text-right pb-20 relative">

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-end lg:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">سجل الحضور اليومي</h1>
          <p className="text-slate-500 font-bold">إدارة الجلسات وطلبات العملاء مباشرة</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Manual Login Button */}
          <button
            onClick={() => setActiveModal('manual-login')}
            className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <UserPlus size={20} />
            <span>دخول يدوي</span>
          </button>

          {/* Quick Booking Button */}
          <button
            onClick={() => setActiveModal('quick-booking')}
            className="bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Zap size={20} className="text-amber-500" />
            <span>حجز سريع</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {/* Table Header & Filters */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-800">الجلسات الجارية</h3>
            <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black">{sessions.length} عملاء</span>
          </div>

          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="بحث..." className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-sm" />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-visible">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4 w-48">العميل</th>
                <th className="px-4 py-4 w-40">الخدمة</th>
                <th className="px-4 py-4 w-32 text-center">دخول / خروج</th>
                <th className="px-4 py-4 w-48 text-center">الطلبات</th>
                <th className="px-4 py-4 w-32 text-center">ملاحظات</th>
                <th className="px-4 py-4 w-32 text-center">الإجمالي</th>
                <th className="px-6 py-4 w-32 text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">جاري التحميل...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">لا توجد جلسات حالياً</td></tr>
              ) : sessions.map(session => (
                <tr key={session.id} className="hover:bg-indigo-50/10 transition-all font-bold group">

                  {/* Client Info */}
                  <td className="px-6 py-4">
                    <p className="text-slate-800 font-black text-sm">{session.customers?.full_name || session.notes || 'زائر'}</p>
                    <p className="text-[10px] text-indigo-500 font-mono tracking-widest">{session.customers?.code || '#'}</p>
                  </td>

                  {/* Service */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-600">{session.services?.name || 'Unknown'}</span>
                  </td>

                  {/* Check-in/out Times */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-emerald-600 font-mono text-xs font-black">{formatTime(session.check_in)}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{formatTime(session.check_out)}</span>
                    </div>
                  </td>

                  {/* Catering Orders */}
                  <td className="px-4 py-4 text-center relative">
                    <button
                      onClick={() => { setSelectedVisitId(session.id); setActiveModal('catering'); }}
                      className={`mx-auto px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition-all ${session.total_fee > session.base_fee
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-500'
                        }`}
                    >
                      <Coffee size={14} />
                      <span>{session.total_fee - session.base_fee} EGP</span>
                    </button>
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs text-slate-400 truncate max-w-[100px] block mx-auto">{session.notes || '-'}</span>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-slate-700">
                      {session.total_fee || session.base_fee} <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                    </span>
                  </td>

                  {/* Check-out Action */}
                  <td className="px-6 py-4 text-left">
                    {!session.check_out ? (
                      <button
                        onClick={() => handleCheckout(session.id)}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:shadow-rose-200 w-full group/btn"
                      >
                        <LogOut size={14} className="group-hover/btn:-translate-x-1 transition-transform" />
                        <span>إنهاء</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1 justify-center">
                        مكتمل
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Manual Login Modal */}
      {activeModal === 'manual-login' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><UserPlus size={24} className="text-indigo-600" /> تسجيل دخول يدوي</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">كود العميل</label>
                <input
                  type="text"
                  value={manualForm.code}
                  onChange={(e) => setManualForm({ ...manualForm, code: e.target.value })}
                  placeholder="مثال: CMP-2024-001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">نوع الخدمة</label>
                <select
                  value={manualForm.serviceId}
                  onChange={(e) => setManualForm({ ...manualForm, serviceId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-indigo-500 outline-none"
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.base_price} EGP)</option>)}
                </select>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={handleManualLogin} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">تأكيد الدخول</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Quick Booking Modal */}
      {activeModal === 'quick-booking' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Zap size={24} className="text-amber-500" /> حجز سريع (Walk-in)</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم الزائر</label>
                <input
                  type="number"
                  value={quickForm.number}
                  onChange={(e) => setQuickForm({ ...quickForm, number: e.target.value })}
                  placeholder="أدخل الرقم"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">نوع الخدمة</label>
                <select
                  value={quickForm.serviceId}
                  onChange={(e) => setQuickForm({ ...quickForm, serviceId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-amber-500 outline-none"
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.base_price} EGP)</option>)}
                </select>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={handleQuickBooking} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black hover:bg-slate-900 transition-all shadow-lg">تأكيد الحجز</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Catering Selection Modal */}
      {activeModal === 'catering' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Coffee size={24} className="text-amber-500" /> إضافة طلب كاترينج</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {cateringItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddOrder(item.id)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all text-right group"
                >
                  <p className="font-black text-slate-800 text-sm group-hover:text-amber-700">{item.name}</p>
                  <p className="text-xs font-bold text-amber-600 mt-1">{item.price} EGP</p>
                </button>
              ))}
              {cateringItems.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-400 font-bold">
                  لا توجد أصناف في قائمة الكاترينج حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Catering Selection Modal */}
      {activeModal === 'catering' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Coffee size={24} className="text-amber-500" /> إضافة طلب كاترينج</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {cateringItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddOrder(item.id)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all text-right group"
                >
                  <p className="font-black text-slate-800 text-sm group-hover:text-amber-700">{item.name}</p>
                  <p className="text-xs font-bold text-amber-600 mt-1">{item.price} EGP</p>
                </button>
              ))}
              {cateringItems.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-400 font-bold">
                  لا توجد أصناف في قائمة الكاترينج حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
