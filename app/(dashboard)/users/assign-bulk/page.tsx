"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UsersList } from "@/components/users-list";
import { DashboardHeader } from "@/components/dashboard-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";

type User = {
  user_id: string;
  full_name: string;
  email: string;
};

type Agent = {
  id: string;
  agent_name: string;
};

export default function AssignBulkPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const fetchAgents = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('user_elevenlabs_agents').select('id, agent_name');
      if (error) throw error;
      setAgents(data || []);
    } catch (error: any) {
      setErrorMessage(`Failed to fetch agents: ${error.message}`);
      setShowErrorDialog(true);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrganization();
    fetchAgents();
  }, [fetchOrganization, fetchAgents]);

  const handleAssignLessons = async () => {
    if (!organization || selectedUsers.length === 0 || selectedAgents.length === 0) return;

    setIsAssigning(true);
    const assignments = selectedUsers.flatMap(userId =>
      selectedAgents.map(agentId => ({
        user_id: userId,
        agent_mapping_id: agentId,
        organization_id: organization.id,
      }))
    );

    try {
      const { error } = await supabase.from('user_agent_assignments').upsert(assignments);
      if (error) throw error;

      setIsAssignDialogOpen(false);
      setShowSuccessDialog(true);
      setSelectedUsers([]);
      setSelectedAgents([]);
    } catch (error: any) {
      setErrorMessage(`Failed to assign lessons: ${error.message}`);
      setShowErrorDialog(true);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardHeader
        title="Bulk Assign Lessons"
        description="Assign lessons to multiple users at once."
        previousMenu={{
          href: "/users",
          label: "Users"
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Select Users</CardTitle>
              <CardDescription>Select the users you want to assign lessons to.</CardDescription>
            </div>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={selectedUsers.length === 0} onClick={() => setIsAssignDialogOpen(true)}>Assign Lessons</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Lessons</DialogTitle>
                  <DialogDescription>
                    Select the lessons to assign to the selected users.
                  </DialogDescription>
                </DialogHeader>
                <MultiSelectDropdown
                  options={agents.map(agent => ({ value: agent.id, label: agent.agent_name }))}
                  selectedValues={selectedAgents}
                  onChange={setSelectedAgents}
                  placeholder="Select lessons"
                />
                <DialogFooter>
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button onClick={handleAssignLessons} disabled={isAssigning || selectedAgents.length === 0}>
                    {isAssigning ? 'Assigning...' : 'Confirm'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <UsersList
            users={users}
            isLoading={usersLoading}
            error={usersError}
            onDeleteUser={() => {}}
            selectedUsers={selectedUsers}
            onSelectedUsersChange={setSelectedUsers}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assignment Successful</AlertDialogTitle>
            <AlertDialogDescription>
              The lessons have been successfully assigned to the selected users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assignment Failed</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowErrorDialog(false)}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}