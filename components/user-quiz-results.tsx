"use client"

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuizAttempt {
  id: string;
  quiz_id: string;
  answered_option: number;
  is_correct: boolean;
  attempt_uuid: string;
  created_at: string;
  quiz: {
    question: string;
    options: string[];
    correct_option: number;
    user_elevenlabs_agents: {
        agent_name: string;
    }
  };
}

interface AttemptScore {
  attempt_uuid: string;
  score: number;
}

interface UserQuizResultsProps {
  userId: string;
}

export function UserQuizResults({ userId }: UserQuizResultsProps) {
  const supabase = createSupabaseBrowserClient();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [scores, setScores] = useState<AttemptScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      const { data: attemptsData, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          answered_option,
          is_correct,
          attempt_uuid,
          created_at,
          quiz (
            question,
            options,
            correct_option,
            user_elevenlabs_agents (
                agent_name
            )
          )
        `)
        .eq('user_id', userId);

      if (attemptsError) {
        setError("Failed to load quiz results.");
        setIsLoading(false);
        return;
      }
      setAttempts(attemptsData as any);

      const { data: scoresData, error: scoresError } = await supabase
        .from('quiz_attempt_scores')
        .select('attempt_uuid, score')
        .eq('user_id', userId);

      if (scoresError) {
        console.error("Failed to load quiz scores:", scoresError);
      } else {
        setScores(scoresData);
      }


      setIsLoading(false);
    };

    fetchResults();
  }, [userId, supabase]);

  if (isLoading) {
    return <div>Loading quiz results...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const groupedByAttempt = attempts.reduce((acc, attempt) => {
    const key = attempt.attempt_uuid;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(attempt);
    return acc;
  }, {} as { [key: string]: QuizAttempt[] });

  return (
    <Card>
        <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Quiz</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Score</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.keys(groupedByAttempt).map(uuid => {
                        const attemptGroup = groupedByAttempt[uuid];
                        const firstAttempt = attemptGroup[0];
                        const score = scores.find(s => s.attempt_uuid === uuid)?.score;
                        return (
                            <TableRow key={uuid}>
                                <TableCell>{firstAttempt.quiz.user_elevenlabs_agents.agent_name}</TableCell>
                                <TableCell>{new Date(firstAttempt.created_at).toLocaleString()}</TableCell>
                                <TableCell>{score !== undefined ? `${score}%` : 'N/A'}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}