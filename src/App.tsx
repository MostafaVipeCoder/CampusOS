import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { Campus } from './types';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WorkspaceLogin } from './pages/WorkspaceLogin';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { BookingsManager } from './pages/BookingsManager';
import { SubscriptionsPanel } from './pages/SubscriptionsPanel';
import { ContractsPanel } from './pages/ContractsPanel';
import { SettingsPanel } from './pages/SettingsPanel';
import { CheckinPortal } from './pages/CheckinPortal';
import { WorkspaceAdminSessions } from './pages/WorkspaceAdminSessions';
import { DailyLog } from './pages/DailyLog';
import { CustomerDatabase } from './pages/CustomerDatabase';
import { StaffManagement } from './pages/StaffManagement';
import { FinancePanel } from './pages/FinancePanel';
import { ExpensesPanel } from './pages/ExpensesPanel';
import { InventoryPanel } from './pages/InventoryPanel';
import { ActivitiesPage } from './pages/ActivitiesPage';

const DashboardLayout = () => {
  const [branches, setBranches] = useState<Campus[]>([]);
  const [currentCampus, setCampus] = useState<Campus | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase.from('branches').select('id, name').eq('is_active', true);
      if (data) {
        const formatted = data.map(b => ({ id: b.id, name: b.name, color: 'blue' })); // Default color blue
        setBranches(formatted);
        if (formatted.length > 0) setCampus(formatted[0]);
      }
    };
    fetchBranches();
  }, []);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/dashboard': return 'لوحة القيادة';
      case '/checkin': return 'بوابة الدخول';
      case '/admin-sessions': return 'متابعة جلسات مكاتب العمل';
      case '/daily_log': return 'سجل الحضور اليومي';
      case '/customers': return 'قاعدة بيانات العملاء';
      case '/bookings': return 'جدول الحجوزات';
      case '/subscriptions': return 'إدارة الاشتراكات';
      case '/contracts': return 'التعاقدات والشراكات';
      case '/staff': return 'إدارة المهام والأداء';
      case '/finance': return 'التقارير المالية والتحليل';
      case '/expenses': return 'سجل المصروفات';
      case '/inventory': return 'إدارة المخزن';
      case '/activities': return 'خطة الأنشطة السنوية';
      case '/settings': return 'إعدادات النظام';
      default: return 'Campus OS';
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent font-['Cairo'] text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      <Sidebar />
      <main className="flex-1 mr-64 relative min-h-screen">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 pointer-events-none" />
        
        {currentCampus && <Header currentCampus={currentCampus} setCampus={setCampus} branches={branches} />}
        
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto text-right animate-fade-in-up">
          <div className="mb-12 flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {getPageTitle(location.pathname)}
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-indigo-500 rounded-full" />
              <p className="text-slate-500 font-bold text-lg">إدارة العمليات المركزية في {currentCampus?.name || '...'}</p>
            </div>
          </div>
          
          <div className="relative">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard branchId={currentCampus?.id} />} />
              <Route path="/checkin" element={<CheckinPortal branchId={currentCampus?.id} />} />
              <Route path="/admin-sessions" element={<WorkspaceAdminSessions branchId={currentCampus?.id} />} />
              <Route path="/daily_log" element={<DailyLog branchId={currentCampus?.id} />} />
              <Route path="/customers" element={<CustomerDatabase branchId={currentCampus?.id} />} />
              <Route path="/bookings" element={<BookingsManager branchId={currentCampus?.id} />} />
              <Route path="/subscriptions" element={<SubscriptionsPanel branchId={currentCampus?.id} />} />
              <Route path="/contracts" element={<ContractsPanel branchId={currentCampus?.id} />} />
              <Route path="/staff" element={<StaffManagement branchId={currentCampus?.id} />} />
              <Route path="/finance" element={<FinancePanel branchId={currentCampus?.id} />} />
              <Route path="/expenses" element={<ExpensesPanel branchId={currentCampus?.id} />} />
              <Route path="/inventory" element={<InventoryPanel branchId={currentCampus?.id} />} />
              <Route path="/activities" element={<ActivitiesPage branchId={currentCampus?.id} />} />
              <Route path="/settings" element={<SettingsPanel branchId={currentCampus?.id} />} />
              <Route path="*" element={
                <div className="p-20 text-center glass rounded-[3rem] font-black justify-center items-center flex flex-col gap-4">
                  <div className="text-6xl text-slate-300">404</div>
                  <div className="text-xl text-slate-400">الصفحة غير موجودة</div>
                </div>
              } />
            </Routes>
          </div>
        </div>
      </main>
      <button
        onClick={() => navigate('/checkin')}
        className="fixed bottom-10 left-10 w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(79,70,229,0.5)] flex items-center justify-center hover:scale-110 hover:rotate-12 hover:shadow-[0_30px_50px_-15px_rgba(79,70,229,0.7)] hover:-translate-y-2 transition-all duration-500 z-50 border border-white/20 group"
      >
        <QrCode size={36} className="group-hover:animate-pulse" />
      </button>
    </div>
  );
};

export const App = () => {
  return (
    <Routes>
      <Route path="/workspace" element={<WorkspaceLogin />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<DashboardLayout />} />
    </Routes>
  );
};
