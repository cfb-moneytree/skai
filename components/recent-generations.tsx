import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Download, MoreHorizontal, Clock } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const recentGenerations = [
  {
    id: "1",
    text: "Welcome to our new product launch. We're excited to share...",
    voice: "Sarah",
    duration: "0:45",
    size: "2.1 MB",
    createdAt: "2 hours ago",
    status: "completed",
  },
  {
    id: "2",
    text: "Thank you for your interest in our services. Our team...",
    voice: "James",
    duration: "1:12",
    size: "3.4 MB",
    createdAt: "4 hours ago",
    status: "completed",
  },
  {
    id: "3",
    text: "This is a test message to demonstrate the voice quality...",
    voice: "Emma",
    duration: "0:28",
    size: "1.8 MB",
    createdAt: "6 hours ago",
    status: "completed",
  },
  {
    id: "4",
    text: "Please note that our office hours have changed...",
    voice: "David",
    duration: "0:33",
    size: "2.0 MB",
    createdAt: "1 day ago",
    status: "completed",
  },
  {
    id: "5",
    text: "Generating audio for marketing campaign...",
    voice: "Sarah",
    duration: "—",
    size: "—",
    createdAt: "Just now",
    status: "processing",
  },
]

export function RecentGenerations() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>Your latest voice generations and audio files</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentGenerations.map((generation) => (
            <div
              key={generation.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{generation.text}</p>
                  <Badge variant={generation.status === "completed" ? "default" : "secondary"} className="text-xs">
                    {generation.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Voice: {generation.voice}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {generation.duration}
                  </span>
                  <span>{generation.size}</span>
                  <span>{generation.createdAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {generation.status === "completed" && (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Regenerate</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
