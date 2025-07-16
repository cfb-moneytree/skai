"use client"

import { useParams } from 'next/navigation'
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from 'next/link'
import { ArrowLeft, Trash2, Loader2, FileImage, AlertCircle, CheckCircle, ArrowUp, ArrowDown, Save, ExternalLink } from 'lucide-react' // Added ExternalLink
import React, { useEffect, useState, ChangeEvent, useCallback } from 'react'
// Script, useRef, Suspense, PlayCircle removed
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { User } from '@supabase/supabase-js'; // Using User type from core supabase-js
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid'

interface UISlide {
  id: string | null; // Database ID (UUID string) once saved, null for new slides
  client_temp_id: string; // Always present, client-side unique ID (e.g., uuidv4())
  title: string; // Auto-generated: "Slide 1", "Slide 2", etc.
  slide_order: number;

  content_type: 'image_text' | 'video'; // New: Default to 'image_text'

  // Existing image fields (used if content_type is 'image_text')
  imageFile: File | null;
  imagePreviewUrl: string | null;
  image_path: string | null;
  talking_points: string;

  // New video fields (used if content_type is 'video')
  videoFile: File | null;
  videoPreviewUrl: string | null; // For local preview
  video_path: string | null; // DB stored video path
  // Add a slide-specific error field for video validation if needed
  // videoError?: string | null;
}

const MAX_IMAGE_SIZE_MB = 2; // Changed from 10MB to 2MB
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const MAX_SLIDE_VIDEO_SIZE_MB = 50;
const MAX_SLIDE_VIDEO_SIZE_BYTES = MAX_SLIDE_VIDEO_SIZE_MB * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']; // .mov is video/quicktime
const ACCEPTED_VIDEO_EXTENSIONS = ".mp4,.mov";

