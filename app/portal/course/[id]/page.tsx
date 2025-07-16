import React, { Suspense } from 'react';
import CoursePlayer from './CoursePlayer';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;

  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center flex-grow p-6 bg-slate-800">
        <p className="text-slate-300">Loading course...</p>
      </main>
    }>
      <CoursePlayer 
        courseId={courseId} 
      />
    </Suspense>
  );
}