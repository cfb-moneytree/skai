"use client"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js"
import { Home, Settings, LogOut, ChevronDown, Shield, Bot, Phone, Users, BarChart3 } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const data = {
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Lessons", url: "/agents", icon: Bot },
    {
      title: "Analytics",
      icon: BarChart3,
      children: [
        { title: "By Lessons", url: "/analytics/lesson", icon: BarChart3 },
        { title: "By Groups", url: "/analytics/group", icon: BarChart3 },
      ],
    },
    { title: "Lesson History", url: "/call-history", icon: Phone },
    { title: "Users", url: "/users", icon: Users },
  ],
};

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseBrowserClient()
  const [organization, setOrganization] = useState<{ name: string | null; description: string | null; logoUrl: string | null; } | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true)

  useEffect(() => {
    const fetchUserProfileAndOrg = async (user: SupabaseUser | null) => {
      setIsLoadingUserProfile(true);
      setIsLoadingOrg(true);
      if (user) {
        setUserEmail(user.email || null);
        const metadata = user.user_metadata;
        setUserName(metadata?.name || metadata?.full_name || null);
        setUserRole(metadata?.role || null);

        const { data: orgUserData, error: orgUserError } = await supabase
          .from('organization_users')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (orgUserError) {
          setOrgError(`Error fetching organization membership: ${orgUserError.message}`);
        } else if (orgUserData && orgUserData.organization_id) {
          const { data: organizationData, error: orgError } = await supabase
            .from('organizations')
            .select('name, description, image_url')
            .eq('id', orgUserData.organization_id)
            .single();

          if (orgError) {
            setOrgError(`Error fetching organization details: ${orgError.message}`);
          } else if (organizationData) {
            setOrganization({
              name: organizationData.name || "SKAI",
              description: organizationData.description || "",
              logoUrl: organizationData.image_url || "/images/default_logo.png",
            });
          }
        } else {
          setOrganization({ name: "SKAI", description: "", logoUrl: "/images/default_logo.png" });
        }
      } else {
        setUserEmail(null);
        setUserName(null);
        setUserRole(null);
        setOrganization(null);
      }
      setIsLoadingUserProfile(false);
      setIsLoadingOrg(false);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      fetchUserProfileAndOrg(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      fetchUserProfileAndOrg(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out from sidebar:", error.message);
    } else {
      window.location.assign("/login");
    }
  }

  // Determine display values from context or defaults
  const displayOrgName = isLoadingOrg ? "Loading..." : (organization?.name || "SKAI");
  const displayOrgDescription = isLoadingOrg ? "" : (organization?.description || "");
  const displayOrgLogo = isLoadingOrg ? "/images/default_logo.png" : (organization?.logoUrl || "/images/default_logo.png");


  if (orgError) {
    console.error("Error fetching organization data in AppSidebar:", orgError);
    // Optionally display an error state for org details or just use defaults
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex aspect-square size-10 items-center justify-center rounded-sm bg-card overflow-hidden">
                <img
                  src={displayOrgLogo}
                  alt={`${displayOrgName} logo`}
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.src = '/images/default_logo.png')}
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none max-w-[calc(100%-2.5rem)]">
                <span className="font-semibold truncate" title={displayOrgName}>{displayOrgName}</span>
                {displayOrgDescription && (
                  <span className="text-xs truncate" title={displayOrgDescription}>{displayOrgDescription}</span>
                )}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isActive = hasChildren
                  ? item.children.some(child => pathname.startsWith(child.url))
                  : (item.url && pathname.startsWith(item.url));

                if (hasChildren) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton isExpanded={true} isActive={!!isActive}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto size-4" />
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                          side="right"
                          align="start"
                          sideOffset={4}
                        >
                          {item.children.map((child) => (
                            <DropdownMenuItem key={child.title} onClick={() => router.push(child.url)} className={pathname.startsWith(child.url) ? "bg-accent" : ""}>
                              <span>{child.title}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={!!isActive}>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/settings')} isActive={pathname.startsWith('/settings')}>
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {userRole === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push('/admin')} isActive={pathname.startsWith('/admin')}>
                  <Shield />
                  <span>Admin</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={undefined} alt={userName || "User"} />
                    <AvatarFallback className="rounded-lg">
                      {isLoadingUserProfile ? "" : (userName ? userName.substring(0, 2).toUpperCase() : "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{isLoadingUserProfile ? "Loading..." : (userName || "User")}</span>
                    <span className="truncate text-xs">{isLoadingUserProfile ? "" : (userEmail || "")}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
