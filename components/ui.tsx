import React from 'react';

// Utility for class merging (simplified for no dependency)
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// Button
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'destructive' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-orange-500 text-white active:bg-orange-600',
      outline: 'border border-gray-300 bg-transparent active:bg-gray-100 text-gray-900',
      ghost: 'active:bg-gray-100 text-gray-700',
      destructive: 'bg-red-500 text-white active:bg-red-600',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex h-12 items-center justify-center rounded-xl px-4 font-medium transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none touch-manipulation',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Card
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Badge
export function Badge({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span 
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors bg-orange-100 text-orange-800', 
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}