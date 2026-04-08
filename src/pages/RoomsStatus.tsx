import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Users, ArrowRight, X, Loader2, CheckCircle2, AlertCircle, Calendar, Plus } from 'lucide-react';

interface Room {
  id: string;
  name_ar: string;
  code: string;
  color: string;
  base_price: number;
  is_active: boolean;
  current_session?: any;
}

export const RoomsStatus = ({ branchId }: { branchId?: string }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'analysis'>('status');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [servingRoom, setServingRoom] = useState<Room | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  
  // State for session opening
  const [userCode, setUserCode] = useState('');
  const [userName, setUserName] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [processing, setProcessing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  // Receipt State
  const [showReceipt, setShowReceipt] = useState<any>(null);

  // Catering Items Handling
  const [inventory, setInventory] = useState<any[]>([]);
  const [showCateringEntry, setShowCateringEntry] = useState<any>(null);
  const [tempOrders, setTempOrders] = useState<any[]>([]);
  const [editingHistoryItem, setEditingHistoryItem] = useState<any>(null);

  // Manual Override States
  const [overrideDuration, setOverrideDuration] = useState('');
  const [overrideRoomAmount, setOverrideRoomAmount] = useState('');

  useEffect(() => {
    if (branchId) {
      if (activeTab === 'status') {
        fetchRoomsStatus();
        fetchInventory();
      }
      else fetchHistory();
      
      const channel = supabase
        .channel('rooms-status-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_sessions' }, () => {
          if (activeTab === 'status') fetchRoomsStatus();
          else fetchHistory();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [branchId, activeTab]);

  // Effect to pre-fill modal when servingRoom changes
  useEffect(() => {
    if (servingRoom) {
      const next = checkFutureBooking(servingRoom.id);
      if (next) {
        setUserName(next.user_name || next.customers?.full_name || '');
        setUserCode(next.user_code || '');
        setDurationHours(next.duration?.toString() || '1');
      } else {
        setUserName('');
        setUserCode('');
        setDurationHours('1');
      }
    }
  }, [servingRoom]);

  const fetchRoomsStatus = async () => {
    if (!branchId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data: roomsData } = await (supabase.from('services') as any).select('*').eq('branch_id', branchId).ilike('service_type', 'room').eq('is_active', true).order('code', { ascending: true });
      const { data: activeSessions } = await (supabase.from('workspace_sessions') as any).select('*, customers(full_name, phone)').eq('branch_id', branchId).neq('status', 'completed');
      const { data: todayBookings } = await (supabase.from('bookings') as any).select('*, customers(full_name, phone, code)').eq('branch_id', branchId).eq('booking_date', today).eq('status', 'Confirmed');

      setBookings(todayBookings || []);
      const roomsWithStatus = (roomsData || []).map((r: any) => ({
        ...r,
        current_session: activeSessions?.find((s: any) => s.service_id === r.id)
      }));
      setRooms(roomsWithStatus);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const { data } = await (supabase.from('workspace_sessions') as any)
        .select('*, services(name_ar), customers(full_name)')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .not('service_id', 'is', null) // Only room sessions
        .order('end_time', { ascending: false })
        .limit(50);
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    if (!branchId) return;
    try {
      const { data } = await supabase.from('inventory').select('*').eq('branch_id', branchId).gt('stock', 0);
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const handleStartServing = async () => {
    if (!servingRoom) return;
    setProcessing(true);
    try {
      let customerId = null;
      let finalUserCode = userCode || servingRoom.code || `GUEST-${Date.now().toString().slice(-4)}`;
      let finalUserName = userName || `${servingRoom.code} - ${servingRoom.name_ar}`;
      let finalPhone = 'N/A';
      
      if (userCode) {
        const { data: customer } = await supabase.from('customers').select('id, code, phone, full_name').eq('code', userCode.toUpperCase()).maybeSingle();
        if (customer) {
            customerId = customer.id;
            finalUserCode = customer.code;
            finalUserName = customer.full_name;
            finalPhone = customer.phone;
        }
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (parseFloat(durationHours) || 1) * 60 * 60 * 1000);

      const { error } = await supabase.from('workspace_sessions').insert({
        branch_id: branchId,
        service_id: servingRoom.id,
        customer_id: customerId,
        user_code: finalUserCode.toUpperCase(),
        user_name: finalUserName,
        phone_number: finalPhone,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'active',
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      setServingRoom(null);
      setUserCode('');
      setUserName('');
      setDurationHours('1');
      fetchRoomsStatus();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleEndServing = (room: Room) => {
    const session = room.current_session;
    if (!session) return;
    
    const start = new Date(session.start_time);
    const end = new Date();
    const diffMins = Math.ceil(Math.abs(end.getTime() - start.getTime()) / 60000);
    const initialAmount = Math.ceil((diffMins/60) * room.base_price);

    setTempOrders([]);
    setOverrideDuration(diffMins.toString());
    setOverrideRoomAmount(initialAmount.toString());
    setShowCateringEntry({
      room,
      session
    });
  };

  const finalizeEndServing = async () => {
    if (!showCateringEntry) return;
    const { room, session } = showCateringEntry;
    
    setProcessing(true);
    try {
      const startTime = new Date(session.start_time);
      const endTime = new Date();
      
      const diffMins = parseInt(overrideDuration) || 0;
      const workspaceAmount = parseFloat(overrideRoomAmount) || 0;
      const cateringAmount = tempOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
      const totalAmount = workspaceAmount + cateringAmount;
      
      const { error: sessionError } = await (supabase.from('workspace_sessions' as any) as any)
          .update({ 
              end_time: endTime.toISOString(), 
              status: 'completed',
              total_minutes: diffMins,
              total_amount: totalAmount,
              catering_amount: cateringAmount,
              orders: tempOrders
          })
          .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Deduct from inventory
      for (const order of tempOrders) {
        if (order.inventory_id) {
           const { data: currentItem } = await supabase.from('inventory').select('stock').eq('id', order.inventory_id).single();
           if (currentItem) {
              await supabase.from('inventory').update({ stock: Math.max(0, currentItem.stock - order.quantity) }).eq('id', order.inventory_id);
           }
        }
      }

      // Show Receipt
      setShowReceipt({
        roomName: room.name_ar,
        roomCode: room.code,
        userName: session.user_name || 'عميل',
        userCode: session.user_code,
        startTime: session.start_time,
        endTime: endTime.toISOString(),
        duration: diffMins,
        rate: room.base_price,
        workspaceAmount,
        cateringAmount,
        items: tempOrders,
        total: totalAmount
      });

      setShowCateringEntry(null);
      fetchRoomsStatus();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const addItemToTemp = (item: any) => {
    setTempOrders(prev => {
      const existing = prev.find(o => o.inventory_id === item.id);
      if (existing) {
        return prev.map(o => o.inventory_id === item.id ? { ...o, quantity: o.quantity + 1 } : o);
      }
      return [...prev, { name: item.name, price: item.selling_price || item.price, quantity: 1, inventory_id: item.id }];
    });
  };

  const removeItemFromTemp = (id: string) => {
    setTempOrders(prev => prev.filter(o => o.inventory_id !== id));
  };

  const handleUpdateHistoryItem = async (updatedData: any) => {
    try {
      const { error } = await supabase
        .from('workspace_sessions')
        .update({
          total_minutes: parseInt(updatedData.total_minutes),
          total_amount: parseFloat(updatedData.total_amount)
        })
        .eq('id', updatedData.id);

      if (error) throw error;
      setEditingHistoryItem(null);
      fetchHistory();
    } catch (err: any) {
      alert('Error updating: ' + err.message);
    }
  };

  const checkFutureBooking = (roomId: string) => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    const next = bookings
      .filter(b => b.service_id === roomId && (b.start_time + b.duration * 60) > nowMinutes)
      .sort((a, b) => a.start_time - b.start_time)[0];
    return next;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'م' : 'ص';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const getRoomColor = (color: string) => {
    switch (color?.toLowerCase()) {
      case 'blue': return 'bg-[#1E75B9]/10 text-[#1E75B9] shadow-[#1E75B9]/20';
      case 'orange': return 'bg-[#F78C2A]/10 text-[#F78C2A] shadow-[#F78C2A]/20';
      case 'red': return 'bg-[#F83854]/10 text-[#F83854] shadow-[#F83854]/20';
      case 'green': return 'bg-[#1ED788]/10 text-[#1ED788] shadow-[#1ED788]/20';
      default: return 'bg-indigo-100 text-indigo-600 shadow-indigo-100/50';
    }
  };

  const handleQuickOpen = () => {
    const room = rooms.find(r => r.code.toUpperCase() === roomCodeInput.toUpperCase());
    if (room) {
      if (room.current_session) {
        alert('هذه الغرفة مشغولة حالياً');
      } else {
        setServingRoom(room);
        setRoomCodeInput('');
      }
    } else {
      alert('كود الغرفة غير صحيح');
    }
  };

  return (
    <div className="space-y-10 font-['Cairo'] text-right pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">إدارة حالة الغرف</h2>
          <div className="flex items-center gap-6 mt-2">
            <button 
              onClick={() => setActiveTab('status')}
              className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'status' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              الحالة الحالية
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              سجل الحجوزات
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'analysis' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              تحليل البيانات
            </button>
          </div>
        </div>

        {activeTab === 'status' && (
          <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-sm w-full md:w-auto overflow-hidden group focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
            <input 
              type="text" 
              placeholder="ادخل كود الغرفة (R1)..." 
              className="flex-1 min-w-[200px] border-none outline-none px-6 py-2 font-black text-slate-700 uppercase"
              value={roomCodeInput}
              onChange={e => setRoomCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickOpen()}
            />
            <button 
              onClick={handleQuickOpen}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-indigo-600 active:scale-[0.98] transition-all"
            >
              فتح سريع
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-50 rounded-[3rem] animate-pulse"></div>)}
        </div>
      ) : activeTab === 'status' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map(room => {
            const isOccupied = !!room.current_session;
            const nextBooking = checkFutureBooking(room.id);
            
            return (
              <div key={room.id} className={`group relative bg-white rounded-[3.5rem] border-2 transition-all duration-500 hover:shadow-2xl ${isOccupied ? 'border-rose-100' : 'border-slate-50 hover:border-indigo-100'}`}>
                <div className="p-10 flex justify-between items-start">
                   <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl transition-all group-hover:scale-110 ${getRoomColor(room.color)}`}>
                     {room.code}
                   </div>
                   <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isOccupied ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>
                     {isOccupied ? 'مشغول' : 'متاح حالياً'}
                   </div>
                </div>

                <div className="p-10 pt-0">
                  <h3 className="text-3xl font-black text-slate-800">{room.name_ar}</h3>
                  <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold">
                    <Clock size={16} />
                    <span>{room.base_price} EGP / سـاعة</span>
                  </div>

                  {nextBooking && !isOccupied && (
                     <div className="mt-4 flex items-center gap-2 text-amber-600 font-black text-xs bg-amber-50 p-3 rounded-2xl border border-amber-100 animate-pulse">
                        <Calendar size={14} />
                        <span>محجوز: {nextBooking.user_name || nextBooking.customers?.full_name} ({formatTime(nextBooking.start_time)})</span>
                     </div>
                  )}

                  {isOccupied ? (
                    <div className="mt-8 space-y-4">
                       <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group/info hover:bg-slate-100 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] text-slate-400 font-black uppercase">العميل</span>
                             <span className="text-sm font-black text-slate-700">{room.current_session.user_name || 'عميل'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black">
                             <span className="text-slate-400 uppercase">المدة</span>
                             <span className="text-indigo-600">من {new Date(room.current_session.start_time).toLocaleTimeString('ar-EG', { hour12: true, hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </div>
                       <button onClick={() => handleEndServing(room)} disabled={processing} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 active:scale-95">
                          إنهاء الجلسة
                       </button>
                    </div>
                  ) : (
                    <div className="mt-10">
                       <button onClick={() => setServingRoom(room)} className="w-full h-32 bg-slate-50 text-slate-400 border-2 border-slate-50 border-dashed rounded-[2.5rem] font-black hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-2 active:scale-95">
                          <ArrowRight size={24} />
                          <span>فتح الغرفة الآن</span>
                       </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'history' ? (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
           <table className="w-full text-right">
             <thead className="bg-slate-50">
               <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <th className="px-8 py-6">الغرفة</th>
                 <th className="px-8 py-6">العميل</th>
                 <th className="px-8 py-6">التاريخ والوقت</th>
                 <th className="px-8 py-6">المدة</th>
                 <th className="px-8 py-6">المبلغ</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group/row">
                    <td className="px-8 py-5">
                       <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black">{item.services?.name_ar || 'غرفة'}</span>
                       {item.services?.code && <span className="mr-2 text-[10px] text-slate-400 font-bold">({item.services.code})</span>}
                    </td>
                    <td className="px-8 py-5">
                       <div>{item.user_name || item.customers?.full_name || 'عميل'}</div>
                       <div className="text-[10px] text-slate-400 uppercase mt-0.5">{item.user_code}</div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="text-xs">{new Date(item.end_time).toLocaleDateString('ar-EG')}</div>
                       <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                         {new Date(item.start_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.end_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                       </div>
                    </td>
                    <td className="px-8 py-5">{item.total_minutes} دقيقة</td>
                    <td className="px-8 py-5">
                       <div className="flex items-center justify-between">
                          <span className="text-indigo-600 font-black">{item.total_amount} EGP</span>
                          <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                             <button 
                               onClick={() => setEditingHistoryItem(item)}
                               className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors"
                             >
                                <Users size={14} />
                             </button>
                             <button 
                               onClick={() => {
                                 if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                   supabase.from('workspace_sessions').delete().eq('id', item.id).then(() => fetchHistory());
                                 }
                               }}
                               className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
                             >
                                <X size={14} />
                             </button>
                          </div>
                       </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-bold">لا يوجد سجل عمليات سابقة</td>
                  </tr>
                )}
             </tbody>
           </table>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-5">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي الإيرادات</p>
                 <h4 className="text-3xl font-black text-slate-900">{history.reduce((sum, h) => sum + (h.total_amount || 0), 0)} EGP</h4>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الجلسات</p>
                 <h4 className="text-3xl font-black text-slate-900">{history.length}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي الدقائق</p>
                 <h4 className="text-3xl font-black text-slate-900">{history.reduce((sum, h) => sum + (Number(h.total_minutes) || 0), 0)}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">متوسط الجلسة</p>
                 <h4 className="text-3xl font-black text-slate-900">
                    {history.length > 0 ? (history.reduce((sum, h) => sum + (h.total_amount || 0), 0) / history.length).toFixed(1) : 0} EGP
                 </h4>
              </div>
           </div>

           <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl p-10">
              <h3 className="text-xl font-black text-slate-800 mb-8 pr-4 border-r-4 border-indigo-600">تحليل استخدام الغرف</h3>
              <div className="space-y-8">
                 {rooms.map(room => {
                    const roomSessions = history.filter(h => h.service_id === room.id);
                    const roomRevenue = roomSessions.reduce((sum, h) => sum + (h.total_amount || 0), 0);
                    const usagePct = history.length > 0 ? (roomSessions.length / history.length) * 100 : 0;
                    
                    return (
                       <div key={room.id} className="group">
                          <div className="flex justify-between items-end mb-3">
                             <div>
                                <span className="text-sm font-black text-slate-800">{room.name_ar}</span>
                                <span className="mr-3 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase">{room.code}</span>
                             </div>
                             <div className="text-right">
                                <span className="text-xs font-black text-indigo-600">{roomRevenue} EGP</span>
                                <span className="mx-2 text-slate-200">|</span>
                                <span className="text-[10px] font-bold text-slate-500">{roomSessions.length} جلسة</span>
                             </div>
                          </div>
                          <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 flex items-center p-0.5">
                             <div 
                               className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-indigo-500 to-indigo-400" 
                               style={{ width: `${usagePct || 2}%` }}
                             />
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
        </div>
      )}

      {/* Manual Serve Modal */}
      {servingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 border border-white/20">
            <div className="bg-slate-900 p-12 flex justify-between items-center text-white relative">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
               <div className="relative z-10">
                  <h3 className="text-4xl font-black">{servingRoom.name_ar}</h3>
                  <p className="text-slate-400 font-bold mt-1 tracking-widest uppercase">بدء جلسة جديدة (Code: {servingRoom.code})</p>
               </div>
               <button onClick={() => setServingRoom(null)} className="relative z-10 p-3 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="p-12 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase mr-3 tracking-widest">كود العميل</label>
                     <input 
                       type="text" 
                       placeholder="#CUS-123" 
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black outline-none focus:border-indigo-500 transition-all uppercase" 
                       value={userCode} 
                       onChange={e => setUserCode(e.target.value)} 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase mr-3 tracking-widest">اسم العميل</label>
                     <input 
                       type="text" 
                       placeholder="الاسم الكامل" 
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black outline-none focus:border-indigo-500 transition-all" 
                       value={userName} 
                       onChange={e => setUserName(e.target.value)} 
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-3 tracking-widest">المدة المتوقعة (ساعة)</label>
                  <input 
                    type="number" 
                    min="0.5" 
                    step="0.5" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black outline-none focus:border-indigo-500 transition-all" 
                    value={durationHours} 
                    onChange={e => setDurationHours(e.target.value)} 
                  />
               </div>

               {checkFutureBooking(servingRoom.id) && (
                  <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex items-start gap-4 animate-pulse">
                     <div className="bg-amber-500 text-white p-2 rounded-xl">
                        <Calendar size={20} />
                     </div>
                     <div>
                        <p className="text-amber-900 font-black text-sm">تنبيه: حجز مؤكد الآن</p>
                        <p className="text-amber-700 text-[11px] font-bold mt-1 leading-relaxed">
                          هذه الغرفة محجوزة للعميل <span className="underline">{checkFutureBooking(servingRoom.id).user_name || checkFutureBooking(servingRoom.id).customers?.full_name}</span> من الساعة {formatTime(checkFutureBooking(servingRoom.id).start_time)}
                        </p>
                     </div>
                  </div>
               )}

               <button 
                 onClick={handleStartServing}
                 disabled={processing}
                 className="w-full bg-indigo-600 text-white h-24 rounded-[2.5rem] font-black text-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 mt-4 disabled:opacity-50"
               >
                 {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                 تأكيد وفتح الغرفة
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Catering Entry Modal Before Ending Session */}
      {showCateringEntry && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]">
              {/* Product List */}
              <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-800">إضافة طلبات الكافتريا</h3>
                    <div className="text-[10px] font-black uppercase text-slate-400 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">{showCateringEntry.room.name_ar}</div>
                 </div>
                 
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {inventory.map(item => (
                      <button 
                        key={item.id} 
                        onClick={() => addItemToTemp(item)}
                        className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all text-right group relative overflow-hidden"
                      >
                         <div className="bg-indigo-50 p-2 rounded-lg w-fit mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Plus size={16} />
                         </div>
                         <p className="font-black text-slate-800 text-sm mb-1">{item.name}</p>
                         <p className="text-indigo-600 font-bold text-xs">{item.selling_price || item.price} EGP</p>
                         <div className="mt-2 text-[9px] text-slate-400 font-bold">المتاح: {item.stock}</div>
                      </button>
                    ))}
                 </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="w-full md:w-96 bg-white border-r border-slate-100 flex flex-col p-8">
                 <div className="flex items-center justify-between mb-8">
                    <button onClick={() => setShowCateringEntry(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                    <div className="flex flex-col items-end">
                       <h4 className="font-black text-slate-900">ملخص الفاتورة</h4>
                       <p className="text-[9px] text-slate-400 uppercase tracking-widest">Billing Summary</p>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto space-y-4 mb-8">
                    {tempOrders.map(order => (
                       <div key={order.inventory_id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl group animate-in slide-in-from-left-2">
                          <button onClick={() => removeItemFromTemp(order.inventory_id)} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"><X size={14} /></button>
                          <div className="text-right">
                             <p className="font-black text-slate-800 text-xs">{order.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold">{order.quantity} × {order.price} EGP</p>
                          </div>
                       </div>
                    ))}
                    {tempOrders.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60 italic py-10">
                         <div className="w-12 h-12 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mb-2"><Plus size={16} /></div>
                         <p className="text-xs">لا توجد طلبات كافتريا</p>
                      </div>
                    )}
                 </div>

                 <div className="space-y-4 border-t border-slate-50 pt-6">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase pr-2">المدة (بالدقائق)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-black text-xs h-10"
                            value={overrideDuration}
                            onChange={e => setOverrideDuration(e.target.value)}
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase pr-2">حساب الغرفة (EGP)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-black text-xs h-10"
                            value={overrideRoomAmount}
                            onChange={e => setOverrideRoomAmount(e.target.value)}
                          />
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 pt-2">
                       <span>إجمالي الكافتريا</span>
                       <span className="font-black text-slate-700">{tempOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0)} EGP</span>
                    </div>

                    <div className="bg-indigo-600 p-4 rounded-2xl flex justify-between items-center text-white">
                       <span className="text-xs font-black uppercase opacity-60">الإجمالي النهائي</span>
                       <span className="text-xl font-black">
                          {(parseFloat(overrideRoomAmount || '0') + tempOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0)).toFixed(2)} EGP
                       </span>
                    </div>

                    <div className="pt-2">
                       <button 
                         onClick={finalizeEndServing} 
                         disabled={processing}
                         className="w-full bg-slate-900 text-white h-16 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200"
                        >
                          {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                          إنهاء الجلسة والدفع
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Enhanced Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in print:bg-white print:p-0">
           <div className="receipt-container bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none">
              <div className="bg-slate-900 p-8 text-center text-white relative print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-100">
                  <div className="absolute top-4 right-4 print:hidden">
                     <button onClick={() => setShowReceipt(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                  </div>
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4 print:text-slate-900" />
                  <h3 className="text-2xl font-black">فاتورة العميل</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 print:text-slate-500">Official Payment Receipt</p>
              </div>

              <div className="p-10 space-y-6">
                 {/* ID Section */}
                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl text-right">
                    <div className="text-left">
                       <p className="text-[10px] text-slate-400 font-black uppercase">الخدمة</p>
                       <p className="font-black text-slate-800">{showReceipt.roomName}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-black uppercase">العميل</p>
                       <p className="font-black text-slate-800">{showReceipt.userName} ({showReceipt.userCode})</p>
                    </div>
                 </div>

                 {/* Usage Section */}
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">تفاصيل استخدام الغرفة</h4>
                    <div className="bg-slate-50/50 rounded-2xl p-6 space-y-3 border border-slate-50">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                           <span>سعر الساعة</span>
                           <span className="text-slate-800">{showReceipt.rate} EGP</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                           <span>المدة الإجمالية</span>
                           <span className="text-slate-800">{showReceipt.duration} دقيقة</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black text-indigo-600 pt-2 border-t border-slate-100">
                           <span>حساب الغرفة</span>
                           <span>{showReceipt.workspaceAmount} EGP</span>
                        </div>
                    </div>
                 </div>

                 {/* Items Section */}
                 {showReceipt.items?.length > 0 && (
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">طلبات الكافتريا</h4>
                       <div className="bg-slate-50/50 rounded-2xl p-6 space-y-3 border border-slate-50">
                          {showReceipt.items.map((item: any, idx: number) => (
                             <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-500">
                                <span>{item.quantity} × {item.name}</span>
                                <span className="text-slate-800">{item.price * item.quantity} EGP</span>
                             </div>
                          ))}
                          <div className="flex justify-between items-center text-xs font-black text-indigo-600 pt-2 border-t border-slate-100">
                             <span>حساب الكافتريا</span>
                             <span>{showReceipt.cateringAmount} EGP</span>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* Grand Total */}
                 <div className="pt-6 border-t font-black">
                    <div className="flex justify-between items-end">
                       <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase">الإجمالي النهائي</p>
                          <p className="text-4xl text-indigo-600">{showReceipt.total} <span className="text-sm">EGP</span></p>
                       </div>
                       <div className="text-left text-[10px] text-slate-300">
                          {new Date(showReceipt.endTime).toLocaleString('ar-EG')}
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 print:hidden">
                    <button 
                      onClick={() => { window.print(); }} 
                      className="flex-1 bg-white border-2 border-slate-900 text-slate-900 py-4 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all active:scale-95"
                    >
                       تحميل PDF / طباعة
                    </button>
                    <button 
                      onClick={() => setShowReceipt(null)}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                    >
                       إغلاق
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* Edit History Modal */}
      {editingHistoryItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10">
              <div className="flex justify-between items-center mb-8">
                 <button onClick={() => setEditingHistoryItem(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
                 <div className="text-right">
                    <h3 className="text-xl font-black text-slate-900">تعديل سجل الجلسة</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{editingHistoryItem.services?.name_ar}</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase pr-2">المدة (بالدقائق)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 font-black outline-none focus:border-indigo-500 transition-all text-center"
                      value={editingHistoryItem.total_minutes}
                      onChange={e => setEditingHistoryItem({ ...editingHistoryItem, total_minutes: e.target.value })}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase pr-2">المبلغ الإجمالي (EGP)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 font-black outline-none focus:border-indigo-500 transition-all text-center"
                      value={editingHistoryItem.total_amount}
                      onChange={e => setEditingHistoryItem({ ...editingHistoryItem, total_amount: e.target.value })}
                    />
                 </div>

                 <button 
                  onClick={() => handleUpdateHistoryItem(editingHistoryItem)}
                  className="w-full bg-slate-900 text-white h-16 rounded-[2rem] font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 mt-4 active:scale-95"
                 >
                    حفظ التعديلات
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// CSS for Print Fix
const printStyles = `
@media print {
  body * {
    visibility: hidden !important;
  }
  .receipt-container, .receipt-container * {
    visibility: visible !important;
  }
  .receipt-container {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
  }
  .print\\:hidden {
    display: none !important;
  }
}
`;

// Inject Styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = printStyles;
  document.head.appendChild(style);
}
