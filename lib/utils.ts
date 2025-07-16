import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SupabaseClient } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function calculateAverageScores(supabase: SupabaseClient, agentIds: string[]): Promise<{ agentId: string; averageScore: number }[]> {
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("user_agent_assignments")
    .select("user_id, agent_mapping_id")
    .in("agent_mapping_id", agentIds);

  if (assignmentsError) {
    console.error("Error fetching assignments:", assignmentsError);
    return [];
  }

  const { data: progressData, error: progressError } = await supabase
    .from("user_agents_progress")
    .select("user_id, score, agent_id")
    .in("agent_id", agentIds);

  if (progressError) {
    console.error("Error fetching progress:", progressError);
    return [];
  }

  const results = agentIds.map(agentId => {
    const assignmentsForAgent = assignmentsData.filter(a => a.agent_mapping_id === agentId);
    const progressForAgent = progressData.filter(p => p.agent_id === agentId);

    const totalStudents = assignmentsForAgent.length;
    let totalScore = 0;
    for (const progress of progressForAgent) {
      totalScore += progress.score || 0;
    }
    const averageScore = totalStudents > 0 ? totalScore / totalStudents : 0;
    return { agentId, averageScore };
  });

  return results;
}

export async function calculatePassingRate(supabase: SupabaseClient, agentIds: string[]): Promise<{ agentId: string; passingRate: number }[]> {
  const { data: agentsData, error: agentsError } = await supabase
    .from("user_elevenlabs_agents")
    .select("id, passing_score")
    .in("id", agentIds);

  if (agentsError) {
    console.error("Error fetching agents:", agentsError);
    return [];
  }

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("user_agent_assignments")
    .select("user_id, agent_mapping_id")
    .in("agent_mapping_id", agentIds);

  if (assignmentsError) {
    console.error("Error fetching assignments:", assignmentsError);
    return [];
  }

  const { data: progressData, error: progressError } = await supabase
    .from("user_agents_progress")
    .select("agent_id, score")
    .in("agent_id", agentIds);

  if (progressError) {
    console.error("Error fetching progress:", progressError);
    return [];
  }

  const results = agentsData.map(agent => {
    const passingScore = agent.passing_score || 0;
    const assignmentsForAgent = assignmentsData.filter(a => a.agent_mapping_id === agent.id);
    const totalStudents = assignmentsForAgent.length;
    const progressForAgent = progressData.filter(p => p.agent_id === agent.id);
    const passedRecords = progressForAgent.filter(p => (p.score || 0) >= passingScore).length;
    const passingRate = totalStudents > 0 ? (passedRecords / totalStudents) * 100 : 0;
    return { agentId: agent.id, passingRate };
  });

  return results;
}

export async function calculateCompletionRate(supabase: SupabaseClient, agentIds: string[]): Promise<{ agentId: string; completionRate: number }[]> {
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("user_agent_assignments")
    .select("user_id, agent_mapping_id")
    .in("agent_mapping_id", agentIds);

  if (assignmentsError) {
    console.error("Error fetching assignments:", assignmentsError);
    return [];
  }

  const { data: progressData, error: progressError } = await supabase
    .from("user_agents_progress")
    .select("agent_id, is_complete")
    .in("agent_id", agentIds);

  if (progressError) {
    console.error("Error fetching progress:", progressError);
    return [];
  }

  const results = agentIds.map(agentId => {
    const assignmentsForAgent = assignmentsData.filter(a => a.agent_mapping_id === agentId);
    const totalStudents = assignmentsForAgent.length;
    const progressForAgent = progressData.filter(p => p.agent_id === agentId);
    const completedRecords = progressForAgent.filter(p => p.is_complete).length;
    const completionRate = totalStudents > 0 ? (completedRecords / totalStudents) * 100 : 0;
    return { agentId, completionRate };
  });

  return results;
}

export async function getStudentsForAgents(supabase: SupabaseClient, agentIds: string[]): Promise<any[]> {
  if (agentIds.length === 0) {
    return [];
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('user_agent_assignments')
    .select('user_id, agent_mapping_id')
    .in('agent_mapping_id', agentIds);

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError);
    return [];
  }

  const userIds = [...new Set(assignments.map(a => a.user_id))];

  const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', {
    body: { user_ids: userIds },
  })

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return [];
  }

  const { data: progressData, error: progressError } = await supabase
    .from('user_agents_progress')
    .select('user_id, agent_id, score, is_complete')
    .in('user_id', userIds);

  if (progressError) {
    console.error('Error fetching progress:', progressError);
    return [];
  }

  const { data: agentsData, error: agentsError } = await supabase
    .from('user_elevenlabs_agents')
    .select('id, agent_name, passing_score')
    .in('id', agentIds);

  if (agentsError) {
    console.error('Error fetching agents:', agentsError);
    return [];
  }

  const students = usersData.users.map((user: any) => {
    const assignedAgentIds = assignments.filter(a => a.user_id === user.id).map(a => a.agent_mapping_id);
    const completedCourses = progressData.filter(p => p.user_id === user.id && p.is_complete && assignedAgentIds.includes(p.agent_id));
    const enrolledCoursesCount = assignedAgentIds.length;
    const completedCoursesCount = completedCourses.length;
    const completionPercentage = enrolledCoursesCount > 0 ? (completedCoursesCount / enrolledCoursesCount) * 100 : 0;

    const passedCoursesCount = completedCourses.filter(c => {
      const agent = agentsData.find(a => a.id === c.agent_id);
      return agent && (c.score || 0) >= (agent.passing_score || 0);
    }).length;
    const passingPercentage = completedCoursesCount > 0 ? (passedCoursesCount / completedCoursesCount) * 100 : 0;

    const scores: { [key: string]: number | null } = {};
    progressData.filter(p => p.user_id === user.id).forEach(p => {
      scores[p.agent_id] = p.score;
    });

    return {
      ...user,
      completionPercentage,
      passingPercentage,
      scores,
      assignedAgentIds,
    };
  });

  return students;
}
