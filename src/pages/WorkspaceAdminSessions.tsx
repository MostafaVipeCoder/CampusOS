import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, X, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Session {
  id: string;
  customer_id: string;
  user_code: string;
  phone_number: string;
  start_time: string;
  status: string;
  catering_amount: number;
  orders: any[];
  customers?: { full_name: string };
}

export const WorkspaceAdminSessions = ({ branchId }: { branchId?: string }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [checkoutBill, setCheckoutBill] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // UI update every minute

    const channel = supabase
      .channel('workspace_admin_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_sessions' },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_sessions')
        .select(`
          *,
          customers(full_name)
        `)
        .in('status', ['active', 'checkout_requested'])
        .order('start_time', { ascending: false });

      if (error) throw error;
      setSessions(data as any);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCheckout = async (session: Session) => {
    try {
      const endTime = new Date();
      const startTime = new Date(session.start_time);
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffMinutes = Math.max(1, Math.ceil(diffMs / 60000));
      
      const hourlyRate = 10;
      let workspaceAmount = parseFloat(((diffMinutes / 60) * hourlyRate).toFixed(2));
      if (workspaceAmount < 10) {
        workspaceAmount = 10; // الحد الأدنى ساعة واحدة
      }
      const cateringAmount = session.catering_amount || 0;
      const totalAmount = parseFloat((workspaceAmount + cateringAmount).toFixed(2));

      const { error } = await supabase
        .from('workspace_sessions')
        .update({
          status: 'completed',
          end_time: endTime.toISOString(),
          total_minutes: diffMinutes,
          total_amount: totalAmount
        })
        .eq('id', session.id);

      if (error) throw error;

      setCheckoutBill({
        ...session,
        workspaceAmount,
        cateringAmount,
        totalAmount,
        diffMinutes,
        endTime
      });

      fetchSessions();
    } catch (err: any) {
      alert('حدث خطأ أثناء إنهاء الجلسة');
      console.error(err);
    }
  };

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const requestedCount = sessions.filter(s => s.status === 'checkout_requested').length;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-[2rem] p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px]" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center">
              <Clock size={32} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-slate-500 font-bold mb-1">جلسات نشطة</p>
              <h3 className="text-4xl font-black text-slate-900">{activeCount}</h3>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2rem] p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px]" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-amber-500/20 w-16 h-16 rounded-2xl flex items-center justify-center">
              <AlertCircle size={32} className="text-amber-500" />
            </div>
            <div>
              <p className="text-slate-500 font-bold mb-1">طلبات خروج معلّقة</p>
              <h3 className="text-4xl font-black text-amber-600">{requestedCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass rounded-[3rem] p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">إدارة الجلسات الحالية</h2>
          <button 
            onClick={fetchSessions}
            className="p-3 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-indigo-100">
                <th className="py-4 px-6 text-indigo-900 font-black">المستخدم</th>
                <th className="py-4 px-6 text-indigo-900 font-black">رقم الهاتف</th>
                <th className="py-4 px-6 text-indigo-900 font-black">وقت البدء</th>
                <th className="py-4 px-6 text-indigo-900 font-black">الوقت المنقضي</th>
                <th className="py-4 px-6 text-indigo-900 font-black">طلبات الكافتريا</th>
                <th className="py-4 px-6 text-indigo-900 font-black">الحالة</th>
                <th className="py-4 px-6 text-indigo-900 font-black">تحديث</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const diffMs = now - new Date(session.start_time).getTime();
                const totalMins = Math.floor(diffMs / 60000);
                const hrs = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                
                return (
                  <tr key={session.id} className="border-b border-white/50 hover:bg-white/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800">{session.customers?.full_name || 'غير معروف'}</div>
                      <div className="text-sm font-semibold text-slate-500">{session.user_code}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-600">{session.phone_number}</td>
                    <td className="py-4 px-6 font-semibold text-slate-600">
                      {new Date(session.start_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-mono text-lg font-bold text-indigo-600">
                        {hrs} ساعة {mins} دقيقة
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800">
                        {session.catering_amount || 0} EGP
                      </div>
                      <div className="text-xs text-slate-500 max-w-[150px] truncate">
                        {session.orders?.length > 0 ? session.orders.map((o: any) => `${o.quantity}x ${o.name}`).join('، ') : 'لا يوجد طلبات'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {session.status === 'checkout_requested' ? (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 w-max">
                          <AlertCircle size={14} /> يطلب الخروج
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 size={14} /> نشط
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleAcceptCheckout(session)}
                        className={`px-4 py-2 rounded-xl text-white font-bold transition-transform hover:scale-105 ${
                          session.status === 'checkout_requested' 
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' 
                            : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                      >
                        إنهاء و محاسبة
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    لا يوجد جلسات نشطة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {checkoutBill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Receipt className="text-indigo-600" /> الفاتورة
              </h2>
              <button onClick={() => setCheckoutBill(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 mb-6">
              <div className="border-b border-slate-200 pb-4">
                <p className="text-sm font-bold text-slate-500 mb-1">العميل</p>
                <p className="text-lg font-black text-slate-900">{checkoutBill.customers?.full_name}</p>
                <p className="text-sm text-indigo-600 font-bold">{checkoutBill.user_code}</p>
              </div>
              
              <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                <span>وقت الجلوس:</span>
                <span>{checkoutBill.diffMinutes} دقيقة</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                <span>قيمة مساحة العمل (10 ج/س):</span>
                <span>{checkoutBill.workspaceAmount} EGP</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                <span>طلبات المتجر:</span>
                <span>{checkoutBill.cateringAmount} EGP</span>
              </div>
              
              {checkoutBill.orders && checkoutBill.orders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400 mb-2">تفاصيل المشتريات:</p>
                  <div className="space-y-1">
                    {checkoutBill.orders.map((o: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-bold text-slate-600">
                        <span>- {o.name} <span className="opacity-50">(x{o.quantity || 1})</span></span>
                        <span>{o.price} EGP</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 mt-2 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900">الإجمالي:</span>
                <span className="text-2xl font-black text-emerald-600">{checkoutBill.totalAmount} EGP</span>
              </div>
            </div>

            <button
              onClick={() => setCheckoutBill(null)}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
