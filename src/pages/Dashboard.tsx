
import React, { useState, useEffect } from 'react';
import { UserCheck, Wallet, Calendar, Users, TrendingUp, Loader2, RefreshCcw } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { supabase } from '../lib/supabase';

export const Dashboard = ({ branchId }: { branchId?: string }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    presentNow: 0,
    dailyRevenue: 0,
    roomOccupancy: 85, // Mock for now
    newMembersToday: 0,
    totalSubscriptions: 156, // Mock for now
    activeSubscriptions: 142,
    expiredSubscriptions: 14,
    retentionRate: 92,
  });

  useEffect(() => {
    if (branchId) fetchDashboardStats();
  }, [branchId]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // 1. Attendance Now
      const { count: presentNow, error: err1 } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .is('check_out', null);
      if (err1) throw err1;

      // 2. Daily Revenue
      const { data: visitsToday, error: err2 } = await supabase
        .from('visits')
        .select('paid_amount')
        .eq('branch_id', branchId)
        .gte('created_at', todayISO);
      if (err2) throw err2;
      const dailyRevenue = visitsToday?.reduce((acc, v) => acc + (Number(v.paid_amount) || 0), 0) || 0;

      // 3. New Members Today
      const { count: newMembersToday, error: err3 } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('home_branch_id', branchId)
        .gte('created_at', todayISO);
      if (err3) throw err3;

      // 4. Subscriptions
      const { data: subs, error: err4 } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('branch_id', branchId);
      if (err4) throw err4;

      const totalSubscriptions = subs?.length || 0;
      const activeSubscriptions = subs?.filter(s => s.status === 'Active').length || 0;
      const expiredSubscriptions = totalSubscriptions - activeSubscriptions;

      // 5. Room Occupancy (Mock logic based on bookings today vs total capacity)
      const { count: activeBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('booking_date', today.toISOString().split('T')[0])
        .eq('status', 'Confirmed');

      const { data: rooms } = await supabase
        .from('services')
        .select('capacity')
        .eq('branch_id', branchId)
        .eq('service_type', 'Room');

      const totalCapacity = rooms?.reduce((acc, r) => acc + (r.capacity || 0), 0) || 10; // Default 10 if no rooms
      const roomOccupancy = Math.min(100, Math.round(((activeBookings || 0) / totalCapacity) * 100));

      setStats(prev => ({
        ...prev,
        presentNow: presentNow || 0,
        dailyRevenue,
        newMembersToday: newMembersToday || 0,
        totalSubscriptions,
        activeSubscriptions,
        expiredSubscriptions,
        roomOccupancy,
      }));

      // 6. Retention Rate (% of customers with > 1 visit)
      const { data: allVisits, error: err6 } = await supabase
        .from('visits')
        .select('customer_id')
        .eq('branch_id', branchId);

      if (!err6 && allVisits) {
        const customerVisitCounts = allVisits.reduce((acc: any, v) => {
          if (v.customer_id) {
            acc[v.customer_id] = (acc[v.customer_id] || 0) + 1;
          }
          return acc;
        }, {});

        const totalCustomers = Object.keys(customerVisitCounts).length;
        const recurringCustomers = Object.values(customerVisitCounts).filter((count: any) => count > 1).length;
        const retentionRate = totalCustomers > 0 ? Math.round((recurringCustomers / totalCustomers) * 100) : 0;

        setStats(prev => ({ ...prev, retentionRate }));
      }

    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Cairo'] text-right">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-slate-800">لوحة التحكم</h2>
        <button
          onClick={fetchDashboardStats}
          disabled={loading}
          className="p-2 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="تحديث البيانات"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-400'} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-10 rounded-3xl" />
        )}
        <StatCard title="الحضور الآن" value={stats.presentNow.toString()} icon={UserCheck} trend={12} />
        <StatCard title="إيراد اليوم (EGP)" value={stats.dailyRevenue.toLocaleString()} icon={Wallet} trend={8} />
        <StatCard title="إشغال الغرف" value={`${stats.roomOccupancy}%`} icon={Calendar} trend={-2} />
        <StatCard title="أعضاء جدد" value={stats.newMembersToday.toString()} icon={Users} trend={15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>تحليلات الأداء</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 bg-slate-50/50 rounded-[1.5rem] flex items-center justify-center border-2 border-dashed border-slate-100">
              <TrendingUp size={64} className="text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تحليلات الاشتراكات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Subscriptions */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-slate-500 font-bold text-xs mb-1">إجمالي الاشتراكات</p>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-800">{stats.totalSubscriptions}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+12%</span>
              </div>
            </div>

            {/* Active vs Expired */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-600">نشط / منتهي</span>
                <span className="text-slate-800">{stats.activeSubscriptions} / {stats.expiredSubscriptions}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-500 h-full rounded-r-full"
                  style={{ width: `${(stats.activeSubscriptions / stats.totalSubscriptions) * 100}%` }}
                ></div>
                <div className="bg-rose-200 h-full flex-1"></div>
              </div>
            </div>

            {/* Retention Rate */}
            <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.92} strokeDashoffset={175.92 - (175.92 * stats.retentionRate) / 100} className="text-indigo-600" />
                </svg>
                <span className="absolute text-sm font-black text-indigo-900">{stats.retentionRate}%</span>
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">معدل الحفاظ على العملاء</p>
                <p className="text-xs text-slate-400 font-bold mt-1">أعلى من المعدل الطبيعي بـ 5%</p>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};
