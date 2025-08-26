// Simple toast hook for notifications
import { useState } from 'react';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = 'default' }: Toast) => {
    // For now, just use browser alert
    // In a real app, you'd implement a proper toast system
    const message = description ? `${title}: ${description}` : title;
    
    if (variant === 'destructive') {
      console.error(message);
      alert(`Error: ${message}`);
    } else {
      console.log(message);
      alert(message);
    }
  };

  return { toast };
}
