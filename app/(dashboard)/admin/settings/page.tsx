"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
// import { Textarea } from "@/components/ui/textarea"; // Not used in this section currently
import React, { useState } from 'react';
// If you have a toast component like sonner, you might import it here:
// import { toast } from "sonner";


export default function AdminSettingsPage() {
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Supabase client initialization removed as the debug button is gone.
  // If other parts of this component need the client, ensure it's initialized appropriately.

  const handleUpdateElevenLabsKey = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_name: 'elevenlabs',
          secret_value: elevenLabsApiKey,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to update API key (status: ${response.status})`);
      }
      
      setMessage({ type: 'success', text: 'ElevenLabs API Key updated successfully!' });
      // toast.success("ElevenLabs API Key updated successfully!"); // Example with sonner
      setElevenLabsApiKey(''); // Optionally clear the input
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
      // toast.error(error.message || "An unexpected error occurred."); // Example with sonner
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>Manage third-party API keys used by the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className='mb-2' htmlFor="elevenlabs-api-key">ElevenLabs API Key</Label>
            <Input
              id="elevenlabs-api-key"
              type="password" // Use password type for sensitive keys
              placeholder="Enter new ElevenLabs API Key"
              value={elevenLabsApiKey}
              onChange={(e) => setElevenLabsApiKey(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Update the API key used for ElevenLabs voice generation services.
            </p>
          </div>
          
          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}

          <Button onClick={handleUpdateElevenLabsKey} disabled={isLoading || !elevenLabsApiKey.trim()}>
            {isLoading ? 'Updating...' : 'Update ElevenLabs API Key'}
          </Button>
          
          {/* <Separator /> */}

          {/* Existing API Access Switch - kept for context, can be removed if not relevant to this task */}
          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="api-access">Enable API Access (Example)</Label>
              <p className="text-sm text-muted-foreground">Allow external applications to access your API (example setting)</p>
            </div>
            <Switch id="api-access" defaultChecked />
          </div>
          <Button variant="outline" disabled>Save Other API Settings (Example)</Button> */}


        </CardContent>
      </Card>
    </div>
  )
}
