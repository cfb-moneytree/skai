"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsProfilePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);

  const supabase = useState(() => createSupabaseBrowserClient())[0];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !user) {
          const errorMessage = getUserError?.message || "User not found.";
          setProfileError(`Error fetching user data: ${errorMessage}`);
          return;
        }

        setUserEmail(user.email || "");
        setNewEmail(user.email || "");

        const metadata = user.user_metadata;
        setFullName(metadata?.name || metadata?.full_name || "");
      } catch (e: any) {
        const errorMsg = `An unexpected error occurred: ${e.message}`;
        setProfileError(errorMsg);
      }
    };
    fetchUserData();
  }, [supabase]);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccessMessage(null);
    if (!newEmail && !fullName) {
      setProfileError("Full Name or Email must be filled.");
      return;
    }
    if (newEmail && !/\S+@\S+\.\S+/.test(newEmail)) {
      setProfileError("Please enter a valid email address.");
      return;
    }
    setProfileLoading(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setProfileError("Could not retrieve user. Please re-login.");
        setProfileLoading(false);
        return;
      }
      const currentUserName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || "";
      const nameChanged = fullName !== currentUserName;
      const emailActuallyChanged = newEmail && newEmail !== userEmail;
      const updatePayload: { email?: string; data?: { name?: string; full_name?: string } } = {};
      if (emailActuallyChanged) updatePayload.email = newEmail;
      if (nameChanged) updatePayload.data = { ...updatePayload.data, name: fullName, full_name: fullName };

      if (Object.keys(updatePayload).length > 0) {
        const { data: updateData, error: updateError } = await supabase.auth.updateUser(updatePayload);
        if (updateError) {
          setProfileError(`Failed to update profile: ${updateError.message}`);
        } else {
          let successMsg = "Profile updated successfully!";
          if (updateData.user?.email && updateData.user.email !== userEmail) {
            setUserEmail(updateData.user.email);
            if (updateData.user.new_email) {
              successMsg += " Check new email to verify change.";
            }
          }
          if (updateData.user?.user_metadata) {
            setFullName(updateData.user.user_metadata.name || updateData.user.user_metadata.full_name || "");
          }
          setProfileSuccessMessage(successMsg);
        }
      } else {
        setProfileSuccessMessage("No changes to save.");
      }
    } catch (e: any) {
      setProfileError(`Unexpected error: ${e.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update personal info</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            {profileError && <p className="text-sm font-medium text-destructive">{profileError}</p>}
            {profileSuccessMessage && <p className="text-sm font-medium text-green-600">{profileSuccessMessage}</p>}
            <Button type="submit" disabled={profileLoading} className="w-full sm:w-auto">
              {profileLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
