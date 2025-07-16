"use client";

import React, { useEffect, useRef, Suspense, useState } from 'react'; // Added useState
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // Assuming @ is root alias

// This component contains the actual page content and logic
const LessonPageContent = () => {
  const convaiWidgetRef = useRef<HTMLElement | null>(null);
  const searchParams = useSearchParams();
  const agentIdFromUrl = searchParams.get('id');

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentContentType, setCurrentContentType] = useState<'image_text' | 'video' | null>(null);
  const [slideMessage, setSlideMessage] = useState<string | null>("Waiting for slide content...");
  const [internalAgentUuid, setInternalAgentUuid] = useState<string | null>(null); // Added state for internal UUID
  const [callId, setCallId] = useState<string | null>(null);

  // Initialize Supabase client (lib/supabase/client.ts handles singleton)
  const supabase = createSupabaseBrowserClient();

  // Effect to generate a unique call identifier for the session
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
  }, []); // Runs once on mount

  // Effect to fetch internal agent UUID
  useEffect(() => {
    if (agentIdFromUrl && supabase) {
      const fetchInternalId = async () => {
        setSlideMessage("Fetching agent configuration...");
        setInternalAgentUuid(null); // Reset while fetching
        try {
          const { data: agentRecord, error: agentFetchError } = await supabase
            .from('user_elevenlabs_agents')
            .select('id') // This 'id' is the internal UUID
            .eq('elevenlabs_agent_id', agentIdFromUrl) // Match against the URL param
            .maybeSingle(); // Changed from .single()

          if (agentFetchError) {
            console.error("Error fetching internal agent ID:", agentFetchError);
            setSlideMessage(`Error fetching agent configuration: ${agentFetchError.message}`);
            return;
          }

          if (agentRecord && agentRecord.id) {
            setInternalAgentUuid(agentRecord.id);
            setSlideMessage("Agent configured. Waiting for slide updates..."); // Update message
          } else {
            setSlideMessage("Agent configuration not found for the provided ID.");
            console.warn(`No internal UUID found for elevenlabs_agent_id: ${agentIdFromUrl}. Received agentRecord:`, agentRecord); // Enhanced logging
          }
        } catch (e: any) {
          console.error("Exception fetching internal agent ID:", e);
          setSlideMessage(`Exception fetching agent configuration: ${e.message}`);
        }
      };
      fetchInternalId();
    } else if (!agentIdFromUrl) {
      setInternalAgentUuid(null); // Clear if no agentIdFromUrl
      setSlideMessage("Agent ID not provided in URL.");
    }
  }, [agentIdFromUrl, supabase]);


  // useEffect for Convai Widget Initialization
  useEffect(() => {
    if (!agentIdFromUrl || !callId) {
      if (!agentIdFromUrl) console.error("Agent ID not found in URL for Convai setup.");
      if (!callId) console.log("Waiting for call identifier to be generated...");
      return;
    }

    const setupWidget = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userName = session?.user?.user_metadata?.full_name || "John"; // Default to "John" if not available
      const userId = session?.user?.id;

      if (!userId) {
        console.error("User not logged in. Cannot initialize widget.");
        setSlideMessage("You must be logged in to interact with the agent.");
        return;
      }

      console.log("🔑 Session call_identifier:", callId);

      const dynamicVars = {
        user_name: userName,
        call_identifier: callId,
        user_id: userId, // Pass the user's ID
        account_type: "premium"
      };

      const widgetElement = convaiWidgetRef.current;
      if (widgetElement) {
        widgetElement.setAttribute('agent-id', agentIdFromUrl);
        widgetElement.setAttribute('dynamic-variables', JSON.stringify(dynamicVars));
      }

      const waitForWidgetReady = () => {
        const interval = setInterval(() => {
          const widget = widgetElement as any;
          if (widget && typeof widget.addAudioBase64Chunk === 'function') {
            console.log("✅ Convai widget is fully initialized and ready for agent:", agentIdFromUrl);
            clearInterval(interval);
          } else {
            console.log("⏳ Waiting for Convai widget to initialize for agent:", agentIdFromUrl);
          }
        }, 500);
        return () => clearInterval(interval);
      };

      if (widgetElement) {
        const scriptElement = document.querySelector('script[src="https://elevenlabs.io/convai-widget/index.js"]');
        if (scriptElement && (scriptElement as any)._isLoaded) {
          waitForWidgetReady();
        } else if (scriptElement) {
          scriptElement.addEventListener('load', waitForWidgetReady);
          // Cleanup event listener on unmount or if agentIdFromUrl changes
          return () => scriptElement.removeEventListener('load', waitForWidgetReady);
        } else {
          setTimeout(waitForWidgetReady, 100);
        }
      }
    };
    setupWidget();
  }, [agentIdFromUrl, callId, supabase]); // Add supabase to dependency array

  // useEffect for Supabase Realtime Subscription
  useEffect(() => {
    // Now depends on internalAgentUuid being available
    if (!agentIdFromUrl || !supabase || !internalAgentUuid || !callId) {
      setCurrentImageUrl(null);
      setCurrentVideoUrl(null);
      setCurrentContentType(null);
      if (!agentIdFromUrl) {
        setSlideMessage("Agent ID not available.");
      } else if (!supabase) {
        setSlideMessage("Supabase client not ready.");
      } else if (!internalAgentUuid && agentIdFromUrl) {
        // Message is likely being handled by the internalAgentUuid fetch effect
        // setSlideMessage("Waiting for agent configuration...");
      }
      return;
    }

    // Message should be "Agent configured. Waiting for slide updates..." or similar from previous effect
    // setSlideMessage("Connecting to slide updates..."); // This might overwrite a more specific message

    const channelName = `agent-events:${callId}`;
    const channel = supabase.channel(channelName);

    const handleSlideChange = async (message: any) => {
      if (message.payload && typeof message.payload === 'object') {
        const { agent_id: eventAgentId, slide_number: eventSlideTitle } = message.payload;

        if (eventAgentId === agentIdFromUrl) { // This check is still valid as eventAgentId is the "agent_01..." style
          setSlideMessage(`Loading slide: ${eventSlideTitle}...`);
          setCurrentImageUrl(null);
          setCurrentVideoUrl(null);
          setCurrentContentType(null);

          try {
            // Use internalAgentUuid for the query
            const { data: slideData, error: slideError } = await supabase
              .from('agent_lessons_slides')
              .select('image_path, video_path, content_type') // Fetch new fields
              .eq('agent_id', internalAgentUuid) // Use the fetched internal UUID
              .eq('title', eventSlideTitle)
              .single();

            if (slideError) {
              console.error("Error fetching slide data:", slideError);
              setSlideMessage(`Error fetching content for slide: ${eventSlideTitle}. Details: ${slideError.message}`);
              return;
            }

            if (slideData) {
              setCurrentContentType(slideData.content_type as 'image_text' | 'video');
              if (slideData.content_type === 'image_text' && slideData.image_path) {
                const { data: signedUrlData, error: urlError } = await supabase
                  .storage
                  .from('lessons') // Assuming 'lessons' is the correct bucket
                  .createSignedUrl(slideData.image_path, 60 * 2); // 2 minutes validity

                if (urlError) {
                  console.error("Error creating signed URL for image:", urlError);
                  setSlideMessage(`Error loading image for slide: ${eventSlideTitle}. Details: ${urlError.message}`);
                } else if (signedUrlData?.signedUrl) {
                  setCurrentImageUrl(signedUrlData.signedUrl);
                  setSlideMessage(null);
                } else {
                  setSlideMessage(`Image could not be loaded for slide: ${eventSlideTitle}.`);
                }
              } else if (slideData.content_type === 'video' && slideData.video_path) {
                const { data: signedUrlData, error: urlError } = await supabase
                  .storage
                  .from('lessons') // Assuming 'lessons' is the correct bucket for videos too
                  .createSignedUrl(slideData.video_path, 60 * 2); // 2 minutes validity

                if (urlError) {
                  console.error("Error creating signed URL for video:", urlError);
                  setSlideMessage(`Error loading video for slide: ${eventSlideTitle}. Details: ${urlError.message}`);
                } else if (signedUrlData?.signedUrl) {
                  setCurrentVideoUrl(signedUrlData.signedUrl);
                  setSlideMessage(null);
                } else {
                  setSlideMessage(`Video could not be loaded for slide: ${eventSlideTitle}.`);
                }
              } else {
                 setSlideMessage(`Content (image/video path or type) not found or mismatched for slide: ${eventSlideTitle}.`);
              }
            } else {
              setSlideMessage(`No data found for slide: ${eventSlideTitle}.`);
            }
          } catch (e: any) {
            console.error("Exception fetching slide or signed URL:", e);
            setSlideMessage(`An error occurred while loading slide content: ${e.message}`);
          }
        }
      } else {
        console.warn("Received broadcast message with unexpected payload structure:", message);
      }
    };

    channel
      .on('broadcast', { event: 'slide_changed' }, handleSlideChange)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${channelName} for slide_changed.`);
          setSlideMessage("Connected. Waiting for slide updates...");
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error on ${channelName}: ${status}`, err);
          setSlideMessage(`Connection error for slide updates: ${status}. Check console.`);
        } else if (status === 'CLOSED') {
            console.log(`Channel ${channelName} closed.`);
            // Optionally set a message or attempt to resubscribe depending on strategy
        }
      });

    return () => {
      console.log(`Unsubscribing from ${channelName}.`);
      supabase.removeChannel(channel).catch(err => console.error("Error removing channel:", err));
    };
  }, [agentIdFromUrl, supabase, internalAgentUuid, callId]); // Added callId to dependencies


  if (!agentIdFromUrl) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        Agent ID not provided in the URL. Please access this page via a valid agent link.
      </div>
    );
  }

  return (
    <>
      {/* Global styles retained, ensure they don't conflict or remove unused ones later */}
      <style jsx global>{`
        body {
          font-family: 'Segoe UI', sans-serif;
          margin: 0;
          background: #fff;
          color: #333;
          padding-bottom: 7rem; /* Retained from original, check if still needed */
        }

        /* Styles for .container, .main, .sidebar, etc. from original are removed as those elements are gone */
        /* Add new styles or adjust existing ones if needed for the new layout */

        .slide-display-container { /* Style for the new image/message display area */
            width: 100%;
            /* Calculate height considering the Convai widget, assuming widget is around 70-80px */
            height: calc(100vh - 100px); /* Example: 100px for widget + some margin */
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px solid #eee; /* Lighter border */
            margin: 20px auto; /* Centered with some margin */
            padding: 10px;
            box-sizing: border-box;
            background-color: #f9f9f9; /* Light background for the display area */
        }
        .slide-display-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px; /* Optional: rounded corners for image/video */
        }
        .slide-display-container video { /* Styles for video element */
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
        }
        .slide-display-container p { /* Styling for placeholder/message text */
            text-align: center;
            padding: 20px;
            font-size: 1.1rem;
            color: #555;
        }
      `}</style>

      <div className="slide-display-container">
        {currentContentType === 'image_text' && currentImageUrl ? (
          <img src={currentImageUrl} alt="Current Lesson Slide" />
        ) : currentContentType === 'video' && currentVideoUrl ? (
          <video src={currentVideoUrl} controls autoPlay muted loop playsInline key={currentVideoUrl}> {/* Added key to force re-render on src change */}
            Your browser does not support the video tag.
          </video>
        ) : (
          <p>{slideMessage}</p>
        )}
      </div>
      
      {/* Convai widget and script retained */}
      {React.createElement('elevenlabs-convai', { ref: convaiWidgetRef })}

      <Script
        src="https://elevenlabs.io/convai-widget/index.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('Convai widget script loaded by next/script.');
          const scriptElement = document.querySelector('script[src="https://elevenlabs.io/convai-widget/index.js"]');
          if (scriptElement) (scriptElement as any)._isLoaded = true;
        }}
      />
    </>
  );
};

// Default export that wraps the main content with Suspense (Retained)
const TestAgentLessonPage = () => {
  return (
    <Suspense fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading lesson details...</div>}>
      <LessonPageContent />
    </Suspense>
  );
};

export default TestAgentLessonPage;