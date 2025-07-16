'use client';

import { useCallback, useState } from 'react';
import { useAgentConversation } from '../hooks/useAgentConversation';
import { Mic, Volume2, Loader2, AlertTriangle, Power, Radio, Square } from 'lucide-react'; // Added Power, Radio, Square

interface ConversationProps {
    agentId: string;
}

// Glow effect classes
const listeningGlow = "shadow-[0_0_25px_8px_rgba(74,222,128,0.6)] animate-pulse-glow-green"; // Green pulse
const agentSpeakingGlow = "shadow-[0_0_25px_8px_rgba(168,85,247,0.6)] animate-pulse-glow-purple"; // Purple pulse
// Note: `animate-pulse-glow-*` would need to be defined in CSS.
// For a simpler version without adding to globals.css, we can use Tailwind's existing `animate-pulse` on the icon
// and keep the static shadow for the button. Let's do that for now.

export function Conversation({ agentId }: ConversationProps) {
    const {
        startConversation,
        stopConversation,
        isConnected,
        isPlayingAudio,
        // conversationHistory, // No longer used
        error: wsError
        // stopCurrentAgentTurn removed from destructuring
    } = useAgentConversation();

    const [mediaError, setMediaError] = useState<string | null>(null);
    // Add a state to track if we are in the process of connecting
    const [isConnecting, setIsConnecting] = useState(false);


    const handleToggleConversation = useCallback(async () => {
        // If connected (either listening or agent speaking), clicking the button means "stop the session".
        // Barge-in is handled by the hook automatically when user speaks.
        if (isConnected) {
            await stopConversation();
            setIsConnecting(false);
        } else { // Not connected -> user wants to start
            setMediaError(null);
            if (!agentId) {
                console.error("Agent ID is missing in Conversation component.");
                setMediaError("Agent ID is missing. Cannot start conversation.");
                return;
            }
            try {
                setIsConnecting(true);
                await navigator.mediaDevices.getUserMedia({ audio: true });
                await startConversation(agentId);
                // isConnected will be set by the hook, then isConnecting can be false
                // However, onopen in the hook sets isConnected. We can set isConnecting to false there
                // For now, we'll rely on isConnected to change the button state after successful connection.
                // A more explicit isConnecting state in the hook would be better.
            } catch (err) {
                console.error('Failed to get media devices or start conversation:', err);
                if (err instanceof Error) {
                    setMediaError(`Error: ${err.message}. Please check microphone permissions.`);
                } else {
                    setMediaError("An unknown error occurred while trying to access microphone.");
                }
                setIsConnecting(false); // Reset on error
            }
        }
    }, [isConnected, stopConversation, agentId, startConversation, isPlayingAudio]); // Added isPlayingAudio to deps, though not directly used in this branch, good for consistency if logic changes
    
    // Determine button state and appearance
    let buttonText = "Tap to Talk";
    let buttonIcon = <Mic className="w-7 h-7" />; // Adjusted icon size
    let buttonDisabled = false;
    // buttonGlowClass is not used anymore, direct pulse on icon
    let statusText = "Tap button to start";

    if (isConnecting && !isConnected) {
        buttonText = "Connecting";
        buttonIcon = <Loader2 className="w-7 h-7 animate-spin" />; // Adjusted icon size
        buttonDisabled = true;
        statusText = "Initializing...";
    } else if (isConnected) {
        if (isPlayingAudio) {
            buttonText = "Agent Speaking";
            buttonIcon = <Volume2 className="w-7 h-7 text-purple-200 animate-pulse" />; // Adjusted icon size
            buttonDisabled = true;
            statusText = "Agent is responding...";
        } else {
            buttonText = "Listening";
            buttonIcon = <Mic className="w-7 h-7 text-green-200 animate-pulse" />; // Adjusted icon size
            buttonDisabled = false;
            statusText = "Tap to stop";
        }
    } else if (wsError || mediaError) {
        buttonText = "Error";
        buttonIcon = <AlertTriangle className="w-7 h-7" />; // Adjusted icon size
        buttonDisabled = false;
        statusText = "An error occurred. Tap to retry.";
    } else {
        buttonText = "Tap to Talk";
        buttonIcon = <Mic className="w-7 h-7" />; // Adjusted icon size
        statusText = "Tap button to start";
    }


    return (
        <div className="flex flex-col h-full items-center justify-center p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative">
            {/* Error Display Area - Absolute positioned or at top */}
            {(wsError || mediaError) && !isConnected && ( // Show errors prominently if not connected
                 <div className="absolute top-4 left-4 right-4 p-3 mb-4 text-sm text-red-100 bg-red-700/50 border border-red-600 rounded-md flex items-center shadow-lg z-10">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{wsError || mediaError}</span>
                </div>
            )}

            <div className="flex flex-col items-center justify-center flex-grow">
                <button
                    onClick={handleToggleConversation}
                    disabled={buttonDisabled}
                    className={`
                        w-32 h-32 md:w-36 md:h-36  // Made button smaller
                        rounded-full
                        flex flex-col items-center justify-center
                        text-white transition-all duration-300 ease-in-out
                        focus:outline-none focus:ring-4 focus:ring-opacity-50
                        shadow-lg hover:shadow-xl
                        
                        ${isConnected && !isPlayingAudio ? 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-emerald-400' :
                          isConnected && isPlayingAudio ? 'bg-gradient-to-br from-purple-500 to-indigo-600 cursor-not-allowed focus:ring-indigo-400' :
                          (wsError || mediaError) ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 focus:ring-rose-400' :
                          isConnecting ? 'bg-gradient-to-br from-sky-500 to-cyan-600 cursor-wait focus:ring-cyan-400' :
                          'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-indigo-400'}
                        
                        disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-lg
                        transform hover:scale-105 active:scale-95
                    `}
                    aria-label={buttonText}
                >
                    <div className="mb-2">{buttonIcon}</div>
                    <span className="text-sm md:text-base font-medium">{buttonText}</span>
                </button>
                <p className="mt-6 text-sm text-slate-300 text-center px-4">{statusText}</p>
            </div>
        </div>
    );
}
