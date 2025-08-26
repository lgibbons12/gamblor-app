'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google: any;
    googleSignInCallback: (response: any) => void;
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export default function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { login } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: window.googleSignInCallback,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 250,
          });
        }
      }
    };

    // Define the callback function
    window.googleSignInCallback = async (response: any) => {
      try {
        if (response.credential) {
          await login(response.credential);
          onSuccess?.();
        }
      } catch (error) {
        console.error('Google sign-in error:', error);
        onError?.(error);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      delete window.googleSignInCallback;
    };
  }, [login, onSuccess, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={buttonRef}></div>
      <p className="text-sm text-gray-600">
        Sign in with your Google account to continue
      </p>
    </div>
  );
}
