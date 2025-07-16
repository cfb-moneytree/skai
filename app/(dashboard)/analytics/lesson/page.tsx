"use client"

import { DashboardHeader } from "@/components/dashboard-header";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { calculateAverageScores } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agent {
  id: string;
  agent_name: string;
  passing_score: number | null;
}

interface Student {
  user_id: string;
  full_name: string;
  email: string;
  updated_at: string;
  score: number | null;
}

export default function LessonAnalyticsPage() {
  const supabase = createSupabaseBrowserClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [completedScore, setCompletedScore] = useState<number>(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_elevenlabs_agents")
        .select("id, agent_name, passing_score");
      if (error) {
        console.error("Error fetching agents:", error);
      } else {
        setAgents(data as Agent[]);
      }
      setIsLoading(false);
    };
    fetchAgents();
  }, [supabase]);

  useEffect(() => {
    if (selectedAgent) {
      const fetchAnalytics = async () => {
        setIsLoading(true);
        
        const averageScores = await calculateAverageScores(supabase, [selectedAgent]);
        if (averageScores.length > 0) {
          setAverageScore(averageScores[0].averageScore);
        }

        // Fetch total students
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("user_agent_assignments")
          .select("user_id")
          .eq("agent_mapping_id", selectedAgent);

        if (assignmentsError) {
          console.error("Error fetching assignments:", assignmentsError);
        } else {
          setTotalStudents(assignmentsData.length);
        }

        // Fetch progress for all assigned students
        const { data: progressData, error: progressError } = await supabase
          .from("user_agents_progress")
          .select("user_id, score, is_complete, updated_at")
          .eq("agent_id", selectedAgent);

        if (progressError) {
          console.error("Error fetching progress:", progressError);
        } else {
          const completedCount = progressData.filter(p => p.is_complete).length;
          setCompletedScore(completedCount);

          const userIds = progressData.map((p) => p.user_id);
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', {
              body: { user_ids: userIds },
            })

            if (usersError) {
              console.error("Error fetching users:", usersError);
            } else {
              const formattedStudents = progressData.map((progress) => {
                const user = usersData.users.find((u: any) => u.id === progress.user_id);
                return {
                  user_id: progress.user_id,
                  full_name: user?.full_name || 'N/A',
                  email: user?.email || 'N/A',
                  updated_at: new Date(progress.updated_at).toLocaleDateString(),
                  score: progress.score,
                };
              });
              setStudents(formattedStudents);
            }
          } else {
            setStudents([]);
          }
        }
        setIsLoading(false);
      };
      fetchAnalytics();
    }
  }, [selectedAgent, supabase]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardHeader
        title="Lesson Analytics"
        description="Analytics per lesson."
      />
      {isLoading && <div className="flex flex-1 flex-col gap-6 p-6 justify-center items-center"><p>Loading...</p></div>}
      {!isLoading && agents.length === 0 && <div className="flex flex-1 flex-col gap-6 p-6 justify-center items-center"><p>No agents found.</p></div>}
      {!isLoading && agents.length > 0 && (
        <div className="w-full">
          <Select onValueChange={setSelectedAgent} value={selectedAgent || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a lesson" />
            </SelectTrigger>
            <SelectContent className="w-full">
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.agent_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedAgent && !isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Students Enrolled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Completed Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedScore}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore.toFixed(2)}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-2">
            {/* <h2 className="text-xl font-semibold mb-2">Students</h2> */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Score (Passing: {selectedAgent ? agents.find(a => a.id === selectedAgent)?.passing_score || 0 : 0}%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.user_id}>
                    <TableCell>
                      <div>{student.full_name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </TableCell>
                    <TableCell>{student.updated_at}</TableCell>
                    <TableCell>{student.score !== null ? `${student.score}` : '0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}