import { type SupabaseClient } from '@supabase/supabase-js';

export async function getUserAnalytics(supabase: SupabaseClient<any, "public", any>, userId: string) {
  const { data: progressData, error: progressError } = await supabase
    .from('user_agents_progress')
    .select('*')
    .eq('user_id', userId);

  if (progressError) {
    return null;
  }

  const { data: agentsData, error: agentsError } = await supabase
    .from('user_elevenlabs_agents')
    .select('id, passing_score');

  if (agentsError) {
    return null;
  }

  const agentPassingScoreMap = new Map(
    agentsData.map((agent) => [agent.id, agent.passing_score])
  );

  const totalCourses = progressData.length;
  const completedCourses = progressData.filter((p) => p.is_completed).length;
  const passedCourses = progressData.filter(
    (p) => p.score >= (agentPassingScoreMap.get(p.agent_id) || 101)
  ).length;
  const totalScore = progressData.reduce((acc, p) => acc + p.score, 0);
  const averageScore = totalCourses > 0 ? (totalScore / totalCourses) : 0;

  return {
    totalCourses,
    completedCourses,
    passedCourses,
    averageScore,
  };
}