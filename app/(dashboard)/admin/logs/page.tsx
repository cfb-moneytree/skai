import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Sample log data
const logs = [
  {
    id: "1",
    event: "User Login",
    user: "john@example.com",
    ip: "192.168.1.1",
    status: "Success",
    timestamp: "2023-06-08 14:32:15",
  },
  {
    id: "2",
    event: "Password Reset",
    user: "jane@example.com",
    ip: "192.168.1.2",
    status: "Success",
    timestamp: "2023-06-08 13:45:22",
  },
  {
    id: "3",
    event: "Failed Login Attempt",
    user: "unknown@example.com",
    ip: "192.168.1.3",
    status: "Failed",
    timestamp: "2023-06-08 12:15:45",
  },
  {
    id: "4",
    event: "User Registration",
    user: "new@example.com",
    ip: "192.168.1.4",
    status: "Success",
    timestamp: "2023-06-08 11:22:33",
  },
  {
    id: "5",
    event: "Settings Changed",
    user: "admin@example.com",
    ip: "192.168.1.5",
    status: "Success",
    timestamp: "2023-06-08 10:11:05",
  },
  {
    id: "6",
    event: "API Key Generated",
    user: "developer@example.com",
    ip: "192.168.1.6",
    status: "Success",
    timestamp: "2023-06-08 09:45:12",
  },
  {
    id: "7",
    event: "Failed Login Attempt",
    user: "hacker@example.com",
    ip: "192.168.1.7",
    status: "Failed",
    timestamp: "2023-06-08 08:32:18",
  },
]

export default function AdminLogsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>View and analyze system activity logs</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search logs..." className="w-full md:w-[200px] pl-8" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="login">Login Events</SelectItem>
                <SelectItem value="failed">Failed Events</SelectItem>
                <SelectItem value="settings">Settings Events</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.event}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.ip}</TableCell>
                <TableCell>
                  <Badge variant={log.status === "Success" ? "default" : "destructive"}>{log.status}</Badge>
                </TableCell>
                <TableCell>{log.timestamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
