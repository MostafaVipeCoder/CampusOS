
import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Mail, Phone, MoreVertical, Plus, X, Edit, QrCode, Send, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
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
          if (payload.eventType === 'INSERT') {
            setCustomers((prev) => [payload.new as Customer, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCustomers((prev) => prev.map((c) => (c.id === payload.new.id ? (payload.new as Customer) : c)));
          } else if (payload.eventType === 'DELETE') {
            setCustomers((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    console.log('Fetching customers from Supabase...');
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      console.log('Customers fetched successfully:', data);
      setCustomers(data || []);
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

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="البحث باسم العميل أو الكود..."
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-16 pl-6 py-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto justify-end">
          <button
            onClick={() => setActiveModal('add')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} /> إضافة عميل جديد
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"><Filter size={18} /> تصفية</button>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"><Download size={18} /> تصدير Excel</button>
        </div>
      </div>

      {/* Database Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
          </div>
        )}

        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <th className="px-8 py-6">الاسم والكود</th>
              <th className="px-6 py-6">التواصل</th>
              <th className="px-6 py-6 text-center">النوع</th>
              <th className="px-6 py-6 text-center">حالة البريد</th>
              <th className="px-6 py-6 text-center">الحالة</th>
              <th className="px-8 py-6 text-left">أدوات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {!loading && filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black">
                  لا يوجد عملاء مطابقين للبحث
                </td>
              </tr>
            )}
            {filteredCustomers.map(customer => (
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
                    <button onClick={() => { setSelectedCustomer(customer); setActiveModal('qr'); }} title="QR Code" className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-colors"><QrCode size={16} /></button>
                    {customer.email && <button onClick={() => handleResendEmail(customer.email)} title="إعادة إرسال البريد" className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors"><Send size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Add Customer Modal */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <h3 className="text-xl font-black flex items-center gap-2"><Plus className="text-indigo-400" /> إضافة عميل جديد</h3>
              <button onClick={resetForm}><X className="opacity-50 hover:opacity-100 transition-opacity" /></button>
            </div>
            <div className="p-8 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الاسم بالكامل</label>
                  <input type="text" placeholder="الاسم" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                    value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">رقم الهاتف</label>
                  <input type="text" placeholder="01xxxxxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">البريد الإلكتروني</label>
                  <input type="email" placeholder="example@mail.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">تاريخ الميلاد</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                    value={formData.birth_date || ''} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">النوع</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                    value={formData.gender || 'Male'} onChange={e => setFormData({ ...formData, gender: e.target.value as any })}>
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">كيف عرفت عنا؟</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                    value={formData.referral_source || ''} onChange={e => setFormData({ ...formData, referral_source: e.target.value })}>
                    <option value="">اختر...</option>
                    <option value="Facebook">فيسبوك</option>
                    <option value="Instagram">انستجرام</option>
                    <option value="Friend">ترشيح صديق</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button onClick={handleAddSubmit} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">تسجيل العميل في قاعدة البيانات</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Edit Customer Modal */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800">تعديل بيانات العميل</h3>
              <button onClick={resetForm}><X className="text-slate-400 hover:text-slate-800" /></button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-bold">
                ⚠️ لا يمكن تعديل الاسم أو الكود أو النوع للحفاظ على تكامل البيانات.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">رقم الهاتف</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">البريد الإلكتروني</label>
                <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                  value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">الحالة</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                  value={String(formData.is_active)} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })} >
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={handleEditSubmit} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800">حفظ التغييرات</button>
                <button onClick={resetForm} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. QR Code Modal */}
      {activeModal === 'qr' && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center relative max-w-sm w-full">
            <button onClick={resetForm} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button>

            <div className="mb-6">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{selectedCustomer.full_name}</h3>
              <p className="text-indigo-600 font-mono font-bold tracking-widest text-lg">{selectedCustomer.code}</p>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-inner border-4 border-indigo-50 inline-block mb-6">
              <QRCodeSVG value={selectedCustomer.code} size={200} level="H" />
            </div>

            <p className="text-slate-400 text-xs font-bold mb-6">يمكن استخدام هذا الكود لتسجيل الدخول في البوابة</p>

            <div className="flex gap-3 justify-center">
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200">تحميل الصورة</button>
              <button className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200">طباعة</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
