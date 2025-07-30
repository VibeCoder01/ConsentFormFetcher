'use client';

import { PatientData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface PatientFormProps {
  patientData: PatientData;
  setPatientData: (data: PatientData) => void;
}

export function PatientForm({ patientData, setPatientData }: PatientFormProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPatientData({
      ...patientData,
      [name]: value,
    });
  };

  return (
    <div className="p-2 md:p-4 border-b">
       <h2 className="px-2 text-lg font-semibold tracking-tight mb-2">
          Patient Details
        </h2>
      <div className="space-y-4 px-2">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input type="text" id="firstName" name="firstName" value={patientData.firstName} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input type="text" id="lastName" name="lastName" value={patientData.lastName} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input type="date" id="dob" name="dob" value={patientData.dob} onChange={handleChange} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5 pb-4">
          <Label htmlFor="hospitalNumber">Hospital Number</Label>
          <Input type="text" id="hospitalNumber" name="hospitalNumber" value={patientData.hospitalNumber} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
}
