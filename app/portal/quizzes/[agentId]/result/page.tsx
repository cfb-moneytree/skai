import React, { Suspense } from 'react';
import QuizResultPlayer from './QuizResultPlayer';

export default async function QuizResultPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId: agentId } = await params;
  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center flex-grow p-6 bg-slate-800">
        <p className="text-slate-300">Loading results...</p>
      </main>
    }>
      <QuizResultPlayer 
        agentId={agentId} 
      />
    </Suspense>
  );
}