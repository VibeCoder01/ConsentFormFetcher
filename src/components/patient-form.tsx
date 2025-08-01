
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
import { RNumberPromptDialog } from './r-number-prompt-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PatientFormProps {
  patientData: PatientData;
  initialData: PatientData;
  setPatientData: (data: PatientData, fromDemographics?: boolean) => void;
  staffMembers: StaffMember[];
}

const identifierOptions: { value: IdentifierType; label: string }[] = [
    { value: 'rNumber', label: 'KOMS patient number' },
    { value: 'nhsNumber', label: 'NHS Number' },
    { value: 'hospitalNumber', label: 'Hospital Number' },
    { value: 'hospitalNumberMTW', label: 'Hospital Number (MTW)' },
];

const hospitalOptions = [
    "Kent Oncology Centre",
    "Kent Oncology Centre - Maidstone Hospital",
    "Kent Oncology Centre - Kent & Canterbury Hospital"
];

export function PatientForm({ patientData, initialData, setPatientData, staffMembers }: PatientFormProps) {
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  const [showRNumberPrompt, setShowRNumberPrompt] = useState(false);
  const [isFetchingDemographics, setIsFetchingDemographics] = useState(false);
  const [demographicsLoaded, setDemographicsLoaded] = useState(false);
  const { toast } = useToast();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPatientData({
      ...patientData,
      [name]: value,
    });
  };

  const handleIdentifierChange = (value: string) => {
    setPatientData({
        ...patientData,
        selectedIdentifier: value as IdentifierType,
    });
  };

  const handleHospitalChange = (value: string) => {
    setPatientData({
      ...patientData,
      hospitalName: value,
    });
  };
  
  const handleMacmillanChange = (value: string) => {
      setPatientData({
          ...patientData,
          macmillanContactId: value
      });
  };

  const handleRNumberSubmit = async (rNumber: string) => {
    setIsFetchingDemographics(true);
    setShowRNumberPrompt(false);
    toast({
      title: 'Fetching...',
      description: `Getting demographics for ${rNumber}...`,
    });

    try {
        const response = await fetch(`/api/koms?RNumber=${rNumber}`);
        const data: KomsResponse | { error: string } = await response.json();

        if (!response.ok || 'error' in data) {
            const errorMsg = 'error' in data ? data.error : `Request failed with status ${response.status}`;
            throw new Error(errorMsg);
        }
        
        setDemographicsLoaded(true);

        // We have good data, update the form
        setPatientData({
            ...patientData,
            forename: data.forename || '',
            surname: data.surname || '',
            dob: data.dob || '',
            rNumber: data.rNumber || rNumber,
            addr1: data.addr1 || '',
            addr2: data.addr2 || '',
            addr3: data.addr3 || '',
            postcode: data.postcode || '',
            homePhone: data.homePhone || '',
            gpName: data.gpName || '',
            nhsNumber: data.nhsNumber || '',
            hospitalNumber: data.hospitalNumber || '',
            hospitalNumberMTW: data.hospitalNumberMTW || '',
            hospitalName: '', // Reset hospital dropdown
            macmillanContactId: null, // Reset macmillan dropdown
        }, true); // Pass true to indicate it's from demographics fetch

        toast({
            title: 'Success',
            description: `Successfully fetched details for ${data.fullName}.`,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
            variant: "destructive",
            title: "Fetch Failed",
            description: errorMessage,
        });
    } finally {
        setIsFetchingDemographics(false);
    }
  }

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
    return !demographicsLoaded && patientData[fieldName] === initialData[fieldName];
  };


  return (
    <div className="p-2 md:p-4 border-b">
       <div className="flex justify-between items-center px-2 mb-4">
        <h2 className="text-lg font-semibold tracking-tight">
            Patient Details
        </h2>
        <Button size="sm" onClick={() => setShowRNumberPrompt(true)} disabled={isFetchingDemographics}>
            {isFetchingDemographics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Get Live Patient Demographics
        </Button>
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
           <Select
            value={patientData.hospitalName}
            onValueChange={handleHospitalChange}
          >
            <SelectTrigger 
                id="hospitalName" 
                className={cn(!patientData.hospitalName && "bg-red-100 dark:bg-red-900/30")}
            >
              <SelectValue placeholder="Make a selection" />
            </SelectTrigger>
            <SelectContent>
              {hospitalOptions.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="macmillanContact">Macmillan Contact</Label>
          <Select
              value={patientData.macmillanContactId || ''}
              onValueChange={handleMacmillanChange}
          >
              <SelectTrigger 
                id="macmillanContact" 
                className={cn(!patientData.macmillanContactId && "bg-red-100 dark:bg-red-900/30")}
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
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="rNumber">KOMS patient number</Label>
          <Input type="text" id="rNumber" name="rNumber" value={patientData.rNumber} onChange={handleChange} className={cn(isInitialValue('rNumber') && "bg-red-100 dark:bg-red-900/30")} />
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
                        <Label htmlFor={option.value} className="font-normal">{option.label}</Label>
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
      <RNumberPromptDialog 
        open={showRNumberPrompt} 
        onOpenChange={setShowRNumberPrompt}
        onSubmit={handleRNumberSubmit}
        isSubmitting={isFetchingDemographics}
      />
    </div>
  );
}
