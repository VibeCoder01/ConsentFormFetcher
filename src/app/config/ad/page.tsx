
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2, TestTube2 } from 'lucide-react';
import type { ADConfig } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


export default function ADConfigPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Partial<ADConfig>>({});
  const [initialConfig, setInitialConfig] = useState<Partial<ADConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const isModified = JSON.stringify(config) !== JSON.stringify(initialConfig) || passwordChanged;

  const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/config/ad');
        if (!res.ok) throw new Error('Failed to fetch AD config');
        const data: Omit<ADConfig, 'password'> = await res.json();
        setConfig(data);
        setInitialConfig(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load AD configuration.',
        });
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchConfig();
  }, [toast]);

  const handleFieldChange = (field: keyof Omit<ADConfig, 'password'>, value: string) => {
    setConfig(prev => ({...prev, [field]: value}));
  };

  const handlePasswordChange = (value: string) => {
      setPassword(value);
      setPasswordChanged(true);
  }

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updates = { ...config };
    if (passwordChanged && password) {
        (updates as ADConfig).password = password;
    }

    try {
      const response = await fetch('/api/config/ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes.');
      }
      
      toast({
        title: 'Success',
        description: 'Active Directory configuration saved.',
      });
      // Refetch config to update initial state, excluding password
      const newConfig = { ...config };
      setInitialConfig(newConfig);
      setPassword('');
      setPasswordChanged(false);

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save AD config. ${errorMessage}`,
      });
    } finally {
        setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    // You might want to save unsaved changes before testing
    if (isModified) {
        toast({
            variant: "destructive",
            title: "Unsaved Changes",
            description: "Please save your changes before testing the connection.",
        });
        setIsTesting(false);
        return;
    }
    
    try {
        const response = await fetch('/api/config/ad-test', { method: 'POST' });
        const result = await response.json();

        if (response.ok && result.success) {
            toast({
                title: "Connection Successful",
                description: result.message,
            });
        } else {
             throw new Error(result.message || 'The test request failed.');
        }
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
            variant: "destructive",
            title: "Connection Test Failed",
            description: errorMessage,
        });
    } finally {
        setIsTesting(false);
    }
  };
  
  const loadingSkeleton = (
    <CardContent className="space-y-6">
        {[...Array(4)].map((_, i) => (
             <div className="space-y-2" key={i}>
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
        ))}
    </CardContent>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 justify-between">
         <div className="flex items-center">
            <Link href="/config" aria-label="Back to configuration">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="ml-4 text-xl font-bold">Active Directory Configuration</h1>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={handleTestConnection} variant="outline" disabled={isTesting || isSaving || isModified}>
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
              Test Connection
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving || !isModified}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
         </div>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-2xl space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Connection Settings</CardTitle>
                    <CardDescription>Configure the details for connecting to your MS Windows Active Directory server.</CardDescription>
                </CardHeader>
                {isLoading ? loadingSkeleton : (
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="url">LDAP URL</Label>
                            <Input id="url" value={config.url || ''} onChange={(e) => handleFieldChange('url', e.target.value)} placeholder="ldap://your-dc.domain.com" />
                        </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="baseDN">Base DN</Label>
                            <Input id="baseDN" value={config.baseDN || ''} onChange={(e) => handleFieldChange('baseDN', e.target.value)} placeholder="dc=domain,dc=com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="username">Bind Username</Label>
                            <Input id="username" value={config.username || ''} onChange={(e) => handleFieldChange('username', e.target.value)} placeholder="CN=Binder,OU=Users,DC=domain,DC=com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Bind Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => handlePasswordChange(e.target.value)} placeholder="Leave blank to keep existing password" />
                        </div>
                    </CardContent>
                )}
                 <CardFooter>
                    <Alert>
                        <AlertTitle>Security Note</AlertTitle>
                        <AlertDescription>
                            The Bind Password is write-only. It is stored securely on the server and will not be displayed here again. If you need to change it, simply enter a new password and save.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </Card>
        </div>
      </main>
    </div>
  );
}
