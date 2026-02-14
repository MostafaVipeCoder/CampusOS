import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, UserCheck, ClipboardCheck, Users2, Award, Layers, Calendar, Wallet, Receipt, Package, Users, Settings, LogOut } from 'lucide-react';

export const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const menuItems = [
    { id: 'dashboard', label: 'لوحة القيادة', path: '/dashboard', icon: LayoutDashboard },
    { id: 'checkin', label: 'بوابة الدخول', path: '/checkin', icon: UserCheck },
    { id: 'daily_log', label: 'سجل الحضور', path: '/daily_log', icon: ClipboardCheck },
    { id: 'customers', label: 'قاعدة العملاء', path: '/customers', icon: Users2 },
    { id: 'subscriptions', label: 'الاشتراكات', path: '/subscriptions', icon: Award },
    { id: 'contracts', label: 'التعاقدات', path: '/contracts', icon: Layers },
    { id: 'bookings', label: 'الحجوزات', path: '/bookings', icon: Calendar },
    { id: 'finance', label: 'المالية والتقارير', path: '/finance', icon: Wallet },
    { id: 'expenses', label: 'المصروفات', path: '/expenses', icon: Receipt },
    { id: 'inventory', label: 'المخزن', path: '/inventory', icon: Package },
    { id: 'activities', label: 'الأنشطة', path: '/activities', icon: Calendar },
    { id: 'staff', label: 'المهام', path: '/staff', icon: Users },
    { id: 'settings', label: 'الإعدادات', path: '/settings', icon: Settings },
  ];
  return (
    <aside className="w-64 bg-slate-900 text-white fixed h-screen right-0 top-0 z-50 flex flex-col font-['Cairo'] shadow-2xl">
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">C</div>
          <h2 className="text-xl font-black tracking-widest uppercase text-right">Campus</h2>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'animate-pulse' : ''} />
                <span className="font-bold text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3.5 text-rose-400 hover:bg-rose-400/10 rounded-2xl transition-all font-bold"
        >
          <LogOut size={20} /><span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};
