
import React, { useState } from 'react';
import {
  Save, Percent, Coffee, Printer, Award, Settings2,
  ShieldCheck, Utensils, Plus, Mail, Bold, Italic,
  List, Link2, Eye, Code, Type as TypeIcon, X
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from '../components/ui';
import { MOCK_INVENTORY } from '../mockData';

export const SettingsPanel = () => {
  const kitchenItems = MOCK_INVENTORY.filter(item => item.category === 'مطبخ وبوفيه');
  const [emailBody, setEmailBody] = useState(`أهلاً بك {{name}} في عائلة Campus!

يسعدنا انضمامك إلينا. هذا هو كود الدخول الخاص بك الذي يمكنك استخدامه في نظام الواي فاي وعند تسجيل الحضور:
كود العميل: {{code}}

يمكنك مسح الـ QR Code المرفق في هذا الإيميل لتسجيل الدخول مباشرة عند وصولك للمكان.

نتمنى لك وقتاً ممتعاً ومثمرًا!
فريق إدارة Campus`);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-['Cairo'] text-right pb-32">

      {/* 1. Room Management (With Add/Edit) */}
      <Card className="relative overflow-hidden border-none shadow-indigo-100 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600 rounded-bl-[10rem] -z-0 opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl">
              <Settings2 size={24} />
            </div>
            <div>
              <CardTitle>إدارة المساحات والغرف</CardTitle>
              <CardDescription>إضافة وتعديل الغرف، وتحديد الأسعار والسعة</CardDescription>
            </div>
          </div>
          <Button variant="default" size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> إضافة مساحة جديدة
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 'shared', name: 'المساحة المشتركة', hourlyRate: 20, capacity: 50 },
              { id: 'focus', name: 'غرفة التركيز', hourlyRate: 35, capacity: 1 },
              { id: 'meeting1', name: 'Meeting Room A', hourlyRate: 150, capacity: 8 },
              { id: 'meeting2', name: 'Meeting Room B', hourlyRate: 200, capacity: 12 },
              { id: 'team', name: 'Team Room', hourlyRate: 120, capacity: 6 },
              { id: 'class', name: 'قاعة المحاضرات', hourlyRate: 250, capacity: 40 },
            ].map((room) => (
              <div key={room.id} className="group relative bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-lg transition-all hover:border-indigo-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    {room.capacity > 10 ? <Award size={20} /> : <Settings2 size={20} />}
                  </div>
                  <span className="bg-slate-100 text-slate-500 rounded-full px-3 py-1 text-[10px] font-black">{room.capacity} فرد</span>
                </div>

                <h4 className="text-lg font-black text-slate-800 mb-1">{room.name}</h4>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-2xl font-black text-indigo-600">{room.hourlyRate}</span>
                  <span className="text-xs font-bold text-slate-400 mb-1.5">ج.م / ساعة</span>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs">تعديل</Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50"><X size={16} /></Button>
                </div>
              </div>
            ))}

            {/* Add New Room Card Placeholder */}
            <button className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all group">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-bold text-sm">إضافة غرفة أخرى</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Catering Pricing */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Utensils size={24} /></div>
            <div>
              <CardTitle>قائمة الكاترينج</CardTitle>
              <CardDescription>إدارة أسعار المشروبات والوجبات</CardDescription>
            </div>
          </div>
          <Button variant="default" size="sm" className="gap-2">
            <Plus size={16} /> إضافة صنف
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-black text-slate-700 border-b border-slate-100 pb-2 mb-4">
                <Coffee size={18} className="text-amber-500" /> المشروبات (Menu)
              </h4>
              {[
                { name: 'قهوة تركي', price: 25 },
                { name: 'شاي فتلة', price: 15 },
                { name: 'نسكافيه 3*1', price: 20 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group">
                  <span className="font-bold text-sm text-slate-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={item.price} className="h-9 w-20 text-center text-xs" />
                    <span className="text-[10px] font-black text-slate-300">EGP</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-black text-slate-700 border-b border-slate-100 pb-2 mb-4">
                <Utensils size={18} className="text-rose-500" /> الوجبات الخفيفة
              </h4>
              {[
                { name: 'بسكويت شوفان', price: 12 },
                { name: 'كرواسون سادة', price: 25 },
                { name: 'شوكولاتة كادبوري', price: 30 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group">
                  <span className="font-bold text-sm text-slate-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={item.price} className="h-9 w-20 text-center text-xs" />
                    <span className="text-[10px] font-black text-slate-300">EGP</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-black text-slate-700 border-b border-slate-100 pb-2 mb-4">
                <Settings2 size={18} className="text-indigo-500" /> خامات المطبخ (Inventory)
              </h4>
              {kitchenItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 hover:bg-white hover:shadow-sm transition-all group">
                  <div>
                    <span className="font-bold text-sm text-slate-700 block">{item.name}</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">مخزون: {item.stock} {item.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[10px] font-bold">تعديل التكلفة</span>
                    <Input type="number" defaultValue={0} placeholder="0" className="h-9 w-16 text-center text-xs bg-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Email Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Mail size={24} /></div>
          <div>
            <CardTitle>تخصيص البريد الترحيبي</CardTitle>
            <CardDescription>صياغة الرسالة التي تصل للعملاء الجدد</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center gap-2">
                <Button variant="ghost" size="icon"><Bold size={16} /></Button>
                <Button variant="ghost" size="icon"><Italic size={16} /></Button>
                <Button variant="ghost" size="icon"><List size={16} /></Button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <Button variant="outline" size="sm" className="mr-auto gap-2">
                  <Eye size={14} /> معاينة
                </Button>
              </div>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full h-80 bg-white border-2 border-slate-100 rounded-2xl p-6 text-sm font-bold leading-relaxed focus:border-indigo-600 outline-none transition-all resize-none shadow-inner"
              />
            </div>
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <h4 className="font-black text-sm mb-4 flex items-center gap-2"><Award size={16} /> الوسوم المتاحة</h4>
                <div className="space-y-3">
                  {["{{name}}", "{{code}}", "{{qr_code}}"].map(tag => (
                    <div key={tag} className="flex justify-between items-center p-2 bg-white/5 rounded-lg border border-white/10">
                      <code className="text-[10px] font-mono text-indigo-300">{tag}</code>
                      <span className="text-[9px] opacity-60 font-black">بيانات متغيرة</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-700 leading-relaxed italic">
                  نصيحة: إدراج رابط "موقعنا على الخرائط" يزيد من تقييم العميل لتجربته الأولى.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Contracts Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Percent size={24} /></div>
          <div>
            <CardTitle>إعدادات التعاقدات</CardTitle>
            <CardDescription>التحكم في نسب الخصم والكاش باك الافتراضية</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 p-6 bg-slate-50/50 border border-slate-100 rounded-2xl">
              <label className="text-xs font-black text-slate-500 block mb-2">نسبة كاش باك الأنشطة الطلابية (Student Cashback)</label>
              <p className="text-[10px] text-slate-400 mb-4">هذه النسبة سيتم تطبيقها تلقائياً على جميع تعاقدات الأنشطة الطلابية الجديدة.</p>
              <div className="relative">
                <Input
                  type="number"
                  defaultValue={localStorage.getItem('studentCashback') || '15'}
                  onChange={(e) => localStorage.setItem('studentCashback', e.target.value)}
                  className="text-xl font-black pr-12 text-emerald-600"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Save Button */}
      <div className="fixed bottom-10 right-1/2 translate-x-1/2 glass-effect border border-slate-200 px-10 py-5 rounded-full shadow-2xl flex items-center gap-8 z-[100] animate-in slide-in-from-bottom-20 duration-500">
        <div className="text-right border-l border-slate-200 pl-8">
          <span className="mb-1 animate-pulse tracking-widest uppercase text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-600">Sync Active</span>
          <p className="text-[10px] font-bold text-slate-500">تم حفظ آخر تغيير منذ دقيقتين</p>
        </div>
        <Button variant="secondary" size="lg" className="rounded-full shadow-indigo-200 shadow-xl gap-2">
          <Save size={20} /> حفظ كافة الإعدادات
        </Button>
      </div>

    </div>
  );
};
