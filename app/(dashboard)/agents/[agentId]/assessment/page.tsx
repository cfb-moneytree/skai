"use client"

import { useParams } from 'next/navigation'
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from 'next/link'
import { ArrowLeft, Trash2, Loader2, FileImage, AlertCircle, CheckCircle, ArrowUp, ArrowDown, Save, ExternalLink } from 'lucide-react'
import React, { useEffect, useState, ChangeEvent, useCallback } from 'react'
import { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid'

interface UIQuiz {
  id: string | null;
  client_temp_id: string;
  question: string;
  question_media: string | null;
  quiz_desc?: string;
  media_type?: string;
  options: string[];
  correct_option: number;
  mediaFile: File | null;
  mediaPreviewUrl: string | null;
  signed_media_url?: string | null;
}

const MAX_MEDIA_SIZE_MB = 5;
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;
const ACCEPTED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'video/mp4', 'video/quicktime'];
const ACCEPTED_MEDIA_EXTENSIONS = ".png,.jpg,.jpeg,.mp4,.mov";

export default function AgentAssessmentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const supabase = useState(() => createSupabaseBrowserClient())[0];
  const [user, setUser] = useState<User | null>(null);

  const [quizzes, setQuizzes] = useState<UIQuiz[]>([]);
  const [originalQuizzes, setOriginalQuizzes] = useState<UIQuiz[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);

  const fetchUser = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    } catch (e) {
      console.error("Error fetching user:", e);
    }
  }, [supabase.auth]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const fetchQuizzes = useCallback(async () => {
    if (!agentId) return;
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/agents/${agentId}/assessment`);
      if (!response.ok) {
        throw new Error("Failed to fetch quizzes");
      }
      const data = await response.json();
      const newQuizzes = data.map((q: any): UIQuiz => ({
        id: q.id,
        client_temp_id: q.id,
        question: q.question,
        question_media: q.question_media,
        quiz_desc: q.quiz_desc,
        options: q.options,
        correct_option: q.correct_option,
        mediaFile: null,
        mediaPreviewUrl: q.signed_media_url || null,
        media_type: q.media_type,
      }));
      setQuizzes(newQuizzes);
      setOriginalQuizzes(newQuizzes);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred while fetching quizzes.");
    } finally {
      setIsProcessing(false);
    }
  }, [agentId, supabase]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleAddQuiz = () => {
    setError(null);
    setSuccessMessage(null);
    const newQuizClientTempId = uuidv4();
    const newQuiz: UIQuiz = {
      id: null,
      client_temp_id: newQuizClientTempId,
      question: "",
      question_media: null,
      quiz_desc: "",
      options: ["", ""],
      correct_option: 0,
      mediaFile: null,
      mediaPreviewUrl: null,
    };
    setQuizzes(prevQuizzes => [...prevQuizzes, newQuiz]);
    setActiveAccordionItem(newQuizClientTempId);
    setIsDirty(true);
  };

  const handleQuizChange = (clientTempId: string, field: keyof UIQuiz, value: any) => {
    setQuizzes(prevQuizzes =>
      prevQuizzes.map(quiz =>
        quiz.client_temp_id === clientTempId ? { ...quiz, [field]: value } : quiz
      )
    );
    setIsDirty(true);
  };

  const handleOptionChange = (clientTempId: string, optionIndex: number, value: string) => {
    setQuizzes(prevQuizzes =>
      prevQuizzes.map(quiz => {
        if (quiz.client_temp_id === clientTempId) {
          const newOptions = [...quiz.options];
          newOptions[optionIndex] = value;
          return { ...quiz, options: newOptions };
        }
        return quiz;
      })
    );
    setIsDirty(true);
  };

  const handleAddOption = (clientTempId: string) => {
    setQuizzes(prevQuizzes =>
      prevQuizzes.map(quiz => {
        if (quiz.client_temp_id === clientTempId) {
          return { ...quiz, options: [...quiz.options, ""] };
        }
        return quiz;
      })
    );
    setIsDirty(true);
  };

  const handleRemoveOption = (clientTempId: string, optionIndex: number) => {
    setQuizzes(prevQuizzes =>
      prevQuizzes.map(quiz => {
        if (quiz.client_temp_id === clientTempId) {
          const newOptions = quiz.options.filter((_, i) => i !== optionIndex);
          // Adjust correct_option if it's out of bounds
          const newCorrectOption = quiz.correct_option >= newOptions.length ? newOptions.length - 1 : quiz.correct_option;
          return { ...quiz, options: newOptions, correct_option: newCorrectOption };
        }
        return quiz;
      })
    );
    setIsDirty(true);
  };

  const handleDeleteQuiz = (clientTempId: string) => {
    setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.client_temp_id !== clientTempId));
    setIsDirty(true);
  };

  const handleMediaChange = (clientTempId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        setError(`Media size exceeds ${MAX_MEDIA_SIZE_MB}MB limit.`);
        return;
      }
      if (!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
        setError('Invalid media type. Please use PNG, JPEG, MP4, or MOV.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setQuizzes(prevQuizzes =>
          prevQuizzes.map(quiz =>
            quiz.client_temp_id === clientTempId
              ? { ...quiz, mediaFile: file, mediaPreviewUrl: reader.result as string, media_type: file.type }
              : quiz
          )
        );
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
      const { error } = await supabase.storage
        .from('assessments')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });
      if (error) throw error;
      return path;
    } catch (uploadError) {
      console.error(`Error uploading file to ${path}:`, uploadError);
      throw new Error(`Failed to upload ${file.name} to cloud storage.`);
    }
  };

  const handleSaveQuizzes = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    const originalQuizIds = originalQuizzes.map(q => q.id).filter(id => id);
    const currentQuizIds = quizzes.map(q => q.id).filter(id => id);
    const deletedQuizIds = originalQuizIds.filter(id => !currentQuizIds.includes(id as string));

    try {
      const quizzesPayload = await Promise.all(quizzes.map(async (quiz) => {
        let question_media = quiz.question_media;

        if (quiz.mediaFile) {
          const fileExt = quiz.mediaFile.name.split('.').pop() || 'png';
          const newMediaPath = `quiz_media/${agentId}/${quiz.client_temp_id}.${fileExt}`;
          question_media = await uploadFile(quiz.mediaFile, newMediaPath);
        }

        return {
          id: quiz.id,
          client_temp_id: quiz.client_temp_id,
          question: quiz.question,
          quiz_desc: quiz.quiz_desc,
          options: quiz.options,
          correct_option: quiz.correct_option,
          question_media: question_media,
          media_type: quiz.media_type,
        };
      }));

      const response = await fetch(`/api/agents/${agentId}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizzes_data: quizzesPayload,
          deleted_quiz_ids: deletedQuizIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save quizzes.");
      }

      setSuccessMessage("Quizzes saved successfully!");
      await fetchQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during save.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader
        title={`Manage Assessments for Agent ${agentId}`}
        description="Create and manage quizzes for this agent's assessment."
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/agents/${agentId}/lessons`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lessons
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}
      {successMessage && (
         <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Quizzes</h2>
        
        <Accordion
            type="single"
            collapsible
            className="w-full space-y-2"
            value={activeAccordionItem}
            onValueChange={setActiveAccordionItem}
            defaultValue={quizzes.length > 0 ? quizzes[0].client_temp_id : undefined}
        >
          {quizzes.map((quiz, index) => (
            <AccordionItem value={quiz.client_temp_id} key={quiz.client_temp_id} className="border bg-card p-0 rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{`Quiz ${index + 1}`}</span>
                    <Button
                        variant="ghost" size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.client_temp_id);}}
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-0 pb-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor={`quiz-question-${quiz.client_temp_id}`}>Question</Label>
                  <Textarea
                    id={`quiz-question-${quiz.client_temp_id}`}
                    value={quiz.question}
                    onChange={(e) => handleQuizChange(quiz.client_temp_id, 'question', e.target.value)}
                    placeholder="Enter the quiz question"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`quiz-desc-${quiz.client_temp_id}`}>Quiz Description</Label>
                  <Textarea
                    id={`quiz-desc-${quiz.client_temp_id}`}
                    value={quiz.quiz_desc}
                    onChange={(e) => handleQuizChange(quiz.client_temp_id, 'quiz_desc', e.target.value)}
                    placeholder="Enter the quiz description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`quiz-media-${quiz.client_temp_id}`}>Question Media (Optional)</Label>
                  <Input
                    id={`quiz-media-${quiz.client_temp_id}`}
                    type="file"
                    accept={ACCEPTED_MEDIA_EXTENSIONS}
                    onChange={(e) => handleMediaChange(quiz.client_temp_id, e)}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {quiz.mediaPreviewUrl && (
                    <div className="mt-2">
                      {(() => {
                        if (quiz.media_type?.startsWith('video/')) {
                          return <video src={quiz.mediaPreviewUrl} controls className="max-h-40 rounded-md border" />;
                        }
                        return <img src={quiz.mediaPreviewUrl} alt="Media Preview" className="max-h-40 rounded-md border" />;
                      })()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  <RadioGroup
                    value={String(quiz.correct_option)}
                    onValueChange={(value) => handleQuizChange(quiz.client_temp_id, 'correct_option', parseInt(value))}
                  >
                    {quiz.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <RadioGroupItem value={String(optionIndex)} id={`option-${quiz.client_temp_id}-${optionIndex}`} />
                        <Label htmlFor={`option-${quiz.client_temp_id}-${optionIndex}`} className="flex-1">
                          <Input
                            value={option}
                            onChange={(e) => handleOptionChange(quiz.client_temp_id, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="w-full"
                          />
                        </Label>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(quiz.client_temp_id, optionIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button variant="outline" size="sm" onClick={() => handleAddOption(quiz.client_temp_id)}>Add Option</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {quizzes.length === 0 && !isProcessing && (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileImage className="mx-auto h-10 w-10 mb-2" />
                <p>No quizzes yet. Click "Add Quiz" to get started.</p>
            </div>
        )}

        <Button onClick={handleAddQuiz} variant="outline">
          Add Quiz
        </Button>

        <div className="mt-8 pt-6 border-t">
          <Button
            onClick={handleSaveQuizzes}
            disabled={isProcessing || !isDirty}
            size="lg"
          >
            {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {isProcessing ? "Saving..." : "Save Quizzes"}
          </Button>
        </div>
      </div>
    </div>
  );
}