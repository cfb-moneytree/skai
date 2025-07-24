"use client";

import { useCallback } from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryManagement } from "@/components/category-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type OrganizationType = "school" | "team" | "company" | "";

export default function SettingsOrganizationPage() {
  const MAX_WORDS_DESCRIPTION = 50;

  const [orgName, setOrgName] = useState<string>("");
  const [orgDescription, setOrgDescription] = useState<string>("");
  const [orgImageFile, setOrgImageFile] = useState<File | null>(null);
  const [orgImageUrl, setOrgImageUrl] = useState<string | null>(null);
  const [orgImagePreview, setOrgImagePreview] = useState<string | null>(null);
  const [orgType, setOrgType] = useState<OrganizationType>("");
  const [organizationInfoLoading, setOrganizationInfoLoading] = useState(false);
  const [organizationInfoError, setOrganizationInfoError] = useState<string | null>(null);
  const [organizationInfoSuccessMessage, setOrganizationInfoSuccessMessage] = useState<string | null>(null);
  const [orgDescriptionWordCount, setOrgDescriptionWordCount] = useState(0);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const supabase = useState(() => createSupabaseBrowserClient())[0];

  // --- ADDED: Quota State ---
  const [monthlyQuota, setMonthlyQuota] = useState<number | string>("");
  const [currentUsage, setCurrentUsage] = useState<number>(0);
  
  const fetchOrgData = useCallback(async () => {
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) {
        const errorMessage = getUserError?.message || "User not found.";
        setOrganizationInfoError(`Error fetching user data: ${errorMessage}`);
        return;
      }

      const { data: orgUserData, error: orgUserError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (orgUserError) {
        setOrganizationInfoError(`Error fetching organization membership: ${orgUserError.message}`);
        setOrgName(""); setOrgDescription(""); setOrgImageUrl(null); setOrgType(""); setOrgDescriptionWordCount(0);
        return;
      }

      if (orgUserData && orgUserData.organization_id) {
        setOrganizationId(orgUserData.organization_id);
        const { data: organizationData, error: orgError } = await supabase
          .from('organizations')
          .select('name, description, image_url, organization_type')
          .eq('id', orgUserData.organization_id)
          .single();

        if (orgError) {
          setOrganizationInfoError(`Error fetching organization details: ${orgError.message}`);
          setOrgName(""); setOrgDescription(""); setOrgImageUrl(null); setOrgType(""); setOrgDescriptionWordCount(0);
        } else if (organizationData) {
          setOrgName(organizationData.name || "");
          setOrgDescription(organizationData.description || "");
          setOrgImageUrl(organizationData.image_url || null);
          setOrgType((organizationData.organization_type as OrganizationType) || "");
          setOrgDescriptionWordCount((organizationData.description?.match(/\S+/g) || []).length);
        }

        // --- ADDED: Fetch quota ---
        const { data: quotaData, error: quotaError } = await supabase
          .from('organization_quotas')
          .select('monthly_quota_minutes, current_usage_minutes')
          .eq('organization_id', orgUserData.organization_id)
          .maybeSingle();

        if (quotaError) {
          setQuotaError(`Error fetching organization quota: ${quotaError.message}`);
        } else if (quotaData) {
          setMonthlyQuota(quotaData.monthly_quota_minutes || "");
          setCurrentUsage(quotaData.current_usage_minutes || 0);
        } else {
          setMonthlyQuota("");
          setCurrentUsage(0);
        }
      } else {
        setOrgName(""); setOrgDescription(""); setOrgImageUrl(null); setOrgType(""); setOrgDescriptionWordCount(0);
      }
    } catch (e: any) {
      const errorMsg = `An unexpected error occurred: ${e.message}`;
      setOrganizationInfoError(errorMsg);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrgData();
  }, [fetchOrgData]);

  useEffect(() => {
    return () => {
      if (orgImagePreview) URL.revokeObjectURL(orgImagePreview);
    };
  }, [orgImagePreview]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      const maxSize = 2 * 1024 * 1024; // 2MB
      setOrganizationInfoError(null);
      if (!allowedTypes.includes(file.type)) {
        setOrganizationInfoError("Invalid file type. Use PNG, JPG, GIF, or WEBP.");
        setOrgImageFile(null); if (orgImagePreview) URL.revokeObjectURL(orgImagePreview); setOrgImagePreview(null); e.target.value = ""; return;
      }
      if (file.size > maxSize) {
        setOrganizationInfoError("File too large. Max 2MB.");
        setOrgImageFile(null); if (orgImagePreview) URL.revokeObjectURL(orgImagePreview); setOrgImagePreview(null); e.target.value = ""; return;
      }
      if (orgImagePreview) URL.revokeObjectURL(orgImagePreview);
      setOrgImageFile(file); setOrgImagePreview(URL.createObjectURL(file));
    } else {
      setOrgImageFile(null); if (orgImagePreview) URL.revokeObjectURL(orgImagePreview); setOrgImagePreview(null);
    }
  };

  const handleOrgDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.match(/\S+/g) || [];
    setOrgDescriptionWordCount(words.length); setOrgDescription(text);
    if (words.length <= MAX_WORDS_DESCRIPTION && organizationInfoError?.includes("description cannot exceed")) setOrganizationInfoError(null);
  };

  const handleUpdateOrganizationInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrganizationInfoError(null); setOrganizationInfoSuccessMessage(null); setOrganizationInfoLoading(true);

    if (!orgName.trim()) { setOrganizationInfoError("Organization Name is required."); setOrganizationInfoLoading(false); return; }
    if (!orgType) { setOrganizationInfoError("Organization Type is required."); setOrganizationInfoLoading(false); return; }
    if (!orgImageFile && !orgImageUrl) { setOrganizationInfoError("Organization Logo is required."); setOrganizationInfoLoading(false); return; }
    if (orgDescriptionWordCount > MAX_WORDS_DESCRIPTION) { setOrganizationInfoError(`Description cannot exceed ${MAX_WORDS_DESCRIPTION} words.`); setOrganizationInfoLoading(false); return; }

    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) { setOrganizationInfoError("Could not retrieve user. Please re-login."); setOrganizationInfoLoading(false); return; }

      let newUploadedOrgImageUrl: string | null = null;
      if (orgImageFile) {
        const fileExt = orgImageFile.name.split('.').pop();
        const uniqueFileName = `org_logo_${Date.now()}.${fileExt}`;
        const filePath = `organization/${user.id}/${uniqueFileName}`;
        const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, orgImageFile, { cacheControl: '3600', upsert: false });
        if (uploadError) { setOrganizationInfoError(`Failed to upload image: ${uploadError.message}`); setOrganizationInfoLoading(false); return; }
        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filePath);
        newUploadedOrgImageUrl = urlData.publicUrl;
      }
      const finalOrgImageUrl = newUploadedOrgImageUrl !== null ? newUploadedOrgImageUrl : orgImageUrl;

      const { data: existingOrgArray, error: fetchOrgError } = await supabase.from('organizations').select('id').eq('owner_user_id', user.id).limit(1);
      if (fetchOrgError) { setOrganizationInfoError(`Error checking organization: ${fetchOrgError.message}`); setOrganizationInfoLoading(false); return; }
      const existingOrg = existingOrgArray && existingOrgArray.length > 0 ? existingOrgArray[0] : null;
      let operationSuccessful = false;

      const orgDataPayload = {
        name: orgName.trim(),
        description: orgDescription.trim() || null,
        image_url: finalOrgImageUrl,
        organization_type: orgType as OrganizationType,
      };

      if (existingOrg && existingOrg.id) {
        const { error: updateOrgError } = await supabase.from('organizations').update(orgDataPayload).eq('id', existingOrg.id);
        if (updateOrgError) setOrganizationInfoError(`Failed to update organization: ${updateOrgError.message}`);
        else operationSuccessful = true;
      } else {
        const { data: newOrgData, error: insertOrgError } = await supabase.from('organizations').insert({ ...orgDataPayload, owner_user_id: user.id }).select('id').single();
        if (insertOrgError) setOrganizationInfoError(`Failed to create organization: ${insertOrgError.message}`);
        else if (newOrgData && newOrgData.id) {
          const { error: linkUserError } = await supabase.from('organization_users').insert({ organization_id: newOrgData.id, user_id: user.id, role: 'admin' });
          if (linkUserError) {
            await supabase.from('organizations').delete().eq('id', newOrgData.id);
            setOrganizationInfoError(`Org created, but failed to link user: ${linkUserError.message}. Rolled back.`);
          } else operationSuccessful = true;
        } else setOrganizationInfoError('Failed to create organization or get ID.');
      }

      if (operationSuccessful) {
        const newOrgMetaData = {
          name: orgName.trim(),
          description: orgDescription.trim() || null,
          logoUrl: finalOrgImageUrl,
        };
        const { error: updateUserMetaError } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, organization: newOrgMetaData },
        });

        if (updateUserMetaError) {
          setOrganizationInfoError(`Org saved, but failed to update user session: ${updateUserMetaError.message}`);
        } else {
          setOrganizationInfoSuccessMessage("Organization information updated successfully!");
          setOrgImageUrl(finalOrgImageUrl);
          if (orgImageFile && newUploadedOrgImageUrl) {
            setOrgImageFile(null);
            if (orgImagePreview) { URL.revokeObjectURL(orgImagePreview); setOrgImagePreview(null); }
          }
        }
      }
    } catch (err: any) { setOrganizationInfoError(`Unexpected error: ${err.message}`); }
    finally { setOrganizationInfoLoading(false); }
  };

  return (
    <div className="grid gap-6">
      {/* --- ADDED: Quota Card --- */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Quota</CardTitle>
          <CardDescription>Set the monthly lesson duration quota for the organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Current Monthly Usage</p>
            <p className="text-2xl font-bold">{currentUsage.toLocaleString()} / {(typeof monthlyQuota === 'number' ? monthlyQuota : 0).toLocaleString()} minutes</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>Set organization's branding details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateOrganizationInfo} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Your Organization LLC" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgType">Organization Type</Label>
              <Select value={orgType} onValueChange={(value) => setOrgType(value as OrganizationType)}>
                <SelectTrigger id="orgType">
                  <SelectValue placeholder="Select organization type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgImage">Organization Logo</Label>
              <Input id="orgImage" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleImageFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
              {(orgImagePreview || orgImageUrl) && (
                <div className="mt-4">
                  <img src={orgImagePreview || orgImageUrl || undefined} alt="Organization Logo Preview" className="h-24 w-24 object-contain border rounded" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Allowed: PNG, JPG, GIF, WEBP. Max 2MB.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgDescription">Short Description (Optional)</Label>
              <Textarea id="orgDescription" value={orgDescription} onChange={handleOrgDescriptionChange} placeholder="Briefly describe your organization" rows={3} />
              <p className="text-xs text-muted-foreground mt-1">
                {orgDescriptionWordCount}/{MAX_WORDS_DESCRIPTION} words. {orgDescriptionWordCount > MAX_WORDS_DESCRIPTION && <span className="text-destructive ml-1">Too long!</span>}
              </p>
            </div>
            {organizationInfoError && <p className="text-sm font-medium text-destructive">{organizationInfoError}</p>}
            {organizationInfoSuccessMessage && <p className="text-sm font-medium text-green-600">{organizationInfoSuccessMessage}</p>}
            <Button type="submit" disabled={organizationInfoLoading} className="w-full sm:w-auto">
              {organizationInfoLoading ? "Saving..." : "Save Organization Information"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>Manage your organization's categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {organizationId && <CategoryManagement organizationId={organizationId} />}
        </CardContent>
      </Card>
    </div>
  );
}