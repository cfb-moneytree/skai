"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/portal/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, X, AlertCircle, ArrowLeft } from "lucide-react";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface QuizAttempt {
  id: string;
  quiz_id: string;
  answered_option: number;
  is_correct: boolean;
  attempt_uuid: string;
  quiz: {
    question: string;
    options: string[];
    correct_option: number;
  };
}

interface GroupedAttempts {
  [key: string]: QuizAttempt[];
}

interface AttemptScore {
  attempt_uuid: string;
  score: number;
}

interface QuizResultPlayerProps {
  agentId: string;
}

export default function QuizResultPlayer({ agentId }: QuizResultPlayerProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [groupedAttempts, setGroupedAttempts] = useState<GroupedAttempts>({});
  const [attemptScores, setAttemptScores] = useState<AttemptScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttemptUuid, setSelectedAttemptUuid] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to view this page.");
        setIsLoading(false);
        return;
      }

      const { data: attemptsData, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          answered_option,
          is_correct,
          attempt_uuid,
          quiz!inner (
            question,
            options,
            correct_option
          )
        `)
        .eq('user_id', user.id)
        .eq('quiz.agent_id', agentId);

      if (attemptsError) {
        setError("Failed to load quiz results.");
        setIsLoading(false);
        return;
      }

      const grouped = (attemptsData.map(a => ({...a, quiz: a.quiz[0]})) as unknown as QuizAttempt[]).reduce((acc, attempt) => {
        const key = attempt.attempt_uuid;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(attempt);
        return acc;
      }, {} as GroupedAttempts);

      setGroupedAttempts(grouped);
      if (Object.keys(grouped).length > 0) {
        setSelectedAttemptUuid(Object.keys(grouped)[0]);
      }

      const { data: scoresData, error: scoresError } = await supabase
        .from('quiz_attempt_scores')
        .select('attempt_uuid, score')
        .eq('user_id', user.id)
        .eq('agent_id', agentId);

      if (scoresError) {
        console.error("Failed to load quiz scores:", scoresError);
      } else {
        setAttemptScores(scoresData);
      }

      setIsLoading(false);
    };

    fetchResults();
  }, [agentId, supabase]);

  const handleRetakeQuiz = () => {
    router.push(`/portal/quizzes/${agentId}`);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }
  
  const selectedAttempts = selectedAttemptUuid ? groupedAttempts[selectedAttemptUuid] : [];
  const selectedScore = selectedAttemptUuid ? attemptScores.find(s => s.attempt_uuid === selectedAttemptUuid)?.score : 0;


  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="hidden md:block space-y-2">
            {Object.keys(groupedAttempts).map((uuid, index) => (
              <div
                key={uuid}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAttemptUuid === uuid ? 'bg-slate-200' : 'bg-white hover:bg-slate-100'
                }`}
                onClick={() => setSelectedAttemptUuid(uuid)}
              >
                <span className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                <span className="text-sm text-black">Attempt {index + 1}</span>
              </div>
            ))}
          </div>

          <div className="md:hidden mb-4">
            <Select onValueChange={value => setSelectedAttemptUuid(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an attempt to review" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(groupedAttempts).map((uuid, index) => (
                  <SelectItem key={uuid} value={uuid}>
                    Attempt {index + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 bg-white p-8 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-black">Quiz Results</h1>
              <Button variant="outline" onClick={handleRetakeQuiz}>Retake Quiz</Button>
            </div>

            {selectedAttemptUuid && (
              <>
                <div className="mb-8">
                  <div>
                    <h3 className="text-gray-600 text-sm mb-2">Your Score</h3>
                    <div className="text-4xl font-bold text-gray-800">{selectedScore}%</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4 text-black">Review Your Answers</h3>
                  <div className="space-y-6">
                    {selectedAttempts.map((attempt, index) => (
                      <div key={attempt.id}>
                        <h4 className="font-medium mb-2 text-black">Question {index + 1}</h4>
                        <p className="mb-2 text-black">{attempt.quiz.question}</p>
                        <div className={`p-3 rounded-lg border ${attempt.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className={attempt.is_correct ? 'text-green-800' : 'text-red-800'}>
                              Your answer: {attempt.quiz.options[attempt.answered_option]}
                            </span>
                            {attempt.is_correct ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                          {!attempt.is_correct && (
                            <div className="mt-2 text-sm text-gray-600">
                              Correct answer: {attempt.quiz.options[attempt.quiz.correct_option]}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}