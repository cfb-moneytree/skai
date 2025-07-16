"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, Smartphone, Key, Lock } from "lucide-react"
import { toast } from "sonner"

export function ProfileSecurity() {
  const [isLoading, setIsLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: true,
  })

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleToggle = (field: string, value: boolean) => {
    setSecuritySettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePasswordUpdate = () => {
    setIsLoading(true)
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match", {
        description: "New password and confirmation must match.",
      })
      setIsLoading(false)
      return
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      toast.success("Password updated", {
        description: "Your password has been updated successfully.",
      })
    }, 1000)
  }

  const handleEnableTwoFactor = () => {
    // In a real app, this would start the 2FA setup process
    toast.info("Two-factor authentication", {
      description: "Setup wizard would start here in a real application.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handlePasswordUpdate}
              disabled={
                isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword
              }
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securitySettings.twoFactorEnabled ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Two-factor authentication is enabled</AlertTitle>
              <AlertDescription>
                Your account is protected with an additional layer of security. When you sign in, you'll need to provide
                a code from your authenticator app.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Two-factor authentication is not enabled</AlertTitle>
              <AlertDescription>
                Protect your account with an additional layer of security. Once configured, you'll be required to enter
                a code along with your password when you sign in.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button variant={securitySettings.twoFactorEnabled ? "outline" : "default"} onClick={handleEnableTwoFactor}>
              {securitySettings.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Configure additional security options for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="twoFactorEnabled">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require a code when signing in</p>
            </div>
            <Switch
              id="twoFactorEnabled"
              checked={securitySettings.twoFactorEnabled}
              onCheckedChange={(checked) => handleToggle("twoFactorEnabled", checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="loginNotifications">Login Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive alerts for new sign-ins</p>
            </div>
            <Switch
              id="loginNotifications"
              checked={securitySettings.loginNotifications}
              onCheckedChange={(checked) => handleToggle("loginNotifications", checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sessionTimeout">Session Timeout</Label>
              <p className="text-sm text-muted-foreground">Automatically log out after 30 minutes of inactivity</p>
            </div>
            <Switch
              id="sessionTimeout"
              checked={securitySettings.sessionTimeout}
              onCheckedChange={(checked) => handleToggle("sessionTimeout", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">Chrome on Windows • New York, USA</p>
                  <p className="text-xs text-muted-foreground">Started 2 hours ago</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Current
                </Button>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Mobile App</p>
                  <p className="text-sm text-muted-foreground">iPhone 13 • San Francisco, USA</p>
                  <p className="text-xs text-muted-foreground">Started 3 days ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Revoke
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="destructive">Sign Out All Other Sessions</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
