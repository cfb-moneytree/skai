"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Key, Copy, Plus, RefreshCw, AlertTriangle, Code, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export function ProfileApiKeys() {
  const [showKey, setShowKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Sample API keys
  const [apiKeys, setApiKeys] = useState([
    {
      id: "key_1",
      name: "Production API Key",
      key: "sk_live_51NZbgqKh7icGpKlGEH1zzGjVdtGbQKrwkXpnzwuVr",
      created: "2023-12-01",
      lastUsed: "2 hours ago",
      status: "active",
    },
    {
      id: "key_2",
      name: "Development API Key",
      key: "sk_test_51NZbgqKh7icGpKlGEH1zzGjVdtGbQKrwkXpnzwuVr",
      created: "2023-12-15",
      lastUsed: "1 day ago",
      status: "active",
    },
    {
      id: "key_3",
      name: "Testing API Key",
      key: "sk_test_51NZbgqKh7icGpKlGEH1zzGjVdtGbQKrwkXpnzwuVr",
      created: "2024-01-05",
      lastUsed: "Never",
      status: "inactive",
    },
  ])

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("API key copied", {
      description: "The API key has been copied to your clipboard.",
    })
  }

  const handleCreateKey = () => {
    if (!newKeyName) {
      toast.error("Name required", {
        description: "Please provide a name for your API key.",
      })
      return
    }

    setIsCreating(true)
    // Simulate API call
    setTimeout(() => {
      const newKey = {
        id: `key_${apiKeys.length + 1}`,
        name: newKeyName,
        key: `sk_test_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        created: new Date().toISOString().split("T")[0],
        lastUsed: "Never",
        status: "active",
      }

      setApiKeys([...apiKeys, newKey])
      setNewKeyName("")
      setIsCreating(false)
      toast.success("API key created", {
        description: "Your new API key has been created successfully.",
      })
    }, 1000)
  }

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.map((key) => (key.id === id ? { ...key, status: "inactive" } : key)))
    toast.warning("API key revoked", {
      description: "The API key has been revoked successfully.",
    })
  }

  return (
    <div className="space-y-6">
      {/* API Keys Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>Manage your API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>API keys are sensitive</AlertTitle>
            <AlertDescription>
              Your API keys provide full access to your account. Keep them secure and never share them in public places
              like GitHub or client-side code.
            </AlertDescription>
          </Alert>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {showKey
                          ? apiKey.key
                          : `${apiKey.key.substring(0, 8)}...${apiKey.key.substring(apiKey.key.length - 4)}`}
                      </code>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCopyKey(apiKey.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{apiKey.created}</TableCell>
                  <TableCell>{apiKey.lastUsed}</TableCell>
                  <TableCell>
                    <Badge variant={apiKey.status === "active" ? "default" : "secondary"}>{apiKey.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {apiKey.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => handleRevokeKey(apiKey.id)}>
                        Revoke
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Revoked
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Create New API Key</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={handleCreateKey} disabled={isCreating}>
                  {isCreating ? (
                    "Creating..."
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Settings
          </CardTitle>
          <CardDescription>Configure your API access and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableApi">Enable API Access</Label>
              <p className="text-sm text-muted-foreground">Allow applications to access your account via API</p>
            </div>
            <Switch id="enableApi" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="webhooks">Webhooks</Label>
              <p className="text-sm text-muted-foreground">Receive notifications for API events</p>
            </div>
            <Switch id="webhooks" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ipRestriction">IP Restriction</Label>
              <p className="text-sm text-muted-foreground">Limit API access to specific IP addresses</p>
            </div>
            <Switch id="ipRestriction" />
          </div>

          <div className="flex justify-end">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Rotate All Keys
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>Resources to help you integrate with our API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="h-auto py-4 justify-start">
              <div className="flex flex-col items-start">
                <span className="font-medium">Getting Started</span>
                <span className="text-sm text-muted-foreground">Learn the basics of our API</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start">
              <div className="flex flex-col items-start">
                <span className="font-medium">API Reference</span>
                <span className="text-sm text-muted-foreground">Detailed documentation of all endpoints</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start">
              <div className="flex flex-col items-start">
                <span className="font-medium">Code Examples</span>
                <span className="text-sm text-muted-foreground">Sample code in various languages</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start">
              <div className="flex flex-col items-start">
                <span className="font-medium">SDKs & Libraries</span>
                <span className="text-sm text-muted-foreground">Official client libraries</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
