
import React from 'react';
import { cn } from '../lib/utils';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
      outline: 'border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-900',
      secondary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
      link: 'text-indigo-600 underline-offset-4 hover:underline',
    };
    const sizes = {
      default: 'h-11 px-6 py-2',
      sm: 'h-9 px-3 text-xs',
      lg: 'h-14 px-10 text-lg',
      icon: 'h-10 w-10',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl text-sm font-black ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

// --- Card ---
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-sm', className)} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-8', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-xl font-black leading-none tracking-tight text-slate-800', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm font-bold text-slate-500', className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-8 pt-0', className)} {...props} />
);

// --- Input ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border-2 border-slate-100 bg-white px-5 py-2 text-sm font-bold ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

// --- Badge ---
export const Badge = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) => {
  const variants = {
    default: 'border-transparent bg-slate-900 text-white',
    secondary: 'border-transparent bg-indigo-100 text-indigo-700',
    destructive: 'border-transparent bg-rose-100 text-rose-700',
    outline: 'text-slate-950 border-slate-200',
  };
  return (
    <div className={cn('inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-black transition-colors', variants[variant], className)} {...props} />
  );
};
