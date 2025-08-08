
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2, Eraser } from 'lucide-react';
import type { EmailContact } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function EmailConfigPage() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<EmailContact[]>([]);
  const [initialEmails, setInitialEmails] = useState<EmailContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isModified = JSON.stringify(emails) !== JSON.stringify(initialEmails);

  const fetchEmails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/email');
        if (!res.ok) throw new Error('Failed to fetch emails');
        const data: EmailContact[] = await res.json();
        setEmails(data);
        setInitialEmails(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load email list.',
        });
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchEmails();
  }, [toast]);

  const handleFieldChange = (index: number, value: string) => {
    const updatedEmails = [...emails];
    updatedEmails[index] = { ...updatedEmails[index], email: value };
    setEmails(updatedEmails);
  };

  const addEmail = () => {
    setEmails([...emails, { id: `new_${Date.now()}`, email: '' }]);
  };

  const removeEmail = (index: number) => {
    const updatedEmails = emails.filter((_, i) => i !== index);
    setEmails(updatedEmails);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const validEmails = emails.filter(contact => contact.email.trim() !== '');
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validEmails),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes.');
      }
      
      toast({
        title: 'Success',
        description: 'Email list updated successfully.',
      });
      setEmails(validEmails);
      setInitialEmails(validEmails);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save email list. ${errorMessage}`,
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleClearList = () => {
      setEmails([]);
      setShowClearConfirm(false);
      toast({
          title: "List Cleared",
          description: "Click 'Save All Changes' to make it permanent.",
      });
  };

  const isLastEmailEmpty = () => {
      if (emails.length === 0) return false;
      const lastEmail = emails[emails.length - 1];
      return !lastEmail.email;
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 justify-between">
         <div className="flex items-center">
            <Link href="/config" aria-label="Back to configuration">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="ml-4 text-xl font-bold">Edit Email List</h1>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={addEmail} disabled={isLastEmailEmpty()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Email
            </Button>
             <Button variant="outline" onClick={() => setShowClearConfirm(true)} disabled={emails.length === 0}>
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
                    <CardTitle>Email Recipients</CardTitle>
                    <CardDescription>Manage the list of email addresses for notifications.</CardDescription>
                </CardHeader>
            </Card>

          {isLoading ? loadingSkeleton : (
            <div className="space-y-6">
                {emails.map((contact, index) => (
                    <Card key={contact.id}>
                        <CardContent className="pt-6">
                            <div className="space-y-1.5">
                                <Label htmlFor={`email-${index}`}>Email Address #{index + 1}</Label>
                                <Input id={`email-${index}`} value={contact.email} onChange={(e) => handleFieldChange(index, e.target.value)} placeholder="e.g., user@example.com" type="email"/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="destructive" size="sm" onClick={() => removeEmail(index)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
          )}

           {!isLoading && emails.length === 0 && (
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle>The Email List is Empty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add a new email address to get started.</p>
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
                    This action will remove all email addresses from the list. You will need to save your changes to make this permanent.
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
