"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from "@/components/portal/button"
import { Card, CardContent } from "@/components/portal/card"
import { MoreHorizontal, CheckCircle, X } from "lucide-react"
import Image from "next/image"

interface AgentCourse {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  students: string;
  image_url?: string | null;
  media_type?: 'image' | 'video' | 'none';
  completed: boolean;
}

export default function MyCoursesPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending")
  const [courses, setCourses] = useState<AgentCourse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const BUCKET_NAME = 'lessons';

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      setError(null);
      setCourses([]);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/portal');
        return;
      }
      const currentUser = session.user;
      setUser(currentUser);

      const processAgents = async (agentList: any[]): Promise<AgentCourse[]> => {
        return Promise.all(
          agentList.map(async (agent) => {
            let imageUrl: string | null = null;
            let mediaType: AgentCourse['media_type'] = 'none';

            if (agent.cover_image) {
              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(agent.cover_image, 3600);
              if (!urlError) {
                imageUrl = signedUrlData?.signedUrl || null;
                mediaType = 'image';
              }
            }

            return {
              id: agent.id,
              title: agent.agent_name || 'Unnamed Course',
              instructor: "N/A",
              duration: "N/A",
              students: "N/A",
              image_url: imageUrl,
              media_type: mediaType,
              completed: activeTab === 'completed',
            } as AgentCourse;
          })
        );
      };

      const isCompleted = activeTab === 'completed';
      const { data: progressData, error: progressError } = await supabase
        .from('user_agents_progress')
        .select('agent_id')
        .eq('user_id', currentUser.id)
        .eq('is_complete', isCompleted);

      if (progressError) {
        setError("Could not load your courses.");
        setIsLoading(false);
        return;
      }
      
      if (progressData && progressData.length > 0) {
        const distinctAgentIds = [...new Set(progressData.map(p => p.agent_id))].filter(id => id != null);
        if (distinctAgentIds.length > 0) {
          const { data: agentsDetails, error: agentsError } = await supabase
            .from('user_elevenlabs_agents')
            .select('id, agent_name, cover_image')
            .in('id', distinctAgentIds);

          if (agentsError) {
            setError("Could not load course details.");
          } else if (agentsDetails) {
            const processedCourses = await processAgents(agentsDetails);
            setCourses(processedCourses);
          }
        }
      }
      setIsLoading(false);
    };

    fetchCourses();
  }, [supabase, router, activeTab]);

  const tabs = [
    { id: "pending", label: "Pending Courses" },
    { id: "completed", label: "Completed Courses" },
  ]

  if (isLoading) {
    return (
        <main className="flex flex-col items-center justify-center flex-grow p-6">
            <p className="text-slate-700">Loading...</p>
        </main>
    );
  }


  return (
    <div className="flex-grow">

      <main className="mx-auto px-6 py-8 w-full">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">My Courses</h1>

        <div className="flex border-b border-gray-200 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {error && <p className="text-red-500">{error}</p>}
          {!error && courses.length === 0 && (
            <p className="text-slate-500">You have no {activeTab} courses.</p>
          )}
          {courses.map((courseItem) => (
            <Card
              key={courseItem.id}
              className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
              onClick={() => router.push(`/portal/course/${courseItem.id}`)}
            >
              <CardContent className="p-6 flex-grow">
                <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0">
                  <div className="relative w-24 h-24 bg-slate-200 rounded-lg flex-shrink-0">
                    {courseItem.image_url ? (
                      <Image
                        src={courseItem.image_url}
                        alt={courseItem.title}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                    ) : (
                       <span className="text-slate-500 text-xs flex items-center justify-center h-full">No Preview</span>
                    )}
                    {courseItem.completed && (
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{courseItem.title}</h3>
                    <p className="text-gray-600 mb-2">{courseItem.instructor}</p>
                    {/* <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{courseItem.duration}</span>
                      <span>• {courseItem.students}</span>
                    </div> */}
                  </div>

                  {courseItem.completed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/portal/quizzes/${courseItem.id}/result`);
                      }}
                    >
                      View Assessment Result
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}