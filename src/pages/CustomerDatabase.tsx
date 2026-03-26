
import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Mail, Phone, MoreVertical, Plus, X, Edit, QrCode, Send, Trash2, CheckCircle2, Loader2, ChevronUp, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Tables } from '../database.types';

type Customer = Tables<'customers'>;

export const CustomerDatabase = ({ branchId }: { branchId?: string }) => {
  // --- STATE ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'qr' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    full_name: '', phone: '', email: '', gender: 'Male', birth_date: '', referral_source: '', is_active: true
  });

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ column: keyof Customer, ascending: boolean }>({
    column: 'code',
    ascending: true
  });
  const itemsPerPage = 50;

  // --- FETCHING ---
  useEffect(() => {
    fetchCustomers();

    // Realtime Subscription
    const channel = supabase
      .channel('customers_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          console.log('Realtime update:', payload);
          // For large datasets with server pagination, we should probably just refresh the current page
          // or handle inserts/deletes carefully. For now, simple refresh is safest for counts.
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, searchTerm, sortConfig]);

  // Log email errors to console for debugging
  useEffect(() => {
    const failedEmails = customers.filter(c => c.email_status === 'failed');
    if (failedEmails.length > 0) {
      console.group('🚨 Email Sending Failures Report 🚨');
      failedEmails.forEach(c => {
        console.error(
          `%cCustomer:%c ${c.full_name}\n%cEmail:%c ${c.email}\n%cError:%c ${c.email_error || 'Unknown Error (Check Edge Function Logs)'}`,
          'font-weight: bold', 'color: inherit',
          'font-weight: bold', 'color: inherit',
          'font-weight: bold; color: red', 'color: red'
        );
      });
      console.groupEnd();
    }
  }, [customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    console.log('Fetching customers from Supabase (Server-side Pagination)...');
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .range(from, to);

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      
      console.log('Total customers count:', count);
      setCustomers(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      showNotification('خطأ في تحميل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  // 1. Add New Customer
  const handleAddSubmit = async () => {
    if (!formData.full_name || !formData.phone) {
      showNotification('يرجى ملء الحقول الأساسية');
      return;
    }

    console.log('Attempting to add customer:', formData);
    try {
      // Determine sequential code starting from A001
      const { data: lastCustomer } = await supabase
        .from('customers')
        .select('code')
        .order('code', { ascending: false })
        .limit(1)
        .maybeSingle();

      let generatedCode = 'A001';

      if (lastCustomer && lastCustomer.code) {
        const lastCode = lastCustomer.code.toUpperCase();
        const match = lastCode.match(/^([A-Z])(\d+)$/);
        
        if (match) {
          const prefix = match[1];
          const number = parseInt(match[2], 10);
          
          if (number < 999) {
            generatedCode = `${prefix}${(number + 1).toString().padStart(3, '0')}`;
          } else {
            const nextPrefix = String.fromCharCode(prefix.charCodeAt(0) + 1);
            generatedCode = `${nextPrefix}001`;
          }
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          full_name: formData.full_name,
          phone: formData.phone!,
          email: formData.email,
          gender: formData.gender,
          birth_date: formData.birth_date,
          referral_source: formData.referral_source,
          code: generatedCode, 
        }] as any)
        .select()
        .single();

      if (error) {
        console.error('Database Error:', error);
        throw error;
      }

      console.log('Customer added successfully:', data);
      // setCustomers([data, ...customers]); // Handled by Realtime subscription
      resetForm();
      showNotification(`تم إضافة العميل ${data.full_name} بنجاح!`);
    } catch (error: any) {
      console.error('Registration Error:', error);
      showNotification('خطأ في الإضافة: ' + error.message);
    }
  };

  // 2. Edit Customer
  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(customer);
    setActiveModal('edit');
  };

  const handleEditSubmit = async () => {
    if (!selectedCustomer) return;
    console.log('Updating customer:', selectedCustomer.id, formData);
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          phone: formData.phone,
          email: formData.email,
          is_active: formData.is_active,
        })
        .eq('id', selectedCustomer.id)
        .select()
        .single();

      if (error) {
        console.error('Update Error:', error);
        throw error;
      }

      console.log('Update success:', data);
      // setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? data : c)); // Handled by Realtime subscription
      resetForm();
      showNotification('تم تحديث بيانات العميل بنجاح');
    } catch (error: any) {
      console.error('Edit Error:', error);
      showNotification('خطأ في التحديث: ' + error.message);
    }
  };

  // 3. Resend Email
  const handleResendEmail = (email: string | null) => {
    if (!email) return;
    showNotification(`تم إعادة إرسال بريد الترحيب إلى ${email}`);
  };

  // Helpers
  const resetForm = () => {
    setFormData({ full_name: '', phone: '', email: '', gender: 'Male', birth_date: '', referral_source: '', is_active: true });
    setActiveModal(null);
    setSelectedCustomer(null);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // No client-side filtering needed anymore as we do it on server
  const filteredCustomers = customers;

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = customers; // Already paginated from server

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Cairo'] text-right pb-20 relative">

      {/* Notifications */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[60] flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="text-emerald-400" size={20} />
          <span className="font-bold">{notification}</span>
        </div>
      )}

      {/* Header Controls */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-white shadow-xl flex flex-col xl:flex-row justify-between items-center gap-4 sm:gap-6 sticky top-2 sm:top-6 z-30">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="البحث باسم العميل أو الكود..."
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-12 sm:pr-16 pl-4 sm:pl-6 py-3 sm:py-4 text-base sm:text-lg font-bold focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 w-full lg:w-auto justify-center lg:justify-end">
          <button
            onClick={() => setActiveModal('add')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Plus size={18} /> إضافة عميل جديد
          </button>

          <button 
            onClick={() => setSortConfig(prev => ({ column: 'code', ascending: !prev.ascending }))}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm active:scale-95"
          >
            {sortConfig.ascending ? <ChevronUp size={18} /> : <ChevronUp size={18} className="rotate-180" />} 
            ترتيب {sortConfig.ascending ? 'تصاعدي' : 'تنازلي'}
          </button>
          
          <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95"><Download size={18} /> تصدير Excel</button>
        </div>
      </div>

      {/* Database Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px] relative group/table transition-all">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-lg z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={64} />
              <p className="text-indigo-900 font-black animate-pulse">جاري تحميل البيانات...</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-20">
              <th 
                className="px-8 py-6 cursor-pointer hover:text-indigo-600 transition-colors group"
                onClick={() => setSortConfig(prev => ({ 
                  column: 'code', 
                  ascending: prev.column === 'code' ? !prev.ascending : true 
                }))}
              >
                <div className="flex items-center gap-2">
                  <span>الاسم والكود</span>
                  {sortConfig.column === 'code' && (
                    <ChevronUp className={`transition-transform duration-300 ${sortConfig.ascending ? '' : 'rotate-180'}`} size={12} />
                  )}
                </div>
              </th>
              <th className="px-6 py-6">التواصل</th>
              <th className="px-6 py-6 text-center">النوع</th>
              <th className="px-6 py-6 text-center">حالة البريد</th>
              <th className="px-6 py-6 text-center">الحالة</th>
              <th className="px-8 py-6 text-left">أدوات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold relative">
            {!loading && filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black">
                  لا يوجد عملاء مطابقين للبحث
                </td>
              </tr>
            )}
            {paginatedCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-indigo-50/20 transition-all group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs uppercase">
                      {customer.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-slate-800 font-black">{customer.full_name}</p>
                      <p className="text-[10px] text-indigo-500 font-mono tracking-widest bg-indigo-50 px-2 rounded inline-block mt-1">{customer.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <span className="flex items-center gap-2"><Phone size={12} /> {customer.phone}</span>
                    {customer.email && <span className="flex items-center gap-2"><Mail size={12} /> {customer.email}</span>}
                  </div>
                </td>
                <td className="px-6 py-6 text-center text-slate-400 text-xs">
                  <span className={`px-2 py-1 rounded-lg text-[10px] ${customer.gender === 'Male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>{customer.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
                </td>
                <td className="px-6 py-6 text-center">
                  {customer.email ? (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto w-fit ${customer.email_status === 'sent'
                      ? 'bg-emerald-50 text-emerald-600'
                      : customer.email_status === 'failed'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-50 text-slate-400'
                      }`}
                      title={customer.email_status === 'failed' ? (customer.email_error || 'خطأ غير معروف') : ''}
                    >
                      {customer.email_status === 'sent' ? (
                        <>
                          <CheckCircle2 size={10} /> تم الإرسال
                        </>
                      ) : customer.email_status === 'failed' ? (
                        <>
                          <X size={10} /> تعذر الإرسال
                        </>
                      ) : (
                        <>
                          <Loader2 size={10} className="animate-spin" /> قيد الانتظار
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">لا يوجد بريد</span>
                  )}
                </td>
                <td className="px-6 py-6 text-center">
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${customer.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {customer.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-8 py-6 text-left">
                  <div className="flex justify-end gap-2 opacity-150 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(customer)} title="تعديل" className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Edit size={16} /></button>
                    <button 
                      onClick={() => {
                        if (customer.qr_code) {
                          window.open(customer.qr_code, '_blank');
                        } else {
                          setSelectedCustomer(customer);
                          setActiveModal('qr');
                        }
                      }} 
                      title="QR Code" 
                      className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <QrCode size={16} />
                    </button>
                    {customer.email && <button onClick={() => handleResendEmail(customer.email)} title="إعادة إرسال البريد" className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors"><Send size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>


      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
            عرض {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalCount)} من {totalCount} عميل
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              بعده
            </button>

            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              قبله
            </button>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Add Customer Modal */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in transition-all">
          <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">إضافة عميل جديد</h3>
                  <p className="text-indigo-300/60 text-xs font-bold uppercase tracking-widest mt-1">إنشاء سجل جديد في النظام</p>
                </div>
              </div>
              <button 
                onClick={resetForm}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    الاسم بالكامل
                  </label>
                  <input type="text" placeholder="مثال: أحمد محمد علي" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                    value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    رقم الهاتف
                  </label>
                  <input type="text" placeholder="01xxxxxxxxx" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    البريد الإلكتروني
                  </label>
                  <input type="email" placeholder="example@mail.com" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    تاريخ الميلاد
                  </label>
                  <input type="date" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
                    value={formData.birth_date || ''} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    النوع (Gender)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, gender: 'Male'})}
                      className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${formData.gender === 'Male' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                    >
                      ذكر
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, gender: 'Female'})}
                      className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${formData.gender === 'Female' ? 'bg-pink-600 text-white border-pink-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                    >
                      أنثى
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    كيف عرفت عنا؟
                  </label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    value={formData.referral_source || ''} onChange={e => setFormData({ ...formData, referral_source: e.target.value })}>
                    <option value="">اختر مصدر المعرفة...</option>
                    <option value="Facebook">فيسبوك</option>
                    <option value="Instagram">انستجرام</option>
                    <option value="Friend">ترشيح صديق</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 shrink-0 border-t border-slate-100">
                <button 
                  onClick={handleAddSubmit} 
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-indigo-200 hover:-translate-y-1 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} />
                  إكمال التسجيل و الحفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Edit Customer Modal */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in transition-all">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                  <Edit size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">تعديل البيانات</h3>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{selectedCustomer?.code}</p>
                </div>
              </div>
              <button 
                onClick={resetForm}
                className="p-3 hover:bg-slate-100 rounded-full transition-colors"
               >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border-2 border-amber-100/50 rounded-2xl text-amber-700 text-[13px] font-bold leading-relaxed flex items-start gap-4">
                <div className="bg-amber-100 p-1.5 rounded-lg shrink-0 mt-0.5">
                  <AlertCircle size={14} />
                </div>
                <span>لا يمكن تعديل الاسم أو الكود أو النوع للحفاظ على تكامل البيانات التاريخية للمستخدم.</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">رقم الهاتف</label>
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">البريد الإلكتروني</label>
                <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                  value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">تنشيط الحساب</label>
                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  value={String(formData.is_active)} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })} >
                  <option value="true">نشط (Active)</option>
                  <option value="false">غير نشط (Inactive)</option>
                </select>
              </div>

              <div className="pt-6 flex gap-4">
                <button onClick={handleEditSubmit} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all shadow-xl">تحديث السجل</button>
                <button onClick={resetForm} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. QR Code Modal */}
      {activeModal === 'qr' && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/80 backdrop-blur-2xl p-0 sm:p-4 animate-in fade-in transition-all">
          <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-10 text-center relative animate-in slide-in-from-bottom-20 duration-500 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-transparent -z-10" />
            
            <button 
              onClick={resetForm} 
              className="absolute top-8 right-8 p-3 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 hover:text-slate-600 transition-all"
            >
              <X size={20} />
            </button>

            <div className="mb-10">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-indigo-100 font-black text-3xl">
                C
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-2">{selectedCustomer.full_name}</h3>
              <p className="text-indigo-600 font-mono font-black tracking-[0.2em] text-xl bg-indigo-50 inline-block px-4 py-1 rounded-lg">{selectedCustomer.code}</p>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.2)] border-2 border-indigo-50 inline-block mb-10 group/qr hover:scale-105 transition-transform duration-500">
              <QRCodeSVG value={selectedCustomer.code} size={240} level="H" className="drop-shadow-sm" />
            </div>

            <p className="text-slate-400 text-sm font-bold mb-10 leading-relaxed px-4">استخدم هذا الرمز للمسح الضوئي السريع وبدء الجلسة تلقائياً في بوابة الدخول.</p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <button className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95">تحميل الكود</button>
                <button className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95">طباعة</button>
              </div>
              {selectedCustomer.qr_code && (
                <button 
                  onClick={() => window.open(selectedCustomer.qr_code, '_blank')}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Download size={18} className="text-indigo-400" />
                  فتح الاستمارة الرقمية
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Feedback */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-40 lg:hidden pointer-events-none">
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-3xl shadow-2xl shadow-indigo-200 animate-pulse border-2 border-white">
          <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            Mobile Version
          </p>
        </div>
      </div>

    </div>
  );
};
