"use client"

import { DashboardHeader } from "@/components/dashboard-header";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
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
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { calculateAverageScores, calculateCompletionRate, calculatePassingRate, getStudentsForAgents } from "@/lib/utils";

interface Agent {
  id: string;
  agent_name: string;
}

interface AverageScore {
  agentId: string;
  averageScore: number;
}

interface CompletionRate {
  agentId: string;
  completionRate: number;
}

interface PassingRate {
  agentId: string;
  passingRate: number;
}

export default function LessonGroupAnalyticsPage() {
  const supabase = createSupabaseBrowserClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [averageScores, setAverageScores] = useState<AverageScore[]>([]);
  const [completionRates, setCompletionRates] = useState<CompletionRate[]>([]);
  const [passingRates, setPassingRates] = useState<PassingRate[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_elevenlabs_agents")
        .select("id, agent_name");
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
    if (selectedAgents.length > 0) {
      const fetchAnalytics = async () => {
        setIsLoading(true);
        const [scores, rates, passRates, studentData] = await Promise.all([
          calculateAverageScores(supabase, selectedAgents),
          calculateCompletionRate(supabase, selectedAgents),
          calculatePassingRate(supabase, selectedAgents),
          getStudentsForAgents(supabase, selectedAgents)
        ]);
        setAverageScores(scores);
        setCompletionRates(rates);
        setPassingRates(passRates);
        setStudents(studentData);
        setIsLoading(false);
      };
      fetchAnalytics();
    } else {
      setAverageScores([]);
      setCompletionRates([]);
      setPassingRates([]);
      setStudents([]);
    }
  }, [selectedAgents, supabase]);

  const chartData = averageScores.map(score => ({
    name: agents.find(agent => agent.id === score.agentId)?.agent_name || 'Unknown',
    averageScore: score.averageScore,
  }));

  const completionRateData = completionRates.map(rate => ({
    name: agents.find(agent => agent.id === rate.agentId)?.agent_name || 'Unknown',
    completionRate: rate.completionRate,
  }));

  const passingRateData = passingRates.map(rate => ({
    name: agents.find(agent => agent.id === rate.agentId)?.agent_name || 'Unknown',
    passingRate: rate.passingRate,
  }));

  const chartConfig = {
    averageScore: {
      label: "Average Score",
      color: "#93c5fd",
    },
    completionRate: {
      label: "Completion Rate",
      color: "#a7f3d0",
    },
    passingRate: {
      label: "Passing Rate",
      color: "#fde047",
    }
  } satisfies ChartConfig

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardHeader
        title="Lesson Group Analytics"
        description="Analytics for groups of lessons."
      />
      {isLoading && <div className="flex flex-1 flex-col gap-6 p-6 justify-center items-center"><p>Loading...</p></div>}
      {!isLoading && agents.length === 0 && <div className="flex flex-1 flex-col gap-6 p-6 justify-center items-center"><p>No agents found.</p></div>}
      {!isLoading && agents.length > 0 && (
        <MultiSelectDropdown
          options={agents.map(agent => ({ value: agent.id, label: agent.agent_name }))}
          selectedValues={selectedAgents}
          onChange={setSelectedAgents}
          placeholder="Select lessons"
          className="w-full"
        />
      )}

      {selectedAgents.length > 0 && !isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Lesson Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      label={{ value: "Lessons", position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      label={{ value: 'Avg Score', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="averageScore" fill="var(--color-averageScore)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={completionRateData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      label={{ value: "Lessons", position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Passing Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={passingRateData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      label={{ value: "Lessons", position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      label={{ value: 'Passing %', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="passingRate" fill="var(--color-passingRate)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Completed Courses %</TableHead>
                      <TableHead>Passing Rate %</TableHead>
                      {selectedAgents.map(agentId => (
                        <TableHead key={agentId}>{agents.find(a => a.id === agentId)?.agent_name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.full_name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </TableCell>
                        <TableCell>{student.completionPercentage.toFixed(2)}%</TableCell>
                        <TableCell>{student.passingPercentage.toFixed(2)}%</TableCell>
                        {selectedAgents.map(agentId => (
                          <TableCell key={agentId} className={!student.assignedAgentIds.includes(agentId) ? 'text-muted-foreground' : ''}>
                            {student.assignedAgentIds.includes(agentId) ? (student.scores[agentId] ?? 'N/A') : 'Not Assigned'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}