"use client"

import { useState, useEffect } from "react" // Added useState, useEffect
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap } from "lucide-react"

interface DashboardHeaderProps {
  title?: string
  description?: string
  previousMenu?: {
    href: string
    label: string
  }
}

export function DashboardHeader({
  title = "Dashboard",
  description = "Welcome to your dashboard",
  previousMenu,
}: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use user_metadata directly
        const metadata = user.user_metadata;
        setUserName(metadata?.name || metadata?.full_name || null);

        // Removed query to user_profiles
        // const { data: profile, error } = await supabase
        //   .from('user_profiles')
        //   .select('name')
        //   .eq('id', user.id)
        //   .single();

        // if (error) {
        //   console.error("Error fetching user profile name:", error.message);
        // } else if (profile) {
        //   setUserName(profile.name);
        // }
      }
    };

    fetchUserProfile();
  }, [supabase]);

  const handleLogout = async () => {
    console.log("Logout button clicked in DashboardHeader"); // Diagnostic
    const { error } = await supabase.auth.signOut();
    console.log("Supabase signOut error object:", error); // Diagnostic
    if (error) {
      console.error("Error logging out from DashboardHeader:", error.message);
      // Optionally, display an error message to the user
    } else {
      console.log("Logout successful, attempting to redirect to /login"); // Diagnostic
      window.location.assign("/login");
      // router.push("/login");
      // router.refresh(); // Temporarily commented out to isolate redirection issue.
                       // The SupabaseAuthListener in app/layout.tsx should handle refreshing.
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          {previousMenu && (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href={previousMenu.href}>{previousMenu.label}</BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          {title !== "Dashboard" && title !== "Voice AI Dashboard" && title !== "Title" && (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-4">
        {/* Usage Badge */}
        <div className="hidden md:flex items-center gap-2">
          {/* <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            8,653 / 10,000 characters
          </Badge> */}
          {/* <Button variant="outline" size="sm">
            Upgrade
          </Button> */}
        </div>
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={handleLogout} className="ml-2">
          Log Out
        </Button>
        {userName && (
          <div className="text-sm text-muted-foreground ml-2">
            Welcome, {userName}
          </div>
        )}
        {/* Original title/description display - can be kept or removed based on preference */}
        {/* <div className="text-right">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div> */}
      </div>
    </header>
  )
}
