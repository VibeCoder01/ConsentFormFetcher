
'use client';

import { PatientData, IdentifierType, StaffMember } from '@/lib/types';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { AgeWarningDialog } from './age-warning-dialog';

interface PatientFormProps {
  patientData: PatientData;
  setPatientData: (data: PatientData) => void;
  staffMembers: StaffMember[];
}

const identifierOptions: { value: IdentifierType; label: string }[] = [
    { value: 'rNumber', label: 'R Number' },
    { value: 'nhsNumber', label: 'NHS Number' },
    { value: 'hospitalNumber', label: 'Hospital Number' },
    { value: 'hospitalNumberMTW', label: 'Hospital Number (MTW)' },
];

const hospitalOptions = [
    "Kent Oncology Centre",
    "Kent Oncology Centre - Maidstone Hospital",
    "Kent Oncology Centre - Kent & Canterbury Hospital"
];

export function PatientForm({ patientData, setPatientData, staffMembers }: PatientFormProps) {
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  
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


  return (
    <div className="p-2 md:p-4 border-b">
       <h2 className="px-2 text-lg font-semibold tracking-tight mb-2">
          Patient Details
        </h2>
      <div className="space-y-4 px-2">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="forename">Forename</Label>
          <Input type="text" id="forename" name="forename" value={patientData.forename} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="surname">Surname</Label>
          <Input type="text" id="surname" name="surname" value={patientData.surname} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input 
            type="date" 
            id="dob" 
            name="dob" 
            value={patientData.dob} 
            onChange={handleChange} 
            className={cn(isUnder16 && "bg-red-100 dark:bg-red-900/30 border-red-500")}
          />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="addr1">Address Line 1</Label>
          <Input type="text" id="addr1" name="addr1" value={patientData.addr1} onChange={handleChange} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="addr2">Address Line 2</Label>
          <Input type="text" id="addr2" name="addr2" value={patientData.addr2} onChange={handleChange} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="addr3">Address Line 3</Label>
          <Input type="text" id="addr3" name="addr3" value={patientData.addr3} onChange={handleChange} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="postcode">Postcode</Label>
          <Input type="text" id="postcode" name="postcode" value={patientData.postcode} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="homePhone">Home Phone</Label>
          <Input type="text" id="homePhone" name="homePhone" value={patientData.homePhone} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="gpName">GP Name</Label>
          <Input type="text" id="gpName" name="gpName" value={patientData.gpName} onChange={handleChange} />
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
          <Label htmlFor="rNumber">R Number</Label>
          <Input type="text" id="rNumber" name="rNumber" value={patientData.rNumber} onChange={handleChange} />
        </div>
         <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="nhsNumber">NHS Number</Label>
          <Input type="text" id="nhsNumber" name="nhsNumber" value={patientData.nhsNumber} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="hospitalNumber">Hospital Number</Label>
          <Input type="text" id="hospitalNumber" name="hospitalNumber" value={patientData.hospitalNumber} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="hospitalNumberMTW">Hospital Number (MTW)</Label>
          <Input type="text" id="hospitalNumberMTW" name="hospitalNumberMTW" value={patientData.hospitalNumberMTW} onChange={handleChange} />
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
            <Input type="text" id="uniqueIdentifierValue" name="uniqueIdentifierValue" value={patientData.uniqueIdentifierValue} readOnly disabled />
        </div>
      </div>
      <AgeWarningDialog open={showAgeWarning} onOpenChange={setShowAgeWarning} />
    </div>
  );
}
