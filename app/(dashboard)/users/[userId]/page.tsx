"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgentAssignmentList } from "@/components/agent-assignment-list";
import { DashboardHeader } from "@/components/dashboard-header";

type User = {
  user_id: string;
  full_name: string;
  email: string;
};

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const supabase = useState(() => createSupabaseBrowserClient())[0];
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrgLoading, setIsOrgLoading] = useState(true);
  const fetchUserDetails = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: usersData, error: usersError } = await supabase.rpc('get_users_by_organization', { organization_id_input: organizationId });

      if (usersError) {
        throw new Error(usersError.message);
      }

      const currentUser = usersData.find((u: User) => u.user_id === userId);
      if (currentUser) {
        setUser(currentUser);
      } else {
        throw new Error("User not found in organization");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    const fetchOrgAndUser = async () => {
      try {
        setIsOrgLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("User not found");

        const { data: orgUserData, error: orgUserError } = await supabase
          .from('organization_users')
          .select('organization_id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (orgUserError) throw orgUserError;
        if (!orgUserData) throw new Error("User not part of any organization");

        fetchUserDetails(orgUserData.organization_id);
        setIsOrgLoading(false);
      } catch (error) {
        setError((error as Error).message);
        setIsOrgLoading(false);
      }
    };
    fetchOrgAndUser();
  }, [fetchUserDetails]);

  if (isOrgLoading || loading) {
    return (
      <main className="flex flex-col items-center justify-center flex-grow p-6">
        <p className="text-slate-700">Loading...</p>
      </main>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardHeader
        title="User Profile"
        description="View and manage user details and agent assignments"
        previousMenu={{
          href: "/users",
          label: "Users"
        }}
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center space-x-4">
            <Avatar className="h-15 w-15">
              <AvatarImage src={undefined} alt={user.full_name} />
              <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user.full_name}</h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assigned Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentAssignmentList userId={user.user_id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}