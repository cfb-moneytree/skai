import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const activities = [
  {
    user: "John Smith",
    action: "made a purchase",
    time: "2 minutes ago",
    avatar: "JS",
  },
  {
    user: "Sarah Johnson",
    action: "signed up for premium",
    time: "5 minutes ago",
    avatar: "SJ",
  },
  {
    user: "Mike Wilson",
    action: "updated profile",
    time: "10 minutes ago",
    avatar: "MW",
  },
  {
    user: "Emma Davis",
    action: "left a review",
    time: "15 minutes ago",
    avatar: "ED",
  },
  {
    user: "Tom Brown",
    action: "cancelled subscription",
    time: "20 minutes ago",
    avatar: "TB",
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest user activities on your platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/placeholder-user.jpg" alt="Avatar" />
                <AvatarFallback>{activity.avatar}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{activity.user}</p>
                <p className="text-sm text-muted-foreground">{activity.action}</p>
              </div>
              <div className="ml-auto font-medium text-sm text-muted-foreground">{activity.time}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
