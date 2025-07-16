"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UsersList } from "@/components/users-list";
import { DashboardHeader } from "@/components/dashboard-header";
import Link from "next/link";

type User = {
  user_id: string;
  full_name: string;
  email: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const supabase = useState(() => createSupabaseBrowserClient())[0];
  const [organization, setOrganization] = useState<{ id: string } | null>(null);
  const [isOrgLoading, setIsOrgLoading] = useState(true);

  const fetchUsers = useCallback(async (organizationId: string) => {
    setUsersLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.rpc('get_users_by_organization', { organization_id_input: organizationId });
      if (usersError) {
        setUsersError(usersError.message);
      } else {
        setUsers(usersData);
      }
    } catch (e: any) {
      setUsersError(`An unexpected error occurred: ${e.message}`);
    } finally {
      setUsersLoading(false);
    }
  }, [supabase]);

  const fetchOrganization = useCallback(async () => {
    setIsOrgLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data: orgUserData, error: orgUserError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (orgUserError) throw orgUserError;
      if (!orgUserData) throw new Error("User not part of any organization");

      setOrganization({ id: orgUserData.organization_id });
      fetchUsers(orgUserData.organization_id);
    } catch (e: any) {
      setUsersError(`An unexpected error occurred: ${e.message}`);
    } finally {
      setIsOrgLoading(false);
    }
  }, [supabase, fetchUsers]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organization) return;
    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          organization_id: organization.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setInviteMessage({ type: 'success', text: data.message });
      setInviteEmail("");
      if (organization) {
        fetchUsers(organization.id);
      }
    } catch (error: any) {
      setInviteMessage({ type: 'error', text: error.message });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser || !organization) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: deletingUser.user_id,
          organization_id: organization.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (organization) {
        fetchUsers(organization.id);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardHeader title="Users" description="Manage your organization's users" />

      {isOrgLoading ? (
        <p>Loading organization...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Manage users in your organization.</CardDescription>
                </div>
                <Link href="/users/assign-bulk" passHref>
                  <Button>Bulk Assign Lessons</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isOrgLoading ? (
                <div className="flex justify-center items-center py-10">
                  <p className="text-slate-700">Loading Organization...</p>
                </div>
              ) : (
                <UsersList users={users} onDeleteUser={handleDeleteUser} isLoading={usersLoading} error={usersError} />
              )}
            </CardContent>
          </Card>
          <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for {deletingUser?.full_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <CardDescription>Create a new user account and add them to your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={inviteLoading} />
            </div>
            {inviteMessage && (
              <p className={`text-sm ${inviteMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {inviteMessage.text}
              </p>
            )}
            <Button type="submit" disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? 'Adding User...' : 'Add User'}
            </Button>
          </form>
        </CardContent>
      </Card>
     </>
    )}
    </div>
  );
}