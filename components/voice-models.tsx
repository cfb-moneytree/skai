import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Plus, Settings } from "lucide-react"

const voiceModels = [
  {
    id: "sarah",
    name: "Sarah",
    description: "Professional Female",
    accent: "American",
    category: "Professional",
    isCustom: false,
  },
  {
    id: "james",
    name: "James",
    description: "Confident Male",
    accent: "British",
    category: "Business",
    isCustom: false,
  },
  {
    id: "emma",
    name: "Emma",
    description: "Friendly Female",
    accent: "Australian",
    category: "Casual",
    isCustom: false,
  },
  {
    id: "custom1",
    name: "My Voice",
    description: "Custom trained voice",
    accent: "Custom",
    category: "Personal",
    isCustom: true,
  },
]

export function VoiceModels() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Voice Models</CardTitle>
            <CardDescription>Select and manage your voice models</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {voiceModels.map((voice) => (
          <div
            key={voice.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`/voice-${voice.id}.jpg`} />
                <AvatarFallback>{voice.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{voice.name}</p>
                  {voice.isCustom && (
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{voice.description}</p>
                <p className="text-xs text-muted-foreground">
                  {voice.accent} • {voice.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Play className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