export default function AgentLessonsPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  // Initialize Supabase client once, similar to SettingsPage
  const supabase = useState(() => createSupabaseBrowserClient())[0];
  const [user, setUser] = useState<User | null>(null);

  const [slides, setSlides] = useState<UISlide[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);

  // All state and refs for live lesson view are fully removed.

  const fetchUser = useCallback(async () => {
    console.log("AgentLessonsPage - fetchUser: CALLED"); // Log when fetchUser starts
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("AgentLessonsPage - fetchUser - Supabase auth error:", userError);
      }
      console.log("AgentLessonsPage - fetchUser - currentUser from Supabase:", currentUser); // Log result
      setUser(currentUser);
    } catch (e) {
      console.error("AgentLessonsPage - fetchUser - Exception during getUser:", e);
    }
  }, [supabase.auth]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);


  const updateSlideTitlesAndOrder = useCallback((currentSlides: UISlide[]): UISlide[] => {
    return currentSlides.map((slide, index) => ({
      ...slide,
      title: `Slide ${index + 1}`,
      slide_order: index,
    }));
  }, []);

  const fetchLessonSlides = useCallback(async () => {
    if (!agentId) return;
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/agents/${agentId}/lessons`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch lesson slides");
      }
      // Define the expected shape of slide data from the API
      interface ApiSlideData {
        id: string;
        title: string;
        slide_order: number;
        content_type: 'image_text' | 'video';
        image_path: string | null;
        signed_image_url?: string | null;
        talking_points: string;
        video_path: string | null;
        signed_video_url?: string | null;
      }
      const data: ApiSlideData[] = await response.json();
      
      const newSlides = data.map((s): UISlide => ({
        id: s.id,
        client_temp_id: s.id, // Use DB id as client_temp_id when fetching
        title: s.title, // Will be overwritten by updateSlideTitlesAndOrder
        slide_order: s.slide_order, // Will be overwritten by updateSlideTitlesAndOrder
        content_type: s.content_type || 'image_text', // Default if API somehow doesn't send
        imageFile: null,
        imagePreviewUrl: s.signed_image_url || null,
        image_path: s.image_path,
        talking_points: s.talking_points || "", // Ensure talking_points is not null
        videoFile: null,
        videoPreviewUrl: s.signed_video_url || null, // For displaying existing video if API provides a preview URL
        video_path: s.video_path || null,
      }));
      setSlides(updateSlideTitlesAndOrder(newSlides));
      setIsDirty(false);
    } catch (err) {
      console.error("Error fetching lesson slides:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while fetching slides.");
    } finally {
      setIsProcessing(false);
    }
  }, [agentId, updateSlideTitlesAndOrder]);

  useEffect(() => {
    fetchLessonSlides();
  }, [fetchLessonSlides]);

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // All useEffects related to live lesson view are fully removed.

  const handleAddSlide = () => {
    setError(null);
    setSuccessMessage(null);
    const newSlideClientTempId = uuidv4();
    const newSlide: UISlide = {
      id: null,
      client_temp_id: newSlideClientTempId,
      title: "", // Will be set by updateSlideTitlesAndOrder
      slide_order: slides.length, // Tentative order
      content_type: 'image_text', // Default for new slides
      imageFile: null,
      imagePreviewUrl: null,
      image_path: null,
      talking_points: "",
      videoFile: null,
      videoPreviewUrl: null,
      video_path: null,
    };
    setSlides(prevSlides => updateSlideTitlesAndOrder([...prevSlides, newSlide]));
    setActiveAccordionItem(newSlideClientTempId);
    setIsDirty(true);
  };

  const handleDeleteSlide = (clientTempIdToDelete: string) => {
    setError(null);
    setSuccessMessage(null);
    setSlides(prevSlides => {
      const filtered = prevSlides.filter(slide => slide.client_temp_id !== clientTempIdToDelete);
      return updateSlideTitlesAndOrder(filtered);
    });
    setIsDirty(true);
  };

  const handleImageChange = (clientTempId: string, e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError(`Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit.`);
        return;
      }
      if (!['image/png', 'image/jpeg'].includes(file.type)) { // Removed GIF
        setError('Invalid image type. Please use PNG or JPEG.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSlides(prevSlides =>
          updateSlideTitlesAndOrder(prevSlides.map(slide =>
            slide.client_temp_id === clientTempId
              ? { ...slide, imageFile: file, imagePreviewUrl: reader.result as string, image_path: null } // Reset image_path
              : slide
          ))
        );
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTalkingPointsChange = (clientTempId: string, newTalkingPoints: string) => {
    setSlides(prevSlides =>
      updateSlideTitlesAndOrder(prevSlides.map(slide =>
        slide.client_temp_id === clientTempId ? { ...slide, talking_points: newTalkingPoints } : slide
      ))
    );
    setIsDirty(true);
  };

  const handleReorderSlide = (clientTempId: string, direction: 'up' | 'down') => {
    setSlides(prevSlides => {
      const index = prevSlides.findIndex(s => s.client_temp_id === clientTempId);
      if (index === -1) return prevSlides;

      const newSlides = [...prevSlides];
      if (direction === 'up' && index > 0) {
        [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];
      } else if (direction === 'down' && index < newSlides.length - 1) {
        [newSlides[index + 1], newSlides[index]] = [newSlides[index], newSlides[index + 1]];
      }
      return updateSlideTitlesAndOrder(newSlides);
    });
    setIsDirty(true);
  };

  const handleContentTypeChange = (clientTempId: string, newContentType: 'image_text' | 'video') => {
    setSlides(prevSlides =>
      updateSlideTitlesAndOrder(prevSlides.map(slide => {
        if (slide.client_temp_id === clientTempId) {
          // When switching, clear the data of the other content type
          if (newContentType === 'image_text') {
            return { ...slide, content_type: newContentType, videoFile: null, videoPreviewUrl: null, /* video_path will be handled by save */ };
          } else { // newContentType === 'video'
            return { ...slide, content_type: newContentType, imageFile: null, imagePreviewUrl: null, talking_points: "", /* image_path will be handled by save */ };
          }
        }
        return slide;
      }))
    );
    setIsDirty(true);
    setError(null); // Clear global error when user makes a choice
    setSuccessMessage(null);
  };

  const handleSlideVideoChange = (clientTempId: string, e: ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear global error first
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_SLIDE_VIDEO_SIZE_BYTES) {
        // Consider setting a slide-specific error in UISlide if you want per-slide errors
        setError(`Video size for this slide exceeds ${MAX_SLIDE_VIDEO_SIZE_MB}MB limit.`);
        // Clear the input
        e.target.value = "";
        setSlides(prevSlides =>
          updateSlideTitlesAndOrder(prevSlides.map(slide =>
            slide.client_temp_id === clientTempId ? {...slide, videoFile: null, videoPreviewUrl: null} : slide
          ))
        );
        return;
      }
      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        setError(`Invalid video type for this slide. Please use MP4 or MOV.`);
        e.target.value = "";
        setSlides(prevSlides =>
          updateSlideTitlesAndOrder(prevSlides.map(slide =>
            slide.client_temp_id === clientTempId ? {...slide, videoFile: null, videoPreviewUrl: null} : slide
          ))
        );
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSlides(prevSlides =>
          updateSlideTitlesAndOrder(prevSlides.map(slide =>
            slide.client_temp_id === clientTempId
              ? { ...slide, videoFile: file, videoPreviewUrl: reader.result as string, video_path: null } // Reset video_path
              : slide
          ))
        );
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const sanitizeTextForPdf = (text: string): string => {
    if (!text) return "";
    // This function now strictly sanitizes a string to be compatible with PDF-lib's standard fonts.
    // It replaces common special characters and removes *all* non-printable ASCII characters, including newlines.
    // Newline handling is now done separately in the main logic.
    let sanitized = text
      .replace(/[\u2018\u2019]/g, "'")   // Smart single quotes -> standard apostrophe
      .replace(/[\u201C\u201D]/g, '"')   // Smart double quotes -> standard double quote
      .replace(/[\u2013\u2014]/g, '-')   // En/em dashes -> standard hyphen
      .replace(/[\u2026]/g, '...') // Ellipsis -> three periods
      .replace(/[\u00A0]/g, ' ');  // Non-breaking space -> regular space

    // Remove any character that is not a printable ASCII character (code 32-126).
    // This is a strict filter to ensure font compatibility.
    sanitized = sanitized.replace(/[^\x20-\x7E]/g, '');

    return sanitized;
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
      const { error } = await supabase.storage
        .from('lessons')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true, // Use upsert to allow overwriting if needed
        });
      if (error) throw error;
      return path;
    } catch (uploadError) {
      console.error(`Error uploading file to ${path}:`, uploadError);
      throw new Error(`Failed to upload ${file.name} to cloud storage.`);
    }
  };

  const handleSaveSlides = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    if (!agentId || !user?.id) {
      setError("User not found or agentId missing. Please refresh.");
      setIsProcessing(false);
      return;
    }

    try {
      // Step 1: Generate PDF for ElevenLabs
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      if (slides.length === 0) {
        const page = pdfDoc.addPage();
        page.drawText("No slides in lesson.", { x: 50, y: page.getHeight() - 50, font: helveticaFont, size: 12 });
      } else {
        for (const slide of slides) {
          const page = pdfDoc.addPage();
          const { width, height } = page.getSize();
          const margin = 50;
          let currentY = height - margin;

          page.drawText(sanitizeTextForPdf(slide.title), { x: margin, y: currentY, font: helveticaFont, size: 18 });
          currentY -= 30;

          const talkingPointsForPdf = slide.content_type === 'video'
            ? "This is a video slide."
            : slide.talking_points.trim() || "(No talking points for this slide)";

          const paragraphs = talkingPointsForPdf.replace(/\r\n/g, '\n').split('\n');
          for (const paragraph of paragraphs) {
            const sanitizedParagraph = sanitizeTextForPdf(paragraph);
            if (sanitizedParagraph.trim() === '' && paragraph.length === 0) {
              currentY -= 12; // Simulate empty line
              continue;
            }
            const words = sanitizedParagraph.split(' ');
            let currentLine = '';
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (helveticaFont.widthOfTextAtSize(testLine, 10) > width - 2 * margin) {
                page.drawText(currentLine, { x: margin, y: currentY, font: helveticaFont, size: 10, lineHeight: 12 });
                currentY -= 12;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            page.drawText(currentLine, { x: margin, y: currentY, font: helveticaFont, size: 10, lineHeight: 12 });
            currentY -= 12;
          }
        }
      }
      const elevenLabsPdfBytes = await pdfDoc.save();

      // Step 2: Upload PDF to Supabase Storage
      const newPdfUuid = uuidv4();
      const elevenLabsPdfFileName = `lesson-${agentId}-${newPdfUuid}.pdf`;
      const elevenLabsPdfSupabasePath = `generated_pdfs/${elevenLabsPdfFileName}`;
      await uploadFile(new File([elevenLabsPdfBytes], elevenLabsPdfFileName, { type: 'application/pdf' }), elevenLabsPdfSupabasePath);

      // Step 3: Upload slide media and prepare payload
      const slidesPayload = await Promise.all(slides.map(async (slide) => {
        let image_path = slide.image_path;
        let video_path = slide.video_path;

        // If there's a new image file, upload it
        if (slide.content_type === 'image_text' && slide.imageFile) {
          const fileExt = slide.imageFile.name.split('.').pop() || 'png';
          const newImagePath = `slide_images/${agentId}/${slide.client_temp_id}.${fileExt}`;
          image_path = await uploadFile(slide.imageFile, newImagePath);
        }

        // If there's a new video file, upload it
        if (slide.content_type === 'video' && slide.videoFile) {
          const fileExt = slide.videoFile.name.split('.').pop() || 'mp4';
          const newVideoPath = `slide_videos/${agentId}/${slide.client_temp_id}.${fileExt}`;
          video_path = await uploadFile(slide.videoFile, newVideoPath);
        }

        return {
          id: slide.id,
          client_temp_id: slide.client_temp_id,
          title: slide.title,
          slide_order: slide.slide_order,
          content_type: slide.content_type,
          talking_points: slide.content_type === 'image_text' ? slide.talking_points : undefined,
          image_path: image_path,
          video_path: video_path,
        };
      }));

      // Step 4: Call Main Save API with JSON payload
      const mainSaveResponse = await fetch(`/api/agents/${agentId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides_data: slidesPayload,
          elevenlabs_pdf_supabase_path: elevenLabsPdfSupabasePath,
        }),
      });

      if (!mainSaveResponse.ok) {
        const errorData = await mainSaveResponse.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || "Failed to save lesson slides.");
      }

      // Step 5: Handle Response
      setSuccessMessage("Lesson slides saved successfully!");
      await fetchLessonSlides(); // Re-fetch to get DB IDs and set isDirty to false

    } catch (err) {
      console.error("Error saving slides:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during save.");
    } finally {
      setIsProcessing(false);
    }
  };


  if (!agentId) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader
        title={`Manage Lessons for Agent ${agentId}`}
        description="Create and arrange slides for this agent's lesson."
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lessons
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {slides.some(slide => slide.id !== null) && ( // Changed condition here
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/lesson/test-agent?id=${agentId}`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Test Lesson
            </Button>
          )}
          {isDirty && <span className="text-sm text-yellow-600">* Unsaved changes</span>}
        </div>
      </div>
      
      {/* Live Lesson View Area and all its contents (Suspense, Script, etc.) fully removed */}

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}
      {successMessage && (
         <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Lesson Slides</h2>
        
        <Accordion
            type="single"
            collapsible
            className="w-full space-y-2"
            value={activeAccordionItem}
            onValueChange={setActiveAccordionItem}
        >
          {slides.map((slide, index) => (
            <AccordionItem value={slide.client_temp_id} key={slide.client_temp_id} className="border bg-card p-0 rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{slide.title}</span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); handleReorderSlide(slide.client_temp_id, 'up');}}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-primary h-8 w-8"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); handleReorderSlide(slide.client_temp_id, 'down');}}
                            disabled={index === slides.length - 1}
                            className="text-muted-foreground hover:text-primary h-8 w-8"
                        >
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.client_temp_id);}}
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-0 pb-4 space-y-6"> {/* Increased space-y */}
                {/* Content Type Radio Group */}
                {/* Note: Using standard HTML radio buttons. Replace with ShadCN/UI RadioGroup if available/created. */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Content Type</Label>
                  <div role="radiogroup" className="flex items-center space-x-4">
                    <div>
                      <input
                        type="radio"
                        id={`content-type-image-${slide.client_temp_id}`}
                        name={`content-type-${slide.client_temp_id}`}
                        value="image_text"
                        checked={slide.content_type === 'image_text'}
                        onChange={() => handleContentTypeChange(slide.client_temp_id, 'image_text')}
                        className="mr-2"
                      />
                      <Label htmlFor={`content-type-image-${slide.client_temp_id}`}>Image & Talking Point</Label>
                    </div>
                    <div>
                      <input
                        type="radio"
                        id={`content-type-video-${slide.client_temp_id}`}
                        name={`content-type-${slide.client_temp_id}`}
                        value="video"
                        checked={slide.content_type === 'video'}
                        onChange={() => handleContentTypeChange(slide.client_temp_id, 'video')}
                        className="mr-2"
                      />
                      <Label htmlFor={`content-type-video-${slide.client_temp_id}`}>Video</Label>
                    </div>
                  </div>
                </div>

                {slide.content_type === 'image_text' && (
                  <>
                    <div className="space-y-1">
                      <Label className='mb-3' htmlFor={`slide-image-${slide.client_temp_id}`}>Slide Image (Max 2MB, PNG/JPEG)</Label>
                      <Input
                        id={`slide-image-${slide.client_temp_id}`}
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={(e) => handleImageChange(slide.client_temp_id, e)}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      {slide.imagePreviewUrl && (
                        <div className="mt-2">
                          <img src={slide.imagePreviewUrl} alt="Image Preview" className="max-h-40 rounded-md border" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className='mb-3' htmlFor={`slide-talking-points-${slide.client_temp_id}`}>Talking Point</Label>
                      <Textarea
                        id={`slide-talking-points-${slide.client_temp_id}`}
                        rows={4}
                        value={slide.talking_points}
                        onChange={(e) => handleTalkingPointsChange(slide.client_temp_id, e.target.value)}
                        placeholder="Enter talking point for this slide..."
                      />
                    </div>
                  </>
                )}

                {slide.content_type === 'video' && (
                  <div className="space-y-1">
                    <Label className='mb-3' htmlFor={`slide-video-${slide.client_temp_id}`}>Slide Video (Max {MAX_SLIDE_VIDEO_SIZE_MB}MB, MP4/MOV)</Label>
                    <Input
                      id={`slide-video-${slide.client_temp_id}`}
                      type="file"
                      accept={ACCEPTED_VIDEO_EXTENSIONS}
                      onChange={(e) => handleSlideVideoChange(slide.client_temp_id, e)}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {slide.videoPreviewUrl && ( // Basic video preview
                      <div className="mt-2">
                        {(slide.videoFile?.type.startsWith('video/') || (!slide.videoFile && slide.video_path)) ? ( // Allow preview for existing videos too
                           <video src={slide.videoPreviewUrl} controls className="max-h-40 rounded-md border" key={slide.videoPreviewUrl} /> // Added key for reliability
                        ) : (
                          <p className="text-sm text-muted-foreground">Video preview not available for this file type.</p> // Simplified message
                        )}
                        {slide.videoFile && <p className="text-xs text-muted-foreground mt-1">New video selected: {slide.videoFile.name}</p>}
                        {!slide.videoFile && slide.video_path && <p className="text-xs text-muted-foreground mt-1">Existing video will be used.</p>}
                      </div>
                    )}
                     {/* Consider adding a specific error display here for slide video validation errors */}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {slides.length === 0 && !isProcessing && (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileImage className="mx-auto h-10 w-10 mb-2" />
                <p>No slides yet. Click "Add Slide" to get started.</p>
            </div>
        )}

        <Button onClick={handleAddSlide} variant="outline">
          Add Slide
        </Button>

        <div className="mt-8 pt-6 border-t">
          <Button
            onClick={handleSaveSlides}
            disabled={isProcessing || !isDirty || slides.some(s => s.content_type === 'image_text' && s.talking_points.trim() === "")}
            size="lg"
            className={isDirty ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}
          >
            {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {isProcessing ? "Saving..." : "Save Slides"}
          </Button>
        </div>
      </div>
      {/* style jsx block for slide-display-container and elevenlabs-convai fully removed */}
    </div>
  );
}