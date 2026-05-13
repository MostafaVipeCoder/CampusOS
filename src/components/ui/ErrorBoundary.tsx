
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center font-['Cairo']">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
            <AlertCircle size={40} className="text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">عذراً، حدث خطأ غير متوقع</h1>
          <p className="text-slate-400 text-sm max-w-xs mb-8">
            لقد واجهنا مشكلة تقنية أثناء تشغيل الواجهة. يرجى المحاولة مرة أخرى أو العودة للرئيسية.
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <RefreshCw size={18} />
              إعادة تحميل الصفحة
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('workspace_session_id');
                window.location.reload();
              }}
              className="flex items-center justify-center gap-2 w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black hover:bg-slate-700 transition-all active:scale-95"
            >
              <Home size={18} />
              العودة لشاشة الدخول
            </button>
          </div>
          
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/5 text-left w-full max-w-md overflow-auto max-h-40">
              <p className="text-rose-400 font-mono text-[10px] whitespace-pre-wrap">
                {this.state.error?.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
