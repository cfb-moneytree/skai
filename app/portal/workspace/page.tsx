"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/portal/card'; // Removed unused CardHeader, CardTitle, CardDescription
import { Button } from '@/components/portal/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface WorkspaceOption {
  id: string; // This is organization_id
  name: string;
  description?: string | null;
  image_url?: string | null;
}

export default function WorkspaceSelectionPage() { // Renamed component
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.push('/portal');
        return;
      }
      const currentUserId = session.user.id;
      setUser(session.user);

      // 1. Fetch user_preferences for the current user
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('active_organization_id')
        .eq('user_id', currentUserId);

      if (preferencesError) {
        console.error("Error fetching user preferences:", preferencesError.message);
        setFetchError(`Could not fetch your workspaces: ${preferencesError.message}`);
        setIsLoading(false);
        return;
      }

      if (!preferencesData || preferencesData.length === 0) {
        setFetchError("No workspaces found for your account. Please contact support or ensure your preferences are set.");
        setWorkspaceOptions([]);
        setIsLoading(false);
        return;
      }

      const organizationIds = preferencesData
        .map(p => p.active_organization_id)
        .filter(id => id !== null) as string[];

      if (organizationIds.length === 0) {
        setFetchError("No active organizations configured in your preferences.");
        setWorkspaceOptions([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch details for these organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, description, image_url')
        .in('id', organizationIds);
      
      if (orgsError) {
        console.error("Error fetching organization details:", orgsError.message);
        setFetchError(`Could not load workspace details: ${orgsError.message}`);
      } else if (orgsData) {
        setWorkspaceOptions(orgsData as WorkspaceOption[]);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    console.log(`User selected workspace: ${workspaceId}`);
  };

  const handleContinue = () => {
    if (selectedWorkspaceId) {
      router.push(`/portal/courses?schoolId=${selectedWorkspaceId}`);
    } else {
      alert("Please select a workspace to continue.");
    }
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center flex-grow p-6 h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-slate-800" />
        <p className="text-slate-700 mt-4">Loading your workspaces...</p>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="flex flex-col items-center justify-center flex-grow p-6 text-center">
        <p className="text-red-600 mb-4">{fetchError}</p>
        <Button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/portal'); // Redirect to login page after logout
          }}
        >
          Logout
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-grow max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">Select Your Workspace</h1>
        <p className="text-lg text-slate-600">Choose the workspace you'd like to proceed with, {user?.email}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {workspaceOptions.length > 0 ? (
          workspaceOptions.map((option) => (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all h-full flex flex-col ${
                selectedWorkspaceId === option.id
                  ? "border-purple-500 border-2 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              onClick={() => handleWorkspaceSelect(option.id)}
            >
              <CardContent className="p-6 md:p-8 text-center flex-grow flex flex-col justify-center items-center">
                {option.image_url ? (
                  <img src={option.image_url} alt={option.name} className="w-20 h-20 object-contain mb-4 rounded" />
                ) : (
                  <div className="w-20 h-20 bg-slate-200 mb-4 rounded flex items-center justify-center text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12M3 7.5h12M3 12h12m-9 3.75h.008v.008H6V15.75zm0 0h.008v.008H6V15.75zm0 0h.008v.008H6V15.75z" />
                    </svg>
                  </div>
                )}
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">{option.name}</h3>
                <p className="text-gray-600 text-sm">{option.description || "No description available."}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-slate-600 md:col-span-2 lg:col-span-3 text-center">
            No workspaces are currently associated with your account.
          </p>
        )}
      </div>

      <div className="text-center">
        <Button
          size="lg"
          className="bg-slate-800 text-white hover:bg-slate-700 px-10 py-3 rounded-md"
          onClick={handleContinue}
          disabled={!selectedWorkspaceId || isLoading}
        >
          {isLoading ? "Loading..." : "Continue"}
        </Button>
      </div>
    </main>
  );
}