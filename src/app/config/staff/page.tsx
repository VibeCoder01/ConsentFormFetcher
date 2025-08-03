
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2, Download, Upload, Eraser } from 'lucide-react';
import type { StaffMember } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function isValidStaffList(data: any): data is StaffMember[] {
    if (!Array.isArray(data)) return false;
    return data.every(item =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.title === 'string' &&
        typeof item.phone === 'string'
    );
}

export default function StaffConfigPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [initialStaff, setInitialStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const isModified = JSON.stringify(staff) !== JSON.stringify(initialStaff);

  useEffect(() => {
    async function fetchStaff() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/staff');
        if (!res.ok) throw new Error('Failed to fetch staff');
        const data: StaffMember[] = await res.json();
        setStaff(data);
        setInitialStaff(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load staff data.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStaff();
  }, [toast]);

  const handleFieldChange = (index: number, field: keyof Omit<StaffMember, 'id'>, value: string) => {
    const updatedStaff = [...staff];
    updatedStaff[index] = { ...updatedStaff[index], [field]: value };
    setStaff(updatedStaff);
  };

  const addStaffMember = () => {
    setStaff([...staff, { id: `new_${Date.now()}`, name: '', title: '', phone: '' }]);
  };

  const removeStaffMember = (index: number) => {
    const updatedStaff = staff.filter((_, i) => i !== index);
    setStaff(updatedStaff);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const nonEmptyStaff = staff.filter(member => member.name || member.title || member.phone);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nonEmptyStaff),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes.');
      }
      
      toast({
        title: 'Success',
        description: 'Staff list updated successfully.',
      });
      setStaff(nonEmptyStaff);
      setInitialStaff(nonEmptyStaff);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save staff list. ${errorMessage}`,
      });
    } finally {
        setIsSaving(false);
    }
  };

  const handleClearList = () => {
      setStaff([]);
      setShowClearConfirm(false);
      toast({
          title: "List Cleared",
          description: "Click 'Save All Changes' to make it permanent.",
      });
  };
  
  const handleExportList = () => {
      if(staff.length === 0) {
          toast({ variant: 'destructive', title: 'Cannot Export', description: 'Staff list is empty.'});
          return;
      }
      const jsonData = JSON.stringify(staff, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'staff-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Staff list exported.'});
  };

  const handleImportClick = () => {
      importFileRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("File content is not readable.");
              const importedData = JSON.parse(text);

              if (!isValidStaffList(importedData)) {
                  throw new Error("Invalid file format. The file should be an array of staff members with id, name, title, and phone fields.");
              }
              
              setStaff(importedData);
              toast({
                  title: 'Import Successful',
                  description: "Staff list has been replaced. Click 'Save All Changes' to make it permanent.",
              });

          } catch (error) {
               const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
               toast({
                   variant: 'destructive',
                   title: 'Import Failed',
                   description: errorMessage,
               });
          }
      };
      reader.onerror = () => {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to read the file.'});
      }
      reader.readAsText(file);

      // Reset file input value to allow re-importing the same file
      event.target.value = '';
  };
  
  const loadingSkeleton = (
    <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/5" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
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

  const isLastMemberEmpty = () => {
      if (staff.length === 0) return false;
      const lastMember = staff[staff.length - 1];
      return !lastMember.name && !lastMember.title && !lastMember.phone;
  };

  const addStaffButton = (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="inline-block"> 
                    <Button onClick={addStaffMember} disabled={isLastMemberEmpty()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                </div>
            </TooltipTrigger>
            {isLastMemberEmpty() && (
                 <TooltipContent>
                    <p>Please fill in the last staff member before adding a new one.</p>
                </TooltipContent>
            )}
        </Tooltip>
    </TooltipProvider>
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
            <h1 className="ml-4 text-xl font-bold">Edit Staff List</h1>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={handleSaveChanges} disabled={isSaving || !isModified}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
         </div>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>Staff Management Actions</CardTitle>
                <CardDescription>Use these actions to manage the entire staff list.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {addStaffButton}
                 <Button variant="outline" onClick={() => setShowClearConfirm(true)} disabled={staff.length === 0}>
                    <Eraser className="mr-2 h-4 w-4" />
                    Clear Staff List
                </Button>
                <Button variant="outline" onClick={handleExportList} disabled={staff.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Staff List
                </Button>
                <Button variant="outline" onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Staff List
                </Button>
                <input
                    type="file"
                    ref={importFileRef}
                    onChange={handleFileImport}
                    accept="application/json"
                    className="hidden"
                />
            </CardContent>
          </Card>
          
          {isLoading ? loadingSkeleton : (
            <div className="space-y-6">
                {staff.map((member, index) => (
                    <Card key={member.id}>
                        <CardHeader>
                            <CardTitle>Staff Member #{index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor={`name-${index}`}>Full Name</Label>
                                <Input id={`name-${index}`} value={member.name} onChange={(e) => handleFieldChange(index, 'name', e.target.value)} placeholder="e.g., Dr. Jane Doe"/>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor={`title-${index}`}>Job Title</Label>
                                <Input id={`title-${index}`} value={member.title} onChange={(e) => handleFieldChange(index, 'title', e.target.value)} placeholder="e.g., Consultant Oncologist"/>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor={`phone-${index}`}>Phone/Bleep</Label>
                                <Input id={`phone-${index}`} value={member.phone} onChange={(e) => handleFieldChange(index, 'phone', e.target.value)} placeholder="e.g., 1234"/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="destructive" size="sm" onClick={() => removeStaffMember(index)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
          )}

           {!isLoading && staff.length === 0 && (
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle>The Staff List is Empty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add a new staff member or import a list to get started.</p>
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
                    This action will remove all staff members from the list. This cannot be undone. You will need to save your changes to make this permanent.
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
