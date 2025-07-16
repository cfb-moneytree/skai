import React, { Suspense } from 'react';
import QuizzesPlayer from './QuizzesPlayer';

export default async function QuizzesPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId: agentId } = await params;
  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center flex-grow p-6 bg-slate-800">
        <p className="text-slate-300">Loading quizzes...</p>
      </main>
    }>
      <QuizzesPlayer 
        agentId={agentId} 
      />
    </Suspense>
  );
}