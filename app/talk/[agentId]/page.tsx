"use client";

import { useParams } from 'next/navigation';
import { Conversation } from '@/components/Conversation'; // Adjust path if necessary
import { useEffect, useState } from 'react';

export default function TalkToAgentPage() {
    const params = useParams();
    const agentId = params.agentId as string | undefined;
    const [pageTitle, setPageTitle] = useState("Test Agent");

    // Basic loading/error state for agentId
    if (!agentId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Agent Not Specified</h1>
                <p className="text-slate-600 dark:text-slate-400">No agent ID was provided in the URL.</p>
            </div>
        );
    }
    
    // In a real app, you might fetch agent details here to display name, etc.
    // For now, we'll just use the ID.
    // useEffect(() => {
    //  Fetch agent name using agentId and setPageTitle(`Test Agent: ${agentName}`);
    // }, [agentId]);


    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8">
            <header className="w-full max-w-3xl mb-6 md:mb-8 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">
                    {pageTitle}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Agent ID: {agentId}</p>
            </header>
            <main className="w-full max-w-2xl h-[70vh] md:h-[75vh] bg-white dark:bg-slate-800 shadow-xl rounded-lg overflow-hidden">
                <Conversation agentId={agentId} />
            </main>
            <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
                <p>Powered by SKAI</p>
            </footer>
        </div>
    );
}