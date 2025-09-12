
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2, Eraser, Upload, Download, X, Search } from 'lucide-react';
import type { StaffMember, TumourSite } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StaffConfigPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [initialStaff, setInitialStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editedStaff, setEditedStaff] = useState<StaffMember | null>(null);
  const [tumourSites, setTumourSites] = useState<TumourSite[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  const isModified = selectedStaff && editedStaff && JSON.stringify(selectedStaff) !== JSON.stringify(editedStaff);

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staff;
    const lowercasedQuery = searchQuery.toLowerCase();
    return staff.filter(member => {
        return Object.values(member).some(value => 
            String(value).toLowerCase().includes(lowercasedQuery)
        );
    });
  }, [staff, searchQuery]);

  const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [staffRes, sitesRes] = await Promise.all([
          fetch('/api/staff'),
          fetch('/api/tumour-sites')
        ]);
        if (!staffRes.ok) throw new Error('Failed to fetch staff');
        if (!sitesRes.ok) throw new Error('Failed to fetch tumour sites');
        
        const staffData: StaffMember[] = (await staffRes.json()).sort((a,b) => a.name.localeCompare(b.name));
        const sitesData: TumourSite[] = await sitesRes.json();

        setStaff(staffData);
        setInitialStaff(staffData);
        setTumourSites(sitesData);
        setSelectedStaff(null);
        setEditedStaff(null);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load initial page data.',
        });
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchInitialData();
  }, [toast]);

  const handleSelectStaff = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditedStaff(JSON.parse(JSON.stringify(member))); // Deep copy for editing
  };

  const handleFieldChange = (field: keyof Omit<StaffMember, 'id'>, value: string | null) => {
    if (editedStaff) {
      setEditedStaff({ ...editedStaff, [field]: value });
    }
  };

  const addStaffMember = () => {
    const newMember: StaffMember = { id: `new_${Date.now()}`, name: '', title: '', phone: '', speciality1: null, speciality2: null, speciality3: null, emailRecipients: '' };
    setStaff([...staff, newMember]);
    handleSelectStaff(newMember);
  };

  const removeStaffMember = async () => {
    if (!selectedStaff) return;
    
    const updatedStaff = staff.filter(s => s.id !== selectedStaff.id);
    setStaff(updatedStaff);
    await persistChanges(updatedStaff);
    setSelectedStaff(null);
    setEditedStaff(null);
    toast({ title: 'Success', description: 'Staff member removed.' });
  };

  const persistChanges = async (staffList: StaffMember[]) => {
      setIsSaving(true);
      try {
          const response = await fetch('/api/staff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(staffList),
          });
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to save changes.');
          }
          return true;
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast({ variant: "destructive", title: "Save Failed", description: errorMessage });
          return false;
      } finally {
          setIsSaving(false);
      }
  };


  const handleUpdate = async () => {
    if (!editedStaff || !selectedStaff) return;
    
    const updatedList = staff.map(s => s.id === selectedStaff.id ? editedStaff : s).sort((a,b) => a.name.localeCompare(b.name));
    
    setStaff(updatedList);
    const success = await persistChanges(updatedList);
    
    if (success) {
        setSelectedStaff(editedStaff);
        setInitialStaff(updatedList);
        toast({ title: 'Success', description: 'Staff member details updated.' });
    } else {
        // Revert on failure
        setStaff(initialStaff);
    }
  };

  const handleClearList = async () => {
      setShowClearConfirm(false);
      const success = await persistChanges([]);
      if (success) {
          fetchInitialData(); // refetch
          toast({ title: "List Cleared", description: "The staff list has been emptied." });
      }
  };

  const handleExport = async () => {
    if (staff.length === 0) {
        toast({ title: 'Nothing to Export', description: 'The staff list is empty.' });
        return;
    }
    const jsonData = JSON.stringify(staff, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff-list.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'The current staff list has been exported.'});
  };

  const handleImportClick = () => { importFileRef.current?.click(); };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("File content is not readable.");
              const importedData = JSON.parse(text);

              if (!Array.isArray(importedData)) {
                  throw new Error("Invalid file format. The file should contain a list of staff members.");
              }

              const success = await persistChanges(importedData);
              if (success) {
                toast({ title: 'Import Successful', description: "Staff list has been overwritten." });
                fetchInitialData();
              }

          } catch (error) {
               const errorMessage = error instanceof Error ? error.message : String(error);
               toast({ variant: 'destructive', title: 'Import Failed', description: errorMessage });
          }
      };
      reader.onerror = () => { toast({ variant: 'destructive', title: 'Error', description: 'Failed to read the file.'}); }
      reader.readAsText(file);
      event.target.value = '';
  };
  
  const loadingSkeleton = (
    <div className="p-2 space-y-2">
        {[...Array(10)].map((_, i) => ( <Skeleton key={i} className="h-10 w-full" /> ))}
    </div>
  );

  const SpecialitySelector = ({ field }: { field: 'speciality1' | 'speciality2' | 'speciality3' }) => (
    <div className="space-y-1.5 relative">
        <Label htmlFor={field}>Tumour Site Speciality</Label>
        <Select
            value={editedStaff?.[field] || ''}
            onValueChange={(value) => handleFieldChange(field, value)}
        >
            <SelectTrigger id={field}>
                <SelectValue placeholder="Select speciality..." />
            </SelectTrigger>
            <SelectContent>
                {tumourSites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        {editedStaff?.[field] && (
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 right-8 h-6 w-6"
                onClick={() => handleFieldChange(field, null)}
            >
                <X className="h-4 w-4" />
            </Button>
        )}
    </div>
  );

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex h-16 shrink-0 items-center border-b bg-card px-4 md:px-6 justify-between">
         <div className="flex items-center">
            <Link href="/config" aria-label="Back to configuration">
              <Button variant="ghost" size="icon"> <ArrowLeft className="h-6 w-6" /> </Button>
            </Link>
            <h1 className="ml-4 text-xl font-bold">Edit Staff List</h1>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={addStaffMember}> <PlusCircle className="mr-2 h-4 w-4" /> Add Staff Member </Button>
            <Button variant="outline" onClick={handleImportClick}> <Upload className="mr-2 h-4 w-4" /> Import </Button>
            <Button variant="outline" onClick={handleExport} disabled={staff.length === 0}> <Download className="mr-2 h-4 w-4" /> Export </Button>
            <Button variant="destructive" onClick={() => setShowClearConfirm(true)} disabled={staff.length === 0}> <Eraser className="mr-2 h-4 w-4" /> Clear List </Button>
             <input type="file" ref={importFileRef} onChange={handleFileImport} accept="application/json" className="hidden"/>
         </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/3 border-r h-full flex flex-col">
            <CardHeader>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>{filteredStaff.length} of {staff.length} member(s) shown.</CardDescription>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full"
                    />
                </div>
            </CardHeader>
            <ScrollArea className="flex-1">
                {isLoading ? loadingSkeleton : (
                    <div className="p-2 space-y-1">
                        {filteredStaff.map((member, index) => (
                            <Button
                                key={member.id}
                                variant={selectedStaff?.id === member.id ? "secondary" : "ghost"}
                                className="w-full justify-start text-left"
                                onClick={() => handleSelectStaff(member)}
                            >
                                <span className="font-semibold truncate">{member.name || "New Member"}</span>
                            </Button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </aside>
        <main className="w-2/3 flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {editedStaff ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Edit: {selectedStaff?.name || 'New Member'}</CardTitle>
                        <CardDescription>Modify the details for this staff member and click Update to save.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={editedStaff.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="e.g., Dr. Jane Doe"/>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="title">Job Title</Label>
                            <Input id="title" value={editedStaff.title} onChange={(e) => handleFieldChange('title', e.target.value)} placeholder="e.g., Consultant Oncologist"/>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone/Bleep</Label>
                            <Input id="phone" value={editedStaff.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} placeholder="e.g., 1234"/>
                        </div>
                         <SpecialitySelector field="speciality1" />
                         <SpecialitySelector field="speciality2" />
                         <SpecialitySelector field="speciality3" />
                         <div className="space-y-1.5 md:col-span-3">
                            <Label htmlFor="emailRecipients">Email Recipients (comma-separated)</Label>
                            <Input id="emailRecipients" value={editedStaff.emailRecipients} onChange={(e) => handleFieldChange('emailRecipients', e.target.value)} placeholder="e.g., recipient1@nhs.net, recipient2@nhs.net"/>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button variant="destructive" onClick={removeStaffMember}> <Trash2 className="mr-2 h-4 w-4" /> Remove </Button>
                        <Button onClick={handleUpdate} disabled={isSaving || !isModified}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Update
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <Card className="text-center w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Select a Staff Member</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Select a staff member from the list on the left to view or edit their details. Or, add a new member.</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </main>
      </div>
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This action will remove all staff members from the list. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, clear the list</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    