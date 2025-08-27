'use client';

import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  onDismiss: (id: string) => void;
}

export function Toast({ id, title, description, variant = 'default', onDismiss }: ToastProps) {
  const variants = {
    default: 'bg-background border-border text-foreground',
    destructive: 'bg-destructive border-destructive text-destructive-foreground'
  };

  const icons = {
    default: <CheckCircle className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />
  };

  return (
    <div className={cn(
      'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
      'animate-in slide-in-from-right-full duration-300 ease-out',
      'data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
      variants[variant]
    )}>
      <div className="flex items-start space-x-3">
        {icons[variant]}
        <div className="grid gap-1">
          <div className="text-sm font-semibold">{title}</div>
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="absolute right-2 top-2 rounded-md p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
