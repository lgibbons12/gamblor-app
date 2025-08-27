'use client';

import React from 'react';
import { ToastContainer } from './toast';
import { useToast } from './use-toast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismissToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
