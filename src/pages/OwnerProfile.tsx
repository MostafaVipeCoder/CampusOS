
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Coffee, 
  Clock, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';

interface Company {
  id: string;
  name: string;
  company_code: string;
  leader_name: string;
  leader_email: string;
  leader_phone: string;
}

interface MemberConsumption {
  id: string;
  name: string;
  unique_code: string;
  cateringTotal: number;
  spaceTotalHours: number;
  spaceTotalCost: number;
  memberOrders: any[];
}

export const OwnerProfile = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<MemberConsumption[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId, selectedMonth]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Company Info
      const { data: comp } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (comp) setCompany(comp);

      // 2. Fetch Active Contract for the month
      const { data: cont } = await supabase
        .from('monthly_contracts')
        .select('*')
        .eq('company_id', companyId)
        .eq('month', selectedMonth)
        .single();
      
      setContract(cont);

      // 3. Fetch Members
      const { data: mems } = await supabase
        .from('company_members')
        .select('*, customers(full_name, code)')
        .eq('company_id', companyId);

      // 4. Fetch Consumption Data
      const startOfMonth = `${selectedMonth}-01T00:00:00Z`;
      const endOfMonth = `${selectedMonth}-31T23:59:59Z`;

      const { data: orders } = await (supabase as any)
        .from('catering_orders')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      const { data: sessions } = await (supabase as any)
        .from('workspace_sessions')
        .select('*')
        .eq('status', 'completed')
        .gte('start_time', startOfMonth)
        .lte('start_time', endOfMonth);

      // Aggregate
      const enrichedMembers = (mems || []).map((m: any) => {
        const memberOrders = (orders || []).filter((o: any) => o.member_id === m.id);
        const cateringTotal = memberOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
        
        const memberSessions = (sessions || []).filter((s: any) => s.customer_id === m.customer_id);
        const spaceTotalHours = memberSessions.reduce((sum: number, s: any) => sum + (Number(s.total_minutes || 0) / 60), 0);
        const spaceTotalCost = memberSessions.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);

        return {
          id: m.id,
          name: m.customers?.full_name || 'Unknown',
          unique_code: m.customers?.code || 'N/A',
          cateringTotal,
          spaceTotalHours,
          spaceTotalCost,
          memberOrders
        };
      });

      setMembers(enrichedMembers);

    } catch (err) {
      console.error('Error fetching owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-indigo-500 rounded-3xl rotate-12 flex items-center justify-center">
            <Building2 className="text-white" size={32} />
          </div>
          <p className="text-slate-400 font-black">جاري تحميل بيانات الشركة...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-10 text-center">
        <p>الشركة غير موجودة</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-black">عودة</button>
      </div>
    );
  }

  const totalCatering = members.reduce((sum, m) => sum + m.cateringTotal, 0);
  const totalHours = members.reduce((sum, m) => sum + m.spaceTotalHours, 0);

  return (
    <div className="space-y-8 font-['Cairo'] text-right pb-20">
      {/* Header Profile Section */}
      <div className="bg-slate-900 text-white rounded-[3.5rem] p-10 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent -z-10" />
         <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="text-center md:text-right flex-1">
               <div className="flex items-center justify-center md:justify-end gap-3 mb-4">
                  <span className="bg-indigo-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Business Account</span>
                  <h1 className="text-4xl md:text-5xl font-black">{company.name}</h1>
               </div>
               <p className="text-slate-400 font-bold mb-6 text-lg max-w-2xl">مرحباً بك {company.leader_name}، يمكنك متابعة استهلاك فريقك وميزانية الشركة من هنا.</p>
               
               <div className="flex flex-wrap justify-center md:justify-end gap-4">
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                     <p className="text-[10px] font-black text-slate-300 uppercase mb-1">كود الشركة للربط</p>
                     <p className="font-mono text-xl font-black">{company.company_code}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                     <p className="text-[10px] font-black text-slate-300 uppercase mb-1">رقم الهاتف المسجل</p>
                     <p className="font-black text-xl">{company.leader_phone}</p>
                  </div>
               </div>
            </div>
            
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-[3rem] flex items-center justify-center rotate-12 hover:rotate-0 transition-transform duration-500 shadow-inner group">
               <Building2 size={64} className="text-white md:group-hover:scale-110 transition-transform" />
            </div>
         </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-white shadow-sm">
         <div className="flex items-center gap-3">
            <Calendar className="text-indigo-500" size={20} />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border-none rounded-xl px-4 py-2 font-black text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
            />
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 rounded-2xl border border-slate-100 font-black text-xs hover:bg-slate-50 transition-all">
               <Download size={16} />
               تحميل تقرير PDF
            </button>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all">
               <ArrowRight size={16} />
               العودة للمنصة
            </button>
         </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="rounded-[2.5rem] border-none shadow-xl shadow-indigo-500/5 bg-white group hover:-translate-y-2 transition-all">
            <CardContent className="p-8">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                     <Users size={28} />
                  </div>
                  <TrendingUp className="text-emerald-500" size={20} />
               </div>
               <p className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">أعضاء الفريق</p>
               <h3 className="text-4xl font-black text-slate-800">{members.length}</h3>
            </CardContent>
         </Card>

         <Card className="rounded-[2.5rem] border-none shadow-xl shadow-emerald-500/5 bg-white group hover:-translate-y-2 transition-all">
            <CardContent className="p-8">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                     <Clock size={28} />
                  </div>
                  <CheckCircle2 className="text-emerald-500" size={20} />
               </div>
               <p className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">ساعات التواجد</p>
               <h3 className="text-4xl font-black text-slate-800">{totalHours.toFixed(1)} <span className="text-sm">hr</span></h3>
            </CardContent>
         </Card>

         <Card className="rounded-[2.5rem] border-none shadow-xl shadow-amber-500/5 bg-white group hover:-translate-y-2 transition-all">
            <CardContent className="p-8">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                     <Coffee size={28} />
                  </div>
                  <AlertCircle className="text-amber-500" size={20} />
               </div>
               <p className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">استهلاك الكافيتريا</p>
               <h3 className="text-4xl font-black text-slate-800">{totalCatering.toLocaleString()} <span className="text-sm">EGP</span></h3>
            </CardContent>
         </Card>

         <Card className="rounded-[2.5rem] border-none shadow-xl shadow-rose-500/5 bg-slate-900 text-white group hover:-translate-y-2 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -z-10" />
            <CardContent className="p-8">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                     <Briefcase size={28} />
                  </div>
                  <ShieldCheck className="text-indigo-400" size={20} />
               </div>
               <p className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">الميزانية المتبقية</p>
               <h3 className="text-4xl font-black">{contract?.catering_remaining_balance?.toLocaleString() || '0'} <span className="text-sm text-slate-500">EGP</span></h3>
            </CardContent>
         </Card>
      </div>

      {/* Members Consumption List */}
      <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white overflow-hidden">
         <CardHeader className="p-10 border-b border-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="text-right">
                  <CardTitle className="text-2xl font-black mb-2">استهلاك أعضاء الفريق</CardTitle>
                  <p className="text-slate-400 font-bold text-sm text-right">قائمة بجميع الأعضاء واستهلاكهم التفصيلي للمساحة والكافيتريا خلال هذا الشهر.</p>
               </div>
               <div className="relative w-full md:w-72">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input className="w-full bg-slate-50 border-none rounded-2xl pr-12 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" placeholder="بحث باسم العضو..." />
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-10">
            <div className="space-y-6">
               {members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-2">
                     <div 
                        onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                        className={`flex flex-col md:flex-row items-center justify-between p-6 bg-white border-2 rounded-[2.5rem] group hover:border-indigo-200 transition-all hover:shadow-xl cursor-pointer ${expandedMemberId === member.id ? 'border-indigo-500 shadow-xl' : 'border-slate-50'}`}
                     >
                        <div className="flex items-center gap-4 order-2 md:order-1 mt-4 md:mt-0">
                           <div className="flex flex-col text-center px-6 border-r border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ساعات المساحة</span>
                              <span className="font-black text-slate-900 text-lg">{member.spaceTotalHours.toFixed(1)} hr</span>
                           </div>
                           <div className="flex flex-col text-center px-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">استهلاك الكافية</span>
                              <span className="font-black text-emerald-600 text-lg">{member.cateringTotal} EGP</span>
                           </div>
                           <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                              {expandedMemberId === member.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                           </div>
                        </div>

                        <div className="flex items-center gap-4 order-1 md:order-2 w-full md:w-auto">
                           <div className="text-right flex-1">
                              <h4 className="text-xl font-black text-slate-800">{member.name}</h4>
                              <p className="text-xs font-black text-indigo-500 font-mono tracking-tighter">#{member.unique_code}</p>
                           </div>
                           <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                              <Users size={32} />
                           </div>
                        </div>
                     </div>

                     {/* Itemized Catering View */}
                     {expandedMemberId === member.id && (
                        <div className="mx-6 md:mx-12 bg-slate-50/50 rounded-b-[2.5rem] border-x-2 border-b-2 border-slate-100 p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
                           <div className="flex justify-between items-center">
                              <span className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black text-slate-400 border border-slate-100 uppercase tracking-widest">{member.memberOrders.length} طلبات</span>
                              <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">سجل استهلاك الكافيتريا</h4>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {member.memberOrders.length > 0 ? member.memberOrders.map((o: any, idx: number) => (
                                 <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group/item hover:border-indigo-100 transition-all">
                                    <div className="text-left">
                                       <p className="text-lg font-black text-emerald-600">{o.amount} <span className="text-[10px]">EGP</span></p>
                                    </div>
                                    <div className="text-right flex-1 px-4">
                                       <h5 className="font-black text-slate-800 mb-0.5">{o.item_name}</h5>
                                       <div className="flex items-center justify-end gap-2 text-slate-400 text-[10px] font-bold">
                                          <span>{new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                          <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                          <span>{new Date(o.created_at).toLocaleDateString('ar-EG')}</span>
                                       </div>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">
                                       x{o.quantity}
                                    </div>
                                 </div>
                              )) : (
                                 <div className="col-span-full py-12 text-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                       <Coffee size={40} />
                                    </div>
                                    <p className="text-slate-400 font-black text-sm italic">لا توجد أي طلبات مسجلة لهذا العضو في هذا الشهر</p>
                                 </div>
                              )}
                           </div>

                           <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-2 text-emerald-600 font-black">
                                 <span className="text-xl">{member.cateringTotal} EGP</span>
                                 <span className="text-[10px] uppercase tracking-widest opacity-50">Total</span>
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">* جميع الطلبات تخصم من رصيد الشركة المسبق</p>
                           </div>
                        </div>
                     )}
                  </div>
               ))}
               {members.length === 0 && (
                  <div className="py-32 text-center">
                     <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 animate-bounce">
                        <Users size={48} />
                     </div>
                     <p className="text-slate-300 font-black text-xl uppercase tracking-[0.2em]">لا يوجد أعضاء مسجلين في هذه الشركة</p>
                  </div>
               )}
            </div>
         </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] pb-10">
         <span>CAMPUS BUSINESS CLOUD</span>
         <div className="w-2 h-2 bg-slate-200 rounded-full hidden md:block" />
         <span>POWERED BY ANTIGRAVITY ENGINE</span>
         <div className="w-2 h-2 bg-slate-200 rounded-full hidden md:block" />
         <span>{new Date().getFullYear()} ALL RIGHTS RESERVED</span>
      </div>
    </div>
  );
};
