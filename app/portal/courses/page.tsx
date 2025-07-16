"use client";

import React, { useState, useEffect, Suspense } from 'react'; // Added Suspense
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/portal/card'; // Removed unused CardHeader, CardTitle, CardDescription
import { Button } from '@/components/portal/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import AnalyticsSection from '@/components/portal/analytics-section';
import { Carousel, CarouselItem } from '@/components/portal/carousel';
import { Select } from '@/components/portal/select';

interface AgentCourse {
  id: string;
  title: string;
  image_path?: string | null;
  cover_image?: string | null;
  video_path?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  media_type?: 'image' | 'video' | 'none';
  duration_placeholder?: string;
  instructor_placeholder?: string;
  students_placeholder?: string;
}

function CoursesDisplay() { // Renamed from AllCoursesPage
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams is here
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isValidAccess, setIsValidAccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const [ongoingCourses, setOngoingCourses] = useState<AgentCourse[]>([]);
  const [ongoingCoursesError, setOngoingCoursesError] = useState<string | null>(null);
  
  const [recommendedCourses, setRecommendedCourses] = useState<AgentCourse[]>([]);
  const [recommendedCoursesError, setRecommendedCoursesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const BUCKET_NAME = 'lessons'; // Updated bucket name

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const schoolQueryParam = searchParams.get('schoolId');
      if (!schoolQueryParam) {
        router.push('/portal/workspace');
        return;
      }

      let url = `/api/portal/courses?schoolId=${schoolQueryParam}`;
      if (selectedCategory) {
        url += `&categoryId=${selectedCategory}`;
      }
      const response = await fetch(url);

      if (!response.ok) {
        setVerificationError("Failed to fetch courses.");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setOngoingCourses(data.ongoingCourses);
      setRecommendedCourses(data.recommendedCourses);
      setCategories(data.categories);
      setIsValidAccess(true);
      setIsLoading(false);
    };

    fetchData();
  }, [searchParams, router, selectedCategory]);

  const handleCourseClick = (courseId: string) => {
    router.push(`/portal/course/${courseId}`);
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center flex-grow p-6">
        <p className="text-slate-700">Verifying access and loading courses...</p>
      </main>
    );
  }

  if (!isValidAccess) {
    return (
      <main className="flex flex-col items-center justify-center flex-grow p-6 text-center">
        <p className="text-red-600 mb-4">{verificationError || "Access to these courses is denied."}</p>
        <Button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/portal');
          }}
        >
          Logout
        </Button>
      </main>
    );
  }
  
  return (
    <main className="flex-grow mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-12">
        <AnalyticsSection />
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-700 mb-2">Your Ongoing Courses</h2>
          {ongoingCourses.length > 0 ? (
            <Carousel>
              {ongoingCourses.map((course, index) => (
                <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <div className="p-1">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full" onClick={() => handleCourseClick(course.id)}>
                      <div className="relative w-full h-48 bg-slate-200 flex items-center justify-center">
                        {course.media_type === 'image' && course.image_url ? (
                          <Image src={course.image_url} alt={course.title} layout="fill" objectFit="cover" />
                        ) : course.media_type === 'video' && course.video_url ? (
                          <video src={course.video_url} controls className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-slate-500 text-xs">No Preview</span>
                        )}
                      </div>
                      <CardContent className="p-4 flex-grow flex flex-col bg-slate-800">
                        <h3 className="text-md font-semibold text-slate-800 mb-1 leading-tight line-clamp-2 text-white">{course.title}</h3>
                        {/* <p className="text-xs text-slate-500 mt-auto">{course.duration_placeholder || "Duration not set"}</p> */}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </Carousel>
          ) : (
            <p className="text-slate-500">You have no ongoing courses.</p>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-6 mt-12">
            <h2 className="text-2xl font-semibold text-slate-700">All Courses</h2>
            <Select
              className="w-[180px]"
              value={selectedCategory || 'all'}
              onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          {recommendedCourses.length > 0 ? (
            <Carousel>
              {recommendedCourses.map((course: AgentCourse, index) => (
                <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <div className="p-1">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full" onClick={() => handleCourseClick(course.id)}>
                      <div className="relative w-full h-48 bg-slate-200 flex items-center justify-center">
                        {course.media_type === 'image' && course.image_url ? (
                          <Image src={course.image_url} alt={course.title} layout="fill" objectFit="cover" />
                        ) : course.media_type === 'video' && course.video_url ? (
                          <video src={course.video_url} controls className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-slate-500 text-xs">No Preview</span>
                        )}
                      </div>
                      <CardContent className="p-4 flex-grow flex flex-col bg-slate-800">
                        <h3 className="font-semibold text-sm leading-tight text-slate-800 line-clamp-2 text-white">{course.title}</h3>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </Carousel>
          ) : (
            <p className="text-slate-500">No courses available.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default function AllCoursesPage() {
  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center flex-grow p-6">
        <p className="text-slate-700">Loading courses...</p>
      </main>
    }>
      <CoursesDisplay />
    </Suspense>
  );
}