
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2 } from 'lucide-react';
import type { StaffMember } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function StaffConfigPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchStaff() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/staff');
        if (!res.ok) throw new Error('Failed to fetch staff');
        const data: StaffMember[] = await res.json();
        setStaff(data);
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
    // Filter out any completely empty staff members before saving
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
      // Re-set the state with the potentially filtered list
      setStaff(nonEmptyStaff);
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
                        Add New Staff Member
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
      <header className="flex h-16 items-center border-b bg-card px-4 md:px-6">
        <Link href="/config" aria-label="Back to configuration">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="ml-4 text-xl font-bold">Edit Staff List</h1>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Modify details, add, or remove staff members.</p>
            {addStaffButton}
          </div>
          
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

          {!isLoading && staff.length > 0 && (
            <div className="mt-8 flex justify-between items-center">
                {addStaffButton}
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>
          )}
           {!isLoading && staff.length === 0 && (
                <div className="mt-8 flex justify-end">
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save All Changes
                    </Button>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
