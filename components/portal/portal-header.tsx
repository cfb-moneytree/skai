"use client";

import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
// import { Button } from '@/components/portal/button'; // Button from portal might not be needed if using DropdownMenuItem
import { LogOut, User as UserIcon, ChevronDown, LayoutGrid } from 'lucide-react'; // Added UserIcon, ChevronDown
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button as ShadButton } from "@/components/ui/button"; // Using ShadCN button for trigger if needed

export function PortalHeader() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("U");
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const processSession = (session: any | null) => {
      const authStatus = !!session;
      setIsAuthenticated(authStatus);
      if (authStatus && session?.user) {
        const user = session.user;
        const email = user.email || "";
        setUserEmail(email);

        const nameFromMeta = user.user_metadata?.name || user.user_metadata?.full_name;
        if (nameFromMeta) {
          const parts = nameFromMeta.split(' ');
          if (parts.length > 1) {
            setUserInitials(`${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase());
          } else if (parts[0]) {
            setUserInitials(parts[0].substring(0, 2).toUpperCase());
          }
        } else if (email) {
          setUserInitials(email.substring(0, 2).toUpperCase());
        } else {
          setUserInitials("U");
        }

        // Fetch active school ID
        supabase
          .from('user_preferences')
          .select('active_organization_id')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (data) {
              setActiveSchoolId(data.active_organization_id);
            }
          });

      } else {
        setUserEmail(null);
        setUserInitials("U");
        setActiveSchoolId(null);
      }
      setIsLoadingAuth(false);
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      processSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // State update will be handled by onAuthStateChange
    router.push('/portal');
  };

  return (
    <header className="bg-slate-800 text-white px-4 sm:px-6 py-3"> {/* Adjusted padding */}
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link href={activeSchoolId ? `/portal/courses?schoolId=${activeSchoolId}` : '/portal/workspace'} className="text-xl sm:text-2xl font-bold text-purple-300">
          Maya
        </Link>
        
        {!isLoadingAuth && isAuthenticated && (
          <div className="flex items-center gap-4">
            <Link href="/portal/my-courses" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              My Courses
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ShadButton variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-slate-700 focus:ring-0 focus:ring-offset-0">
                  <Avatar className="h-9 w-9">
                    {/* <AvatarImage src="/path-to-user-image.jpg" alt={userEmail || "User"} /> */}
                    <AvatarFallback className="bg-purple-500 text-white text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </ShadButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {userEmail && (
                  <>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Signed in as</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userEmail}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/portal/workspace" className="cursor-pointer">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>Switch Workspace</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}