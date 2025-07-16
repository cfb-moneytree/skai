import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, FileText, Settings } from "lucide-react"

const actions = [
  {
    title: "Add New User",
    description: "Invite a new team member",
    icon: Plus,
    action: "Add User",
  },
  {
    title: "View Reports",
    description: "Check latest analytics",
    icon: FileText,
    action: "View Reports",
  },
  {
    title: "Manage Team",
    description: "Update team settings",
    icon: Users,
    action: "Manage",
  },
  {
    title: "System Settings",
    description: "Configure your system",
    icon: Settings,
    action: "Configure",
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Frequently used actions and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <action.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                {action.action}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
