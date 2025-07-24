"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicrophoneStream } from './useMicrophoneStream';
import type { ElevenLabsWebSocketEvent } from "../types/websocket";

const sendMessage = (websocket: WebSocket, request: object) => {
  if (websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  websocket.send(JSON.stringify(request));
};

export interface ConversationMessage {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const useAgentConversation = () => {
  const websocketRef = useRef<WebSocket>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isProcessingQueueRef = useRef<boolean>(false);

  const interruptAgentPlayback = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        console.warn("Error stopping current audio source during interruption:", e);
      }
      currentSourceRef.current.disconnect();
      currentSourceRef.current = null;
    }
    audioQueueRef.current = [];
    setIsPlayingAudio(false);
    isProcessingQueueRef.current = false;
    console.log("Agent playback interrupted by client.");
  }, []);

  // Use the new microphone stream hook
  const { startStreaming, stopStreaming } = useMicrophoneStream({
    onAudioChunked: (audioData) => {
      if (!websocketRef.current) return;
      const audioBase64 = arrayBufferToBase64(audioData);
      sendMessage(websocketRef.current, {
        user_audio_chunk: audioBase64,
      });
    },
  });

  const playNextInQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current || audioContextRef.current.state === 'closed') {
      if (isProcessingQueueRef.current && audioQueueRef.current.length > 0) {
      }
      return;
    }

    isProcessingQueueRef.current = true;
    setIsPlayingAudio(true);
    
    const pcmDataArrayBuffer = audioQueueRef.current.shift();

    if (!pcmDataArrayBuffer) {
      setIsPlayingAudio(false);
      isProcessingQueueRef.current = false;
      return;
    }

    try {
      const SAMPLE_RATE = 16000;
      const NUM_CHANNELS = 1;

      const pcmData = new Int16Array(pcmDataArrayBuffer);
      const numSamples = pcmData.length;

      if (numSamples === 0) {
        console.log("Received empty PCM data chunk.");
        setIsPlayingAudio(false);
        isProcessingQueueRef.current = false;
        playNextInQueue();
        return;
      }
      
      const audioBuffer = audioContextRef.current.createBuffer(
        NUM_CHANNELS,
        numSamples,
        SAMPLE_RATE
      );

      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      const source = audioContextRef.current.createBufferSource();
      currentSourceRef.current = source;
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);

      console.log(`Playing PCM chunk: ${numSamples} samples at ${SAMPLE_RATE}Hz`);

      source.onended = () => {
        currentSourceRef.current = null;
        setIsPlayingAudio(false);
        isProcessingQueueRef.current = false;
        playNextInQueue();
      };
    } catch (error) {
      console.error("Error processing or playing PCM audio:", error);
      currentSourceRef.current = null;
      setIsPlayingAudio(false);
      isProcessingQueueRef.current = false;
    }
  }, [isPlayingAudio]);

  const startConversation = useCallback(async (agentId: string) => {
    if (isConnected) return;
    if (!agentId) {
      console.error("Agent ID is required to start a conversation.");
      return;
    }

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    audioQueueRef.current = [];
    setIsPlayingAudio(false);
    isProcessingQueueRef.current = false;
    setConversationHistory([]);
    setError(null);
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) { }
      currentSourceRef.current.disconnect();
      currentSourceRef.current = null;
    }

    const websocket = new WebSocket(
      `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
    );

    websocket.onopen = async () => {
      setIsConnected(true);
      sendMessage(websocket, {
        type: "conversation_initiation_client_data",
        generation_config: {
          output_format: "pcm_16000"
        }
      });
      console.log("Sent conversation_initiation_client_data with output_format: pcm_16000");
      await startStreaming();
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data) as ElevenLabsWebSocketEvent;

      if (data.type === "ping") {
        setTimeout(() => {
          sendMessage(websocket, {
            type: "pong",
            event_id: data.ping_event.event_id,
          });
        }, data.ping_event.ping_ms);
      }

      if (data.type === "user_transcript") {
        const { user_transcription_event } = data;
        if (user_transcription_event.user_transcript) {
          setConversationHistory(prev => [
            ...prev,
            {
              speaker: 'user',
              text: user_transcription_event.user_transcript,
              timestamp: new Date(),
            }
          ]);
        }
        console.log(
          "User transcript",
          user_transcription_event.user_transcript
        );
      }

      if (data.type === "agent_response") {
        const { agent_response_event } = data;
        if (agent_response_event.agent_response) {
          setConversationHistory(prev => [
            ...prev,
            {
              speaker: 'agent',
              text: agent_response_event.agent_response,
              timestamp: new Date(),
            }
          ]);
        }
        console.log("Agent response", agent_response_event.agent_response);
      }

      if (data.type === "interruption") {
      }

      if (data.type === "audio") {
        const { audio_event } = data;
        if (audio_event.audio_base_64 && audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            console.log(
              "Received audio chunk (base64 preview):",
              audio_event.audio_base_64.substring(0, 30) + "...",
              "Event ID:", audio_event.event_id
            );
            const binaryString = window.atob(audio_event.audio_base_64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const receivedBuffer = bytes.buffer;
            console.log("Decoded ArrayBuffer length:", receivedBuffer.byteLength);
            audioQueueRef.current.push(receivedBuffer);
            playNextInQueue();
          } catch (e) {
            console.error("Error processing audio event:", e);
          }
        }
      }
    };
    
    websocket.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("WebSocket connection error. Please try again.");
      setIsConnected(false);
      stopStreaming();
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch (e) { }
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
      }
      audioQueueRef.current = [];
      setIsPlayingAudio(false);
      isProcessingQueueRef.current = false;
    };

    websocketRef.current = websocket;

    websocket.onclose = async () => {
      if (!error && !websocketRef.current?.OPEN) {
      }
      websocketRef.current = null;
      setIsConnected(false);
      stopStreaming();
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) { }
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
      }
      audioQueueRef.current = [];
      isProcessingQueueRef.current = false;
    };
  }, [startStreaming, isConnected, stopStreaming, playNextInQueue, interruptAgentPlayback]);


  const stopConversation = useCallback(async () => {
    interruptAgentPlayback();

    if (!websocketRef.current) return;
    websocketRef.current.close();
  }, [interruptAgentPlayback]);


  useEffect(() => {
    if (typeof window !== "undefined" && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) { }
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
      }
      audioQueueRef.current = [];
      isProcessingQueueRef.current = false;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    startConversation,
    stopConversation,
    isConnected,
    isPlayingAudio,
    conversationHistory,
    error,
  };
};
