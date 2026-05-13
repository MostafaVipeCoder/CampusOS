
import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, PieChart, BarChart3,
  ArrowUpRight, DollarSign, Calendar, ChevronRight,
  ChevronLeft, Plus, Save, Calculator, CheckCircle2,
  AlertCircle, Receipt, Printer, X, Wallet, ArrowRightLeft,
  ChevronUp, ChevronDown, Lock, Edit, Trash2, Phone, Smartphone, Users2, Briefcase
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Modal } from '../components/ui';
import { supabase } from '../lib/supabase';

export const FinancePanel = ({ branchId }: { branchId?: string }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'annual' | 'digital' | 'analytics'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [dailyData, setDailyData] = useState({
    income: 0,
    expense: 0,
    details: { catering: 0, rooms: 0, workspace: 0, subscriptions: 0, corporate: 0, vfcash: 0, instapay: 0 },
    vfcashPayments: [] as any[]
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState({
    total_in: 0,
    total_out: 0,
    total_cash: 0,
    cash_cloud: 0,
    cash_athar: 0,
    // Previous balances (manual offsets)
    total_in_prev: 0,
    total_out_prev: 0,
    total_cash_prev: 0,
    cash_cloud_prev: 0,
    cash_athar_prev: 0,
    final_balance_prev: 0
  });
  const [activeSummaryEdit, setActiveSummaryEdit] = useState<{
    key: string;
    label: string;
    icon: any;
    color: string;
  } | null>(null);
  const [summaryEditValue, setSummaryEditValue] = useState('');

  // Real Petty Cash Database State
  const [pettyTransactions, setPettyTransactions] = useState<any[]>([]);

  // Modal States
  const [showPettyModal, setShowPettyModal] = useState<'add' | 'withdraw' | null>(null);
  const [showCloseMonthModal, setShowCloseMonthModal] = useState(false);
  const [pettyActionValue, setPettyActionValue] = useState('');
  const [pettyNote, setPettyNote] = useState('');
  const [rolloverOption, setRolloverOption] = useState<'rollover' | 'settle'>('rollover');
  const [notification, setNotification] = useState<string | null>(null);

  // Closed Months "Database" (Real Integration)
  const [closedMonths, setClosedMonths] = useState<{ [key: string]: any }>({});

  const [editingPetty, setEditingPetty] = useState<any | null>(null);
  const [editingDailyLog, setEditingDailyLog] = useState<any | null>(null);
  const [editDailyIncome, setEditDailyIncome] = useState('');
  const [editDailyExpense, setEditDailyExpense] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueByCategory: { [key: string]: number };
    roomUsage: { name: string; count: number; revenue: number }[];
    paymentMethods: { [key: string]: number };
    dailyPerformance: { date: string; revenue: number; expenses: number }[];
    sessions: any[];
  }>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueByCategory: {},
    roomUsage: [],
    paymentMethods: {},
    dailyPerformance: [],
    sessions: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchReport, setSearchReport] = useState<any[] | null>(null);
  const [editingPaymentSession, setEditingPaymentSession] = useState<any | null>(null);



  // Cash Drawer State
  const [cashDrawer, setCashDrawer] = useState<{ [key: number]: string }>({
    200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 1: ''
  });

  const denominations = [200, 100, 50, 20, 10, 5, 1];

  const parseExpression = (val: string): number => {
    if (!val) return 0;
    const clean = val.startsWith('=') ? val.substring(1) : val;
    try {
      // Handle simple addition expressions like "100+5+2"
      const parts = clean.split('+').map(p => parseFloat(p.trim()));
      return parts.reduce((sum, p) => sum + (isNaN(p) ? 0 : p), 0);
    } catch {
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    }
  };

  const totalCountedCash = useMemo(() => {
    return denominations.reduce((sum, den) => {
      const expr = cashDrawer[den] || '0';
      const count = parseExpression(expr);
      return sum + (count * den);
    }, 0);
  }, [cashDrawer, denominations]);

  // Calculations
  const pettyCashStats = useMemo(() => {
    return pettyTransactions.reduce((acc, curr) => {
      if (curr.type === 'add') acc.added += Number(curr.amount);
      else acc.withdrawn += Number(curr.amount);
      return acc;
    }, { added: 0, withdrawn: 0 });
  }, [pettyTransactions]);

  // Computed Treasury Values incorporating Manual Offsets (Previous Balances)
  const computedSummary = useMemo(() => {
    // 1. Get Base System Values
    const base_in = Number(financeSummary.total_in) || 0;
    const base_out = Number(financeSummary.total_out) || 0;
    const base_athar = Number(financeSummary.cash_athar) || 0;
    
    // 2. Add Respective Manual Offsets (رصيد سابق لكل خانة)
    const total_in = base_in + (Number(financeSummary.total_in_prev) || 0);
    const total_out = base_out + (Number(financeSummary.total_out_prev) || 0);
    const cash_athar = base_athar + (Number(financeSummary.cash_athar_prev) || 0);
    
    // 3. Perform Logic Calculations
    // اجمالي الكاش هو طرح الخارج من الداخل + رصيد الكاش السابق
    const total_cash = (total_in - total_out) + (Number(financeSummary.total_cash_prev) || 0);
    
    // الكاش في كلاود هو فرق اجمالي الكاش عن الكاش في اثر + رصيد كلاود السابق
    const cash_cloud = (total_cash - cash_athar) + (Number(financeSummary.cash_cloud_prev) || 0);
    
    // الفلوس في الخزنة أصبحت قيمة يدوية بالكامل (Manual Entry)
    const safe_balance = (Number(financeSummary.safe_balance) || 0) + (Number(financeSummary.safe_balance_prev) || 0);

    return {
      total_in,
      total_out,
      total_cash,
      cash_athar,
      cash_cloud,
      safe_balance
    };
  }, [financeSummary, totalCountedCash]);


  useEffect(() => {
    if (branchId) {
      fetchData();
      
      const channel = supabase.channel(`finance_realtime_${branchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'petty_cash' }, () => fetchPettyTransactions())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_closings' }, () => fetchClosedMonths())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_sessions', filter: `branch_id=eq.${branchId}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `branch_id=eq.${branchId}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `branch_id=eq.${branchId}` }, () => fetchData())
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [branchId, currentDate, activeTab, viewDate, analyticsPeriod]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDailyFinance(),
      fetchPettyTransactions(),
      fetchClosedMonths(),
      fetchFinanceSummary(),
      fetchMonthlyClosingsHistory(),
      fetchAnalyticsData()
    ]);
    setLoading(false);
  };

  const fetchAnalyticsData = async () => {
    if (!branchId) return;
    setLoading(true);
    
    let start, end;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    
    if (analyticsPeriod === 'day') {
      const dateStr = viewDate.toLocaleDateString('en-CA');
      start = `${dateStr}T00:00:00`;
      end = `${dateStr}T23:59:59`;
    } else if (analyticsPeriod === 'month') {
      const lastDay = new Date(year, month, 0).getDate();
      start = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00`;
      end = `${year}-${month.toString().padStart(2, '0')}-${lastDay}T23:59:59`;
    } else {
      start = `${year}-01-01T00:00:00`;
      end = `${year}-12-31T23:59:59`;
    }

    try {
      const [
        { data: sessions },
        { data: subs },
        { data: expenses },
        { data: services }
      ] = await Promise.all([
        (supabase as any).from('workspace_sessions').select('*, services(name_ar)').eq('branch_id', branchId).eq('status', 'completed').gte('end_time', start).lte('end_time', end),
        (supabase as any).from('subscriptions').select('*').eq('branch_id', branchId).gte('created_at', start).lte('created_at', end),
        (supabase as any).from('expenses').select('*').eq('branch_id', branchId).gte('date', start.split('T')[0]).lte('date', end.split('T')[0]),
        (supabase as any).from('services').select('id, name_ar').eq('branch_id', branchId)
      ]);

      // Process Revenue
      let totalRevenue = 0;
      const revenueByCategory: { [key: string]: number } = {
        'Catering': 0,
        'Workspace': 0,
        'Rooms': 0,
        'Subscriptions': 0,
        'Corporate': 0
      };
      const paymentMethods: { [key: string]: number } = {};
      const roomUsageMap: { [key: string]: { count: number; revenue: number; name: string } } = {};

      sessions?.forEach(s => {
        const total = Number(s.total_amount) || 0;
        const catering = Number(s.catering_amount) || 0;
        const workspace = Math.max(0, total - catering);
        
        totalRevenue += total;
        revenueByCategory['Catering'] += catering;
        
        if (s.service_id) {
          revenueByCategory['Rooms'] += workspace;
        } else {
          revenueByCategory['Workspace'] += workspace;
        }
        
        if (s.payment_method === 'corporate') {
          revenueByCategory['Corporate'] += total;
        }

        const method = s.payment_method || 'cash';
        paymentMethods[method] = (paymentMethods[method] || 0) + total;

        if (s.service_id) {
          if (!roomUsageMap[s.service_id]) {
            const serviceName = s.services?.name_ar || services?.find((sv: any) => sv.id === s.service_id)?.name_ar || 'Unknown Room';
            roomUsageMap[s.service_id] = { count: 0, revenue: 0, name: serviceName };
          }
          roomUsageMap[s.service_id].count += 1;
          roomUsageMap[s.service_id].revenue += total;
        }
      });

      subs?.forEach(sb => {
        const paid = Number(sb.paid) || 0;
        totalRevenue += paid;
        revenueByCategory['Subscriptions'] += paid;
        paymentMethods['cash'] = (paymentMethods['cash'] || 0) + paid;
      });

      const totalExpenses = expenses?.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0) || 0;

      // Daily Performance
      const performanceMap: { [key: string]: { revenue: number; expenses: number } } = {};
      sessions?.forEach(s => {
        const d = new Date(s.end_time).toISOString().split('T')[0];
        if (!performanceMap[d]) performanceMap[d] = { revenue: 0, expenses: 0 };
        performanceMap[d].revenue += Number(s.total_amount) || 0;
      });
      subs?.forEach(sb => {
        const d = new Date(sb.created_at).toISOString().split('T')[0];
        if (!performanceMap[d]) performanceMap[d] = { revenue: 0, expenses: 0 };
        performanceMap[d].revenue += Number(sb.paid) || 0;
      });
      expenses?.forEach(e => {
        const d = e.date;
        if (!performanceMap[d]) performanceMap[d] = { revenue: 0, expenses: 0 };
        performanceMap[d].expenses += Number(e.amount) || 0;
      });

      setAnalyticsData({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        revenueByCategory,
        roomUsage: Object.values(roomUsageMap).sort((a, b) => b.revenue - a.revenue),
        paymentMethods,
        dailyPerformance: Object.keys(performanceMap).sort().map(date => ({
          date,
          revenue: performanceMap[date].revenue,
          expenses: performanceMap[date].expenses
        })),
        sessions: sessions || []
      });

    } finally {
      setLoading(false);
    }
  };

  const handlePrevPeriod = () => {
    const newDate = new Date(viewDate);
    if (analyticsPeriod === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (analyticsPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setViewDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(viewDate);
    if (analyticsPeriod === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (analyticsPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setViewDate(newDate);
  };

  const fetchSearchReport = async () => {
    if (!searchQuery || !branchId) return;
    setLoading(true);
    try {
      const { data: sessions } = await (supabase as any)
        .from('workspace_sessions')
        .select('*, services(name_ar)')
        .eq('branch_id', branchId)
        .or(`user_code.ilike.%${searchQuery}%,user_name.ilike.%${searchQuery}%`)
        .order('start_time', { ascending: false });
      
      setSearchReport(sessions || []);
    } catch (err) {
      console.error(searchQuery, err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async (sessionId: string, newMethod: string) => {
    try {
      // 1. Fetch current session data to calculate differences
      const { data: session, error: fetchErr } = await (supabase as any)
        .from('workspace_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (fetchErr) throw fetchErr;
      const oldMethod = session.payment_method || 'cash';
      const amount = Number(session.total_amount) || 0;
      const dateStr = new Date(session.end_time).toLocaleDateString('en-CA');

      // 2. Prepare session updates
      const updates: any = { payment_method: newMethod };
      if (newMethod === 'cash') {
        updates.vfcash_admin_id = null;
        updates.vfcash_payment_time = null;
        updates.vfcash_whatsapp_confirmed = false;
      } else if (newMethod === 'vfcash' || newMethod === 'instapay') {
        updates.vfcash_payment_time = new Date().toISOString();
      }

      // 3. Update the session itself
      const { error: updateErr } = await (supabase as any)
        .from('workspace_sessions')
        .update(updates)
        .eq('id', sessionId);
      
      if (updateErr) throw updateErr;

      // 4. Update the Daily History (daily_closings) if it exists
      if (oldMethod !== newMethod) {
        const { data: closing } = await (supabase as any)
          .from('daily_closings')
          .select('*')
          .eq('branch_id', branchId)
          .eq('date', dateStr)
          .single();

        if (closing) {
          let newExpectedCash = Number(closing.expected_cash) || 0;
          let newVfCash = Number(closing.vfcash_total) || 0;
          let newInstaPay = Number(closing.instapay_total) || 0;

          // Deduct from old method
          if (oldMethod === 'cash') newExpectedCash -= amount;
          else if (oldMethod === 'vfcash') newVfCash -= amount;
          else if (oldMethod === 'instapay') newInstaPay -= amount;

          // Add to new method
          if (newMethod === 'cash') newExpectedCash += amount;
          else if (newMethod === 'vfcash') newVfCash += amount;
          else if (newMethod === 'instapay') newInstaPay += amount;

          await (supabase as any)
            .from('daily_closings')
            .update({
              expected_cash: newExpectedCash,
              vfcash_total: newVfCash,
              instapay_total: newInstaPay,
              difference: Number(closing.actual_cash) - newExpectedCash
            })
            .eq('id', closing.id);
        }
      }

      showNotification('تم تحديث وسيلة الدفع وتعديل السجل المالي بنجاح');
      setEditingPaymentSession(null);
      fetchData(); 
      if (activeTab === 'analytics' && searchReport) fetchSearchReport();
    } catch (err: any) {
      alert('خطأ في التحديث: ' + err.message);
    }
  };

  const fetchFinanceSummary = async () => {
    if (!branchId) return;
    
    try {
      // 1. Fetch persistent data (primarily for cash_athar)
      const { data: summaryData } = await (supabase as any)
        .from('finance_summary')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();

      // 2. Fetch all-time system data for accurate calculations
      const [
        { data: sessions },
        { data: subscriptions },
        { data: expenses },
        { data: petty }
      ] = await Promise.all([
        (supabase as any).from('workspace_sessions').select('total_amount').eq('branch_id', branchId).eq('status', 'completed'),
        (supabase as any).from('subscriptions').select('paid').eq('branch_id', branchId),
        (supabase as any).from('expenses').select('amount').eq('branch_id', branchId),
        (supabase as any).from('petty_cash').select('amount, type').eq('branch_id', branchId)
      ]);

      const sessionsSum = (sessions as any[])?.reduce((s, b) => s + (Number(b.total_amount) || 0), 0) || 0;
      const subsSum = (subscriptions as any[])?.reduce((s, b) => s + (Number(b.paid) || 0), 0) || 0;
      const expenseSum = (expenses as any[])?.reduce((s, b) => s + (Number(b.amount) || 0), 0) || 0;
      
      const pettyInSum = (petty as any[])?.filter(p => p.type === 'add').reduce((s, b) => s + (Number(b.amount) || 0), 0) || 0;
      const pettyOutSum = (petty as any[])?.filter(p => p.type === 'withdraw').reduce((s, b) => s + (Number(b.amount) || 0), 0) || 0;


      const total_in = sessionsSum + subsSum + pettyInSum;
      const total_out = expenseSum + pettyOutSum;
      const cash_athar = summaryData?.cash_athar || 0;

      // Fallback: Load offsets and manual balances from LocalStorage since DB schema is locked
      const localData = JSON.parse(localStorage.getItem(`finance_offsets_${branchId}`) || '{}');

      const finalData = {
        ...financeSummary,
        total_in,
        total_out,
        cash_athar,
        safe_balance: localData.safe_balance || 0,
        total_in_prev: localData.total_in_prev || 0,
        total_out_prev: localData.total_out_prev || 0,
        total_cash_prev: localData.total_cash_prev || 0,
        cash_athar_prev: localData.cash_athar_prev || 0,
        cash_cloud_prev: localData.cash_cloud_prev || 0,
        safe_balance_prev: localData.safe_balance_prev || 0
      };

      setFinanceSummary(finalData as any);
    } catch (err) {
      console.error('Error fetching system totals:', err);
    }
  };


  const saveFinanceSummaryOffset = async (key: string, newValue: number) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const isBaseManual = ['cash_athar', 'safe_balance'].includes(key);
      const storageKey = isBaseManual ? key : `${key}_prev`;
      
      const newSummary = { ...financeSummary, [storageKey]: newValue };

      // 1. Update Server Only for Core Fields (that exist in DB)
      const { data: existing } = await (supabase as any)
        .from('finance_summary')
        .select('id')
        .eq('branch_id', branchId)
        .maybeSingle();

      const serverPayload = {
        branch_id: branchId,
        total_in: newSummary.total_in,
        total_out: newSummary.total_out,
        cash_athar: newSummary.cash_athar,
        // (Excluding safe_balance and _prev columns to avoid DB errors)
      };

      if (existing?.id) {
        await (supabase as any).from('finance_summary').update(serverPayload).eq('id', existing.id);
      } else {
        await (supabase as any).from('finance_summary').insert(serverPayload);
      }

      // 2. Update LocalStorage for the Custom/Manual Fields
      const localData = {
        safe_balance: newSummary.safe_balance,
        total_in_prev: newSummary.total_in_prev,
        total_out_prev: newSummary.total_out_prev,
        total_cash_prev: newSummary.total_cash_prev,
        cash_athar_prev: newSummary.cash_athar_prev,
        cash_cloud_prev: newSummary.cash_cloud_prev,
        safe_balance_prev: newSummary.safe_balance_prev
      };
      localStorage.setItem(`finance_offsets_${branchId}`, JSON.stringify(localData));
      
      setFinanceSummary(newSummary);
      setActiveSummaryEdit(null);
      showNotification('تم تحديث الرصيد بنجاح');
    } catch (err: any) {
      alert('خطأ في الحفظ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPettyTransactions = async () => {
    if (!branchId) return;
    const { data } = await (supabase as any)
      .from('petty_cash')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });
    setPettyTransactions(data || []);
  };

  const fetchClosedMonths = async () => {
    if (!branchId) return;
    const { data } = await (supabase as any)
      .from('monthly_closings')
      .select('*')
      .eq('branch_id', branchId);

    if (data) {
      const monthMap = data.reduce((acc: any, m: any) => {
        acc[m.month_key] = { income: m.total_income, expense: m.total_expense, net: m.net_profit };
        return acc;
      }, {});
      setClosedMonths(monthMap);
    }
  };

  const fetchDailyFinance = async () => {
    const dateStr = currentDate.toLocaleDateString('en-CA');

    try {
      // 1. Fetch Workspace Sessions Income
      const { data: sessions } = await (supabase as any)
        .from('workspace_sessions')
        .select('total_amount, catering_amount, payment_method, service_id, vfcash_admin_id, vfcash_payment_time, vfcash_whatsapp_confirmed, user_name, user_code, id, end_time, profiles:vfcash_admin_id(full_name)')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .gte('end_time', `${dateStr}T00:00:00`)
        .lte('end_time', `${dateStr}T23:59:59`);

      // 2. Fetch Subscriptions Income (Cash in)
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('paid')
        .eq('branch_id', branchId)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);

      // 3. Fetch Daily Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('branch_id', branchId)
        .eq('date', dateStr);

      // 4. Fetch Petty Cash Additions (Manual floor income)
      const { data: pettyAdds } = await (supabase as any)
        .from('petty_cash')
        .select('amount')
        .eq('branch_id', branchId)
        .eq('type', 'add')
        .gte('created_at', `${dateStr}T00:00:00`);

      let workspaceCash = 0, roomsCash = 0, cateringCash = 0, corporateUsage = 0, vfcashIncome = 0, instapayIncome = 0;
      const vfcashPayments: any[] = [];
      
      sessions?.forEach(s => {
        if (s.payment_method === 'owner') return;
        const cat = Number(s.catering_amount) || 0;
        const total = Number(s.total_amount) || 0;
        const serviceAmount = Math.max(0, total - cat);
        
        if (s.payment_method === 'corporate') {
           corporateUsage += total;
        } else if (s.payment_method === 'vfcash') {
           vfcashIncome += total;
           vfcashPayments.push(s);
        } else if (s.payment_method === 'instapay') {
           instapayIncome += total;
           vfcashPayments.push(s);
        } else {
           cateringCash += cat;
           if (s.service_id) {
             roomsCash += serviceAmount;
           } else {
             workspaceCash += serviceAmount;
           }
        }
      });

      const subIncome = subs?.reduce((s, b) => s + (Number(b.paid) || 0), 0) || 0;
      
      // ONLY include actual cash payments in totalIncome
      const totalIncome = workspaceCash + roomsCash + cateringCash + subIncome;
      const totalExpense = expenses?.reduce((s, e) => s + (Number(e.amount) || 0), 0) || 0;

      setDailyData({
        income: totalIncome,
        expense: totalExpense,
        details: { 
           catering: cateringCash, 
           rooms: roomsCash, 
           workspace: workspaceCash, 
           vfcash: vfcashIncome,
           instapay: instapayIncome,
           subscriptions: subIncome,
           corporate: corporateUsage
        },
        vfcashPayments
      });

      // Load existing inventory/closing if it exists
      await fetchDailyClosing(dateStr);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDailyClosing = async (dateStr: string) => {
    try {
      // 1. Try LocalStorage first (for instant recovery/fallback)
      const localKey = `inventory_${branchId}_${dateStr}`;
      const localData = localStorage.getItem(localKey);
      
      // 2. Try DB
      const { data: dbData } = await (supabase as any)
        .from('daily_closings')
        .select('denominations')
        .eq('branch_id', branchId)
        .eq('date', dateStr)
        .maybeSingle();

      if (localData) {
        setCashDrawer(JSON.parse(localData));
      } else if (dbData?.denominations) {
        setCashDrawer(dbData.denominations);
      } else {
        setCashDrawer({
          200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 1: ''
        });
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  };

  const fetchMonthlyFinance = async () => {
    setLoading(true);
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
      // 1. Fetch Monthly Workspace Sessions
      const { data: sessions } = await (supabase as any)
        .from('workspace_sessions')
        .select('total_amount, catering_amount, payment_method, service_id')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .gte('end_time', `${firstDay}T00:00:00`)
        .lte('end_time', `${lastDay}T23:59:59`);

      // 2. Fetch Monthly Subscriptions
      const { data: subs } = await (supabase as any)
        .from('subscriptions')
        .select('paid')
        .eq('branch_id', branchId)
        .gte('created_at', `${firstDay}T00:00:00`)
        .lte('created_at', `${lastDay}T23:59:59`);

      // 3. Fetch Monthly Expenses
      const { data: expenses } = await (supabase as any)
        .from('expenses')
        .select('amount')
        .eq('branch_id', branchId)
        .gte('date', firstDay)
        .lte('date', lastDay);

      let workspaceCash = 0, roomsCash = 0, cateringCash = 0, corporateUsage = 0;
      sessions?.forEach(s => {
        const cat = s.catering_amount || 0;
        const total = s.total_amount || 0;
        const serviceAmount = Math.max(0, total - cat);

        if (s.payment_method === 'corporate') {
           corporateUsage += total;
        } else {
           cateringCash += cat;
           if (s.service_id) {
             roomsCash += serviceAmount;
           } else {
             workspaceCash += serviceAmount;
           }
        }
      });

      const subIncome = subs?.reduce((s: number, b: any) => s + (b.paid || 0), 0) || 0;
      const totalIncome = workspaceCash + roomsCash + cateringCash + subIncome;
      const totalExpense = expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0;

      setDailyData({
        income: totalIncome,
        expense: totalExpense,
        details: { 
           catering: cateringCash, 
           rooms: roomsCash, 
           workspace: workspaceCash,
           subscriptions: subIncome,
           corporate: corporateUsage,
           vfcash: 0,
           instapay: 0
        },
        vfcashPayments: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const expectedCash = dailyData.income - dailyData.expense; // Daily expected income only
  const cashDiff = computedSummary.cash_cloud - (computedSummary.safe_balance + totalCountedCash);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePettyAction = async () => {
    const val = parseFloat(pettyActionValue);
    if (!isNaN(val)) {
      try {
        const { error } = await (supabase as any).from('petty_cash').insert({
          branch_id: branchId,
          type: showPettyModal as 'add' | 'withdraw',
          amount: val,
          note: pettyNote || (showPettyModal === 'add' ? 'إضافة عهدة' : 'سحب عهدة'),
          date: new Date().toISOString().split('T')[0]
        });

        if (error) throw error;
        showNotification('تمت تسجيل حركة العهدة');
        setShowPettyModal(null);
        setPettyActionValue('');
        setPettyNote('');
        fetchPettyTransactions();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleUpdatePetty = async () => {
    if (!editingPetty) return;
    try {
      const { error } = await (supabase as any)
        .from('petty_cash')
        .update({
          amount: parseFloat(pettyActionValue),
          note: pettyNote
        })
        .eq('id', editingPetty.id);

      if (error) throw error;
      showNotification('تم تحديث العهدة بنجاح');
      setEditingPetty(null);
      setPettyActionValue('');
      setPettyNote('');
      fetchPettyTransactions();
      fetchFinanceSummary(); // Update total_in/out
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePetty = async (id: string) => {
    if (!confirm('هل أنت متأكد من مسح هذه الحركة؟')) return;
    try {
      const { error } = await (supabase as any)
        .from('petty_cash')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('تم مسح الحركة بنجاح');
      fetchPettyTransactions();
      fetchFinanceSummary(); // Update total_in/out
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveInventory = async () => {
    if (!branchId) return;
    try {
      const dateStr = currentDate.toLocaleDateString('en-CA');
      const localKey = `inventory_${branchId}_${dateStr}`;

      // 1. Save locally first (Always succeeds, zero lag)
      localStorage.setItem(localKey, JSON.stringify(cashDrawer));

      // 2. Clear existing entries to avoid UI confusion, then Upsert
      const payload = {
        branch_id: branchId,
        date: dateStr,
        expected_cash: expectedCash,
        actual_cash: totalCountedCash,
        difference: cashDiff,
        is_finalized: false, // Inventory save doesn't finalize
        denominations: cashDrawer
      };

      const { error } = await (supabase as any)
        .from('daily_closings')
        .upsert(payload, { onConflict: 'branch_id,date' });

      if (error) throw error;

      showNotification('تم حفظ جرد الخزينة بنجاح (محلياً وسحابياً)');
    } catch (err: any) {
      // Still show success if local saved, but mention potential sync issue
      console.error('DB Sync failed:', err);
      showNotification('تم الحفظ محلياً (حدث خطأ في مزامنة السيرفر)');
    }
  };

  const [monthlyClosingsHistory, setMonthlyClosingsHistory] = useState<any[]>([]);

  const fetchMonthlyClosingsHistory = async () => {
    if (!branchId) return;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const start = `${year}-${month.toString().padStart(2, '0')}-01`;
    const end = `${year}-${month.toString().padStart(2, '0')}-31`;

    const { data } = await (supabase as any)
      .from('daily_closings')
      .select('*')
      .eq('branch_id', branchId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    
    setMonthlyClosingsHistory(data || []);
  };

  const handleFinalizeDay = async () => {
    try {
      const dateStr = currentDate.toLocaleDateString('en-CA');
      
      // 1. Check for existing record
      const { data: existing } = await (supabase as any)
        .from('daily_closings')
        .select('id')
        .eq('branch_id', branchId)
        .eq('date', dateStr)
        .maybeSingle();

      if (existing && !confirm('هذا اليوم مقفل بالفعل. هل تريد إعادة الإقفال وتحديث البيانات (Override)؟')) {
        return;
      }

      if (!existing && !confirm('هل أنت متأكد من إغلاق اليوم نهائياً؟ سيتم ترحيل كافة الموازنات.')) return;

      const payload = {
        branch_id: branchId,
        date: dateStr,
        total_income: dailyData.income,
        total_expense: dailyData.expense,
        expected_cash: expectedCash,
        actual_cash: totalCountedCash,
        difference: cashDiff,
        is_finalized: true,
        denominations: cashDrawer,
        vfcash_total: dailyData.details.vfcash,
        instapay_total: dailyData.details.instapay
      };

      const { error } = await (supabase as any)
        .from('daily_closings')
        .upsert(payload, { onConflict: 'branch_id,date' });

      if (error) throw error;

      showNotification('تم إقفال اليوم بنجاح وترحيل البيانات');
      fetchMonthlyClosingsHistory();
    } catch (err: any) {
      alert('خطأ في الإقفال: ' + err.message);
    }
  };

  const handleUpdateDailyLog = async () => {
    if (!editingDailyLog || !branchId) return;
    try {
      const { error } = await (supabase as any)
        .from('daily_closings')
        .update({
          total_income: parseFloat(editDailyIncome) || 0,
          total_expense: parseFloat(editDailyExpense) || 0,
          difference: (editingDailyLog.actual_cash) - ( (parseFloat(editDailyIncome) || 0) - (parseFloat(editDailyExpense) || 0) ) 
        })
        .eq('id', editingDailyLog.id);

      if (error) throw error;
      showNotification('تم تحديث بيانات اليوم بنجاح');
      setEditingDailyLog(null);
      fetchMonthlyClosingsHistory();
    } catch (err: any) {
      alert('خطأ في التحديث: ' + err.message);
    }
  };

  const handleDeleteDailyLog = async (id: string) => {
    if (!confirm('هل أنت متأكد من مسح سجل الإقفال لهذا اليوم؟ سيتم فقدان البيانات المالية لهذا التاريخ من التقارير.')) return;
    try {
      const { error } = await (supabase as any)
        .from('daily_closings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('تم مسح سجل اليوم بنجاح');
      fetchMonthlyClosingsHistory();
    } catch (err: any) {
      alert('خطأ في المسح: ' + err.message);
    }
  };

  const handleClearDailyLogs = async () => {
    if (!confirm('هل أنت متأكد من مسح كافة سجلات الإقفال اليومي لهذا الفرع؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      const { error } = await (supabase as any)
        .from('daily_closings')
        .delete()
        .eq('branch_id', branchId);

      if (error) throw error;
      
      showNotification('تم مسح كافة سجلات الإقفال بنجاح');
      fetchMonthlyClosingsHistory();
      // Also clear local storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`inventory_${branchId}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (err: any) {
      alert('خطأ في المسح: ' + err.message);
    }
  };


  const handleCloseMonth = async () => {
    const monthKey = viewDate.toISOString().slice(0, 7);
    const m_income = dailyData.income + pettyCashStats.added;
    const m_expense = dailyData.expense + pettyCashStats.withdrawn;

    try {
      const { error } = await (supabase as any).from('monthly_closings').upsert({
        branch_id: branchId,
        month_key: monthKey,
        total_income: m_income,
        total_expense: m_expense,
        net_profit: m_income - m_expense
      });

      if (error) throw error;
      
      showNotification(`تم تقفيل شهر ${monthKey} بنجاح`);
      setShowCloseMonthModal(false);
      fetchClosedMonths();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getDiffColor = () => {
    if (cashDiff === 0 && totalCountedCash > 0) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (cashDiff < 0) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (cashDiff > 0) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-400 bg-slate-50 border-slate-100';
  };

  const renderDaily = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="الدخل النقدي للمكان" value={dailyData.income.toLocaleString()} icon={TrendingUp} trend={8} />
        <StatCard title="فودافون كاش" value={dailyData.details.vfcash.toLocaleString()} icon={Phone} color="rose" />
        <StatCard title="InstaPay" value={dailyData.details.instapay.toLocaleString()} icon={Smartphone} color="indigo" />
        <StatCard title="مصروفات اليوم" value={dailyData.expense.toLocaleString()} icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <Calculator size={24} />
              </div>
              <div>
                <CardTitle>جرد خزينة اليوم (الدرج)</CardTitle>
                <CardDescription>أدخل عدد الورقات النقدية لمطابقة العجز والزيادة</CardDescription>
              </div>
            </div>
            <div className={`px-6 py-3 rounded-2xl border-2 font-black transition-all ${getDiffColor()}`}>
              الفرق: {cashDiff.toLocaleString()} ج.م
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {denominations.map(den => (
                <div key={den} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-300 transition-all flex flex-col justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{den} ج.م</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="0"
                      value={cashDrawer[den]}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow digits, +, =, and .
                        if (/^[0-9+=. ]*$/.test(val) || val === '') {
                          setCashDrawer({ ...cashDrawer, [den]: val });
                        }
                      }}
                      className="text-xl font-black border-none bg-transparent p-0 h-auto focus-visible:ring-0 w-full"
                    />
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      ={parseExpression(cashDrawer[den]).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-indigo-600 text-white rounded-2xl flex flex-col justify-center">
                <p className="text-[10px] font-black opacity-60 uppercase">الإجمالي المحسوب</p>
                <p className="text-2xl font-black">{totalCountedCash.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <DollarSign size={24} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-xs font-bold opacity-60">المفروض تواجده (حسب النظام)</p>
                  <p className="text-2xl font-black">{expectedCash.toLocaleString()} EGP</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveInventory} size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl gap-2 font-black transition-all shadow-lg shadow-indigo-200">
                  <Save size={18} /> حفظ الجرد
                </Button>
                <Button onClick={handleFinalizeDay} size="lg" className="bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-2xl gap-2 font-black transition-all">
                  <Lock size={18} /> إقفال اليوم
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-black"><PieChart size={20} className="text-indigo-600" /> تحليل مصادر الدخل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: 'مبيعات الاشتراكات', amount: dailyData.details.subscriptions, color: 'bg-indigo-500' },
              { label: 'حجوزات المساحة (كاش)', amount: dailyData.details.workspace, color: 'bg-emerald-500' },
              { label: 'حجوزات القاعات (كاش)', amount: dailyData.details.rooms, color: 'bg-violet-500' },
              { label: 'مبيعات الكاترينج (كاش)', amount: dailyData.details.catering, color: 'bg-amber-500' },
              { label: 'فودافون كاش', amount: dailyData.details.vfcash, color: 'bg-rose-500' },
              { label: 'إنستا باي', amount: dailyData.details.instapay, color: 'bg-blue-500' },
              { label: 'استهلاك الشركات (آجل)', amount: dailyData.details.corporate, color: 'bg-purple-500' },
            ].map((cat, i) => {
              const totalBreakdown = dailyData.income + dailyData.details.corporate + dailyData.details.vfcash + dailyData.details.instapay;
              return (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-600">{cat.label}</span>
                  <span className="font-black text-slate-800">{cat.amount.toLocaleString()} ج.م</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${(cat.amount / (totalBreakdown || 1)) * 100}%` }} />
                </div>
              </div>
            )})}
          </CardContent>
        </Card>

        {/* VF Cash Tracking Table */}
        <Card className="border-none shadow-xl shadow-slate-100 overflow-hidden">
          <CardHeader className="bg-rose-600 text-white pb-6">
            <div className="flex items-center gap-3">
              <Phone size={20} />
              <div>
                <CardTitle className="text-lg">تتبع فودافون كاش</CardTitle>
                <CardDescription className="text-rose-100">سجل التحويلات اليومية</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-rose-50 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">العميل</th>
                    <th className="px-4 py-3">المبلغ</th>
                    <th className="px-4 py-3">الادمن</th>
                    <th className="px-4 py-3">واتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50">
                  {dailyData.vfcashPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs font-black text-slate-300">لا يوجد تحويلات اليوم</td>
                    </tr>
                  ) : (
                    dailyData.vfcashPayments.map((p, i) => (
                      <tr key={i} className="hover:bg-rose-50/30 transition-all">
                        <td className="px-4 py-4">
                          <p className="text-xs font-black text-slate-700">{p.user_name || p.user_code}</p>
                          <p className="text-[8px] text-slate-400">
                            {p.vfcash_payment_time ? new Date(p.vfcash_payment_time).toLocaleTimeString('ar-EG') : 'N/A'}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-rose-600">{p.total_amount} ج.م</td>
                        <td className="px-4 py-4">
                          <span className="text-[8px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500">
                            {p.vfcash_admin_id?.slice(0, 8) || 'System'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {p.vfcash_whatsapp_confirmed ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <X size={16} className="text-rose-300" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMonthly = () => {
    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-5 group hover:border-indigo-200 transition-all">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><TrendingUp size={32} /></div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي الداخل </p>
              <p className="text-3xl font-black text-slate-900">{(dailyData.income).toLocaleString()} <span className="text-sm opacity-40">ج.م</span></p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-5 group hover:border-indigo-200 transition-all">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all"><TrendingDown size={32} /></div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي المصروفات  </p>
              <p className="text-3xl font-black text-slate-900">{(dailyData.expense + pettyCashStats.withdrawn).toLocaleString()} <span className="text-sm opacity-40">ج.م</span></p>
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 text-white flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center"><Wallet size={32} /></div>
            <div className="flex-1">
              <p className="text-xs font-black opacity-60 uppercase tracking-widest mb-1">رصيد العهدة الصافي</p>
              <div className="flex justify-between items-end">
                <p className="text-3xl font-black">{(pettyCashStats.added - pettyCashStats.withdrawn).toLocaleString()} <span className="text-sm opacity-40">ج.م</span></p>
                <Button onClick={() => setShowCloseMonthModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl h-10 px-4">تقفيل الشهر</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl shadow-slate-100 overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
              <CardTitle className="text-emerald-700 font-black flex items-center gap-2">العهدة المضافة</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-right">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-6 py-4">التاريخ</th><th className="px-6 py-4">البيان</th><th className="px-6 py-4 text-left">المبلغ</th><th className="px-6 py-4 text-center">أدوات</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pettyTransactions.filter(t => t.type === 'add').map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group text-sm">
                      <td className="px-6 py-4 font-bold text-slate-500">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="px-6 py-4 font-black text-slate-700">{t.note}</td>
                      <td className="px-6 py-4 text-left font-black text-emerald-600">{t.amount.toLocaleString()} ج.م</td>
                      <td className="px-6 py-4 text-center items-center flex justify-center gap-2">
                        <button onClick={() => { setEditingPetty(t); setPettyActionValue(t.amount.toString()); setPettyNote(t.note || ''); }} className="p-2 text-indigo-400 hover:text-indigo-600"><Edit size={16} /></button>
                        <button onClick={() => handleDeletePetty(t.id)} className="p-2 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-100 overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-rose-50/50 border-b border-rose-100 pb-4">
              <CardTitle className="text-rose-700 font-black flex items-center gap-2">العهدة المسحوبة</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-right">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-6 py-4">التاريخ</th><th className="px-6 py-4">البيان</th><th className="px-6 py-4 text-left">المبلغ</th><th className="px-6 py-4 text-center">أدوات</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pettyTransactions.filter(t => t.type === 'withdraw').map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group text-sm">
                      <td className="px-6 py-4 font-bold text-slate-500">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="px-6 py-4 font-black text-slate-700">{t.note}</td>
                      <td className="px-6 py-4 text-left font-black text-rose-600">{t.amount.toLocaleString()} ج.م</td>
                      <td className="px-6 py-4 text-center items-center flex justify-center gap-2">
                        <button onClick={() => { setEditingPetty(t); setPettyActionValue(t.amount.toString()); setPettyNote(t.note || ''); }} className="p-2 text-indigo-400 hover:text-indigo-600"><Edit size={16} /></button>
                        <button onClick={() => handleDeletePetty(t.id)} className="p-2 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8 mt-12 bg-slate-50/50 p-10 rounded-[4rem] border-2 border-dashed border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-900 border-r-8 border-indigo-600 pr-5">سجل الإقفال اليومي التفصيلي</h3>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearDailyLogs}
                className="text-rose-400 hover:text-white hover:bg-rose-500 font-bold rounded-xl h-9 px-4 flex items-center gap-2 transition-all border border-rose-100 bg-white"
              >
                <Trash2 size={16} /> مسح كافة السجلات
              </Button>
              <div className="px-6 py-2 bg-white rounded-full border border-slate-100 shadow-sm text-xs font-black text-indigo-600">سجل عمليات الشهر الحالي</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {monthlyClosingsHistory.map((day) => (
              <div key={day.id} className="p-8 bg-white border border-slate-100 rounded-[3rem] flex flex-wrap items-center justify-between gap-8 hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-100/40 transition-colors" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex flex-col items-center justify-center font-black shadow-lg group-hover:bg-indigo-600 transition-all">
                    <span className="text-sm opacity-60 uppercase">{new Date(day.date).toLocaleDateString('ar-EG', { month: 'short' })}</span>
                    <span className="text-xl">{new Date(day.date).getDate()}</span>
                  </div>
                  <div>
                    <p className="font-black text-xl text-slate-900">{new Date(day.date).toLocaleDateString('ar-EG', { weekday: 'long' })}</p>
                    <p className="text-xs font-bold text-slate-400 tracking-widest">{day.date}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-10 items-center relative z-10 text-right">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">إجمالي الدخل</p>
                    <p className="text-xl font-black text-emerald-600">{(day.total_income || 0).toLocaleString()} <span className="text-xs">ج.م</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">إجمالي المصروفات</p>
                    <p className="text-xl font-black text-rose-600">{(day.total_expense || 0).toLocaleString()} <span className="text-xs">ج.م</span></p>
                  </div>
                  <div className={`px-6 py-3 rounded-2xl text-[13px] font-black shadow-sm ${(day.difference || 0) === 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    {day.difference === 0 ? '✓ مطابق' : `⚠ فرق: ${day.difference?.toLocaleString()}`}
                  </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setViewDate(new Date(day.date));
                          setAnalyticsPeriod('day');
                          setActiveTab('analytics');
                        }}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2"
                      >
                         <BarChart3 size={18} /> عرض التفاصيل
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setEditingDailyLog(day);
                          setEditDailyIncome(day.total_income?.toString() || '0');
                          setEditDailyExpense(day.total_expense?.toString() || '0');
                        }}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteDailyLog(day.id)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                </div>
              </div>
            ))}
            {monthlyClosingsHistory.length === 0 && (
              <div className="py-24 text-center text-slate-300 font-bold border-4 border-dashed border-slate-100 rounded-[4rem] bg-white">لم يتم تقفيل أي أيام في هذا الشهر بعد</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAnnual = () => {
    const months = Object.keys(closedMonths);
    const totalYearIncome = months.reduce((s, m) => s + (closedMonths[m].income || 0), 0);
    const totalYearExpense = months.reduce((s, m) => s + (closedMonths[m].expense || 0), 0);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6"><TrendingUp size={32} /></div>
            <p className="text-sm font-black text-slate-400 mb-2 uppercase tracking-widest">إجمالي دخل العام</p>
            <h4 className="text-4xl font-black text-slate-900">{totalYearIncome.toLocaleString()} <span className="text-sm">ج.م</span></h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6"><TrendingDown size={32} /></div>
            <p className="text-sm font-black text-slate-400 mb-2 uppercase tracking-widest">إجمالي مصروفات العام</p>
            <h4 className="text-4xl font-black text-slate-900">{totalYearExpense.toLocaleString()} <span className="text-sm">ج.م</span></h4>
          </div>
          <div className={`p-8 rounded-[2.5rem] border shadow-xl flex flex-col items-center text-center ${totalYearIncome - totalYearExpense >= 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6"><ArrowUpRight size={32} /></div>
            <p className="text-sm font-black opacity-80 mb-2 uppercase tracking-widest">صافي الربح السنوي</p>
            <h4 className="text-4xl font-black">{(totalYearIncome - totalYearExpense).toLocaleString()} <span className="text-sm font-bold">ج.م</span></h4>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Period Selector */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
            {[
              { id: 'day', label: 'تحليل اليوم' },
              { id: 'month', label: 'تحليل الشهر' },
              { id: 'year', label: 'تحليل السنة' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setAnalyticsPeriod(p.id as any)}
                className={`px-10 py-3 rounded-xl text-sm font-black transition-all ${analyticsPeriod === p.id ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'text-slate-500 hover:text-indigo-600'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4 md:gap-8 mb-8">
          <Button 
            variant="ghost" 
            onClick={handleNextPeriod} 
            className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white shadow-xl border border-slate-100 text-indigo-600 hover:bg-indigo-50 hover:scale-110 transition-all flex items-center justify-center"
          >
            <ChevronLeft size={32} />
          </Button>
          
          <div className="text-center px-6 md:px-12 py-4 md:py-6 bg-white rounded-[2.5rem] shadow-2xl border border-slate-50 min-w-[200px] md:min-w-[400px] relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-100 transition-colors" />
             <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">الفترة التحليلية الحالية</p>
             <h3 className="text-xl md:text-3xl font-black text-slate-800 relative z-10">
               {analyticsPeriod === 'day' ? viewDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) :
                analyticsPeriod === 'month' ? viewDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) :
                `عام ${viewDate.getFullYear()}`}
             </h3>
          </div>

          <Button 
            variant="ghost" 
            onClick={handlePrevPeriod} 
            className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white shadow-xl border border-slate-100 text-indigo-600 hover:bg-indigo-50 hover:scale-110 transition-all flex items-center justify-center"
          >
            <ChevronRight size={32} />
          </Button>
        </div>


        {/* User / Company Specific Search */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-slate-900 text-white overflow-hidden">
          <CardContent className="p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-md">
                <h3 className="text-2xl font-black mb-2">استعلام مالي مخصص</h3>
                <p className="text-slate-400 text-sm font-bold">ابحث عن كود مستخدم أو اسم شركة لمعرفة تاريخ تعاملاته المالية والمبالغ المستحقة.</p>
              </div>
              <div className="flex-1 w-full flex gap-3">
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="أدخل كود العميل أو اسم الشركة..."
                  className="h-16 bg-white/10 border-white/10 text-white rounded-2xl font-bold placeholder:text-slate-500 focus:ring-indigo-500"
                />
                <Button onClick={fetchSearchReport} className="h-16 px-10 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-lg">بحث</Button>
              </div>
            </div>

            {searchReport && (
              <div className="mt-12 animate-in slide-in-from-top-4 duration-500">
                <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
                  <table className="w-full text-right">
                    <thead className="bg-white/10 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-5">التاريخ</th>
                        <th className="px-8 py-5">العميل / الكود</th>
                        <th className="px-8 py-5">الخدمة</th>
                        <th className="px-8 py-5">المبلغ</th>
                        <th className="px-8 py-5">وسيلة الدفع</th>
                        <th className="px-8 py-5">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {searchReport.length === 0 ? (
                        <tr><td colSpan={6} className="px-8 py-10 text-center text-slate-500">لا يوجد سجلات مطابقة لهذا البحث</td></tr>
                      ) : (
                        searchReport.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-8 py-5 text-sm font-bold opacity-60">{new Date(row.start_time).toLocaleDateString('ar-EG')}</td>
                            <td className="px-8 py-5">
                               <p className="font-black text-white">{row.user_name || 'N/A'}</p>
                               <p className="text-[10px] font-black text-indigo-400">{row.user_code}</p>
                            </td>
                            <td className="px-8 py-5 text-sm font-bold">{row.services?.name_ar || 'مساحة عمل'}</td>
                            <td className="px-8 py-5 font-black text-indigo-300">{row.total_amount?.toLocaleString()} ج.م</td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-2">
                                 <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase">{row.payment_method}</span>
                                 <button onClick={() => setEditingPaymentSession(row)} className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400 transition-all">
                                   <Edit size={12} />
                                 </button>
                               </div>
                            </td>
                            <td className="px-8 py-5">
                               <span className={`px-3 py-1 rounded-full text-[10px] font-black ${row.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                 {row.status === 'completed' ? 'تم الدفع' : 'قيد الانتظار'}
                               </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-8 flex justify-between items-center p-6 bg-indigo-600/20 rounded-3xl border border-indigo-500/30">
                   <div>
                      <p className="text-xs font-black text-indigo-300 uppercase mb-1">إجمالي تعاملات العميل</p>
                      <h4 className="text-3xl font-black">{searchReport.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0).toLocaleString()} <span className="text-sm">ج.م</span></h4>
                   </div>
                   <Button variant="ghost" onClick={() => setSearchReport(null)} className="text-white hover:bg-white/10 font-bold">إغلاق التقرير</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[3rem] overflow-hidden relative group">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
            <CardContent className="p-10">
              <div className="flex items-center gap-3 mb-4 opacity-80">
                <TrendingUp size={20} />
                <p className="text-xs font-black uppercase tracking-widest">إجمالي الإيرادات</p>
              </div>
              <h3 className="text-5xl font-black mb-2 tracking-tighter">{analyticsData.totalRevenue.toLocaleString()} <span className="text-xl font-bold opacity-60">ج.م</span></h3>
              <p className="text-xs font-bold text-indigo-100">إجمالي كافة مصادر الدخل للفترة المحددة</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white border border-slate-100 rounded-[3rem] overflow-hidden relative group">
             <CardContent className="p-10">
              <div className="flex items-center gap-3 mb-4 text-rose-500">
                <TrendingDown size={20} />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">إجمالي المصروفات</p>
              </div>
              <h3 className="text-5xl font-black mb-2 tracking-tighter text-slate-900">{analyticsData.totalExpenses.toLocaleString()} <span className="text-xl font-bold text-slate-300">ج.م</span></h3>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(analyticsData.totalExpenses / (analyticsData.totalRevenue || 1)) * 100}%` }} />
                </div>
                <span className="text-[10px] font-black text-slate-400">{((analyticsData.totalExpenses / (analyticsData.totalRevenue || 1)) * 100).toFixed(0)}% من الدخل</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl shadow-indigo-100/50 bg-slate-900 text-white rounded-[3rem] overflow-hidden relative group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <CardContent className="p-10 relative z-10">
              <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <Wallet size={20} />
                <p className="text-xs font-black uppercase tracking-widest opacity-60">صافي الأرباح</p>
              </div>
              <h3 className="text-5xl font-black mb-2 tracking-tighter">{analyticsData.netProfit.toLocaleString()} <span className="text-xl font-bold opacity-40">ج.م</span></h3>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black border border-emerald-500/30">
                <ArrowUpRight size={14} /> {((analyticsData.netProfit / (analyticsData.totalRevenue || 1)) * 100).toFixed(1)}% نسبة الربحية
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Revenue Breakdown */}
          <Card className="border-none shadow-2xl shadow-slate-100 rounded-[3rem] bg-white border border-slate-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-black text-2xl flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><PieChart size={24} /></div>
                  تحليل مصادر الدخل
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {[
                { label: 'حجوزات المساحة العامة', key: 'Workspace', color: 'bg-indigo-600' },
                { label: 'حجوزات القاعات والخدمات', key: 'Rooms', color: 'bg-violet-500' },
                { label: 'مبيعات الكاترينج والبوفيه', key: 'Catering', color: 'bg-emerald-500' },
                { label: 'اشتراكات الأعضاء الجديدة', key: 'Subscriptions', color: 'bg-amber-500' },
                { label: 'حسابات الشركات والتعاقدات', key: 'Corporate', color: 'bg-rose-500' },
              ].map((cat) => {
                const amount = analyticsData.revenueByCategory[cat.key] || 0;
                const percent = (amount / (analyticsData.totalRevenue || 1)) * 100;
                return (
                  <div key={cat.key} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">{cat.label}</span>
                        <span className="text-xl font-black text-slate-900">{amount.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></span>
                      </div>
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-4 w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                      <div className={`h-full ${cat.color} rounded-2xl transition-all duration-1000 shadow-sm`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Room Utilization */}
          <Card className="border-none shadow-2xl shadow-slate-100 rounded-[3rem] overflow-hidden bg-white border border-slate-50">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="font-black text-2xl flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><Users2 size={24} /></div>
                أداء الغرف والخدمات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5">الغرفة / الخدمة</th>
                      <th className="px-8 py-5 text-center">عدد الحجوزات</th>
                      <th className="px-8 py-5 text-left">إجمالي الدخل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analyticsData.roomUsage.length === 0 ? (
                      <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-300 font-bold">لا يوجد بيانات للغرف في هذه الفترة</td></tr>
                    ) : (
                      analyticsData.roomUsage.map((room, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                             <p className="font-black text-slate-700 text-lg">{room.name}</p>
                             <div className="flex gap-1 mt-1">
                                {[1,2,3,4,5].map(s => <div key={s} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-slate-200'}`} />)}
                             </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="px-4 py-2 bg-slate-100 rounded-xl font-black text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">{room.count} حجز</span>
                          </td>
                          <td className="px-8 py-5 text-left">
                            <p className="font-black text-xl text-slate-900">{room.revenue.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart - Enhanced with Net Profit Indicator */}
        <Card className="border-none shadow-2xl shadow-slate-100 rounded-[3rem] bg-white border border-slate-50 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 via-emerald-500 to-rose-400" />
          <CardHeader className="pb-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><BarChart3 size={24} /></div>
                <div>
                  <CardTitle className="font-black text-2xl">تحليل النمو والأداء المالي</CardTitle>
                  <CardDescription className="font-bold text-slate-400">مقارنة الإيرادات بالمصروفات وصافي الربح للفترة المحددة</CardDescription>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-4 px-6 py-3 bg-slate-50 rounded-2xl">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-sm shadow-indigo-100" /> 
                    <span className="text-[10px] font-black text-slate-600">الدخل</span>
                 </div>
                 <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <div className="w-3 h-3 bg-rose-400 rounded-full shadow-sm shadow-rose-100" /> 
                    <span className="text-[10px] font-black text-slate-600">المصروفات</span>
                 </div>
                 <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm shadow-emerald-100" /> 
                    <span className="text-[10px] font-black text-slate-600">صافي الربح</span>
                 </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-12">
            <div className="h-96 flex items-end gap-3 sm:gap-4 px-6 pb-16 border-b-2 border-slate-50 relative group/chart">
              {/* Vertical Labels */}
              <div className="absolute left-0 top-0 bottom-16 w-10 flex flex-col justify-between text-[8px] font-black text-slate-300 pointer-events-none">
                 <span>100%</span>
                 <span>75%</span>
                 <span>50%</span>
                 <span>25%</span>
                 <span>0%</span>
              </div>
              
              <div className="absolute inset-0 top-0 bottom-16 flex flex-col justify-between pointer-events-none opacity-20 px-10">
                 {[1,2,3,4,5].map(l => <div key={l} className="border-t border-slate-300 border-dashed w-full" />)}
              </div>

              {analyticsData.dailyPerformance.slice(-15).map((day, i) => {
                const max = Math.max(...analyticsData.dailyPerformance.map(d => Math.max(d.revenue, d.expenses)), 1000);
                const revHeight = (day.revenue / max) * 100;
                const expHeight = (day.expenses / max) * 100;
                const netProfit = day.revenue - day.expenses;
                const isPositive = netProfit >= 0;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                    <div className="flex gap-1.5 items-end w-full h-full justify-center pb-1">
                      {/* Revenue Bar */}
                      <div 
                        className="w-2 sm:w-4 bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-full transition-all duration-1000 hover:scale-x-110 relative group/rev shadow-sm shadow-indigo-100"
                        style={{ height: `${revHeight}%` }}
                      >
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover/rev:opacity-100 transition-all scale-75 group-hover/rev:scale-100 whitespace-nowrap z-50 shadow-2xl">
                            <p className="text-indigo-400 text-[8px] mb-0.5">الدخل</p>
                            {day.revenue.toLocaleString()} ج.م
                         </div>
                      </div>
                      
                      {/* Expense Bar */}
                      <div 
                        className="w-2 sm:w-4 bg-gradient-to-t from-rose-500 to-rose-300 rounded-t-full transition-all duration-1000 hover:scale-x-110 relative group/exp shadow-sm shadow-rose-100"
                        style={{ height: `${expHeight}%` }}
                      >
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover/exp:opacity-100 transition-all scale-75 group-hover/exp:scale-100 whitespace-nowrap z-50 shadow-2xl">
                            <p className="text-rose-200 text-[8px] mb-0.5">المصروفات</p>
                            {day.expenses.toLocaleString()} ج.م
                         </div>
                      </div>
                    </div>

                    {/* Net Profit Indicator Dot */}
                    <div className="absolute bottom-[10%] w-full flex justify-center pointer-events-none">
                       <div className={`w-2 h-2 rounded-full border-2 border-white shadow-sm ${isPositive ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`} />
                    </div>

                    <span className="text-[9px] font-black text-slate-400 rotate-45 mt-6 origin-left whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity">
                      {new Date(day.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
               <div className="text-center md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">أعلى إيراد يومي</p>
                  <p className="text-xl font-black text-indigo-600">{Math.max(...analyticsData.dailyPerformance.map(d => d.revenue)).toLocaleString()} <span className="text-xs">ج.م</span></p>
               </div>
               <div className="text-center md:text-right border-r border-slate-200 pr-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">متوسط الربح اليومي</p>
                  <p className="text-xl font-black text-emerald-600">{(analyticsData.netProfit / (analyticsData.dailyPerformance.length || 1)).toFixed(0).toLocaleString()} <span className="text-xs">ج.م</span></p>
               </div>
               <div className="text-center md:text-right border-r border-slate-200 pr-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">عدد أيام النشاط</p>
                  <p className="text-xl font-black text-slate-900">{analyticsData.dailyPerformance.length} يوم</p>
               </div>
               <div className="text-center md:text-right border-r border-slate-200 pr-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">حالة الأداء</p>
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                     <span className={`w-2 h-2 rounded-full ${analyticsData.netProfit > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                     <p className="text-sm font-black text-slate-700">{analyticsData.netProfit > 0 ? 'نمو إيجابي' : 'تحت المراجعة'}</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List for Daily Analysis */}
        {analyticsPeriod === 'day' && (
          <Card className="border-none shadow-2xl shadow-slate-100 rounded-[3rem] overflow-hidden bg-white border border-slate-50 mt-12">
            <CardHeader className="bg-slate-900 text-white pb-10 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/10 rounded-2xl shadow-lg border border-white/5"><Receipt size={28} className="text-indigo-400" /></div>
                  <div>
                    <CardTitle className="text-2xl font-black">سجل عمليات اليوم</CardTitle>
                    <CardDescription className="text-slate-400 font-bold">عرض وتعديل كافة عمليات الدفع المسجلة لهذا اليوم</CardDescription>
                  </div>
                </div>
                <div className="px-6 py-2 bg-white/10 rounded-full border border-white/10 text-xs font-black text-indigo-300">
                  {analyticsData.sessions.length} عملية مسجلة
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5">العميل / الكود</th>
                      <th className="px-8 py-5">المبلغ الإجمالي</th>
                      <th className="px-8 py-5">وسيلة الدفع</th>
                      <th className="px-8 py-5">وقت الانتهاء</th>
                      <th className="px-8 py-5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analyticsData.sessions.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-24 text-center text-slate-300 font-black">لا يوجد عمليات مسجلة لهذا التاريخ</td></tr>
                    ) : (
                      analyticsData.sessions.map((session, i) => (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <p className="font-black text-slate-900">{session.user_name || 'N/A'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{session.user_code}</p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-black text-lg text-slate-900">{session.total_amount?.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></p>
                            <p className="text-[9px] text-indigo-500 font-bold">بوفيه: {session.catering_amount || 0} ج.م</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black inline-flex items-center gap-2 ${
                              session.payment_method === 'vfcash' ? 'bg-rose-50 text-rose-600' :
                              session.payment_method === 'instapay' ? 'bg-indigo-50 text-indigo-600' :
                              session.payment_method === 'corporate' ? 'bg-amber-50 text-amber-600' :
                              'bg-emerald-50 text-emerald-600'
                            }`}>
                              {session.payment_method === 'vfcash' ? <Phone size={12} /> : 
                               session.payment_method === 'instapay' ? <Smartphone size={12} /> : 
                               session.payment_method === 'corporate' ? <Briefcase size={12} /> : 
                               <DollarSign size={12} />}
                              {session.payment_method === 'vfcash' ? 'Vodafone Cash' :
                               session.payment_method === 'instapay' ? 'InstaPay' :
                               session.payment_method === 'corporate' ? 'Corporate' :
                               'نقدي (كاش)'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-500">
                            {session.end_time ? new Date(session.end_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'قيد التشغيل'}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <Button 
                              onClick={() => setEditingPaymentSession(session)}
                              className="w-10 h-10 p-0 rounded-xl bg-white border border-slate-100 text-indigo-600 shadow-sm hover:shadow-md hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-90"
                            >
                              <Edit size={18} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDigitalHistory = () => {
    if (activeTab !== 'digital') return null;
    
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="إجمالي فودافون كاش" value={dailyData.details.vfcash.toLocaleString()} icon={Phone} color="rose" />
          <StatCard title="إجمالي InstaPay" value={dailyData.details.instapay.toLocaleString()} icon={Smartphone} color="indigo" />
          <StatCard title="عدد التحويلات" value={dailyData.vfcashPayments.length.toLocaleString()} icon={Users2} />
          <StatCard title="معدل التحويل" value={((dailyData.details.vfcash + dailyData.details.instapay) / ((dailyData.income + dailyData.details.vfcash + dailyData.details.instapay) || 1) * 100).toFixed(1) + '%'} icon={TrendingUp} />
        </div>

        <Card className="border-none shadow-xl shadow-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-900 text-white pb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <ArrowRightLeft size={24} className="text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">تاريخ التحويلات الرقمية</CardTitle>
                <CardDescription className="text-slate-400">سجل مفصل للتحويلات عبر فودافون كاش وإنستا باي لليوم المحدد</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">العميل</th>
                    <th className="px-6 py-4">الوسيلة</th>
                    <th className="px-6 py-4">المبلغ</th>
                    <th className="px-6 py-4">الوقت</th>
                    <th className="px-6 py-4">المسؤول (الآدمن)</th>
                    <th className="px-6 py-4">واتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dailyData.vfcashPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-300">
                          <Phone size={48} className="opacity-20" />
                          <p className="font-black text-sm">لا يوجد تحويلات رقمية مسجلة لهذا اليوم</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dailyData.vfcashPayments.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-slate-700">{p.user_name || p.user_code}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Session #{p.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1.5 ${p.payment_method === 'vfcash' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {p.payment_method === 'vfcash' ? <Phone size={10} /> : <Smartphone size={10} />}
                              {p.payment_method === 'vfcash' ? 'Vodafone Cash' : 'InstaPay'}
                            </span>
                            <button onClick={() => setEditingPaymentSession(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-400 transition-all opacity-0 group-hover:opacity-100">
                              <Edit size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-slate-900">{p.total_amount} <span className="text-[10px] opacity-40">EGP</span></p>
                        </td>
                        <td className="px-6 py-5 text-xs font-bold text-slate-500">
                          {new Date(p.vfcash_payment_time || p.end_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 font-black text-[10px] border border-slate-200">
                              {p.profiles?.full_name?.split(' ').map((n: any) => n[0]).join('').slice(0, 2) || 'AD'}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-700">{p.profiles?.full_name || 'System Admin'}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase">{p.vfcash_admin_id?.slice(0, 8) || 'AUTO-LOG'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {p.vfcash_whatsapp_confirmed ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-100">
                              <CheckCircle2 size={12} /> تم التأكيد
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-300 rounded-full text-[10px] font-black border border-rose-100">
                              <X size={12} /> لم يتم الربط
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-16 font-['Cairo'] text-right pb-32 mt-10 px-4 md:px-8">

      {/* Treasury Summary Section - Moved for Constant Visibility */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white/40 backdrop-blur-xl border border-white/40 rounded-[3rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-lg shadow-indigo-100">
              <Wallet size={24} />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">ملخص الخزينة الشامل</CardTitle>
              <CardDescription className="font-bold text-slate-500">انقر على أي خانة لتعديل الرصيد السابق يدوياً</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {[
              { key: 'total_in', label: 'إجمالي الداخل', icon: TrendingUp, color: 'text-emerald-600' },
              { key: 'total_out', label: 'إجمالي الخارج', icon: TrendingDown, color: 'text-rose-600' },
              { key: 'total_cash', label: 'إجمالي الكاش', icon: Wallet, color: 'text-indigo-600' },
              { key: 'cash_athar', label: 'كاش Athar', icon: BarChart3, color: 'text-amber-600' },
              { key: 'cash_cloud', label: 'كاش Cloud', icon: PieChart, color: 'text-sky-600' },
              { key: 'safe_balance', label: 'الفلوس في الخزنة', icon: Lock, color: 'text-violet-600' },
            ].map((item) => {
              const Icon = item.icon;
              const value = computedSummary[item.key as keyof typeof computedSummary];
              const prevValue = (financeSummary as any)[`${item.key}_prev`] || 0;

              return (
                <div 
                  key={item.key} 
                  onClick={() => {
                    setActiveSummaryEdit(item);
                    setSummaryEditValue(prevValue.toString());
                  }}
                  className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] group hover:border-indigo-400/50 hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all">
                    <Edit size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-xl bg-white shadow-sm ${item.color.replace('text-', 'text-opacity-20 bg-')}`}>
                      <Icon size={16} className={item.color} />
                    </div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.label}</label>
                  </div>
                  
                  <div className="space-y-1">
                    <p className={`text-2xl font-black ${item.color} tracking-tight`}>
                      {value.toLocaleString()} 
                      <span className="text-xs opacity-50 mr-1">ج.م</span>
                    </p>
                    {prevValue !== 0 && (
                      <p className="text-[10px] font-bold text-slate-400">سابق: {prevValue.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>


      {/* Summary Field Editor Modal */}
      <Modal
        isOpen={!!activeSummaryEdit}
        onClose={() => setActiveSummaryEdit(null)}
        title={activeSummaryEdit ? `تعديل ${activeSummaryEdit.label}` : ""}
      >
        <div className="space-y-8 pb-4">
          <div className="space-y-4">
            <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                {activeSummaryEdit && ['cash_athar', 'safe_balance'].includes(activeSummaryEdit.key) ? 'المبلغ المودع حالياً' : 'الرصيد السابق (يدوي)'}
              </p>
              <Input
                type="number"
                value={summaryEditValue}
                onChange={(e) => setSummaryEditValue(e.target.value)}
                className="text-4xl font-black h-20 text-center border-none bg-transparent focus:ring-0"
                autoFocus
              />
              <p className="text-[10px] text-center font-bold text-slate-400 mt-4 leading-relaxed px-4">
                {activeSummaryEdit && ['cash_athar', 'safe_balance'].includes(activeSummaryEdit.key) 
                  ? 'سيتم حفظ هذا الرقم كقيمة أساسية لهذه الخانة' 
                  : 'سيتم إضافة هذا الرقم كعجز أو زيادة سابقة لهذه الخانة'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setActiveSummaryEdit(null)} variant="ghost" className="flex-1 h-16 rounded-2xl font-black text-slate-400">إلغاء</Button>
            <Button 
              onClick={() => activeSummaryEdit && saveFinanceSummaryOffset(activeSummaryEdit.key, parseFloat(summaryEditValue) || 0)} 
              className={`flex-[2] h-16 rounded-2xl text-white font-black text-lg shadow-xl ${activeSummaryEdit?.color.replace('text-', 'bg-')}`}
            >
              حفظ التعديل
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Tabs */}
      <div className="bg-white/80 p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-wrap justify-between items-center gap-6 sticky top-20 md:top-24 z-40 backdrop-blur-md transition-all duration-300">


        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'daily', label: 'التقرير اليومي', icon: Calendar },
            // { id: 'monthly', label: 'التقرير الشهري', icon: BarChart3 },
            // { id: 'annual', label: 'التقرير السنوي', icon: TrendingUp },
            { id: 'digital', label: 'التحويلات الرقمية', icon: Phone },
            { id: 'analytics', label: 'تحليلات الأداء', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'monthly' && (
            <>
              <Button onClick={() => setShowPettyModal('add')} size="sm" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-2 border-emerald-100 h-11 px-6 rounded-2xl font-black gap-2 transition-all active:scale-95 shadow-sm">
                <Plus size={18} /> إضافة عهدة
              </Button>
              <Button onClick={() => setShowPettyModal('withdraw')} size="sm" className="bg-rose-50 text-rose-600 hover:bg-rose-100 border-2 border-rose-100 h-11 px-6 rounded-2xl font-black gap-2 transition-all active:scale-95 shadow-sm">
                <TrendingDown size={18} /> سحب عهدة
              </Button>
            </>
          )}

          {activeTab === 'daily' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-slate-600 font-bold text-sm">
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))} className="hover:text-indigo-600"><ChevronRight size={18} /></button>
              <span className="px-4 min-w-[150px] text-center">{currentDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))} className="hover:text-indigo-600"><ChevronLeft size={18} /></button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'daily' ? renderDaily() : 
       // activeTab === 'monthly' ? renderMonthly() : 
       activeTab === 'digital' ? renderDigitalHistory() :
       activeTab === 'analytics' ? renderAnalytics() :
       renderAnnual()}

      {/* Petty Cash Modal - Enhanced Design */}
      <Modal
        isOpen={!!showPettyModal}
        onClose={() => setShowPettyModal(null)}
        title={showPettyModal === 'add' ? 'إضافة عهدة' : 'سحب عهدة'}
      >
        <div className="space-y-8 pb-4 relative z-10">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest">المبلغ المطلوب (ج.م)</label>
               <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 font-bold">EGP Currency</span>
            </div>
            <div className="relative group">
              <Input
                type="number"
                autoFocus
                value={pettyActionValue}
                onChange={(e) => setPettyActionValue(e.target.value)}
                placeholder="0.00"
                className="text-4xl font-black h-20 text-center border-2 border-slate-100 focus:border-indigo-500 rounded-[2rem] bg-slate-50/50 shadow-inner group-hover:border-slate-200 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">بيان الملاحظات</label>
            <Input
              value={pettyNote}
              onChange={(e) => setPettyNote(e.target.value)}
              placeholder="مثلاً: مشتريات بوفيه، عهدة تشغيل..."
              className="h-14 font-bold border-2 border-slate-100 focus:border-indigo-500 rounded-2xl bg-white/80"
            />
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-500 leading-relaxed flex items-start gap-2 text-right">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
              {showPettyModal === 'add' 
                ? 'سيتم تسجيل هذه حركة كدخل إضافي مباشر للخزينة تحت بند العهدة.' 
                : 'سيتم تسجيل هذه حركة كمصروفات فورية من رصيد الخزينة الحالي.'}
            </p>
          </div>

          <Button 
            onClick={handlePettyAction} 
            className={`w-full h-16 rounded-3xl text-white font-black text-xl shadow-xl transition-all active:scale-95 ${showPettyModal === 'add' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
          >
            تنفيذ العملية الآن
          </Button>
        </div>
      </Modal>

      {/* Edit Petty Modal */}
      <Modal
        isOpen={!!editingPetty}
        onClose={() => setEditingPetty(null)}
        title="تعديل حركة عهدة"
      >
        <div className="space-y-8 pb-4">
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">المبلغ الجديد</label>
            <Input
              type="number"
              value={pettyActionValue}
              onChange={(e) => setPettyActionValue(e.target.value)}
              className="text-4xl font-black h-20 text-center border-2 border-slate-100 rounded-[2rem] bg-slate-50/50"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">ملاحظات التعديل</label>
            <Input
              value={pettyNote}
              onChange={(e) => setPettyNote(e.target.value)}
              className="h-14 font-bold border-2 border-slate-100 rounded-2xl"
            />
          </div>
          <Button 
            onClick={handleUpdatePetty} 
            className={`w-full h-16 rounded-3xl text-white font-black text-xl shadow-xl ${editingPetty?.type === 'add' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-900 shadow-slate-200'}`}
          >
            حفظ التعديلات المحدثة
          </Button>
        </div>
      </Modal>

      {/* Edit Daily Log Modal */}
      <Modal
        isOpen={!!editingDailyLog}
        onClose={() => setEditingDailyLog(null)}
        title={editingDailyLog ? `تعديل سجل يوم ${editingDailyLog.date}` : ""}
      >
        <div className="space-y-8 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">إجمالي الدخل</label>
              <Input
                type="number"
                value={editDailyIncome}
                onChange={(e) => setEditDailyIncome(e.target.value)}
                className="text-2xl font-black h-16 text-center border-2 border-slate-100 rounded-2xl bg-slate-50/50"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">إجمالي المصروفات</label>
              <Input
                type="number"
                value={editDailyExpense}
                onChange={(e) => setEditDailyExpense(e.target.value)}
                className="text-2xl font-black h-16 text-center border-2 border-slate-100 rounded-2xl bg-slate-50/50"
              />
            </div>
          </div>
          <div className="p-6 bg-slate-900 rounded-3xl text-white text-center shadow-2xl">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-2">الرصيد الفعلي المسجل</p>
            <p className="text-3xl font-black">{editingDailyLog?.actual_cash?.toLocaleString()} <span className="text-sm opacity-40">ج.م</span></p>
          </div>
          <Button 
            onClick={handleUpdateDailyLog} 
            className="w-full h-16 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
          >
            حفظ التعديلات المحدثة
          </Button>
        </div>
      </Modal>

      {/* Month Closing Modal - Enhanced Design */}
      <Modal
        isOpen={showCloseMonthModal}
        onClose={() => setShowCloseMonthModal(false)}
        title="تقفيل الشهر المالي"
      >
        <div className="p-2 pt-4 text-center space-y-8 relative z-10">
          <div className="relative mx-auto w-24 h-24 group">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-full h-full bg-white border-8 border-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-xl">
              <Lock size={40} className="stroke-[2.5]" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full text-sm font-black ring-1 ring-indigo-200/50">
              <Calendar size={14} />
              {viewDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          <p className="text-slate-500 font-bold leading-relaxed px-4 text-lg">
            سيتم ترحيل كافة العمليات المالية لهذا الشهر إلى سجلات الأرشيف السنوية. يرجى تحديد مصير الرصيد المتبقي:
          </p>

          <div className="grid grid-cols-2 gap-5">
            {[
              { id: 'rollover', label: 'ترحيل لشهر القادم', icon: ArrowRightLeft, desc: 'يتم تدوير المبلغ كبداية لشهر الجديد' },
              { id: 'settle', label: 'تسوية وتصفير', icon: CheckCircle2, desc: 'تصفير العهدة وتوريدها للبنك أو الخزنة' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setRolloverOption(option.id as any)}
                className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col items-center text-center gap-3 group relative overflow-hidden ${rolloverOption === option.id ? 'border-indigo-600 bg-indigo-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <div className={`p-4 rounded-2xl transition-all duration-300 ${rolloverOption === option.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                  <option.icon size={28} />
                </div>
                <div>
                  <span className={`block font-black text-[15px] mb-1 ${rolloverOption === option.id ? 'text-indigo-900' : 'text-slate-700'}`}>{option.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 leading-tight block px-2">{option.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-4 pt-6">
            <Button 
              onClick={() => setShowCloseMonthModal(false)} 
              variant="ghost" 
              className="flex-1 h-16 rounded-3xl font-black text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleCloseMonth} 
              className="flex-[2] h-16 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              إقفال الشهر الآن <ChevronRight size={24} />
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Edit Payment Method Modal */}
      <Modal
        isOpen={!!editingPaymentSession}
        onClose={() => setEditingPaymentSession(null)}
        title="تعديل وسيلة الدفع"
      >
        <div className="p-2 pt-4 text-center space-y-8">
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">العميل</p>
            <h4 className="text-xl font-black text-slate-900">{editingPaymentSession?.user_name || editingPaymentSession?.user_code}</h4>
            <p className="text-sm font-bold text-indigo-600 mt-1">المبلغ: {editingPaymentSession?.total_amount} ج.م</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'cash', label: 'كاش (نقدي)', icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
              { id: 'vfcash', label: 'Vodafone Cash', icon: Phone, color: 'text-rose-600 bg-rose-50' },
              { id: 'instapay', label: 'InstaPay', icon: Smartphone, color: 'text-indigo-600 bg-indigo-50' },
              { id: 'corporate', label: 'حساب شركة', icon: Users2, color: 'text-amber-600 bg-amber-50' },
            ].map(method => (
              <button
                key={method.id}
                onClick={() => handleUpdatePaymentMethod(editingPaymentSession.id, method.id)}
                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 group ${editingPaymentSession?.payment_method === method.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 hover:border-slate-200 bg-white'}`}
              >
                <div className={`p-4 rounded-2xl ${method.color} transition-transform group-hover:scale-110`}>
                  <method.icon size={24} />
                </div>
                <span className="font-black text-sm text-slate-700">{method.label}</span>
              </button>
            ))}
          </div>

          <Button variant="ghost" onClick={() => setEditingPaymentSession(null)} className="w-full h-14 rounded-2xl font-black text-slate-400">إلغاء</Button>
        </div>
      </Modal>
    </div>
  );


};

export default FinancePanel;

