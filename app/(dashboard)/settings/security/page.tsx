"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  const supabase = useState(() => createSupabaseBrowserClient())[0];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !user) {
          const errorMessage = getUserError?.message || "User not found.";
          setPasswordError(`Error fetching user data: ${errorMessage}`);
          return;
        }
        setUserEmail(user.email || "");
      } catch (e: any) {
        const errorMsg = `An unexpected error occurred: ${e.message}`;
        setPasswordError(errorMsg);
      }
    };
    fetchUserData();
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccessMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    setPasswordLoading(true);
    if (!userEmail) {
      setPasswordError("User email not available. Please re-login.");
      setPasswordLoading(false);
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword });
      if (signInError) {
        setPasswordError(signInError.message.toLowerCase().includes('invalid login credentials') ? "Incorrect current password." : `Error: ${signInError.message}`);
        setPasswordLoading(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPasswordError(`Failed to update password: ${updateError.message}`);
      } else {
        setPasswordSuccessMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (e: any) {
      setPasswordError(`Unexpected error: ${e.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage account security. Min 6 chars for new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            {passwordError && <p className="text-sm font-medium text-destructive">{passwordError}</p>}
            {passwordSuccessMessage && <p className="text-sm font-medium text-green-600">{passwordSuccessMessage}</p>}
            <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto">
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}