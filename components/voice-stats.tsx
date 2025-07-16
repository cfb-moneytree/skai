import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Clock, Zap, Users } from "lucide-react"

const stats = [
  {
    title: "Characters Used",
    value: "12,847",
    change: "2,340 this month",
    icon: Mic,
    color: "text-blue-600",
  },
  {
    title: "Audio Generated",
    value: "2h 34m",
    change: "45m this week",
    icon: Clock,
    color: "text-green-600",
  },
  {
    title: "API Calls",
    value: "1,234",
    change: "156 today",
    icon: Zap,
    color: "text-purple-600",
  },
  {
    title: "Voice Models",
    value: "8",
    change: "2 custom voices",
    icon: Users,
    color: "text-orange-600",
  },
]

export function VoiceStats() {
  return (
    <>
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
