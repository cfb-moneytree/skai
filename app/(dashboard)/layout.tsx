"use client"; // Required for hooks like useAuthGuard

import React, { useEffect } from "react"; // Added useEffect import
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { useAuthGuard } from "@/hooks/use-auth-guard"; // Reverted to original guard

// This layout component can be simpler and assume authentication if rendered,
// as middleware (`middleware.ts`) is responsible for protecting this route,
// and SupabaseAuthListener in `app/layout.tsx` handles refreshing the router
// on auth state changes.
// However, adding useAuthGuard here provides an additional layer of client-side protection.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[DashboardLayout] Component rendering.');

  useEffect(() => {
    console.log('[DashboardLayout] DIAGNOSTIC: useEffect in DashboardLayout triggered!');
  }, []); // Empty dependency array, should run once on mount

  const isAuthenticated = useAuthGuard(); // Call the original guard
  console.log('[DashboardLayout] isAuthenticated from useAuthGuard:', isAuthenticated);

  // if (isAuthenticated === null) {
  //   console.log('[DashboardLayout] isAuthenticated is null. Rendering loading/blank state.');
  //   return (
  //     <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
  //       <p>Loading authentication status (isAuthenticated is null)...</p>
  //     </div>
  //   );
  // }

  // if (isAuthenticated === false) {
  //   // This case should ideally be handled by the redirect within useAuthGuard.
  //   console.log('[DashboardLayout] isAuthenticated is false. This should have been redirected by the hook. Rendering unauthenticated state text.');
  //   return (
  //     <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
  //       <p>User is not authenticated (isAuthenticated is false). Redirecting soon...</p>
  //     </div>
  //   );
  // }

  // isAuthenticated is true
  console.log('[DashboardLayout] isAuthenticated is true. Rendering children.');

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
