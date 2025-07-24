"use client"

import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from "@/components/portal/button"
import { Card, CardContent } from "@/components/portal/card"
import { Badge } from "@/components/ui/badge"
import { FileQuestion } from "lucide-react"
import { MonthlyLimitDialog } from "./MonthlyLimitDialog"
import { Play, Pause, SkipBack, Volume2, Maximize, Settings, MessageSquare, Bookmark, Share, CheckCircle } from "lucide-react"
import Image from "next/image"

interface CourseDetails {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  students: string;
  elevenlabs_agent_id: string | null;
  completed: boolean;
  cover_image: string | null;
}

interface Lesson {
  id: string;
  title: string;
  slide_order: number;
}

interface Quiz {
  id: string;
  title: string;
}

interface CoursePlayerProps {
  courseId: string;
}

export default function CoursePlayer({ courseId }: CoursePlayerProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [remainingPlays, setRemainingPlays] = useState<number>(0);
  const [playLimit, setPlayLimit] = useState<number>(0);
  const [callId, setCallId] = useState<string | null>(null);
  const [isCourseStarted, setIsCourseStarted] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [overridePrompt, setOverridePrompt] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<{ slideId: string; slideTitle: string; } | null>(null);
  const [hasProgress, setHasProgress] = useState(false);
  const [showTargetedCourse, setShowTargetedCourse] = useState(false);

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentContentType, setCurrentContentType] = useState<'image_text' | 'video' | null>(null);
  const [slideMessage, setSlideMessage] = useState<string | null>("Waiting for slide content...");
  const [currentSlideTitle, setCurrentSlideTitle] = useState<string | null>(null);

  const BUCKET_NAME = 'lessons';

  // --- ADDED: Organization Quota State ---
  const [orgQuota, setOrgQuota] = useState<{ monthly_quota_minutes: number; current_usage_minutes: number } | null>(null);

  const convaiWidgetRef = useCallback((node: HTMLElement | null) => {
    if (node !== null && course?.elevenlabs_agent_id && callId) {
      const setupWidget = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const userName = session?.user?.user_metadata?.full_name || "Student";
        const userId = session?.user?.id;

        if (!userId) {
          setError("You must be logged in to interact with the agent.");
          return;
        }

        const agentIdForWidget = course.elevenlabs_agent_id;
        const dynamicVars = {
          user_name: userName,
          call_identifier: callId,
          user_id: userId
        };

        if (agentIdForWidget) {
          node.setAttribute('agent-id', agentIdForWidget);
        }
        node.setAttribute('dynamic-variables', JSON.stringify(dynamicVars));
        if (overridePrompt) {
          node.setAttribute('override-prompt', overridePrompt);
        }
      };
      setupWidget();
    }
  }, [course, callId, supabase, overridePrompt]);

  useEffect(() => {
    function generateCallIdentifier(length = 12) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
    setCallId(generateCallIdentifier());
  }, []);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/portal');
        return;
      }
      setUser(session.user);

      const { data: agentDetails, error: agentError } = await supabase
        .from('user_elevenlabs_agents')
        .select('*')
        .eq('id', courseId)
        .single();

      if (agentError || !agentDetails) {
        setError("Could not load course details.");
        setIsLoading(false);
        return;
      }

      setCourse({
        id: agentDetails.id,
        title: agentDetails.agent_name || 'Unnamed Course',
        instructor: agentDetails.instructor_placeholder || "N/A",
        duration: agentDetails.duration_placeholder || "N/A",
        students: agentDetails.students_placeholder || "N/A",
        elevenlabs_agent_id: agentDetails.elevenlabs_agent_id,
        completed: agentDetails.completed || false,
        cover_image: agentDetails.cover_image,
      });

      if (agentDetails.cover_image) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(agentDetails.cover_image, 3600);
        if (urlData) {
          setCoverImageUrl(urlData.signedUrl);
        }
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('agent_lessons_slides')
        .select('id, title, slide_order')
        .eq('agent_id', agentDetails.id)
        .order('slide_order', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData.map(l => ({ id: l.id, title: l.title || `Slide ${l.id}`, slide_order: l.slide_order })));
      }

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quiz')
        .select('id, question')
        .eq('agent_id', agentDetails.id);

      if (quizzesData) {
        setQuizzes(quizzesData.map(q => ({ id: q.id, title: q.question })));

        if (session.user && quizzesData.length > 0) {
          const quizIds = quizzesData.map(q => q.id);
          const { data: attempts, error: attemptsError } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('user_id', session.user.id)
            .in('quiz_id', quizIds)
            .limit(1);

          if (attempts && attempts.length > 0) {
            setHasAttempts(true);
          }
        }
      }

      if (session.user) {
            // Get play limit and current count
            const currentDate = new Date();
            const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

            const { data: orgs } = await supabase
              .from('organization_users')
              .select('organization_id')
              .eq('user_id', session.user.id);

            const orgIds = orgs?.map(org => org.organization_id) || [];

        // --- ADDED: Fetch orgQuota ---
        if (orgIds.length > 0) {
          const { data: quotaData, error: quotaError } = await supabase
            .from('organization_quotas')
            .select('monthly_quota_minutes, current_usage_minutes')
            .eq('organization_id', orgIds[0]) // Assumes one org per user
            .single();

          if (quotaError) {
            console.error("Error fetching organization quota:", quotaError);
          } else if (quotaData) {
            setOrgQuota(quotaData);
          }
        }

            const { data: limitData } = await supabase
              .from('app_limits')
              .select('value')
              .eq('limit_type', 'monthly_agent_play')
              .or(`applies_to_user_id.eq.${session.user.id},applies_to_organization_id.in.(${orgIds}),applies_to_agent_id.eq.${courseId}`)
              .order('applies_to_user_id', { ascending: false })
              .order('applies_to_organization_id', { ascending: false })
              .limit(1);

            const limit = limitData?.[0]?.value;
            if (limit === undefined) {
              setError("This lesson requires a monthly play limit to be set. Please contact your administrator.");
              setIsLoading(false);
              return;
            }
            setPlayLimit(limit);

            const { data: playData } = await supabase
              .from('monthly_agent_plays')
              .select('play_count')
              .eq('user_id', session.user.id)
              .eq('agent_id', courseId)
              .eq('month_year', monthYear)
              .maybeSingle();

            setRemainingPlays(limit - (playData?.play_count || 0));

            const { data: progress, error: progressError } = await supabase
              .from('user_agents_progress')
              .select('is_complete, slide_id, score')
              .eq('user_id', session.user.id)
              .eq('agent_id', courseId)
              .maybeSingle();
    
            if (progress) {
              setHasProgress(true);
              if (progress.is_complete && progress.score !== null && progress.score < 100) {
                setShowTargetedCourse(true);
              }

              if (progress.is_complete === false) {
                try {
                  const { data: promptData, error: promptError } = await supabase.functions.invoke('get-resume-prompt', {
                    body: { userId: session.user.id, agentId: courseId },
                  });
    
                  if (promptError) throw promptError;
                  if (promptData.prompt && promptData.slideId && promptData.slideTitle) {
                    setOverridePrompt(promptData.prompt);
                    setResumeData({ slideId: promptData.slideId, slideTitle: promptData.slideTitle });
                  }
                } catch (e) {
                  console.error("Error fetching resume prompt:", e);
                }
              }
            } else {
              setHasProgress(false);
            }
          }

      setIsLoading(false);
    };

    fetchCourseDetails();
  }, [supabase, router, courseId]);

  const loadSlideContent = useCallback(async (slideTitle: string) => {
    if (!course) return;

    setCurrentSlideTitle(slideTitle);
    setSlideMessage(`Loading slide: ${slideTitle}...`);
    setCurrentImageUrl(null);
    setCurrentVideoUrl(null);
    setCurrentContentType(null);

    const { data: slideData, error: slideError } = await supabase
      .from('agent_lessons_slides')
      .select('id, image_path, video_path, content_type, slide_order')
      .eq('agent_id', course.id)
      .eq('title', slideTitle)
      .single();

    if (slideError || !slideData) {
      setSlideMessage(`Error fetching content for slide: ${slideTitle}.`);
      return;
    }

    if (user) {
      const { error: progressError } = await supabase
        .from('user_agents_progress')
        .update({ slide_id: slideData.id })
        .eq('user_id', user.id)
        .eq('agent_id', course.id);

      if (progressError) {
        console.error('Error updating progress:', progressError);
      }
    }

    setCurrentContentType(slideData.content_type);
    const path = slideData.image_path || slideData.video_path;
    if (path) {
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 120);

      if (urlError || !signedUrlData?.signedUrl) {
        setSlideMessage(`Error loading media for slide: ${slideTitle}.`);
      } else {
        if (slideData.content_type === 'image_text') {
          setCurrentImageUrl(signedUrlData.signedUrl);
        } else if (slideData.content_type === 'video') {
          setCurrentVideoUrl(signedUrlData.signedUrl);
        }
        setSlideMessage(null);
      }
    } else {
      setSlideMessage(`Content path not found for slide: ${slideTitle}.`);
    }
  }, [course, supabase, user]);

  useEffect(() => {
    if (!isCourseStarted || !course?.elevenlabs_agent_id || !supabase || !callId) return;

    const agentIdForSubscription = course.elevenlabs_agent_id;
    const channelName = `agent-events:${callId}`;
    const channel = supabase.channel(channelName);

    const handleSlideChange = (message: any) => {
      if (message.payload?.agent_id === agentIdForSubscription) {
        loadSlideContent(message.payload.slide_number);
      }
    };

    channel
      .on('broadcast', { event: 'slide_changed' }, handleSlideChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${channelName} for slide_changed events.`);
          setSlideMessage("Connected. Waiting for slide updates...");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCourseStarted, course, supabase, callId, loadSlideContent]);

  const handleStartCourse = async () => {
    if (!user || !course) return;

    // --- ADDED: Organization Quota Check ---
    if (orgQuota && orgQuota.current_usage_minutes >= orgQuota.monthly_quota_minutes) {
      setError("Your organization has exceeded its monthly lesson quota. Please contact your administrator.");
      setShowLimitDialog(true);
      return;
    }

    // Get current month-year
    const currentDate = new Date();
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Check monthly play limit
    const { data: orgs } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id);

    const orgIds = orgs?.map(org => org.organization_id) || [];

    const { data: limitData } = await supabase
      .from('app_limits')
      .select('value')
      .eq('limit_type', 'monthly_agent_play')
      .or(`applies_to_user_id.eq.${user.id},applies_to_organization_id.in.(${orgIds}),applies_to_agent_id.eq.${course.id}`)
      .order('applies_to_user_id', { ascending: false })
      .order('applies_to_organization_id', { ascending: false })
      .limit(1);

    if (!limitData) {
      setError("Error checking play limit. Please try again.");
      return;
    }
    const monthlyLimit = limitData[0]?.value;
    if (monthlyLimit === undefined) {
      setError("This lesson requires a monthly play limit to be set. Please contact your administrator.");
      return;
    }
    setPlayLimit(monthlyLimit);

    // Get current play count
    const { data: playData } = await supabase
      .from('monthly_agent_plays')
      .select('play_count')
      .eq('user_id', user.id)
      .eq('agent_id', course.id)
      .eq('month_year', monthYear)
      .single();

    const currentPlayCount = playData?.play_count || 0;
    const remaining = monthlyLimit - currentPlayCount;
    setRemainingPlays(remaining);

    if (remaining <= 0) {
      setShowLimitDialog(true);
      return;
    }

    // Increment play count
    const { error: updateError } = await supabase
      .from('monthly_agent_plays')
      .upsert({
        user_id: user.id,
        agent_id: course.id,
        month_year: monthYear,
        play_count: currentPlayCount + 1
      }, { onConflict: 'user_id,agent_id,month_year' });

    if (updateError) {
      setError("Error updating play count. Please try again.");
      return;
    }

    setIsCourseStarted(true);
    if (lessons.length > 0) {
      if (resumeData) {
        loadSlideContent(resumeData.slideTitle);
      }

      const firstLesson = lessons[0];
      const { error } = await supabase
        .from('user_agents_progress')
        .upsert({
          user_id: user.id,
          agent_id: course.id,
          slide_id: resumeData?.slideId || firstLesson.id,
        }, { onConflict: 'user_id, agent_id' });

      if (error) {
        console.error('Error saving initial progress:', error);
      }
    }
  };

  const handleRestartCourse = async () => {
    if (user && course && lessons.length > 0) {
      const firstLesson = lessons[0];
      const { error } = await supabase
        .from('user_agents_progress')
        .update({ slide_id: firstLesson.id })
        .eq('user_id', user.id)
        .eq('agent_id', course.id);

      if (error) {
        console.error('Error restarting course:', error);
      } else {
        setOverridePrompt(null);
        setResumeData(null);
        setShowTargetedCourse(false);
        loadSlideContent(firstLesson.title);
        if (!isCourseStarted) {
          setIsCourseStarted(true);
        }
      }
    }
  };

  const handleStartTargetedCourse = async () => {
    if (!user || !course) return;

    const { data: incorrectQuestions, error: incorrectQuestionsError } = await supabase
      .from('quiz_attempts')
      .select('quiz(question)')
      .eq('user_id', user.id)
      .eq('is_correct', false);

    if (incorrectQuestionsError) {
      console.error('Error fetching incorrect questions:', incorrectQuestionsError);
      return;
    }

    const questionList = incorrectQuestions.map((q: any) => q.quiz.question);

    try {
      const response = await fetch('/api/get-targeted-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: course.id, question_list: questionList }),
      });

      if (!response.ok) {
        throw new Error('Failed to get targeted prompt');
      }

      const { prompt, slideId, slideTitle } = await response.json();
      setOverridePrompt(prompt);
      setResumeData({ slideId, slideTitle });
      handleStartCourse();
    } catch (error) {
      console.error('Error starting targeted course:', error);
    }
  };

  if (isLoading) {
    return (
        <main className="flex flex-col items-center justify-center flex-grow p-6 bg-slate-800">
            <p className="text-slate-300">Loading course content...</p>
        </main>
    );
  }

  if (error) {
    return (
        <main className="flex flex-col items-center justify-center flex-grow p-6 bg-slate-800">
            <p className="text-red-500">{error}</p>
        </main>
    );
  }

  if (!course) {
    return (
        <main className="flex flex-col items-center justify-center flex-grow p-6 bg-slate-800">
            <p className="text-slate-300">Course not found.</p>
        </main>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-800 text-white flex flex-col">
        {!isCourseStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl mx-auto">
              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-0">
                  <div className="relative aspect-video">
                    <Image
                      src={coverImageUrl || '/images/placeholder.svg'}
                      alt={course.title}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-t-lg"
                    />
                  </div>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                    <p className="text-slate-300 mb-2">Ready to start?</p>
                    <div className="flex items-center gap-2 mb-6">
                      <Badge variant={remainingPlays === 0 ? "destructive" : remainingPlays <= 2 ? "warning" : "default"} className="text-sm">
                        {remainingPlays} / {playLimit} plays remaining
                      </Badge>
                    </div>
                    {remainingPlays > 0 && (
                      <>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="w-full mt-4 bg-slate-600 hover:bg-slate-500" 
                          onClick={handleStartCourse}
                        >
                          {hasProgress ? 'Continue' : 'Start'}
                        </Button>
                        {hasProgress && (
                          <Button 
                            size="lg" 
                            variant="outline" 
                            className="w-full mt-4 bg-slate-600 hover:bg-slate-500" 
                            onClick={handleRestartCourse}
                          >
                            Restart
                          </Button>
                        )}
                        {showTargetedCourse && (
                          <Button size="lg" variant="outline" className="w-full mt-4 bg-slate-600 hover:bg-slate-500" onClick={handleStartTargetedCourse}>
                            Targeted Course
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row flex-1">
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative bg-black">
                {currentContentType === 'image_text' && currentImageUrl ? (
                  <Image src={currentImageUrl} alt="Current Lesson Slide" layout="fill" objectFit="contain" />
                ) : currentContentType === 'video' && currentVideoUrl ? (
                  <video src={currentVideoUrl} controls autoPlay muted loop playsInline key={currentVideoUrl} className="w-full h-full object-contain">
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="absolute inset-0">
                    {coverImageUrl ? (
                      <>
                        <Image
                          src={coverImageUrl}
                          alt="Lesson background"
                          layout="fill"
                          objectFit="cover"
                          className="blur-sm"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-lg text-white font-bold" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)' }}>{slideMessage}</p>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        <p className="text-lg text-gray-400">{slideMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Course Info */}
              <div className="p-6 bg-slate-800">
                <div className="flex items-center space-x-4 mb-4">
                  <h1 className="text-2xl font-bold">{course.title}</h1>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 bg-slate-700 flex-shrink-0 flex flex-col">
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-600 ${lesson.title === currentSlideTitle ? 'bg-slate-600' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                        <span className="text-sm">{index + 1}</span>
                      </div>
                      <span className="text-sm">{lesson.title}</span>
                    </div>
                  </div>
                ))}

                {quizzes.length > 0 && (
                  <div
                    onClick={() => router.push(`/portal/quizzes/${courseId}`)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-600`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                        <FileQuestion className="w-4 h-4" />
                      </div>
                      <span className="text-sm">Quizzes</span>
                    </div>
                  </div>
                )}

                {hasAttempts && (
                  <div
                    onClick={() => router.push(`/portal/quizzes/${courseId}/result`)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-600`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <span className="text-sm">View Results</span>
                    </div>
                  </div>
                )}

                <div className="h-24"></div> {/* Spacer div */}
              </div>
            </div>
          </div>
        )}
        {isCourseStarted && React.createElement('elevenlabs-convai', { ref: convaiWidgetRef })}
        <Script
          src="https://elevenlabs.io/convai-widget/index.js"
          strategy="afterInteractive"
        />
      </div>
      <MonthlyLimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        remainingPlays={remainingPlays}
        totalLimit={playLimit}
      />
    </>
  );
}