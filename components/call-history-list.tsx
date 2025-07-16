"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Clock, Bot, Loader2, ChevronDown, ChevronRight, Play, Download, MessageSquareText, Info } from "lucide-react";
import { CallHistoryConversation, DetailedConversation, TranscriptEntry } from "@/lib/elevenlabs/api"; // Import DetailedConversation and TranscriptEntry

interface CallHistoryListProps {
  conversations: CallHistoryConversation[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

const formatUnixTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

export function CallHistoryList({ conversations, isLoading, hasMore, loadMore }: CallHistoryListProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  
  // State for audio
  const [audioSrcMap, setAudioSrcMap] = useState<Record<string, string>>({});
  const [audioLoadingMap, setAudioLoadingMap] = useState<Record<string, boolean>>({});
  
  // State for detailed conversation data
  const [detailsMap, setDetailsMap] = useState<Record<string, DetailedConversation>>({});
  const [detailsLoadingMap, setDetailsLoadingMap] = useState<Record<string, boolean>>({});

  const fetchAudio = async (conversationId: string) => {
    if (audioSrcMap[conversationId] || audioLoadingMap[conversationId]) return;
    setAudioLoadingMap(prev => ({ ...prev, [conversationId]: true }));
    try {
      const response = await fetch(`/api/call-history/${conversationId}/audio`);
      if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      setAudioSrcMap(prev => ({ ...prev, [conversationId]: objectURL }));
    } catch (error) {
      console.error(`Error fetching audio for ${conversationId}:`, error);
    } finally {
      setAudioLoadingMap(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  const fetchDetails = async (conversationId: string) => {
    if (detailsMap[conversationId] || detailsLoadingMap[conversationId]) return;
    setDetailsLoadingMap(prev => ({ ...prev, [conversationId]: true }));
    try {
      const response = await fetch(`/api/call-history/${conversationId}/details`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch details"}));
        throw new Error(errorData.message || `Details fetch failed: ${response.status}`);
      }
      const data: DetailedConversation = await response.json();
      setDetailsMap(prev => ({ ...prev, [conversationId]: data }));
    } catch (error) {
      console.error(`Error fetching details for ${conversationId}:`, error);
    } finally {
      setDetailsLoadingMap(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  const toggleExpanded = (conversationId: string) => {
    const isOpening = expandedCallId !== conversationId;
    setExpandedCallId(isOpening ? conversationId : null);
    if (isOpening) {
      // Fetch both audio and details when expanding
      fetchAudio(conversationId);
      fetchDetails(conversationId);
    }
  };
  
  useEffect(() => {
    return () => {
      Object.values(audioSrcMap).forEach(URL.revokeObjectURL);
    };
  }, [audioSrcMap]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading lesson history...</p>
      </div>
    );
  }

  if (!isLoading && conversations.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Lesson History</CardTitle><CardDescription>No calls found.</CardDescription></CardHeader>
        <CardContent><p>Try adjusting your filters or check back later.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson History</CardTitle>
        <CardDescription>Your recent conversations. Click to expand for details, transcription, and audio.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conversations.map((call) => {
            const currentDetails = detailsMap[call.conversation_id];
            const isLoadingDetails = detailsLoadingMap[call.conversation_id];
            const isLoadingAudio = audioLoadingMap[call.conversation_id];
            const currentAudioSrc = audioSrcMap[call.conversation_id];

            return (
              <Collapsible 
                key={call.conversation_id} 
                open={expandedCallId === call.conversation_id} 
                onOpenChange={() => toggleExpanded(call.conversation_id)}
              >
                <Card className={`border-l-4 ${call.call_successful === "success" ? "border-l-green-500" : "border-l-red-500"}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      {/* ... (existing CardHeader content for summary row - no changes here) ... */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-1 sm:pt-0">
                            {expandedCallId === call.conversation_id ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-base">{call.agent_name || "Unknown Agent"}</h3>
                              <Badge
                                variant={
                                  call.status === "completed" || call.status === "ended"
                                    ? "default"
                                    : call.status === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {call.status}
                              </Badge>
                              {call.call_successful !== "success" && (
                                <Badge variant="outline" className="text-xs">
                                  Not Successful
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              Conv ID: {call.conversation_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-3 sm:mt-0 sm:text-right flex-shrink-0 pl-8 sm:pl-0">
                          <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{formatDuration(call.call_duration_secs)}</span>
                          </div>
                          <p className="mt-0.5">{formatUnixTimestamp(call.start_time_unix_secs)}</p>
                          <div className="flex items-center gap-1 mt-0.5 justify-start sm:justify-end">
                            <Bot className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]" title={call.agent_id}>Lesson ID: {call.agent_id}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2 pb-4 text-sm">
                      {isLoadingDetails && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <p className="ml-2">Loading details...</p>
                        </div>
                      )}
                      {!isLoadingDetails && currentDetails && (
                        <Tabs defaultValue="overview" className="w-full mt-2">
                          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                            <TabsTrigger value="overview"><Info className="mr-1 h-4 w-4 inline-block"/>Overview</TabsTrigger>
                            <TabsTrigger value="transcription"><MessageSquareText className="mr-1 h-4 w-4 inline-block"/>Transcription</TabsTrigger>
                            <TabsTrigger value="audio"><Play className="mr-1 h-4 w-4 inline-block"/>Audio</TabsTrigger>
                          </TabsList>
                          <TabsContent value="overview" className="mt-4">
                            <h5 className="font-semibold mb-2 text-base">Overview</h5>
                            <div className="space-y-1">
                              <p><span className="font-medium">Summary:</span> {currentDetails.analysis?.transcript_summary || "Not available"}</p>
                              <p><span className="font-medium">Call Successful:</span> {currentDetails.analysis?.call_successful.toUpperCase() || "N/A"}</p>
                              <p><span className="font-medium">Status:</span> {currentDetails.status.toUpperCase()}</p>
                              <p><span className="font-medium">Message Count:</span> {call.message_count}</p>
                            </div>
                          </TabsContent>
                          <TabsContent value="transcription" className="mt-4">
                            <h5 className="font-semibold mb-2 text-base">Transcription</h5>
                            {currentDetails.transcript && currentDetails.transcript.length > 0 ? (
                              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                                {currentDetails.transcript.map((entry: TranscriptEntry, index: number) => (
                                  <div key={index} className={`flex gap-2 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}> {/* Swapped alignment */}
                                    <div className={`p-2 rounded-lg max-w-[80%] ${entry.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                      <p className="text-xs font-medium mb-0.5 capitalize">{entry.role} <span className="text-muted-foreground/80">({entry.time_in_call_secs}s)</span></p>
                                      <p className="text-sm">{entry.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p>No transcription available.</p>
                            )}
                          </TabsContent>
                          <TabsContent value="audio" className="mt-4">
                            <h5 className="font-semibold mb-2 text-base">Audio Recording</h5>
                            {isLoadingAudio && (
                              <div className="flex items-center justify-center my-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <p className="ml-2 text-sm">Loading audio...</p>
                              </div>
                            )}
                            {currentAudioSrc && !isLoadingAudio && (
                              <div className="my-2">
                                <audio controls src={currentAudioSrc} className="w-full">
                                  Your browser does not support the audio element.
                                </audio>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = currentAudioSrc;
                                        link.download = `conversation_${call.conversation_id}.mp3`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download Audio
                                </Button>
                              </div>
                            )}
                            {!currentAudioSrc && !isLoadingAudio && expandedCallId === call.conversation_id && (
                               <p className="text-xs text-muted-foreground my-4">Could not load audio or no audio available.</p>
                            )}
                          </TabsContent>
                        </Tabs>
                      )}
                      {!isLoadingDetails && !currentDetails && expandedCallId === call.conversation_id && (
                        <p className="text-muted-foreground py-4">Could not load conversation details.</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button onClick={loadMore} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
