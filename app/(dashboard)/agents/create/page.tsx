"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Bot, Mic, Brain, Settings, Save, ArrowLeft, Play, Pause, Loader2, ListChecks, XCircle, ExternalLink } from "lucide-react" // Added ListChecks, XCircle, ExternalLink
import { useRouter, useSearchParams } from "next/navigation"
import type { ElevenLabsVoice, ElevenLabsAgentDetails, AgentDataFromUI, EvaluationCriterion } from "@/lib/elevenlabs/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CreateAgentPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentIdToEdit = searchParams.get("id");
  const isEditMode = !!agentIdToEdit;

  const [isLoadingPage, setIsLoadingPage] = useState(isEditMode);
  const [pageError, setPageError] = useState<string | null>(null);
  const [agentData, setAgentData] = useState<AgentDataFromUI>({
    name: "",
    language: "en",
    voice_id: "",
    instructions: "",
    firstMessage: "",
    evaluation_criteria: [], // Initialize evaluation criteria
    passing_score: 0,
    // kb_name and kb_text are handled by specific state now
    // knowledge_base_text_entry will be part of the final payload
    category_id: "",
  });
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [voiceLoadingError, setVoiceLoadingError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentPreviewAudio, setCurrentPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // State for Knowledge Base Text Input
  const [kbNameInput, setKbNameInput] = useState("");
  const [kbTextInput, setKbTextInput] = useState("");
  const [currentKbEntry, setCurrentKbEntry] = useState<{ id: string; name: string; type: "text" } | null>(null);
  const [isAddingKb, setIsAddingKb] = useState(false);
  const [addKbError, setAddKbError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoadingVoices(true);
      setVoiceLoadingError(null);
      try {
        const response = await fetch("/api/voices"); 
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch voices");
        }
        const voices = await response.json();
        setElevenLabsVoices(voices);
      } catch (error) {
        console.error("Error fetching ElevenLabs voices:", error);
        setVoiceLoadingError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: orgUserData } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      if (orgUserData) {
        const response = await fetch(`/api/admin/categories?organizationId=${orgUserData.organization_id}`);
        const data = await response.json();
        setCategories(data);
      }
    }
  };

  // Effect to fetch agent data if in edit mode, or default prompt for new agents
  useEffect(() => {
    const fetchDefaultPrompt = async () => {
      try {
        const response = await fetch('/api/get-default-prompt');
        if (!response.ok) {
          throw new Error('Failed to fetch default prompt');
        }
        const data = await response.json();
        setAgentData(prev => ({ ...prev, instructions: data.prompt }));
      } catch (error) {
        console.error("Error fetching default prompt:", error);
        toast.error("Could not load default prompt.");
        // Set a fallback prompt
        setAgentData(prev => ({ ...prev, instructions: "You are a helpful assistant." }));
      }
    };

    fetchDefaultPrompt();

    if (isEditMode && agentIdToEdit) {
      const fetchAgentToEdit = async () => {
        setIsLoadingPage(true);
        setPageError(null);
        try {
          const response = await fetch(`/api/agents/${agentIdToEdit}`);
          if (!response.ok) {
            let errorMsg = `Failed to fetch agent details for ID ${agentIdToEdit}`;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || errorMsg;
            } catch (e) { /* ignore if error response is not json */ }
            throw new Error(errorMsg);
          }
          const fetchedAgentData: AgentDataFromUI = await response.json();

          setAgentData(prev => ({
            ...prev,
            name: fetchedAgentData.name || "",
            language: fetchedAgentData.language || "en",
            voice_id: fetchedAgentData.voice_id || "",
            firstMessage: fetchedAgentData.firstMessage || "",
            evaluation_criteria: fetchedAgentData.evaluation_criteria || [],
            cover_image: fetchedAgentData.cover_image,
            passing_score: fetchedAgentData.passing_score || 0,
            category_id: fetchedAgentData.category_id,
          }));

          if (fetchedAgentData.cover_image) {
            // This is a simplified example. In a real app, you'd fetch a signed URL
            // from your backend to display the image securely.
            const { data, error } = await supabase.storage.from('lessons').createSignedUrl(fetchedAgentData.cover_image, 60); // 60 seconds expiry
            if (error) {
              console.error("Error creating signed URL for cover image:", error);
            } else {
              setCoverImageUrl(data.signedUrl);
            }
          }

          const textKbToLoad = fetchedAgentData.knowledge_base_text_entry;

          if (textKbToLoad) {
            setCurrentKbEntry(textKbToLoad);
            setKbNameInput(textKbToLoad.name);

            try {
              console.log(`Fetching text content for KB item ID: ${textKbToLoad.id}`);
              const kbTextResponse = await fetch(`/api/knowledge-base/text/${textKbToLoad.id}`);
              if (kbTextResponse.ok) {
                const kbTextData = await kbTextResponse.json();
                if (kbTextData && typeof kbTextData.text === 'string') {
                  setKbTextInput(kbTextData.text);
                } else {
                  console.warn(`KB text content not found for item ID: ${textKbToLoad.id}`);
                }
              } else {
                console.error(`Failed to fetch KB text content for item ID: ${textKbToLoad.id}`);
              }
            } catch (kbTextErr) {
              console.error(`Error fetching KB text content for item ID: ${textKbToLoad.id}`, kbTextErr);
            }
          }
        } catch (err) {
          console.error("Error fetching agent details for edit:", err);
          setPageError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
          setIsLoadingPage(false);
        }
      };
      fetchAgentToEdit();
    } else {
      setAgentData(prev => ({ ...prev, evaluation_criteria: prev.evaluation_criteria || [] }));
    }
  }, [isEditMode, agentIdToEdit]);

  const handleAddCriterion = () => {
    setAgentData(prev => ({
      ...prev,
      evaluation_criteria: [
        ...(prev.evaluation_criteria || []),
        { id: "", name: "", type: "prompt", conversation_goal_prompt: "", use_knowledge_base: true }
      ]
    }));
  };

  const handleRemoveCriterion = (index: number) => {
    setAgentData(prev => ({
      ...prev,
      evaluation_criteria: (prev.evaluation_criteria || []).filter((_, i) => i !== index)
    }));
  };

  const handleCriterionChange = (index: number, field: keyof EvaluationCriterion, value: string | boolean) => {
    setAgentData(prev => {
      const updatedCriteria = [...(prev.evaluation_criteria || [])];
      const criterionToUpdate = { ...updatedCriteria[index] };

      if (field === 'name') {
        criterionToUpdate.name = value as string;
        criterionToUpdate.id = value as string; // Set id to name
      } else if (field === 'conversation_goal_prompt') {
        criterionToUpdate.conversation_goal_prompt = value as string;
      } else if (field === 'use_knowledge_base') {
        // This field is not directly editable in this UI iteration but handler supports it
        criterionToUpdate.use_knowledge_base = value as boolean;
      }
      // 'type' is fixed to "prompt" and not changed here

      updatedCriteria[index] = criterionToUpdate;
      return { ...prev, evaluation_criteria: updatedCriteria };
    });
  };

  // Effect to clean up audio when voice selection changes or component unmounts
  useEffect(() => {
    return () => {
      if (currentPreviewAudio) {
        currentPreviewAudio.pause();
        setCurrentPreviewAudio(null);
        setIsPlayingPreview(false);
      }
    };
  }, [currentPreviewAudio]);

  // Effect to stop audio if selected voice changes
  useEffect(() => {
    if (currentPreviewAudio) {
      currentPreviewAudio.pause();
      setIsPlayingPreview(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentData.voice_id]);


  const handleTestVoice = () => {
    const selectedVoice = elevenLabsVoices.find(v => v.voice_id === agentData.voice_id);
    if (!selectedVoice || !selectedVoice.preview_url) {
      console.warn("No preview URL for selected voice:", selectedVoice);
      return;
    }

    if (currentPreviewAudio && currentPreviewAudio.src === selectedVoice.preview_url) {
      if (isPlayingPreview) {
        currentPreviewAudio.pause();
        setIsPlayingPreview(false);
      } else {
        currentPreviewAudio.play().catch(err => console.error("Error playing audio:", err));
        setIsPlayingPreview(true);
      }
    } else {
      if (currentPreviewAudio) {
        currentPreviewAudio.pause();
      }
      
      const newAudio = new Audio(selectedVoice.preview_url);
      setCurrentPreviewAudio(newAudio);
      setIsPlayingPreview(true);
      newAudio.play().catch(err => console.error("Error playing new audio:", err));

      newAudio.onended = () => {
        setIsPlayingPreview(false);
      };
      newAudio.onerror = (err) => {
        console.error("Audio playback error:", err);
        setIsPlayingPreview(false);
        setCurrentPreviewAudio(null);
      };
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const formData = new FormData();
    formData.append('name', agentData.name);
    formData.append('language', agentData.language);
    formData.append('voice_id', agentData.voice_id);
    formData.append('instructions', agentData.instructions);
    formData.append('firstMessage', agentData.firstMessage);
    formData.append('evaluation_criteria', JSON.stringify(agentData.evaluation_criteria || []));
    formData.append('passing_score', (agentData.passing_score || 0).toString());
    if (agentData.category_id) {
      formData.append('category_id', agentData.category_id);
    }
    if (coverImage) {
      formData.append('cover_image', coverImage);
    }
    
    const apiPath = isEditMode ? `/api/agents/${agentIdToEdit}` : "/api/agents/create";
    const httpMethod = isEditMode ? "PATCH" : "POST";

    try {
      const response = await fetch(apiPath, {
        method: httpMethod,
        body: formData, // No 'Content-Type' header, browser sets it for FormData
      });

      if (!response.ok) {
        let errorMsg = `Failed to ${isEditMode ? 'update' : 'create'} agent (status: ${response.status})`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.details || errorMsg;
        } catch(e) { /* ignore if error response is not json */ }
        throw new Error(errorMsg);
      }

      // router.push("/agents"); // Removed redirection as per user feedback
      // router.push("/agents"); // Removed redirection as per user feedback
      if(!isEditMode) {
        router.push("/agents"); // Redirect to the edited agent's page
      }
      const successMessage = `Lesson ${isEditMode ? 'updated' : 'created'} successfully.`;
      toast.success(successMessage);
      console.log(successMessage);
    } catch (error) {
      console.error("Error saving agent:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while saving.";
      toast.error(errorMessage);
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKbText = async () => {
    if (!kbNameInput.trim() || !kbTextInput.trim()) {
      toast.error("Knowledge base name and text cannot be empty.");
      setAddKbError("Name and text are required.");
      return;
    }
    setIsAddingKb(true);
    setAddKbError(null);
    try {
      const response = await fetch("/api/knowledge-base/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: kbNameInput, text: kbTextInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add text to knowledge base");
      }
      const result = await response.json();
      setCurrentKbEntry({ id: result.id, name: result.name, type: "text" });
      toast.success(`Knowledge base text "${result.name}" added/updated.`);
      // Optionally clear inputs after successful add, or user can edit and re-submit
      // setKbNameInput("");
      // setKbTextInput("");
    } catch (error) {
      console.error("Error adding KB text:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(message);
      setAddKbError(message);
    } finally {
      setIsAddingKb(false);
    }
  };
  
  if (isLoadingPage && isEditMode) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6 justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <p>Loading lesson details...</p>
      </div>
    );
  }

  if (pageError && isEditMode) {
     return (
      <div className="flex flex-1 flex-col gap-6 p-6 justify-center items-center">
        <p className="text-destructive">Error: {pageError}</p>
        <Button onClick={() => router.push("/agents")}>Back to Lessons</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader
        title={isEditMode ? "Edit Lesson" : "Create Lesson"}
        description={isEditMode ? "Modify your conversational AI lesson" : "Build your conversational AI lesson"}
      />

      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/agents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lessons
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{isEditMode ? `Editing: ${agentData.name || 'Lesson'} (${agentIdToEdit})` : "New Lesson"}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Configure your lesson's basic details and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Lesson Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Support Assistant"
                    value={agentData.name}
                    onChange={(e) => setAgentData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={agentData.language}
                    onValueChange={(value) => setAgentData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      {/* Add other languages as needed */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing_score">Passing Score (%)</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    placeholder="e.g., 80"
                    value={agentData.passing_score ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      let numericValue = value === "" ? null : parseFloat(value);
                      if (numericValue !== null) {
                        if (numericValue > 100) numericValue = 100;
                        if (numericValue < 0) numericValue = 0;
                      }
                      setAgentData(prev => ({ ...prev, passing_score: numericValue }));
                    }}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={agentData.category_id}
                    onValueChange={(value) => setAgentData(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
               <div className="space-y-2">
                 <Label htmlFor="cover-image">Cover Image</Label>
                 <Input
                   id="cover-image"
                   type="file"
                   accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setCoverImage(file);
                        setCoverImageUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                 {coverImageUrl && (
                   <div className="mt-4">
                     <img src={coverImageUrl} alt="Cover preview" className="w-full h-auto rounded-md" />
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>

          {/* Voice Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Configuration
              </CardTitle>
              <CardDescription>Choose how your lesson sounds when speaking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice">Voice Model</Label>
                <Select
                  value={agentData.voice_id}
                  onValueChange={(value) => setAgentData(prev => ({ ...prev, voice_id: value }))}
                  disabled={isLoadingVoices || !!voiceLoadingError}
                >
                  <SelectTrigger id="voice">
                    <SelectValue placeholder={isLoadingVoices ? "Loading voices..." : (voiceLoadingError ? "Error loading voices" : "Select a voice for your lesson")} />
                  </SelectTrigger>
                  <SelectContent>
                    {!isLoadingVoices && !voiceLoadingError && elevenLabsVoices.length > 0 ? (
                      elevenLabsVoices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}
                        </SelectItem>
                      ))
                    ) : !isLoadingVoices && elevenLabsVoices.length === 0 ? (
                      <SelectItem value="no-voices" disabled>
                        No voices available
                      </SelectItem>
                    ) : null}
                    {voiceLoadingError && (
                       <SelectItem value="error" disabled>
                         Error: {voiceLoadingError}
                       </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {voiceLoadingError && <p className="text-xs text-destructive">{voiceLoadingError}</p>}
              </div>
              {agentData.voice_id && !isLoadingVoices && !voiceLoadingError && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      Preview: "{elevenLabsVoices.find(v => v.voice_id === agentData.voice_id)?.name || agentData.voice_id}"
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestVoice}
                      disabled={!agentData.voice_id || !elevenLabsVoices.find(v => v.voice_id === agentData.voice_id)?.preview_url}
                    >
                      {isPlayingPreview && currentPreviewAudio?.src === elevenLabsVoices.find(v => v.voice_id === agentData.voice_id)?.preview_url ? (
                        <Pause className="mr-2 h-4 w-4" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Test Voice
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personality & Behavior */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Personality & Behavior
              </CardTitle>
              <CardDescription>Define how your lesson thinks and responds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="firstMessage">First Message</Label>
                <p className="text-sm text-muted-foreground">
                  The first message the lesson will say. If empty, the lesson will wait for the user to start the conversation.
                </p>
                <Textarea
                  id="firstMessage"
                  placeholder="e.g. 'Hello! I'm your virtual assistant. How can I help you today?'"
                  value={agentData.firstMessage}
                  onChange={(e) => setAgentData(prev => ({ ...prev, firstMessage: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>


              {/* <div className="space-y-2">
                <Label htmlFor="instructions">System Prompt</Label>
                <p className="text-sm text-muted-foreground">
                  The system prompt is used to determine the persona of the lesson and the context of the conversation.
                </p>
                <Textarea
                  id="instructions"
                  placeholder="Specific instructions for how the lesson should behave, what it should and shouldn't do..."
                  value={agentData.instructions}
                  onChange={(e) => setAgentData(prev => ({ ...prev, instructions: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div> */}

              {/* Knowledge Base Text Section */}
              {isEditMode && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Knowledge Base</Label>
                  {/* <p className="text-sm text-muted-foreground">
                    Add or update a single text-based knowledge item for your lesson. This will be stored on ElevenLabs.
                  </p> */}
                  {currentKbEntry && (
                    <Badge variant="outline" className="flex items-center gap-2 py-2 px-3">
                      <Brain className="h-4 w-4" />
                      Current Text KB: {currentKbEntry.name} (ID: {currentKbEntry.id})
                    </Badge>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="kbName">Text Name</Label>
                    <Input
                      id="kbName"
                      placeholder="Enter a name for your text"
                      value={kbNameInput}
                      onChange={(e) => setKbNameInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kbText">Text Content</Label>
                    <Textarea
                      id="kbText"
                      placeholder="Enter the text content here"
                      value={kbTextInput}
                      onChange={(e) => setKbTextInput(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button onClick={handleAddKbText} disabled={isAddingKb || !kbNameInput.trim() || !kbTextInput.trim()}>
                    {isAddingKb ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {currentKbEntry && currentKbEntry.name === kbNameInput ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {currentKbEntry && currentKbEntry.name === kbNameInput ? "Update" : "Save"} Text
                      </>
                    )}
                  </Button>
                  {addKbError && <p className="text-sm text-destructive">{addKbError}</p>}
                  {/* <p className="text-xs text-muted-foreground">
                    Clicking this button calls the ElevenLabs API directly to store the text. The lesson will use the latest successfully added/updated entry upon saving the lesson.
                  </p> */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evaluation Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Evaluation Criteria
              </CardTitle>
              <CardDescription>Define criteria to evaluate the lesson's performance. The 'name' will be used as the 'id'.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(agentData.evaluation_criteria || []).map((criterion, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-md relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => handleRemoveCriterion(index)}
                    aria-label="Remove criterion"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <div className="space-y-1">
                    <Label htmlFor={`criterion-name-${index}`}>Criterion Name</Label>
                    <Input
                      id={`criterion-name-${index}`}
                      value={criterion.name}
                      onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                      placeholder="e.g., Followed Instructions"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`criterion-prompt-${index}`}>Evaluation Prompt</Label>
                    <Textarea
                      id={`criterion-prompt-${index}`}
                      value={criterion.conversation_goal_prompt}
                      onChange={(e) => handleCriterionChange(index, 'conversation_goal_prompt', e.target.value)}
                      placeholder="e.g., Did the lesson correctly follow all instructions in the system prompt?"
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddCriterion} className="w-full">
                Add Evaluation Criterion
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Lesson Settings</CardTitle>
              <CardDescription>Fine-tune your lesson's behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Lesson Status</h4>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isEditMode ? "Currently live" : "Not yet published"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditMode ? "Update Lesson" : "Save Lesson"}
                    </>
                  )}
                </Button>
                {saveError && <p className="text-sm text-destructive mt-2">{saveError}</p>}
              </div>
              {isEditMode && agentIdToEdit && (
                <div className="space-y-2 mt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`/talk/${agentIdToEdit}`, '_blank')}
                  >
                    <Play className="mr-2 h-4 w-4" /> {/* Changed Icon */}
                    Test Lesson
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
