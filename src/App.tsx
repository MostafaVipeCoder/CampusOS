import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { Campus } from './types';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { BookingsManager } from './pages/BookingsManager';
import { SubscriptionsPanel } from './pages/SubscriptionsPanel';
import { ContractsPanel } from './pages/ContractsPanel';
import { SettingsPanel } from './pages/SettingsPanel';
import { CheckinPortal } from './pages/CheckinPortal';
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
    <div className="flex min-h-screen bg-slate-50 font-['Cairo'] text-slate-800 antialiased selection:bg-indigo-100">
      <Sidebar />
      <main className="flex-1 mr-64">
        {currentCampus && <Header currentCampus={currentCampus} setCampus={setCampus} branches={branches} />}
        <div className="p-10 max-w-[1600px] mx-auto text-right">
          <div className="mb-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              {getPageTitle(location.pathname)}
            </h1>
            <p className="text-slate-500 font-bold text-lg">إدارة العمليات المركزية في {currentCampus?.name || '...'}</p>
          </div>
          <div className="relative">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard branchId={currentCampus?.id} />} />
              <Route path="/checkin" element={<CheckinPortal branchId={currentCampus?.id} />} />
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
                <div className="p-20 text-center bg-white rounded-[3rem] border border-slate-100 font-black text-slate-300">
                  الصفحة غير موجودة
                </div>
              } />
            </Routes>
          </div>
        </div>
      </main>
      <button
        onClick={() => navigate('/checkin')}
        className="fixed bottom-10 left-10 w-20 h-20 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex items-center justify-center hover:bg-indigo-600 hover:rotate-12 transition-all duration-500 z-50 border-4 border-white"
      >
        <QrCode size={40} />
      </button>
    </div>
  );
};

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<DashboardLayout />} />
    </Routes>
  );
};
