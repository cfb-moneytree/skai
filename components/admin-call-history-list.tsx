"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  Play,
  Pause,
  Download,
  ChevronDown,
  ChevronRight,
  Phone,
  Clock,
  User,
  Bot,
  Copy,
  MoreHorizontal,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Extended call history data for admin view (includes all users)
const allCallHistory = [
  {
    id: "call_001",
    caller: {
      name: "Sarah Johnson",
      phone: "+1 (555) 123-4567",
      avatar: "/caller-1.jpg",
    },
    user: "john@example.com",
    agent: "Customer Support Bot",
    startTime: "2024-01-08 14:32:15",
    duration: "4m 23s",
    status: "completed",
    summary: "Customer inquiry about product return policy and refund process",
    transcription: [
      { speaker: "Agent", text: "Hello! Thank you for calling. How can I help you today?", timestamp: "00:00" },
      {
        speaker: "Caller",
        text: "Hi, I need to return a product I bought last week. Can you help me with that?",
        timestamp: "00:03",
      },
      {
        speaker: "Agent",
        text: "Of course! I'd be happy to help you with your return. Can you please provide me with your order number?",
        timestamp: "00:08",
      },
    ],
    audioUrl: "/call-001.mp3",
  },
  {
    id: "call_002",
    caller: {
      name: "Michael Chen",
      phone: "+1 (555) 987-6543",
      avatar: "/caller-2.jpg",
    },
    user: "jane@example.com",
    agent: "Sales Assistant",
    startTime: "2024-01-08 11:15:42",
    duration: "7m 18s",
    status: "completed",
    summary: "Product demonstration and pricing inquiry for enterprise solution",
    transcription: [
      {
        speaker: "Agent",
        text: "Good morning! Thank you for your interest in our enterprise solutions. How can I assist you today?",
        timestamp: "00:00",
      },
      {
        speaker: "Caller",
        text: "Hi, I'm looking for a solution for my company. We need something that can handle about 500 users.",
        timestamp: "00:04",
      },
    ],
    audioUrl: "/call-002.mp3",
  },
  {
    id: "call_003",
    caller: {
      name: "Emily Rodriguez",
      phone: "+1 (555) 456-7890",
      avatar: "/caller-3.jpg",
    },
    user: "mike@example.com",
    agent: "Technical Expert",
    startTime: "2024-01-07 16:45:30",
    duration: "2m 56s",
    status: "failed",
    summary: "Call dropped due to technical issues",
    transcription: [
      { speaker: "Agent", text: "Hello, this is technical support. How can I help you?", timestamp: "00:00" },
      {
        speaker: "Caller",
        text: "Hi, I'm having trouble with my account login. It keeps saying my password is incorrect.",
        timestamp: "00:03",
      },
    ],
    audioUrl: "/call-003.mp3",
  },
  {
    id: "call_004",
    caller: {
      name: "David Wilson",
      phone: "+1 (555) 789-0123",
      avatar: "/caller-4.jpg",
    },
    user: "sarah@example.com",
    agent: "Marketing Advisor",
    startTime: "2024-01-07 09:22:18",
    duration: "6m 45s",
    status: "completed",
    summary: "Marketing strategy consultation for small business",
    transcription: [
      {
        speaker: "Agent",
        text: "Hello! I'm here to help you with your marketing strategy. What's your business focus?",
        timestamp: "00:00",
      },
      { speaker: "Caller", text: "We're a small bakery looking to expand our online presence.", timestamp: "00:04" },
    ],
    audioUrl: "/call-004.mp3",
  },
]

export function AdminCallHistoryList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [playingCall, setPlayingCall] = useState<string | null>(null)

  const filteredCalls = allCallHistory.filter((call) => {
    const matchesSearch =
      call.caller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || call.status === statusFilter
    const matchesUser = userFilter === "all" || call.user === userFilter
    return matchesSearch && matchesStatus && matchesUser
  })

  const uniqueUsers = Array.from(new Set(allCallHistory.map((call) => call.user)))

  const togglePlayback = (callId: string) => {
    setPlayingCall(playingCall === callId ? null : callId)
  }

  const toggleExpanded = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>All Call History</CardTitle>
            <CardDescription>Platform-wide call history with transcriptions and audio recordings</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search calls..."
                className="w-full md:w-[200px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calls</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredCalls.map((call) => (
            <Collapsible key={call.id} open={expandedCall === call.id} onOpenChange={() => toggleExpanded(call.id)}>
              <Card className="border-l-4 border-l-blue-500">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {expandedCall === call.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={call.caller.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{call.caller.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{call.caller.name}</h3>
                            <Badge
                              variant={
                                call.status === "completed"
                                  ? "default"
                                  : call.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {call.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{call.caller.phone}</p>
                          <p className="text-sm text-muted-foreground truncate">{call.summary}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            <span>User: {call.user}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{call.duration}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{call.startTime}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Bot className="h-3 w-3" />
                            <span>{call.agent}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Export call data</DropdownMenuItem>
                            <DropdownMenuItem>View user profile</DropdownMenuItem>
                            <DropdownMenuItem>Flag for review</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete call</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {/* Audio Player */}
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Audio Recording</h4>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => togglePlayback(call.id)}>
                            {playingCall === call.id ? (
                              <Pause className="h-4 w-4 mr-1" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            {playingCall === call.id ? "Pause" : "Play"}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Audio Waveform Visualization */}
                      <div className="h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center mb-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 60 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full ${playingCall === call.id ? "bg-blue-500 animate-pulse" : "bg-blue-300"}`}
                              style={{
                                height: `${Math.random() * 40 + 10}px`,
                                animationDelay: playingCall === call.id ? `${i * 30}ms` : "0ms",
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0:00</span>
                        <span>{call.duration}</span>
                      </div>
                    </div>

                    {/* Call Summary */}
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Call Summary</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{call.summary}</p>
                    </div>

                    {/* User Information */}
                    <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium mb-2">User Information</h4>
                      <div className="text-sm text-muted-foreground">
                        <p>Account: {call.user}</p>
                        <p>Agent Used: {call.agent}</p>
                      </div>
                    </div>

                    {/* Transcription */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Transcription</h4>
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Transcript
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                        {call.transcription.map((entry, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                              {entry.speaker === "Agent" ? (
                                <Bot className="h-4 w-4 text-blue-600" />
                              ) : (
                                <User className="h-4 w-4 text-green-600" />
                              )}
                              <span className="text-xs font-medium text-muted-foreground">{entry.speaker}</span>
                              <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                            </div>
                            <p className="text-sm flex-1">{entry.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
