"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

export function useAuthGuard(redirectTo = '/login') {
  const router = useRouter();
  let supabaseClient: SupabaseClient<any, "public", any> | null = null;
  
  try {
    supabaseClient = createSupabaseBrowserClient();
  } catch (e: any) {
    console.error('[useAuthGuard] CRITICAL ERROR initializing Supabase client:', e.message, e.stack);
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!supabaseClient) {
      console.error("[useAuthGuard] Supabase client is not initialized. Cannot check auth state.");
      if (isMounted) setIsAuthenticated(false);
      return;
    }

    async function checkAuth() {
      const { data: { session } } = await supabaseClient!.auth.getSession();
      if (isMounted) {
        if (session) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push(redirectTo);
        }
      }
    }

    checkAuth();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (isMounted) {
          if (session) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            router.push(redirectTo);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [redirectTo, router, supabaseClient]);
  return isAuthenticated;
}