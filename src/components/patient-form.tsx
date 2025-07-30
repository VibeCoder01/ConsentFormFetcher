
'use client';

import { PatientData } from '@/lib/types';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface PatientFormProps {
  patientData: PatientData;
  setPatientData: (data: PatientData) => void;
}

export function PatientForm({ patientData, setPatientData }: PatientFormProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedData = {
      ...patientData,
      [name]: value,
    };

    // Also update fullAddress if one of the address fields changes
    if (['addr1', 'addr2', 'addr3', 'postcode'].includes(name)) {
        updatedData.fullAddress = [updatedData.addr1, updatedData.addr2, updatedData.addr3, updatedData.postcode].filter(Boolean).join(', ');
    }

    setPatientData(updatedData);
  };

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
          <Input type="date" id="dob" name="dob" value={patientData.dob} onChange={handleChange} />
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
        <div className="grid w-full max-w-sm items-center gap-1.5 pb-4">
          <Label htmlFor="hospitalNumberMTW">Hospital Number (MTW)</Label>
          <Input type="text" id="hospitalNumberMTW" name="hospitalNumberMTW" value={patientData.hospitalNumberMTW} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
}
