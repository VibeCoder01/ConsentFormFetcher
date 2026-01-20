
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2, TestTube2, AlertTriangle } from 'lucide-react';
import type { ADConfig } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const emptyConfig: Partial<ADConfig> = {
    url: '',
    baseDN: '',
    bindDN: '',
    caFile: '',
    groupDNs: {
        user: '',
        change: '',
        full: ''
    }
};

export default function ADConfigPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Partial<ADConfig>>(emptyConfig);
  const [initialConfig, setInitialConfig] = useState<Partial<ADConfig>>(emptyConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [bindPassword, setBindPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const isModified = JSON.stringify(config) !== JSON.stringify(initialConfig) || passwordChanged;

  const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/config/ad');
        if (!res.ok) throw new Error('Failed to fetch AD config');
        const data: Omit<ADConfig, 'bindPassword'> = await res.json();
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

  const handleFieldChange = (field: keyof Omit<ADConfig, 'bindPassword' | 'groupDNs'>, value: string) => {
    setConfig(prev => ({...prev, [field]: value}));
  };
  
   const handleGroupDNChange = (role: 'user' | 'change' | 'full', value: string) => {
    setConfig(prev => ({
        ...prev,
        groupDNs: {
            ...prev.groupDNs,
            [role]: value,
        }
    }));
  };

  const handlePasswordChange = (value: string) => {
      setBindPassword(value);
      setPasswordChanged(true);
  }

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updates = { ...config };
    if (passwordChanged && bindPassword) {
        (updates as ADConfig).bindPassword = bindPassword;
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
      setBindPassword('');
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
        {[...Array(8)].map((_, i) => (
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
             {!isLoading && !config.caFile && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Insecure Connection</AlertTitle>
                    <AlertDescription>
                        No CA certificate file is provided. The connection to Active Directory will not be secure. This is not recommended for production environments.
                    </AlertDescription>
                </Alert>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>Connection Settings</CardTitle>
                    <CardDescription>Configure the details for connecting to your Active Directory server. Use a read-only service account for the bind credentials.</CardDescription>
                </CardHeader>
                {isLoading ? loadingSkeleton : (
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="url">LDAPS URL</Label>
                            <Input id="url" value={config.url || ''} onChange={(e) => handleFieldChange('url', e.target.value)} placeholder="ldaps://your-dc.domain.com:636" />
                        </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="baseDN">Base DN</Label>
                            <Input id="baseDN" value={config.baseDN || ''} onChange={(e) => handleFieldChange('baseDN', e.target.value)} placeholder="DC=domain,DC=com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bindDN">Bind DN</Label>
                            <Input id="bindDN" value={config.bindDN || ''} onChange={(e) => handleFieldChange('bindDN', e.target.value)} placeholder="CN=ServiceAccount,OU=Users,DC=domain,DC=com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bindPassword">Bind Password</Label>
                            <Input id="bindPassword" type="password" value={bindPassword} onChange={(e) => handlePasswordChange(e.target.value)} placeholder="Leave blank to keep existing password" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="caFile">CA Certificate File Path (Optional)</Label>
                            <Input id="caFile" value={config.caFile || ''} onChange={(e) => handleFieldChange('caFile', e.target.value)} placeholder="e.g., C:\\certs\\ca.pem or /etc/ssl/certs/ca.pem" />
                        </div>
                    </CardContent>
                )}
                 <CardFooter>
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Security Note</AlertTitle>
                        <AlertDescription>
                            The Bind Password is not displayed. To change it, enter a new password and save. 
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Role-Based Access Control</CardTitle>
                    <CardDescription>Map Active Directory security groups to application access levels. A user's highest role will be used. 'Full' includes 'Change' and 'User' access.</CardDescription>
                </CardHeader>
                {isLoading ? <div className="p-6"><Skeleton className="h-32 w-full" /></div> : (
                     <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="groupUser">User Access Group DN</Label>
                            <Input id="groupUser" value={config.groupDNs?.user || ''} onChange={(e) => handleGroupDNChange('user', e.target.value)} placeholder="CN=AppUsers,OU=Groups,DC=domain,DC=com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="groupChange">Change Access Group DN</Label>
                            <Input id="groupChange" value={config.groupDNs?.change || ''} onChange={(e) => handleGroupDNChange('change', e.target.value)} placeholder="CN=AppAdmins-Change,OU=Groups,DC=domain,DC=com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="groupFull">Full Access Group DN</Label>
                            <Input id="groupFull" value={config.groupDNs?.full || ''} onChange={(e) => handleGroupDNChange('full', e.target.value)} placeholder="CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com" />
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
      </main>
    </div>
  );
}
