import React, { useState } from 'react';
import { CheckCircle2, QrCode } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QRCodeSVG } from 'qrcode.react';

export const CheckinPortal = () => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scannedName, setScannedName] = useState<string>('');

  const handleScan = (detectedCodes: any[]) => {
    if (status === 'success' || detectedCodes.length === 0) return;

    const value = detectedCodes[0].rawValue;
    // In a real app, you'd fetch user details here
    console.log('Scanned:', value);

    setScannedName('أحمد محمد علي'); // Mock name
    setStatus('success');

    // Reset after 3 seconds
    setTimeout(() => {
      setStatus('idle');
      setScannedName('');
    }, 3000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center font-['Cairo'] text-right animate-in fade-in duration-700">

      {/* Success Overlay */}
      {status === 'success' && (
        <div className="fixed inset-0 bg-emerald-500/95 z-50 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
          <CheckCircle2 size={120} className="mb-6 animate-bounce" />
          <h1 className="text-6xl font-black mb-4">تم تسجيل الدخول</h1>
          <p className="text-3xl font-bold opacity-90">أهلاً بك، {scannedName}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-6xl mx-auto items-center">

        {/* Scanner Section */}
        <div className="bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-indigo-50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-800 mb-2">تسجيل حضور الأعضاء</h2>
            <p className="text-slate-500 font-bold">يرجى وضع QR Code أمام الكاميرا</p>
          </div>

          <div className="relative rounded-[2rem] overflow-hidden border-4 border-indigo-100 shadow-inner aspect-square max-w-md mx-auto bg-slate-100">
            <Scanner
              onScan={handleScan}
              sound={false}
              styles={{
                container: { width: '100%', height: '100%' }
              }}
              components={{
                finder: true
              }}
            />
            {/* Scanning Overlay Animation */}
            <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-[2rem] pointer-events-none"></div>
            <div className="absolute h-1 w-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] top-1/2 -translate-y-1/2 animate-[scan_2s_ease-in-out_infinite] opacity-50 pointer-events-none"></div>
          </div>

          <div className="mt-8 flex justify-center items-center gap-3 text-indigo-500 opacity-60">
            <QrCode className="animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase">Scanner Active</span>
          </div>
        </div>

        {/* Registration Section */}
        <div className="bg-slate-900 rounded-[3rem] p-12 text-center text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-between h-full min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-4">ليس لديك حساب؟</h2>
            <p className="text-indigo-200 text-lg font-bold">سجّل الآن وانضم إلى مجتمعنا</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 relative z-10 group">
            <QRCodeSVG
              value="https://campus-hub.com/register"
              size={220}
              level="H"
              fgColor="#1e293b"
            />
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
              <span className="text-slate-900 font-black text-xl">سجّل الآن 🚀</span>
            </div>
          </div>

          <div className="relative z-10 w-full">
            <div className="h-px bg-white/10 w-full my-6"></div>
            <p className="text-sm text-slate-400">امسح الكود بكاميرا هاتفك لفتح نموذج التسجيل</p>
          </div>
        </div>
      </div>
    </div>
  );
};
