
'use client';

import { useMemo, useState } from 'react';
import { StaffMember, TumourSite } from '@/lib/types';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface ClinicianFormProps {
  staffMembers: StaffMember[];
  tumourSites: TumourSite[];
  selectedStaffId?: string | null;
  onStaffMemberChange: (staffId: string | null) => void;
}

export function ClinicianForm({ staffMembers, tumourSites, selectedStaffId, onStaffMemberChange }: ClinicianFormProps) {
    const [selectedTumourSiteId, setSelectedTumourSiteId] = useState<string | null>(null);

    const showConsultantWarning = useMemo(() => {
        if (!selectedStaffId) return false;
        const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);
        if (!selectedStaff) return false;
        const lowerCaseTitle = selectedStaff.title.toLowerCase();
        return !lowerCaseTitle.includes('consultant') && !lowerCaseTitle.includes('doctor');
    }, [selectedStaffId, staffMembers]);

    const filteredStaffMembers = useMemo(() => {
        if (!selectedTumourSiteId) {
            return staffMembers;
        }
        return staffMembers.filter(staff => 
            staff.speciality1 === selectedTumourSiteId ||
            staff.speciality2 === selectedTumourSiteId ||
            staff.speciality3 === selectedTumourSiteId
        );
    }, [selectedTumourSiteId, staffMembers]);

    const handleTumourSiteChange = (siteId: string) => {
        // "all" is a special value to clear the filter
        if (siteId === 'all') {
            setSelectedTumourSiteId(null);
        } else {
            setSelectedTumourSiteId(siteId);
        }
        onStaffMemberChange(null); // Reset clinician selection when site changes
    };

    if (!staffMembers || staffMembers.length === 0) {
        return (
             <div className="p-4 border-b">
                <div className="px-2 space-y-2">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 border-b">
            <h2 className="px-2 text-lg font-semibold tracking-tight mb-2">
                Clinician Details
            </h2>
            <div className="space-y-4 px-2">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="tumourSite">Filter by Tumour Site</Label>
                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedTumourSiteId || 'all'}
                            onValueChange={handleTumourSiteChange}
                        >
                            <SelectTrigger id="tumourSite">
                                <SelectValue placeholder="Select a tumour site..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Show All Clinicians</SelectItem>
                                {tumourSites.map(site => (
                                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="clinicianName">Select Clinician</Label>
                    <Select
                        value={selectedStaffId || ''}
                        onValueChange={onStaffMemberChange}
                    >
                        <SelectTrigger 
                            id="clinicianName"
                             className={cn(
                                 !selectedStaffId && "bg-red-100 dark:bg-red-900/30",
                                 showConsultantWarning && "bg-orange-200 dark:bg-orange-800/50"
                             )}
                        >
                            <SelectValue placeholder={selectedTumourSiteId ? "Select a matching clinician" : "Select a clinician"} />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredStaffMembers.map(staff => (
                                <SelectItem key={staff.id} value={staff.id}>{staff.name} - {staff.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
