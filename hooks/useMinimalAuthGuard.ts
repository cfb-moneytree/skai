"use client";

import { useEffect, useState } from 'react';

export function useMinimalAuthGuard() {
  console.log('[useMinimalAuthGuard] Hook initialized.');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useMinimalAuthGuard] MINIMAL useEffect triggered!');
    setStatus('useEffect ran');
    return () => {
      console.log('[useMinimalAuthGuard] MINIMAL useEffect cleanup.');
    };
  }, []);

  console.log('[useMinimalAuthGuard] Hook rendering. Returning status:', status);
  return status;
}