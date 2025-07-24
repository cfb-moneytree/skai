"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import MicStream from 'microphone-stream';

interface UseMicrophoneStreamProps {
  onAudioChunked: (chunk: ArrayBuffer) => void;
}

export const useMicrophoneStream = ({ onAudioChunked }: UseMicrophoneStreamProps) => {
  const micStreamRef = useRef<MicStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startStreaming = useCallback(async () => {
    if (isStreaming || micStreamRef.current) {
      console.warn("Streaming is already active.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const micStream = new MicStream({
        stream,
        objectMode: true, // Output Buffer objects which we'll convert
        bufferSize: 1024
      });

      (micStream as any).on('data', (chunk: Buffer) => {
        // The hook's consumer expects an ArrayBuffer
        onAudioChunked(new Uint8Array(chunk).buffer);
      });

      (micStream as any).on('error', (error: Error) => {
        console.error("Microphone stream error:", error);
        // Consider adding state to propagate error to the UI
      });

      micStreamRef.current = micStream;
      setIsStreaming(true);
    } catch (error) {
      console.error("Failed to get user media or initialize microphone stream:", error);
      throw error; // Re-throw to be caught by the calling component
    }
  }, [isStreaming, onAudioChunked]);

  const stopStreaming = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.stop();
      micStreamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.stop();
      }
    };
  }, []);

  return { startStreaming, stopStreaming, isStreaming };
};