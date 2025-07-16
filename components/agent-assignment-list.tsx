"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AppAgentDetails } from "@/app/api/agents/route";

interface AgentAssignmentListProps {
  userId: string;
}

export function AgentAssignmentList({ userId }: AgentAssignmentListProps) {
  const supabase = useState(() => createSupabaseBrowserClient())[0];
  const [agents, setAgents] = useState<AppAgentDetails[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const fetchAgentsAndAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Could not identify the current user.");

      // Fetch all agents created by the admin
      const { data: agentsData, error: agentsError } = await supabase
        .from("user_elevenlabs_agents")
        .select("id, elevenlabs_agent_id, agent_name, created_at")
        .eq("user_id", adminUser.id);

      if (agentsError) throw agentsError;

      const agentIds = agentsData.map(a => a.id);

      if (agentIds.length === 0) {
        setAgents([]);
        setAssignedAgents([]);
        setLoading(false);
        return;
      }

      // Fetch assigned agents for the target user from the list of agents created by the admin
      const { data: targetAssignments, error: targetAssignmentsError } = await supabase
        .from("user_agent_assignments")
        .select("agent_mapping_id")
        .eq("user_id", userId)
        .in("agent_mapping_id", agentIds);

      if (targetAssignmentsError) throw targetAssignmentsError;

      setAgents(agentsData.map(a => ({
        agent_id: a.elevenlabs_agent_id,
        name: a.agent_name,
        app_mapping_id: a.id,
        app_created_at: a.created_at,
        conversation_config: { tts: {}, agent: { prompt: {} } }
      })));
      setAssignedAgents(targetAssignments.map(a => a.agent_mapping_id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchAgentsAndAssignments();
  }, [fetchAgentsAndAssignments]);

  const handleAssignmentChange = async (agentMappingId: string, isAssigned: boolean) => {
    if (isAssigned) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: orgUserData } = await supabase.from('organization_users').select('organization_id').eq('user_id', authUser.id).single();
      if (!orgUserData) return;

      const { error } = await supabase.from("user_agent_assignments").insert({
        user_id: userId,
        agent_mapping_id: agentMappingId,
        organization_id: orgUserData.organization_id,
      });
      if (error) {
        setError(error.message);
      } else {
        setAssignedAgents([...assignedAgents, agentMappingId]);
      }
    } else {
      const { error } = await supabase
        .from("user_agent_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("agent_mapping_id", agentMappingId);
      if (error) {
        setError(error.message);
      } else {
        setAssignedAgents(assignedAgents.filter(id => id !== agentMappingId));
      }
    }
  };

  const filteredAgents = agents
    .filter(agent => {
      if (filter === 'assigned') {
        return assignedAgents.includes(agent.app_mapping_id);
      }
      if (filter === 'unassigned') {
        return !assignedAgents.includes(agent.app_mapping_id);
      }
      return true; // 'all'
    })
    .filter(agent =>
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex border-b">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium ${filter === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>All</button>
          <button onClick={() => setFilter('assigned')} className={`px-4 py-2 text-sm font-medium ${filter === 'assigned' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Assigned</button>
          <button onClick={() => setFilter('unassigned')} className={`px-4 py-2 text-sm font-medium ${filter === 'unassigned' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Unassigned</button>
        </div>
        <Input
          type="search"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assigned</TableHead>
            <TableHead>Agent Name</TableHead>
            <TableHead>Agent ID</TableHead>
            <TableHead>Created Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAgents.map((agent) => (
            <TableRow key={agent.app_mapping_id}>
              <TableCell>
                <Checkbox
                  checked={assignedAgents.includes(agent.app_mapping_id)}
                  onCheckedChange={(checked) => handleAssignmentChange(agent.app_mapping_id, !!checked)}
                />
              </TableCell>
              <TableCell>{agent.name}</TableCell>
              <TableCell>{agent.agent_id}</TableCell>
              <TableCell>{new Date(agent.app_created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}