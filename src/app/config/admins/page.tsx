
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2, Eraser, ShieldX, UserCog } from 'lucide-react';
import type { AdminUser, AccessLevel } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const accessLevels: AccessLevel[] = ['Read', 'Change', 'Full'];

export default function AdminsConfigPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [initialAdmins, setInitialAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  const isModified = JSON.stringify(admins) !== JSON.stringify(initialAdmins);

  const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const [userRes, adminsRes] = await Promise.all([
          fetch('/api/auth/user', { credentials: 'include' }),
          fetch('/api/admins', { credentials: 'include' })
        ]);

        if (!userRes.ok) throw new Error('Could not authenticate current user.');
        const userData = await userRes.json();
        setCurrentUser(userData);

        if (userData.accessLevel !== 'Full') {
           setIsLoading(false);
           return;
        }

        if (!adminsRes.ok) throw new Error('Failed to fetch admin list');
        const data: AdminUser[] = await adminsRes.json();
        setAdmins(data);
        setInitialAdmins(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Could not load page data.',
        });
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchUsers();
  }, [toast]);

  const handleFieldChange = (index: number, field: keyof Omit<AdminUser, 'id'>, value: string) => {
    const updatedAdmins = [...admins];
    updatedAdmins[index] = { ...updatedAdmins[index], [field]: value };
    setAdmins(updatedAdmins);
  };

  const addAdmin = () => {
    setAdmins([...admins, { id: `new_${Date.now()}`, username: '', accessLevel: 'Read' }]);
  };

  const removeAdmin = (index: number) => {
    const updatedAdmins = admins.filter((_, i) => i !== index);
    setAdmins(updatedAdmins);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const validAdmins = admins.filter(admin => admin.username.trim() !== '');
    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(validAdmins),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes.');
      }
      
      toast({
        title: 'Success',
        description: 'Admin list updated successfully.',
      });
      setAdmins(validAdmins);
      setInitialAdmins(validAdmins);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save admin list. ${errorMessage}`,
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleClearList = () => {
      const fullAdmins = admins.filter(admin => admin.accessLevel === 'Full');
      setAdmins(fullAdmins);
      setShowClearConfirm(false);
      toast({
          title: "List Cleared",
          description: "Admins with Read and Change permissions removed. Click 'Save Changes' to make it permanent.",
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (currentUser?.accessLevel !== 'Full') {
    return (
      <div className="flex flex-col min-h-screen w-full">
         <header className="flex h-16 items-center border-b bg-card px-4 md:px-6">
            <Link href="/config" aria-label="Back to configuration">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-6 w-6" /></Button>
            </Link>
             <h1 className="ml-4 text-xl font-bold">Manage Admins</h1>
         </header>
         <main className="flex-1 flex items-center justify-center p-8">
            <Alert variant="destructive" className="max-w-lg">
              <ShieldX className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                You do not have permission to manage administrators.
              </AlertDescription>
            </Alert>
         </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 justify-between">
         <div className="flex items-center">
            <Link href="/config" aria-label="Back to configuration">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="ml-4 text-xl font-bold">Manage Admins</h1>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={addAdmin}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Admin
            </Button>
             <Button variant="outline" onClick={() => setShowClearConfirm(true)} disabled={admins.length === 0}>
                <Eraser className="mr-2 h-4 w-4" />
                Clear List
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
                    <CardTitle>Administrator List</CardTitle>
                    <CardDescription>Manage users who can access the configuration page. Usernames must match KOMS usernames.</CardDescription>
                </CardHeader>
            </Card>

            <div className="space-y-6">
                {admins.map((admin, index) => (
                    <Card key={admin.id}>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor={`username-${index}`}>KOMS Username</Label>
                                <Input 
                                    id={`username-${index}`} 
                                    value={admin.username} 
                                    onChange={(e) => handleFieldChange(index, 'username', e.target.value)} 
                                    placeholder="e.g., jsmith"
                                    autoCapitalize="none"
                                />
                            </div>
                             <div className="space-y-1.5">
                                <Label htmlFor={`access-${index}`}>Access Level</Label>
                                <Select
                                    value={admin.accessLevel}
                                    onValueChange={(value) => handleFieldChange(index, 'accessLevel', value)}
                                >
                                    <SelectTrigger id={`access-${index}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accessLevels.map(level => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="destructive" size="sm" onClick={() => removeAdmin(index)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

           {admins.length === 0 && (
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle>The Admin List is Empty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add a new admin to get started. Be careful not to lock yourself out!</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </main>
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will remove all admins with 'Read' and 'Change' permissions from the list. Users with 'Full' access will be preserved. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, clear the list
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    