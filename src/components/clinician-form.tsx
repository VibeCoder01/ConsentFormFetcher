
'use client';

import { StaffMember } from '@/lib/types';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface ClinicianFormProps {
  staffMembers: StaffMember[];
  selectedStaffId?: string | null;
  onStaffMemberChange: (staffId: string) => void;
}

export function ClinicianForm({ staffMembers, selectedStaffId, onStaffMemberChange }: ClinicianFormProps) {
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
                    <Label htmlFor="clinicianName">Select Clinician</Label>
                    <Select
                        value={selectedStaffId || ''}
                        onValueChange={onStaffMemberChange}
                    >
                        <SelectTrigger 
                            id="clinicianName"
                             className={cn(!selectedStaffId && "bg-red-100 dark:bg-red-900/30")}
                        >
                            <SelectValue placeholder="Make a selection" />
                        </SelectTrigger>
                        <SelectContent>
                            {staffMembers.map(staff => (
                                <SelectItem key={staff.id} value={staff.id}>{staff.name} - {staff.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

    