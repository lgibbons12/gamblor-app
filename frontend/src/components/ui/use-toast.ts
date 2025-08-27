// Toast notification system using custom popup
import { useState } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// Global toast state
let globalToasts: Toast[] = [];
let globalSetToasts: ((toasts: Toast[]) => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Register this instance as the global setter
  if (!globalSetToasts) {
    globalSetToasts = setToasts;
    globalToasts = toasts;
  }

  const toast = ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, title, description, variant };
    
    // Log to console
    const message = description ? `${title}: ${description}` : title;
    if (variant === 'destructive') {
      console.error(message);
    } else {
      console.log(message);
    }
    
    // Add to global toasts
    globalToasts = [...globalToasts, newToast];
    if (globalSetToasts) {
      globalSetToasts(globalToasts);
    }
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      globalToasts = globalToasts.filter(t => t.id !== id);
      if (globalSetToasts) {
        globalSetToasts(globalToasts);
      }
    }, 4000);
  };

  const dismissToast = (id: string) => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    if (globalSetToasts) {
      globalSetToasts(globalToasts);
    }
  };

  return { toast, toasts, dismissToast };
}
