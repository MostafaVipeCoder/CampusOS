import React, { useState } from 'react';
import { UserPlus, Zap, Search, Filter, Coffee, LogOut, ChevronDown, Plus, Minus, X, Building2 } from 'lucide-react';
import { CATERING_MENU, MOCK_SUBSCRIPTIONS } from '../mockData'; // Import SUBSCRIPTIONS for lookup

// Types for local state
interface SessionItem {
  id: number;
  name: string;
  code: string;
  service: string;
  checkin: string;
  checkout: string;
  duration: string;
  fee: number;
  orders: { itemId: string; name: string; qty: number; price: number }[];
  discount: number;
  notes: string;
}

export const DailyLog = () => {
  // Initial Mock Data wrapped in State
  const [sessions, setSessions] = useState<SessionItem[]>([
    {
      id: 1, name: 'أحمد علي', code: 'C-201', service: 'Shared Space',
      checkin: '09:00', checkout: '', duration: '3.5h', fee: 70,
      orders: [{ itemId: 'c1', name: 'قهوة تركي', qty: 1, price: 25 }],
      discount: 0, notes: ''
    },
    {
      id: 2, name: 'ليلى حسن', code: 'C-205', service: 'Focus Room',
      checkin: '10:30', checkout: '', duration: '2.0h', fee: 80,
      orders: [],
      discount: 0, notes: ''
    },
  ]);

  const [activePopover, setActivePopover] = useState<{ id: number, type: 'catering' | 'notes' } | null>(null);
  const [activeModal, setActiveModal] = useState<'manual-login' | 'quick-booking' | 'hall-booking' | null>(null);

  // Form States
  const [manualForm, setManualForm] = useState({ code: '', service: 'Shared Space' });
  const [quickForm, setQuickForm] = useState({ number: '' });
  const [hallForm, setHallForm] = useState({ code: '', service: 'Room Booking' });


  // Helper to calculate totals
  const calculateTotal = (session: SessionItem) => {
    const ordersTotal = session.orders.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    return (session.fee + ordersTotal) - session.discount;
  };

  // Helper: Get Current Time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  // --- ACTIONS ---

  const handleManualLogin = () => {
    // Lookup client by code
    const client = MOCK_SUBSCRIPTIONS.find(s => s.code === manualForm.code);
    const name = client ? client.name : 'Unknown Client'; // Or handle error

    const newSession: SessionItem = {
      id: Date.now(),
      name: name,
      code: manualForm.code,
      service: manualForm.service,
      checkin: getCurrentTime(),
      checkout: '',
      duration: '0h',
      fee: 0, // Should be calculated based on service/time later
      orders: [],
      discount: 0,
      notes: ''
    };

    setSessions([newSession, ...sessions]);
    setManualForm({ code: '', service: 'Shared Space' });
    setActiveModal(null);
  };

  const handleQuickBooking = () => {
    if (!quickForm.number) return;
    const generatedCode = `NA - ${quickForm.number} `;

    const newSession: SessionItem = {
      id: Date.now(),
      name: `زائر ${quickForm.number} `, // Generic name
      code: generatedCode,
      service: 'Walk-in',
      checkin: getCurrentTime(),
      checkout: '',
      duration: '0h',
      fee: 0,
      orders: [],
      discount: 0,
      notes: ''
    };

    setSessions([newSession, ...sessions]);
    setQuickForm({ number: '' });
    setActiveModal(null);
  };

  const handleHallBooking = () => {
    // Logic: Use Hall Code or Client Code
    // For now, if code matches a "Room" config (not implemented yet for lookup), we could use that title.
    // Assuming simple entry for now as requested.

    const newSession: SessionItem = {
      id: Date.now(),
      name: `حجز قاعة(${hallForm.code})`, // Or client name if client code used
      code: hallForm.code,
      service: 'Room Booking',
      checkin: getCurrentTime(),
      checkout: '',
      duration: '0h',
      fee: 0,
      orders: [],
      discount: 0,
      notes: ''
    };

    setSessions([newSession, ...sessions]);
    setHallForm({ code: '', service: 'Room Booking' });
    setActiveModal(null);
  }


  // --- FIELD HANDLERS ---
  const handleServiceChange = (id: number, newService: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, service: newService } : s));
  };
  const handleTimeChange = (id: number, field: 'checkin' | 'checkout', value: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const handleAddOrder = (sessionId: number, item: typeof CATERING_MENU[0]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const existingOrder = s.orders.find(o => o.itemId === item.id);
      let newOrders;
      if (existingOrder) newOrders = s.orders.map(o => o.itemId === item.id ? { ...o, qty: o.qty + 1 } : o);
      else newOrders = [...s.orders, { itemId: item.id, name: item.name, price: item.price, qty: 1 }];

      // Simulate Real-time Inventory Deduction
      console.log(`[Inventory] Deducting stock for ${item.name}`);

      return { ...s, orders: newOrders };
    }));
  };
  const handleUpdateOrderQty = (sessionId: number, itemId: string, delta: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const newOrders = s.orders.map(o => o.itemId === itemId ? { ...o, qty: Math.max(0, o.qty + delta) } : o).filter(o => o.qty > 0);
      return { ...s, orders: newOrders };
    }));
  };
  const handleDiscountChange = (id: number, value: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, discount: parseFloat(value) || 0 } : s));
  };
  const handleNotesChange = (id: number, value: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, notes: value } : s));
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

          {/* Hall Booking Button */}
          <button
            onClick={() => setActiveModal('hall-booking')}
            className="bg-slate-900 text-white border border-slate-800 px-5 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
          >
            <Building2 size={20} />
            <span>حجز قاعة</span>
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
                <th className="px-4 py-4 w-24 text-center">الخصم</th>
                <th className="px-4 py-4 w-32 text-center">ملاحظات</th>
                <th className="px-4 py-4 w-32 text-center">الإجمالي</th>
                <th className="px-6 py-4 w-32 text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-indigo-50/10 transition-all font-bold group">

                  {/* Client Info */}
                  <td className="px-6 py-4">
                    <p className="text-slate-800 font-black text-sm">{session.name}</p>
                    <p className="text-[10px] text-indigo-500 font-mono tracking-widest">{session.code}</p>
                  </td>

                  {/* Service Selection */}
                  <td className="px-4 py-4">
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 appearance-none font-bold text-slate-600"
                        value={session.service}
                        onChange={(e) => handleServiceChange(session.id, e.target.value)}
                      >
                        <option>Shared Space</option>
                        <option>Focus Room</option>
                        <option>Meeting Room</option>
                        <option>Walk-in</option>
                        <option>Room Booking</option>
                      </select>
                      <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </td>

                  {/* Check-in/out Times */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <input
                        type="time"
                        value={session.checkin}
                        onChange={(e) => handleTimeChange(session.id, 'checkin', e.target.value)}
                        className="bg-transparent text-emerald-600 font-mono text-xs font-black text-center outline-none hover:bg-slate-50 rounded"
                      />
                      <input
                        type="time"
                        value={session.checkout}
                        placeholder="--:--"
                        onChange={(e) => handleTimeChange(session.id, 'checkout', e.target.value)}
                        className="bg-transparent text-slate-400 font-mono text-[10px] text-center outline-none hover:bg-slate-50 rounded placeholder:text-slate-300"
                      />
                    </div>
                  </td>

                  {/* Catering Orders */}
                  <td className="px-4 py-4 text-center relative">
                    <button
                      onClick={() => setActivePopover(activePopover?.id === session.id && activePopover.type === 'catering' ? null : { id: session.id, type: 'catering' })}
                      className={`mx - auto px - 3 py - 1.5 rounded - xl text - xs flex items - center gap - 2 transition - all ${session.orders.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-600'} `}
                    >
                      <Coffee size={14} />
                      <span>{session.orders.length > 0 ? `${session.orders.reduce((p, c) => p + (c.price * c.qty), 0)} EGP` : 'إضافة طلب'}</span>
                    </button>

                    {/* Catering Popover */}
                    {activePopover?.id === session.id && activePopover.type === 'catering' && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <h4 className="text-xs font-black text-slate-700">قائمة المشروبات</h4>
                          <button onClick={() => setActivePopover(null)}><X size={14} className="text-slate-400 hover:text-rose-500" /></button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                          {CATERING_MENU.map(item => {
                            const orderItem = session.orders.find(o => o.itemId === item.id);
                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group/item">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-slate-400">{item.price} EGP</p>
                                    <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 rounded font-black border border-emerald-100 italic">In Stock</span>
                                  </div>
                                </div>
                                {orderItem ? (
                                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-1">
                                    <button onClick={() => handleUpdateOrderQty(session.id, item.id, -1)} className="p-1 hover:bg-slate-100 rounded-md"><Minus size={10} /></button>
                                    <span className="text-xs font-bold w-3 text-center">{orderItem.qty}</span>
                                    <button onClick={() => handleUpdateOrderQty(session.id, item.id, 1)} className="p-1 hover:bg-slate-100 rounded-md text-indigo-600"><Plus size={10} /></button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleAddOrder(session.id, item)}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Discount */}
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      value={session.discount > 0 ? session.discount : ''}
                      placeholder="-"
                      onChange={(e) => handleDiscountChange(session.id, e.target.value)}
                      className="w-16 text-center text-xs font-black text-rose-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-rose-500 outline-none placeholder:text-slate-300"
                    />
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-4 text-center relative">
                    <div className="relative group/notes">
                      <textarea
                        className="w-full h-8 bg-transparent text-xs text-slate-500 resize-none outline-none border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded-lg p-1 transition-all"
                        placeholder="ملاحظات..."
                        value={session.notes}
                        onChange={(e) => handleNotesChange(session.id, e.target.value)}
                      ></textarea>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-4 text-center">
                    <span className={`text - sm font - black ${calculateTotal(session) > 100 ? 'text-indigo-600' : 'text-slate-700'} `}>
                      {calculateTotal(session)} <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                    </span>
                  </td>

                  {/* Check-out Action */}
                  <td className="px-6 py-4 text-left">
                    <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:shadow-rose-200 w-full group/btn">
                      <LogOut size={14} className="group-hover/btn:-translate-x-1 transition-transform" />
                      <span>إنهاء</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Backdrop for Popovers */}
          {activePopover && (
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePopover(null)}></div>
          )}
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
                  placeholder="أدخل كود العميل (مثال: C-101)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-indigo-500 outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">سيتم جلب الاسم تلقائياً بناءً على الكود.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">نوع الخدمة</label>
                <select
                  value={manualForm.service}
                  onChange={(e) => setManualForm({ ...manualForm, service: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-indigo-500 outline-none"
                >
                  <option>Shared Space</option>
                  <option>Focus Room</option>
                  <option>Meeting Room</option>
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
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم الإيصال / الزائر</label>
                <input
                  type="number"
                  value={quickForm.number}
                  onChange={(e) => setQuickForm({ ...quickForm, number: e.target.value })}
                  placeholder="أدخل الرقم"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-amber-500 outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">سيتم إنشاء كود تلقائي بصيغة NA-رقم</p>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={handleQuickBooking} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black hover:bg-slate-900 transition-all shadow-lg">تأكيد الحجز</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Hall Booking Modal */}
      {activeModal === 'hall-booking' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Building2 size={24} className="text-slate-600" /> حجز قاعة</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">كود القاعة / كود العميل</label>
                <input
                  type="text"
                  value={hallForm.code}
                  onChange={(e) => setHallForm({ ...hallForm, code: e.target.value })}
                  placeholder="أدخل الكود"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-slate-500 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-8">
              <button onClick={handleHallBooking} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg">بدء الحجز</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
