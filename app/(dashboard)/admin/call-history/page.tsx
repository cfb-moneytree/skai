import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminCallHistoryList } from "@/components/admin-call-history-list"
import { Phone, Clock, Users, TrendingUp } from "lucide-react"

// Admin stats for all calls
const adminStats = [
  {
    title: "Total Platform Calls",
    value: "12,847",
    change: "+234 today",
    icon: Phone,
    color: "text-blue-600",
  },
  {
    title: "Total Call Duration",
    value: "847h 23m",
    change: "+45h this week",
    icon: Clock,
    color: "text-green-600",
  },
  {
    title: "Active Callers",
    value: "2,456",
    change: "+89 this month",
    icon: Users,
    color: "text-purple-600",
  },
  {
    title: "Avg Call Duration",
    value: "3m 58s",
    change: "+12s from last week",
    icon: TrendingUp,
    color: "text-orange-600",
  },
]

export default function AdminCallHistoryPage() {
  return (
    <div className="space-y-6">
      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminStats.map((stat, index) => (
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

      {/* All Call History */}
      <AdminCallHistoryList />
    </div>
  )
}
