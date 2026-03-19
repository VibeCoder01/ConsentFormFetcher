
'use client';

import { PatientData, IdentifierType, StaffMember, KomsResponse } from '@/lib/types';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { AgeWarningDialog } from './age-warning-dialog';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DebugToast } from './debug-toast';

interface PatientFormProps {
  patientData: PatientData;
  initialData: PatientData;
  setPatientData: (data: PatientData, fromDemographics?: boolean) => void;
  staffMembers: StaffMember[];
  komsApiDebugMode: boolean;
  validateRNumber: boolean;
  isConfigLoading: boolean;
}

const identifierOptions: { value: IdentifierType; label: string }[] = [
    { value: 'rNumber', label: 'KOMS patient number' },
    { value: 'nhsNumber', label: 'NHS Number' },
    { value: 'hospitalNumber', label: 'Hospital Number' },
    { value: 'hospitalNumberMTW', label: 'Hospital Number (MTW)' },
];

function trimToEmpty(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function getApiErrorMessage(responseData: unknown, status: number): string {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'error' in responseData &&
    typeof responseData.error === 'string'
  ) {
    return responseData.error;
  }

  return `Request failed with status ${status}`;
}

export function PatientForm({
  patientData,
  initialData,
  setPatientData,
  staffMembers,
  komsApiDebugMode,
  validateRNumber,
  isConfigLoading,
}: PatientFormProps) {
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  const [missingIdentifierWarning, setMissingIdentifierWarning] = useState<string | null>(null);
  const [isFetchingDemographics, setIsFetchingDemographics] = useState(false);
  const [demographicsLoaded, setDemographicsLoaded] = useState(false);
  const [macmillanFilter, setMacmillanFilter] = useState<'macmillan' | 'other' | null>('macmillan');
  const { toast } = useToast();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPatientData({
      ...patientData,
      [name]: value,
    });
  };

  const handleIdentifierChange = (value: string) => {
    const selectedIdentifier = value as IdentifierType;
    const selectedIdentifierValue = trimToEmpty(patientData[selectedIdentifier]);

    setPatientData({
        ...patientData,
        selectedIdentifier,
    });

    if (!selectedIdentifierValue) {
        const selectedOption = identifierOptions.find(option => option.value === selectedIdentifier);
        setMissingIdentifierWarning(selectedOption?.label || 'The selected identifier');
    }
  };
  
  const handleMacmillanChange = (value: string) => {
      setPatientData({
          ...patientData,
          macmillanContactId: value
      });
  };

  const handleMacmillanFilterChange = (value: 'macmillan' | 'other') => {
      setMacmillanFilter(value);
      // Reset the contact selection when the filter changes
      handleMacmillanChange('');
  }

  const filteredMacmillanContacts = useMemo(() => {
    if (!macmillanFilter) return staffMembers; // Show all if no filter is selected yet
    if (macmillanFilter === 'macmillan') {
        return staffMembers.filter(s => s.title.toLowerCase().includes('macmillan'));
    }
    // "other"
    return staffMembers.filter(s => !s.title.toLowerCase().includes('macmillan'));
  }, [macmillanFilter, staffMembers]);

  const handleRNumberSubmit = async (rNumber: string) => {
    const normalizedRNumber = rNumber.trim().toUpperCase();

    setIsFetchingDemographics(true);
    toast({
      title: 'Fetching...',
      description: `Getting demographics for ${normalizedRNumber}...`,
    });
    
    let rawResponseData: unknown;

    try {
        const response = await fetch(`/api/koms?RNumber=${encodeURIComponent(normalizedRNumber)}`);
        rawResponseData = await response.json();

        if (komsApiDebugMode) {
            toast({
              title: "KOMS API Debug Response",
              duration: 15000, // Show for longer
              description: <DebugToast data={rawResponseData} />,
            });
        }

        if (
          !response.ok ||
          (rawResponseData && typeof rawResponseData === 'object' && 'error' in rawResponseData)
        ) {
            const errorMsg = getApiErrorMessage(rawResponseData, response.status);
            throw new Error(errorMsg);
        }
        
        const data = rawResponseData as KomsResponse;
        
        // Check for placeholder response which indicates user is not logged into KOMS
        if (data.forename === '${forename}') {
             if (!komsApiDebugMode) { // Only show this if debug mode is off
                toast({
                    variant: "destructive",
                    title: "Login Required",
                    description: "Please ensure you are logged into KOMS to access patient information.",
                });
             }
             return; // Stop execution
        }

        setDemographicsLoaded(true);

        // We have good data, update the form
        setPatientData({
            ...patientData,
            forename: trimToEmpty(data.forename),
            surname: trimToEmpty(data.surname),
            dob: trimToEmpty(data.dob),
            rNumber: trimToEmpty(data.rNumber) || normalizedRNumber,
            addr1: trimToEmpty(data.addr1),
            addr2: trimToEmpty(data.addr2),
            addr3: trimToEmpty(data.addr3),
            postcode: trimToEmpty(data.postcode),
            homePhone: trimToEmpty(data.homePhone),
            gpName: trimToEmpty(data.gpName),
            nhsNumber: trimToEmpty(data.nhsNumber),
            hospitalNumber: trimToEmpty(data.hospitalNumber),
            hospitalNumberMTW: trimToEmpty(data.hospitalNumberMTW),
            hospitalName: patientData.hospitalName, // Keep existing hospital name
            macmillanContactId: null, // Reset macmillan dropdown
        }, true); // Pass true to indicate it's from demographics fetch

        if (!komsApiDebugMode) {
            toast({
                title: 'Success',
                description: `Successfully fetched details for ${data.fullName}.`,
            });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
         if (!komsApiDebugMode) {
            toast({
                variant: "destructive",
                title: "Fetch Failed",
                description: errorMessage,
            });
        }
    } finally {
        setIsFetchingDemographics(false);
    }
  };

  const isUnder16 = useMemo(() => {
    if (!patientData.dob) return false;
    const birthDate = new Date(patientData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age < 16;
  }, [patientData.dob]);

  useEffect(() => {
    if (isUnder16) {
      setShowAgeWarning(true);
    }
  }, [isUnder16]);
  
  const isInitialValue = (fieldName: keyof PatientData) => {
    const currentValue = patientData[fieldName];

    if (typeof currentValue !== 'string') {
        return false;
    }

    // If live data has been loaded, nothing is an "initial value" anymore.
    if (demographicsLoaded) {
        return currentValue.trim() === '';
    }

    // If the initial data was empty (i.e., no fake data), any empty field is considered "initial".
    if (typeof initialData[fieldName] === 'string' && initialData[fieldName] === '') {
        return currentValue.trim() === '';
    }

    // Otherwise, check if the current value matches the non-empty fake data.
    return currentValue === initialData[fieldName];
  };

  const showMacmillanWarning = useMemo(() => {
      if (!patientData.macmillanContactId) return false;
      const selectedStaff = staffMembers.find(s => s.id === patientData.macmillanContactId);
      if (!selectedStaff) return false;
      return !selectedStaff.title.toLowerCase().includes('macmillan');
  }, [patientData.macmillanContactId, staffMembers]);

  const isRNumberValid = !validateRNumber || (!!patientData.rNumber && /^R\d{7}$/i.test(patientData.rNumber.trim()));

  const handleFetchDemographics = () => {
    if (!patientData.rNumber || !isRNumberValid || isFetchingDemographics || isConfigLoading) {
      return;
    }

    handleRNumberSubmit(patientData.rNumber);
  };

  const handleRNumberKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleFetchDemographics();
    }
  };


  return (
    <div className="p-2 md:p-4 border-b">
       <div className="px-2 mb-4">
        <div className="w-full space-y-1.5">
            <Label htmlFor="fetch-r-number" className="sr-only">KOMS patient number</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="sm:flex-1">
                                <Input
                                    id="fetch-r-number"
                                    type="text"
                                    name="rNumber"
                                    value={patientData.rNumber}
                                    onChange={handleChange}
                                    onKeyDown={handleRNumberKeyDown}
                                    placeholder="R Number"
                                    disabled={isFetchingDemographics || isConfigLoading}
                                    className={cn(
                                        "w-full min-w-0",
                                        isInitialValue('rNumber') && "bg-red-100 dark:bg-red-900/30",
                                        patientData.rNumber && !isRNumberValid && "border-red-500 focus-visible:ring-red-500"
                                    )}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{patientData.rNumber || 'No R number entered.'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="shrink-0">
                                <Button
                                    size="sm"
                                    onClick={handleFetchDemographics}
                                    disabled={!patientData.rNumber || isFetchingDemographics || !isRNumberValid || isConfigLoading}
                                    className="w-full whitespace-nowrap sm:w-auto sm:px-2.5"
                                >
                                    {isFetchingDemographics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Get Demographics
                                </Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Fetch patient details from KOMS. You must be logged into KOMS for this to work.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {validateRNumber ? (
                <p className={cn("text-xs text-muted-foreground", patientData.rNumber && !isRNumberValid && "text-destructive")}>
                    Enter an R number in the format R1234567.
                </p>
            ) : null}
        </div>
       </div>
      <div className="space-y-4 px-2">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="forename">Forename</Label>
          <Input type="text" id="forename" name="forename" value={patientData.forename} onChange={handleChange} className={cn(isInitialValue('forename') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="surname">Surname</Label>
          <Input type="text" id="surname" name="surname" value={patientData.surname} onChange={handleChange} className={cn(isInitialValue('surname') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input 
            type="date" 
            id="dob" 
            name="dob" 
            value={patientData.dob} 
            onChange={handleChange} 
            className={cn(
                isUnder16 && "bg-red-100 dark:bg-red-900/30 border-red-500",
                isInitialValue('dob') && "bg-red-100 dark:bg-red-900/30"
            )}
          />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="addr1">Address Line 1</Label>
          <Input type="text" id="addr1" name="addr1" value={patientData.addr1} onChange={handleChange} className={cn(isInitialValue('addr1') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="addr2">Address Line 2</Label>
          <Input type="text" id="addr2" name="addr2" value={patientData.addr2} onChange={handleChange} className={cn(isInitialValue('addr2') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="addr3">Address Line 3</Label>
          <Input type="text" id="addr3" name="addr3" value={patientData.addr3} onChange={handleChange} className={cn(isInitialValue('addr3') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="postcode">Postcode</Label>
          <Input type="text" id="postcode" name="postcode" value={patientData.postcode} onChange={handleChange} className={cn(isInitialValue('postcode') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="homePhone">Home Phone</Label>
          <Input type="text" id="homePhone" name="homePhone" value={patientData.homePhone} onChange={handleChange} className={cn(isInitialValue('homePhone') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="gpName">GP Name</Label>
          <Input type="text" id="gpName" name="gpName" value={patientData.gpName} onChange={handleChange} className={cn(isInitialValue('gpName') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="hospitalName">Name of Hospital</Label>
          <Input type="text" id="hospitalName" name="hospitalName" value={patientData.hospitalName} onChange={handleChange} className={cn(isInitialValue('hospitalName') && "bg-red-100 dark:bg-red-900/30")}/>
        </div>

        <div className="space-y-2">
            <Label>Macmillan Contact</Label>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Select
                    value={macmillanFilter || ''}
                    onValueChange={(value) => handleMacmillanFilterChange(value as 'macmillan' | 'other')}
                >
                    <SelectTrigger id="macmillanFilter">
                        <SelectValue placeholder="Filter by contact type..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="macmillan">Macmillan</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Select
                    value={patientData.macmillanContactId || ''}
                    onValueChange={handleMacmillanChange}
                    disabled={!macmillanFilter}
                >
                    <SelectTrigger 
                        id="macmillanContact" 
                        className={cn(
                        !patientData.macmillanContactId && "bg-red-100 dark:bg-red-900/30",
                        showMacmillanWarning && "bg-orange-200 dark:bg-orange-800/50"
                        )}
                    >
                        <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredMacmillanContacts.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>{staff.name} - {staff.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="nhsNumber">NHS Number</Label>
          <Input type="text" id="nhsNumber" name="nhsNumber" value={patientData.nhsNumber} onChange={handleChange} className={cn(isInitialValue('nhsNumber') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="hospitalNumber">Hospital Number</Label>
          <Input type="text" id="hospitalNumber" name="hospitalNumber" value={patientData.hospitalNumber} onChange={handleChange} className={cn(isInitialValue('hospitalNumber') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="hospitalNumberMTW">Hospital Number (MTW)</Label>
          <Input type="text" id="hospitalNumberMTW" name="hospitalNumberMTW" value={patientData.hospitalNumberMTW} onChange={handleChange} className={cn(isInitialValue('hospitalNumberMTW') && "bg-red-100 dark:bg-red-900/30")} />
        </div>
        
        <div className="grid w-full max-w-sm items-center gap-2.5">
            <Label>Select Unique Patient Identifier</Label>
            <RadioGroup 
                value={patientData.selectedIdentifier} 
                onValueChange={handleIdentifierChange}
                className="gap-2"
            >
                {identifierOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
        
        <div className="grid w-full max-w-sm items-center gap-1.5 pb-4">
            <Label htmlFor="uniqueIdentifierValue">Unique Patient Identifier</Label>
            <Input type="text" id="uniqueIdentifierValue" name="uniqueIdentifierValue" value={patientData.uniqueIdentifierValue} readOnly />
        </div>
      </div>
      <AgeWarningDialog open={showAgeWarning} onOpenChange={setShowAgeWarning} />
      <AlertDialog open={missingIdentifierWarning !== null} onOpenChange={(open) => {
        if (!open) {
          setMissingIdentifierWarning(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unique Patient Identifier Missing</AlertDialogTitle>
            <AlertDialogDescription>
              {missingIdentifierWarning} is blank. Please populate it before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button onClick={() => setMissingIdentifierWarning(null)}>OK</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
