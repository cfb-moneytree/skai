"use client";

import React, { useState, useEffect } from 'react'; // Added useEffect
import { useRouter } from 'next/navigation'; // Ensure useRouter is imported
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/portal/card';
import { Button } from '@/components/portal/button';
import { Input } from '@/components/portal/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // Import Supabase client

export default function PublicPortalPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter(); // Initialize router

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmailForWelcome, setUserEmailForWelcome] = useState<string | null>(null);

  // Middleware now handles redirection, so we only need to listen for sign-out events
  // to refresh the page and let the middleware take over.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMessage(error.message);
    } else if (data.user) {
      const userRole = data.user.user_metadata?.role;

      if (userRole === 'student') {
      } else {
        // Not a student, sign them out immediately
        await supabase.auth.signOut();
        setErrorMessage("Access denied. This portal is for students only.");
        // Clear password field for security
        setPassword('');
      }
    }
    // setIsLoading(false);
  };

  // Show loader only during form submission
  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center px-6 py-8 md:py-16 flex-grow h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-slate-800" />
      </main>
    );
  }

  
  // The isAuthenticated state and the "blank page" view are removed from this page.
  // Auth state will be checked by useEffect, and successful login/signup redirects to onboarding.

  return (
    // The PortalHeader is in app/portal/layout.tsx
    <main className="flex flex-col items-center justify-center px-6 py-8 md:py-16 flex-grow">
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md w-full max-w-md text-sm">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md w-full max-w-md text-sm">
          {successMessage}
        </div>
      )}
      {/* Sign Up Form Card */}

      {/* Sign In Form Card */}
      {!isSignUp && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Sign In</CardTitle> {/* Added text-slate-800 */}
            <CardDescription className="text-gray-600 mt-2">
              Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4"> {/* Applied test.js class */}
            <form onSubmit={handleSignIn} className="space-y-4">
               <div>
                <label htmlFor="signin-email" className="sr-only">Email address</label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  disabled={isLoading}
                />
              </div>
              <div className="relative">
                <label htmlFor="signin-password" className="sr-only">Password</label>
                <Input
                  id="signin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  disabled={isLoading}
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-sm leading-5 text-slate-500 hover:text-slate-700 hover:bg-transparent h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <Button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}