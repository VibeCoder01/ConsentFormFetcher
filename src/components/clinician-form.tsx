
'use client';

import { useMemo, useState } from 'react';
import { StaffMember, TumourSite } from '@/lib/types';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

interface ClinicianFormProps {
  staffMembers: StaffMember[];
  tumourSites: TumourSite[];
  selectedStaffId?: string | null;
  onStaffMemberChange: (staffId: string | null) => void;
}

export function ClinicianForm({ staffMembers, tumourSites, selectedStaffId, onStaffMemberChange }: ClinicianFormProps) {
    const [selectedTumourSiteId, setSelectedTumourSiteId] = useState<string | null>(null);
    const [consultantSearch, setConsultantSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const normalizedSearch = consultantSearch.trim().toLowerCase();

    const selectedStaff = useMemo(() => {
        if (!selectedStaffId) return null;
        return staffMembers.find(staff => staff.id === selectedStaffId) ?? null;
    }, [selectedStaffId, staffMembers]);

    const showConsultantWarning = useMemo(() => {
        if (!selectedStaff) return false;
        const lowerCaseTitle = selectedStaff.title.toLowerCase();
        return !lowerCaseTitle.includes('consultant') && !lowerCaseTitle.includes('doctor');
    }, [selectedStaff]);

    const filteredStaffMembers = useMemo(() => {
        return staffMembers.filter(staff => {
            const matchesTumourSite = !selectedTumourSiteId ||
                staff.speciality1 === selectedTumourSiteId ||
                staff.speciality2 === selectedTumourSiteId ||
                staff.speciality3 === selectedTumourSiteId;

            if (!matchesTumourSite) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            const searchableText = `${staff.name} ${staff.title}`.toLowerCase();
            return searchableText.includes(normalizedSearch);
        });
    }, [normalizedSearch, selectedTumourSiteId, staffMembers]);

    const showSearchResults = isSearchFocused && normalizedSearch.length > 0;

    const handleTumourSiteChange = (siteId: string) => {
        // "all" is a special value to clear the filter
        if (siteId === 'all') {
            setSelectedTumourSiteId(null);
        } else {
            setSelectedTumourSiteId(siteId);
        }
        onStaffMemberChange(null); // Reset clinician selection when site changes
    };

    const handleConsultantSearchChange = (value: string) => {
        setConsultantSearch(value);

        if (selectedStaffId) {
            onStaffMemberChange(null);
        }
    };

    const handleStaffSuggestionSelect = (staff: StaffMember) => {
        setConsultantSearch(staff.name);
        onStaffMemberChange(staff.id);
        setIsSearchFocused(false);
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
                    <Label htmlFor="clinicianSearch">Select Clinician</Label>
                    <div className="relative">
                        <Input
                            id="clinicianSearch"
                            type="text"
                            value={consultantSearch}
                            onChange={(event) => handleConsultantSearchChange(event.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setIsSearchFocused(false);
                                }

                                if (event.key === 'Enter' && filteredStaffMembers.length > 0) {
                                    event.preventDefault();
                                    handleStaffSuggestionSelect(filteredStaffMembers[0]);
                                }
                            }}
                            placeholder="Type a consultant name to search..."
                            autoComplete="off"
                        />
                        {showSearchResults && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-md">
                                {filteredStaffMembers.length > 0 ? (
                                    filteredStaffMembers.map(staff => (
                                        <button
                                            key={staff.id}
                                            type="button"
                                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => handleStaffSuggestionSelect(staff)}
                                        >
                                            <span className="font-medium">{staff.name}</span>
                                            <span className="text-muted-foreground">{staff.title}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">
                                        No clinicians match the current search.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                            {filteredStaffMembers.length > 0 ? (
                                filteredStaffMembers.map(staff => (
                                    <SelectItem key={staff.id} value={staff.id}>{staff.name} - {staff.title}</SelectItem>
                                ))
                            ) : (
                                <SelectItem value="no-matching-clinicians" disabled>No clinicians match the current search.</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
