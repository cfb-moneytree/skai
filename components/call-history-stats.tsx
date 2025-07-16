import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Clock, MessageSquare, TrendingUp } from "lucide-react"

const stats = [
  {
    title: "Total Calls",
    value: "247",
    change: "+12 this week",
    icon: Phone,
    color: "text-blue-600",
  },
  {
    title: "Call Duration",
    value: "18h 42m",
    change: "+2h 15m this week",
    icon: Clock,
    color: "text-green-600",
  },
  {
    title: "Conversations",
    value: "189",
    change: "76% completion rate",
    icon: MessageSquare,
    color: "text-purple-600",
  },
  {
    title: "Avg Call Length",
    value: "4m 32s",
    change: "+15s from last week",
    icon: TrendingUp,
    color: "text-orange-600",
  },
]

export function CallHistoryStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    </div>
  )
}
