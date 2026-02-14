import React, { useState, useEffect } from 'react';
import {
  Save, Percent, Coffee, Printer, Award, Settings2,
  ShieldCheck, Utensils, Plus, Mail, Bold, Italic,
  List, Link2, Eye, Code, Type as TypeIcon, X, Package, Box
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { Tables } from '../database.types';

// Specialized Types for the New Architecture
type Room = Tables<'services'>;
type CateringItem = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  branch_id: string | null;
  is_active: boolean | null;
};
type InventoryItem = {
  id: string;
  name: string;
  stock: number | null;
  unit: string | null;
  min_stock: number | null;
  branch_id: string | null;
};

// Cast supabase to any to avoid deep instantiation errors with complex schemas
const sb = supabase as any;

export const SettingsPanel = ({ branchId }: { branchId?: string }) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for each category
  const [rooms, setRooms] = useState<Room[]>([]);
  const [catering, setCatering] = useState<CateringItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Modal State
  const [modalType, setModalType] = useState<'room' | 'catering' | 'inventory' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Email/Settings State
  const [emailBody, setEmailBody] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchRooms(),
        fetchCatering(),
        fetchInventory()
      ]);
    } catch (e: any) {
      console.error('Error fetching data:', e.message);
    }
  };

  const getBranchId = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');

    const { data: emp, error } = await sb.from('employees')
      .select('branch_id')
      .eq('id', user.id)
      .single();

    if (error || !emp?.branch_id) throw new Error('تعذر العثور على الفرع الخاص بك');
    return emp.branch_id;
  };

  const fetchRooms = async () => {
    const { data } = await sb.from('services').select('*').eq('service_type', 'room').eq('is_active', true);
    setRooms((data as Room[]) || []);
  };

  const fetchCatering = async () => {
    const { data } = await sb.from('catering_items').select('*').eq('is_active', true);
    setCatering((data as CateringItem[]) || []);
  };

  const fetchInventory = async () => {
    const { data } = await sb.from('inventory').select('*');
    setInventory((data as InventoryItem[]) || []);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- SAVE HANDLERS ---

  const handleSaveRoom = async () => {
    if (!formData.name || !formData.base_price) return showNotification('يرجى ملء الاسم والسعر');
    try {
      if (editingItem) {
        await sb.from('services').update(formData).eq('id', editingItem.id);
      } else {
        const branch_id = await getBranchId();
        await sb.from('services').insert([{ ...formData, service_type: 'room', branch_id, is_active: true }]);
      }
      showNotification('تم الحفظ بنجاح');
      setModalType(null);
      fetchRooms();
    } catch (e: any) { showNotification(e.message); }
  };

  const handleSaveCatering = async () => {
    if (!formData.name || !formData.price) return showNotification('يرجى ملء الاسم والسعر');
    try {
      if (editingItem) {
        await sb.from('catering_items').update(formData).eq('id', editingItem.id);
      } else {
        const branch_id = await getBranchId();
        await sb.from('catering_items').insert([{ ...formData, branch_id, is_active: true }]);
      }
      showNotification('تم الحفظ بنجاح');
      setModalType(null);
      fetchCatering();
    } catch (e: any) { showNotification(e.message); }
  };

  const handleSaveInventory = async () => {
    if (!formData.name) return showNotification('يرجى ملء الاسم');
    try {
      if (editingItem) {
        await sb.from('inventory').update(formData).eq('id', editingItem.id);
      } else {
        const branch_id = await getBranchId();
        await sb.from('inventory').insert([{ ...formData, branch_id }]);
      }
      showNotification('تم الحفظ بنجاح');
      setModalType(null);
      fetchInventory();
    } catch (e: any) { showNotification(e.message); }
  };

  // --- DELETE HANDLERS ---
  const handleDelete = async (table: string, id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      if (table === 'inventory') {
        await sb.from(table).delete().eq('id', id);
      } else {
        await sb.from(table).update({ is_active: false }).eq('id', id);
      }
      showNotification('تم الحذف');
      fetchAllData();
    } catch (e: any) { showNotification(e.message); }
  };

  // --- SETTINGS (EMAIL) ---
  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await sb.from('settings').select('*').in('key', ['welcome_email_template', 'sender_email']);
    if (data) {
      setEmailBody(data.find((s: any) => s.key === 'welcome_email_template')?.value || '');
      setSenderEmail(data.find((s: any) => s.key === 'sender_email')?.value || '');
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const updates = [
      { key: 'welcome_email_template', value: emailBody, updated_at: new Date().toISOString() },
      { key: 'sender_email', value: senderEmail, updated_at: new Date().toISOString() }
    ];
    await sb.from('settings').upsert(updates, { onConflict: 'key' });
    showNotification('تم حفظ الإعدادات');
    setSaving(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-['Cairo'] text-right pb-32 relative">
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[110] flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="text-emerald-400" size={20} />
          <span className="font-bold">{notification}</span>
        </div>
      )}

      {/* 1. Specialized Room Management */}
      <Card className="border-none shadow-indigo-100 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600 rounded-bl-[10rem] opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Settings2 size={24} /></div>
            <div>
              <CardTitle>إدارة المساحات والغرف</CardTitle>
              <CardDescription>إدارة السعة والأسعار لكل ساعة</CardDescription>
            </div>
          </div>
          <Button className="bg-indigo-600" onClick={() => { setModalType('room'); setEditingItem(null); setFormData({ capacity: 1 }); }}>
            <Plus size={16} /> إضافة مساحة
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div key={room.id} className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Award size={20} /></div>
                  <span className="bg-slate-100 text-slate-500 rounded-full px-3 py-1 text-[10px] font-black">{room.capacity} فرد</span>
                </div>
                <h4 className="text-lg font-black text-slate-800">{room.name}</h4>
                <p className="text-2xl font-black text-indigo-600 mb-4">{room.base_price} <span className="text-[10px] text-slate-400">ج.م / ساعة</span></p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setModalType('room'); setEditingItem(room); setFormData(room); }}>تعديل</Button>
                  <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => handleDelete('services', room.id)}><Trash2 size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Specialized Catering Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Utensils size={24} /></div>
            <div>
              <CardTitle>قائمة الكاترينج</CardTitle>
              <CardDescription>إدارة المشروبات والوجبات الخفيفة</CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setModalType('catering'); setEditingItem(null); setFormData({ category: 'beverages' }); }}>
            <Plus size={16} /> إضافة صنف
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {['beverages', 'snacks'].map(cat => (
              <div key={cat} className="space-y-4">
                <h4 className="flex items-center gap-2 font-black text-slate-700 border-b border-slate-100 pb-2">
                  {cat === 'beverages' ? <Coffee className="text-amber-500" /> : <Utensils className="text-rose-500" />}
                  {cat === 'beverages' ? 'المشروبات' : 'الوجبات الخفيفة'}
                </h4>
                {catering.filter(c => c.category === cat).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 group">
                    <span className="font-bold text-sm">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-700">{item.price} ج.م</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => { setModalType('catering'); setEditingItem(item); setFormData(item); }}>
                        <Settings2 size={14} className="text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => handleDelete('catering_items', item.id)}>
                        <Trash2 size={14} className="text-rose-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Inventory Management (Hidden as requested, but logic kept for linking) */}
      {/* Standalone Inventory page exists */}

      {/* 4. Settings Footer (Email / Resend) */}
      <Card className="border-none shadow-indigo-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600 rounded-br-[5rem] opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Mail size={24} /></div>
            <div>
              <CardTitle>تخصيص البريد الترحيبي</CardTitle>
              <CardDescription>هذا الإيميل يصل تلقائياً للعملاء الجدد</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showPreview ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={showPreview ? "bg-indigo-600" : ""}
            >
              {showPreview ? "تعديل النص" : "معاينة الإيميل"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 pr-2">البريد المرسل منه (الاسم أو الدومين)</label>
            <Input
              dir="ltr"
              className="direction-ltr bg-slate-50 border-slate-200"
              value={senderEmail}
              onChange={e => setSenderEmail(e.target.value)}
              placeholder="welcome@domain.com"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs font-black text-slate-400 w-full mb-1">الأوسمة المتاحة (سيتم استبدالها تلقائياً):</span>
              {['{name}', '{code}', '{branch}', '{created_at}'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setEmailBody(prev => prev + ' ' + tag)}
                  className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black hover:bg-indigo-100 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {showPreview ? (
              <div
                className="w-full h-64 p-6 bg-white border border-slate-100 rounded-[2rem] overflow-y-auto prose prose-slate max-w-none text-right shadow-inner"
                dir="rtl"
                dangerouslySetInnerHTML={{
                  __html: emailBody
                    .replace(/{name}/g, 'أحمد محمد')
                    .replace(/{code}/g, 'C-1234')
                    .replace(/{branch}/g, 'فرع المعادي')
                    .replace(/{created_at}/g, new Date().toLocaleDateString('ar-EG'))
                    .replace(/\n/g, '<br/>')
                }}
              />
            ) : (
              <div className="relative group">
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  className="w-full h-64 p-6 bg-slate-900 text-indigo-100 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none selection:bg-indigo-500/30 scrollbar-hide"
                  placeholder="اكتب رسالة الترحيب هنا... يمكنك استخدام HTML"
                  dir="rtl"
                />
                <div className="absolute top-4 left-4 p-2 bg-indigo-500/10 rounded-lg text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <Code size={14} />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={saveSettings}
            className="w-full h-14 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200 hover:shadow-slate-300 transform hover:-translate-y-1 transition-all"
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin ml-2" /> : <Save className="ml-2" />}
            حفظ إعدادات البريد
          </Button>
        </CardContent>
      </Card>

      {/* --- MODALS --- */}

      {/* Room Modal */}
      {modalType === 'room' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">{editingItem ? 'تعديل مساحة' : 'إضافة مساحة جديدة'}</h3>
              <button onClick={() => setModalType(null)} className="p-2 hover:bg-slate-50 rounded-full"><X /></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">اسم الغرفة / المساحة</label>
                <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثلاً: غرفة الاجتماعات" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500">السعر (ساعة)</label>
                  <Input type="number" value={formData.base_price || 0} onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500">السعة (أفراد)</label>
                  <Input type="number" value={formData.capacity || 1} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                </div>
              </div>
              <Button onClick={handleSaveRoom} className="w-full h-14 rounded-2xl bg-indigo-600 text-lg font-black">حفظ البيانات</Button>
            </div>
          </div>
        </div>
      )}

      {/* Catering Modal */}
      {modalType === 'catering' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">{editingItem ? 'تعديل صنف' : 'إضافة صنف جديد'}</h3>
              <button onClick={() => setModalType(null)}><X /></button>
            </div>
            <div className="space-y-5">
              <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="اسم الصنف (مثلاً: بيبسي)" />
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" value={formData.price || 0} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} placeholder="السعر" />
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="beverages">مشروبات</option>
                  <option value="snacks">وجبات خفيفة</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">الارتباط بالمخزن (الخامة الأساسية)</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                  value={formData.inventory_id || ''}
                  onChange={e => setFormData({ ...formData, inventory_id: e.target.value })}
                >
                  <option value="">-- اختر خامة --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSaveCatering} className="w-full h-14 rounded-2xl bg-amber-500 font-black">حفظ الصنف</Button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal Removed */}

    </div>
  );
};
