"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Play, Pause, Download, Copy, Wand2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function VoiceGenerator() {
  const [text, setText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stability, setStability] = useState([75])
  const [clarity, setClarity] = useState([50])

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false)
    }, 3000)
  }

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Voice Generator
        </CardTitle>
        <CardDescription>Transform text into natural-sounding speech</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text Input */}
        <div className="space-y-2">
          <Label htmlFor="text-input">Text to Speech</Label>
          <Textarea
            id="text-input"
            placeholder="Enter the text you want to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{text.length} characters</span>
            <span>10,000 character limit</span>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label>Voice Model</Label>
          <Select defaultValue="sarah">
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sarah">Sarah - Professional Female</SelectItem>
              <SelectItem value="james">James - Confident Male</SelectItem>
              <SelectItem value="emma">Emma - Friendly Female</SelectItem>
              <SelectItem value="david">David - Authoritative Male</SelectItem>
              <SelectItem value="custom1">Custom Voice 1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voice Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Stability: {stability[0]}%</Label>
            <Slider value={stability} onValueChange={setStability} max={100} step={1} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label>Clarity: {clarity[0]}%</Label>
            <Slider value={clarity} onValueChange={setClarity} max={100} step={1} className="w-full" />
          </div>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating audio...</span>
              <span>67%</span>
            </div>
            <Progress value={67} className="w-full" />
          </div>
        )}

        {/* Audio Waveform Placeholder */}
        {!isGenerating && text && (
          <div className="space-y-4">
            <div className="h-20 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-500 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 40 + 10}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={togglePlayback} className="h-8 w-8 p-0">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-muted-foreground">0:00 / 0:15</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button onClick={handleGenerate} disabled={!text || isGenerating} className="w-full" size="lg">
          {isGenerating ? "Generating..." : "Generate Speech"}
        </Button>
      </CardContent>
    </Card>
  )
}
