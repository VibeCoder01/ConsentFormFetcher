
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2, Eraser } from 'lucide-react';
import type { TumourGroup } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function TumourGroupsConfigPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<TumourGroup[]>([]);
  const [initialGroups, setInitialGroups] = useState<TumourGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { session, isLoading: isSessionLoading } = useSession();
  const hasFullAccess = session.isLoggedIn && session.roles.includes('full');
  const canEdit = session.isLoggedIn && (session.roles.includes('change') || hasFullAccess);

  const isModified = JSON.stringify(groups) !== JSON.stringify(initialGroups);

  const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/tumour-groups');
        if (!res.ok) throw new Error('Failed to fetch tumour groups');
        const data: TumourGroup[] = await res.json();
        setGroups(data);
        setInitialGroups(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load tumour group list.',
        });
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchGroups();
  }, [toast]);

  const handleFieldChange = (index: number, value: string) => {
    if (!canEdit) return;
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], name: value };
    setGroups(updatedGroups);
  };

  const addGroup = () => {
    if (!canEdit) return;
    setGroups([...groups, { id: `new_${Date.now()}`, name: '' }]);
  };

  const removeGroup = (index: number) => {
    if (!canEdit) return;
    const updatedGroups = groups.filter((_, i) => i !== index);
    setGroups(updatedGroups);
  };

  const handleSaveChanges = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    const validGroups = groups.filter(group => group.name.trim() !== '');
    try {
      const response = await fetch('/api/tumour-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validGroups),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes.');
      }
      
      toast({
        title: 'Success',
        description: 'Tumour group list updated successfully.',
      });
      setGroups(validGroups);
      setInitialGroups(validGroups);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save the list. ${errorMessage}`,
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleClearList = () => {
      if (!canEdit) return;
      setGroups([]);
      setShowClearConfirm(false);
      toast({
          title: "List Cleared",
          description: "Click 'Save Changes' to make it permanent.",
      });
  };

  const isLastGroupEmpty = () => {
      if (groups.length === 0) return false;
      const lastGroup = groups[groups.length - 1];
      return !lastGroup.name;
  };

  const loadingSkeleton = (
    <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-2/5" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-9 w-24" />
                </CardFooter>
            </Card>
        ))}
    </div>
  );

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            <h1 className="ml-4 text-xl font-bold">Edit Tumour Groups</h1>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={addGroup} disabled={!canEdit || isLastGroupEmpty()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Group
            </Button>
             <Button variant="outline" onClick={() => setShowClearConfirm(true)} disabled={!canEdit || groups.length === 0}>
                <Eraser className="mr-2 h-4 w-4" />
                Clear List
            </Button>
            <Button onClick={handleSaveChanges} disabled={!canEdit || isSaving || !isModified}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
         </div>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-2xl space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Tumour Groups</CardTitle>
                    <CardDescription>Manage the list of tumour groups. Empty entries will be removed on save.</CardDescription>
                </CardHeader>
            </Card>

          {isLoading ? loadingSkeleton : (
            <div className="space-y-6">
                {groups.map((group, index) => (
                    <Card key={group.id}>
                        <CardContent className="pt-6">
                            <div className="space-y-1.5">
                                <Label htmlFor={`group-${index}`}>Tumour Group Name #{index + 1}</Label>
                                <Input 
                                    id={`group-${index}`} 
                                    value={group.name} 
                                    onChange={(e) => handleFieldChange(index, e.target.value)} 
                                    placeholder="e.g., Head & Neck"
                                    disabled={!canEdit} 
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="destructive" size="sm" onClick={() => removeGroup(index)} disabled={!canEdit}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
          )}

           {!isLoading && groups.length === 0 && (
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle>The Tumour Group List is Empty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add a new group to get started.</p>
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
                    This action will remove all tumour groups from the list. You will need to save your changes to make this permanent.
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
