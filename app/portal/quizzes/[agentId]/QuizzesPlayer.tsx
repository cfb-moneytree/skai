"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/portal/button";
import { CheckCircle, Plus } from "lucide-react";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  signed_media_url?: string;
  question_media?: string;
  media_type?: string;
  quiz_desc?: string;
  attempt?: {
    answered_option: number;
    is_correct: boolean;
  };
}

interface QuizzesPlayerProps {
  agentId: string;
}

export default function QuizzesPlayer({ agentId }: QuizzesPlayerProps) {
  const supabase = createSupabaseBrowserClient();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [attemptUuid, setAttemptUuid] = useState<string>('');

  useEffect(() => {
    setAttemptUuid(uuidv4());
    const fetchQuizzesAndAttempts = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quiz')
        .select('*')
        .eq('agent_id', agentId);

      if (error) {
        setError("Failed to load quizzes.");
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const quizzesWithSignedUrls = await Promise.all(
        data.map(async (quiz) => {
          let signed_media_url: string | undefined = undefined;
          if (quiz.question_media) {
            const { data: signedUrlData } = await supabase.storage
              .from("assessments")
              .createSignedUrl(quiz.question_media, 60 * 5);
            signed_media_url = signedUrlData?.signedUrl;
          }
          return { ...quiz, signed_media_url, media_type: quiz.media_type };
        })
      );
      setQuizzes(quizzesWithSignedUrls);


      setIsLoading(false);
    };

    fetchQuizzesAndAttempts();
  }, [agentId, supabase]);

  const handleAnswerSelect = async (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    setShowResult(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentQuiz = quizzes[currentQuizIndex];
    const isCorrect = optionIndex === currentQuiz.correct_option;

    const { error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: currentQuiz.id,
        user_id: user.id,
        answered_option: optionIndex,
        is_correct: isCorrect,
        attempt_uuid: attemptUuid,
      });

    if (insertError) {
      console.error('Error inserting quiz attempt:', insertError);
    }


    const updatedQuizzes = quizzes.map((quiz, index) => {
      if (index === currentQuizIndex) {
        return {
          ...quiz,
          attempt: {
            answered_option: optionIndex,
            is_correct: isCorrect,
          },
        };
      }
      return quiz;
    });
    setQuizzes(updatedQuizzes);
  };

  const handleContinue = async () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Handle quiz completion
      if (user) {
        const correctAnswers = quizzes.filter(q => q.attempt?.is_correct).length;
        const totalQuizzes = quizzes.length;
        const score = totalQuizzes > 0 ? Math.round((correctAnswers / totalQuizzes) * 100) : 0;

        // Save the score for this attempt
        const { error: scoreError } = await supabase
          .from('quiz_attempt_scores')
          .insert({
            user_id: user.id,
            agent_id: agentId,
            attempt_uuid: attemptUuid,
            score: score,
          });

        if (scoreError) {
          console.error('Error saving quiz score:', scoreError);
        }

        // Update the best score in user_agents_progress
        const { data: progress, error: progressError } = await supabase
          .from('user_agents_progress')
          .select('score')
          .eq('user_id', user.id)
          .eq('agent_id', agentId)
          .single();

        if (progressError && progressError.code !== 'PGRST116') {
          console.error('Error fetching user progress:', progressError);
        }

        if (!progress || (progress && score > progress.score)) {
          const { error: updateError } = await supabase
            .from('user_agents_progress')
            .update({ is_complete: true, score: score })
            .eq('user_id', user.id)
            .eq('agent_id', agentId);

          if (updateError) {
            console.error('Error updating user progress:', updateError);
          }
        }
      }
      window.location.replace(`/portal/quizzes/${agentId}/result`);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (quizzes.length === 0) {
    return <div>No quizzes found for this agent.</div>;
  }

  const currentQuiz = quizzes[currentQuizIndex];
  const isCorrect = selectedAnswer !== null ? selectedAnswer === currentQuiz.correct_option : currentQuiz.attempt?.is_correct;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-8">Problem {currentQuizIndex + 1}</h2>

          {currentQuiz.signed_media_url && (
            <div className="mb-8 w-1/2 mx-auto">
              {currentQuiz.media_type?.startsWith('video') ? (
                <video key={currentQuiz.signed_media_url} src={currentQuiz.signed_media_url} controls autoPlay muted loop playsInline className="w-full h-full object-contain">
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img src={currentQuiz.signed_media_url} alt="Quiz media" className="mx-auto" />
              )}
            </div>
          )}

          {currentQuiz.quiz_desc && (
            <div className="max-w-2xl mx-auto mb-4">
              <p className="text-gray-600">{currentQuiz.quiz_desc}</p>
            </div>
          )}

          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-gray-700 font-medium">{currentQuiz.question}</p>
          </div>

          <div className="space-y-3 max-w-md mx-auto mb-8">
            {currentQuiz.options.map((option, index) => (
              option && (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    (showResult && selectedAnswer === index)
                      ? isCorrect
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && selectedAnswer === index && isCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </button>
              )
            ))}
          </div>

          {showResult && (
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                {isCorrect ? (
                  <>
                    <span className="text-2xl">🎉</span>
                    <span className="text-green-600 font-semibold">Correct!</span>
                  </>
                ) : (
                  <span className="text-red-600 font-semibold">Incorrect</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <Button
              className="bg-black text-white hover:bg-gray-800 px-8"
              onClick={handleContinue}
              disabled={!showResult}
            >
              Continue
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}