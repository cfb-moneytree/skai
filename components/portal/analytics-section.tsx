"use client";

import React,
{
  useState,
  useEffect
} from 'react';
import AnalyticsCard from './analytics-card';
import Image from 'next/image';
import {
  createSupabaseBrowserClient
} from '@/lib/supabase/client';
import { getUserAnalytics } from '@/lib/portal/analytics';

const AnalyticsSection = () => {
  const supabase = createSupabaseBrowserClient();
  const [analytics, setAnalytics] = useState({
    totalCourses: 0,
    completedCourses: 0,
    passedCourses: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const data = await getUserAnalytics(supabase, user.id);
        if (data) {
          setAnalytics(data);
        }
      }
      setLoading(false);
    };

    fetchAnalyticsData();
  }, [supabase]);

  if (loading) {
    return <div > Loading... </div>;
  }

  return (
    <section className="mb-12" >
      <div className="flex overflow-x-auto space-x-4 p-4 scrollbar-hide">
        <div className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
          <AnalyticsCard
            title="No. of Courses"
            value={analytics.totalCourses}
            icon={<Image src="/images/portal-analytics/total_courses.png" alt="Total Courses" width={50} height={50} />}
          />
        </div>
        <div className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
          <AnalyticsCard
            title="Courses Completed"
            value={analytics.completedCourses}
            icon={<Image src="/images/portal-analytics/completed.png" alt="Courses Completed" width={60} height={60} />}
          />
        </div>
        <div className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
          <AnalyticsCard
            title="Courses Passed"
            value={analytics.passedCourses}
            icon={<Image src="/images/portal-analytics/pass_course.png" alt="Courses Passed" width={40} height={40} />}
          />
        </div>
        <div className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
          <AnalyticsCard
            title="Average Score"
            value={Math.round(analytics.averageScore)}
            icon={<Image src="/images/portal-analytics/average_score.png" alt="Average Score" width={40} height={40} />}
          />
        </div>
      </div>
    </section>
  );
};

export default AnalyticsSection;