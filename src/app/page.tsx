
"use client";

import { useState, useEffect, useMemo } from "react";
import type { ConsentForm, ConsentFormCategory, PatientData, IdentifierType, StaffMember } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppHeader } from "@/components/app-header";
import { FormList } from "@/components/form-list";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UpdateAvailableAlert } from "@/components/update-available-alert";
import { checkForFormUpdates, updateForms } from "@/ai/flows/update-check-flow";
import { PatientForm } from "@/components/patient-form";
import { ClinicianForm } from "@/components/clinician-form";
import { fillPdf } from "@/ai/flows/fill-pdf-flow";
import { getPdfFields } from "@/ai/flows/get-pdf-fields-flow";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { PdfForm, PdfFormSkeleton, PdfField } from "@/components/pdf-form";
import { format } from 'date-fns';

const initialPatientData: PatientData = {
  forename: "John",
  surname: "Smith",
  dob: "1970-01-01",
  addr1: "123 Fake Street",
  addr2: "Fakeville",
  addr3: "Faketon",
  postcode: "FK1 1AB",
  fullAddress: "123 Fake Street, Fakeville, Faketon, FK1 1AB",
  homePhone: "01234567890",
  gpName: "Dr. Smith",
  hospitalName: "", // Default to empty to show placeholder
  rNumber: "R1234567",
  nhsNumber: "123 456 7890",
  hospitalNumber: "1234567",
  hospitalNumberMTW: "MTW123456",
  selectedIdentifier: 'hospitalNumber',
  uniqueIdentifierValue: '1234567',
  macmillanContactId: null,
};


export default function Home() {
  const [formCategories, setFormCategories] = useState<ConsentFormCategory[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState<ConsentFormCategory[] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [patientData, setPatientData] = useState<PatientData>(initialPatientData);
  const [selectedForm, setSelectedForm] = useState<ConsentForm | null>(null);

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null);

  const [pdfFields, setPdfFields] = useState<PdfField[]>([]);
  const [isFetchingFields, setIsFetchingFields] = useState(false);
  const [pdfFormData, setPdfFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handlePatientDataChange = (newData: PatientData, fromDemographics = false) => {
    // Also update fullAddress if one of the address fields changes
    if (['addr1', 'addr2', 'addr3', 'postcode'].some(field => newData[field as keyof PatientData] !== patientData[field as keyof PatientData])) {
        newData.fullAddress = [newData.addr1, newData.addr2, newData.addr3, newData.postcode].filter(Boolean).join(', ');
    }

    // Update the unique identifier value if the selected identifier or its value changes
    const selectedIdField = newData.selectedIdentifier;
    const selectedIdValue = newData[selectedIdField as Exclude<IdentifierType, 'selectedIdentifier' | 'uniqueIdentifierValue'>];

    if (newData.uniqueIdentifierValue !== selectedIdValue) {
        newData.uniqueIdentifierValue = selectedIdValue;
    }
    
    setPatientData(newData);

    if (fromDemographics) {
        setSelectedStaffMember(null);
    }
  };

  const handleStaffMemberChange = (staffId: string) => {
    const selected = staffMembers.find(s => s.id === staffId) || null;
    setSelectedStaffMember(selected);
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [formsRes, staffRes] = await Promise.all([
        fetch("/api/consent-forms"),
        fetch("/api/staff")
      ]);

      const formsData: ConsentFormCategory[] = await formsRes.json();
      const staffData: StaffMember[] = await staffRes.json();

      setFormCategories(formsData);
      setStaffMembers(staffData);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error fetching initial data",
        description: "Could not load forms or staff list. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchInitialData();

    checkForFormUpdates()
      .then((result) => {
        if (result.hasUpdates && result.newData) {
          setUpdateAvailable(result.newData);
          setShowAlert(true);
        }
      })
      .catch(console.error)
      .finally(() => setIsCheckingForUpdates(false));
  }, []);

  const patientMappings = useMemo(() => {
    const formattedDob = patientData.dob ? format(new Date(patientData.dob), 'dd/MM/yyyy') : '';
    const fullName = `${patientData.forename} ${patientData.surname}`;
    const todaysDate = format(new Date(), 'dd/MM/yyyy');
    
    type Mapping = { value: string; description: string };
    const mappings: Record<string, Mapping> = {
      // More specific names first
      'patient full name': { value: fullName, description: 'Patient Full Name' },
      'name of patient': { value: fullName, description: 'Patient Full Name' },
      'patientname': { value: fullName, description: 'Patient Full Name' },
      'patient name': { value: fullName, description: 'Patient Full Name' },
      'name': { value: fullName, description: 'Patient Full Name' },
      
      'surname': { value: patientData.surname, description: 'Surname' },
      'last name': { value: patientData.surname, description: 'Surname' },
      
      'forename': { value: patientData.forename, description: 'Forename' },
      'first name': { value: patientData.forename, description: 'Forename' },
      
      'dob': { value: formattedDob, description: 'Date of Birth' },
      'date of birth': { value: formattedDob, description: 'Date of Birth' },
      
      'hospital number mtw': { value: patientData.hospitalNumberMTW, description: 'Hospital Number (MTW)' },
      'hospitalnamemtw': { value: patientData.hospitalNumberMTW, description: 'Hospital Number (MTW)' },
      'hospital number': { value: patientData.hospitalNumber, description: 'Hospital Number' },
      'hospitalnumber': { value: patientData.hospitalNumber, description: 'Hospital Number' },
      
      'name of hospital': { value: patientData.hospitalName, description: 'Hospital Name' },
      'hospitalname': { value: patientData.hospitalName, description: 'Hospital Name' },
      
      'address': { value: patientData.fullAddress, description: 'Full Address' },
      'addr1': { value: patientData.addr1, description: 'Address Line 1' },
      'address line 1': { value: patientData.addr1, description: 'Address Line 1' },
      'addr2': { value: patientData.addr2, description: 'Address Line 2' },
      'address line 2': { value: patientData.addr2, description: 'Address Line 2' },
      'addr3': { value: patientData.addr3, description: 'Address Line 3' },
      'address line 3': { value: patientData.addr3, description: 'Address Line 3' },
      'postcode': { value: patientData.postcode, description: 'Postcode' },
      
      'home phone': { value: patientData.homePhone, description: 'Home Phone' },
      'home telephone': { value: patientData.homePhone, description: 'Home Phone' },
      
      'gp name': { value: patientData.gpName, description: 'GP Name' },
      'gpname': { value: patientData.gpName, description: 'GP Name' },
      
      'r number': { value: patientData.rNumber, description: 'R Number' },
      'rnumber': { value: patientData.rNumber, description: 'R Number' },
      
      'nhs number': { value: patientData.nhsNumber, description: 'NHS Number' },
      'nhsnumber': { value: patientData.nhsNumber, description: 'NHS Number' },
      
      'patient unique identifier': { value: patientData.uniqueIdentifierValue, description: 'Unique Patient ID' },
      'unique patient identifier': { value: patientData.uniqueIdentifierValue, description: 'Unique Patient ID' },

      'date': { value: todaysDate, description: 'Todays Date' },
    };

    if (selectedStaffMember) {
        const clinicianInfo = `${selectedStaffMember.name}, ${selectedStaffMember.title} - ${selectedStaffMember.phone}`;
        mappings['clinician name'] = { value: clinicianInfo, description: 'Clinician Name + Title + Phone' };
        mappings['name of person'] = { value: clinicianInfo, description: 'Clinician Name + Title + Phone' };
        mappings['responsible consultant'] = { value: clinicianInfo, description: 'Clinician Name + Title + Phone' };
        mappings['job title'] = { value: selectedStaffMember.title, description: 'Clinician Title' };
        mappings['jobtitle'] = { value: selectedStaffMember.title, description: 'Clinician Title' };
    }

    const selectedMacmillan = staffMembers.find(s => s.id === patientData.macmillanContactId);
    if(selectedMacmillan) {
        const macmillanContactInfo = `${selectedMacmillan.name}, ${selectedMacmillan.title} - ${selectedMacmillan.phone}`;
        mappings['contact details'] = { value: macmillanContactInfo, description: 'Macmillan Contact Name + Title + Phone' };
        mappings['contact number'] = { value: macmillanContactInfo, description: 'Macmillan Contact Name + Title + Phone' };
    }

    return mappings;

  }, [patientData, selectedStaffMember, staffMembers]);

  const prePopulateForm = (fields: string[]) => {
    const newPdfFields: PdfField[] = [];
    const newPdfFormData: Record<string, string> = {};

    const specialStartsWithKeys = ['name', 'date'];
    
    // Explicit keys for clinician to avoid populating patient data in staff fields
    const clinicianRelatedKeys = ['clinician name', 'name of person', 'responsible consultant'];

    for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        let prefilledValue = '';
        let matchedKeyDescription: string | null = null;
        let fieldProcessed = false;

        const normalizedField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Rule for Name followed by Job Title
        if (specialStartsWithKeys.includes('name') && normalizedField.startsWith('name') && i + 1 < fields.length) {
            const nextFieldName = fields[i + 1];
            const normalizedNextField = nextFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedNextField.includes('jobtitle') || normalizedNextField.includes('title')) {
                if (selectedStaffMember) {
                    newPdfFormData[fieldName] = selectedStaffMember.name;
                    newPdfFields.push({ name: fieldName, matchedKey: 'Clinician Name' });

                    newPdfFormData[nextFieldName] = selectedStaffMember.title;
                    newPdfFields.push({ name: nextFieldName, matchedKey: 'Clinician Title' });
                } else {
                    // if no clinician is selected, leave them blank
                    newPdfFormData[fieldName] = '';
                    newPdfFields.push({ name: fieldName, matchedKey: null });

                    newPdfFormData[nextFieldName] = '';
                    newPdfFields.push({ name: nextFieldName, matchedKey: null });
                }
                
                i++; // Increment i to skip the next field since we've already processed it
                fieldProcessed = true;
            }
        }
        
        if (fieldProcessed) {
            continue;
        }

        // Generic matching logic
        const sortedKeys = Object.keys(patientMappings).sort((a, b) => b.length - a.length);
        
        for (const key of sortedKeys) {
            const mapping = patientMappings[key as keyof typeof patientMappings];
            if (!mapping.value) continue;

            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

            const isMatch = specialStartsWithKeys.some(swKey => key.startsWith(swKey))
                ? normalizedField.startsWith(normalizedKey)
                : normalizedField.includes(normalizedKey);

            if (isMatch) {
                 // If the match is a clinician-related one, ensure we have a selected staff member.
                if(clinicianRelatedKeys.includes(key) && !selectedStaffMember) {
                    continue; // Skip if it's a clinician field but no clinician is selected
                }
                if (!prefilledValue) {
                    prefilledValue = mapping.value;
                    matchedKeyDescription = mapping.description;
                }
            }
        }
        
        newPdfFormData[fieldName] = prefilledValue;
        newPdfFields.push({ name: fieldName, matchedKey: matchedKeyDescription });
    }
    
    setPdfFields(newPdfFields);
    setPdfFormData(newPdfFormData);
  };


  const handleSelectForm = async (form: ConsentForm) => {
    setSelectedForm(form);
    setPdfFields([]);
    setIsFetchingFields(true);
    if (isMobile) setSheetOpen(false);

    try {
      const result = await getPdfFields(form.url);
      if (result.success && result.fields) {
        prePopulateForm(result.fields);
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching form fields",
          description: result.error || "Could not inspect the selected PDF.",
        });
      }
    } catch(error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Error",
        description: `An error occurred while getting PDF fields: ${errorMessage}`,
      });
    } finally {
      setIsFetchingFields(false);
    }
  };

  const handlePdfSubmit = async (finalFormData: Record<string, string>) => {
      if (!selectedForm) return;

      setIsSubmitting(true);
      try {
        const result = await fillPdf({
            formUrl: selectedForm.url,
            fields: finalFormData
        });

        if (result.success && result.pdfId) {
            window.open(`/api/filled-pdf/${result.pdfId}`, '_blank');
        } else {
             toast({
                variant: "destructive",
                title: "PDF Generation Failed",
                description: result.error || "An unknown error occurred while preparing the PDF.",
            });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
            variant: "destructive",
            title: "Error",
            description: `An error occurred while filling the PDF: ${errorMessage}`,
        });
      } finally {
        setIsSubmitting(false);
      }
  }

  const handleConfirmUpdate = async () => {
    if (!updateAvailable) return;

    setIsUpdating(true);
    setShowAlert(false);

    try {
      await updateForms(updateAvailable);
      fetchInitialData(); // Re-fetch all data to update the list
    } catch (error) {
      console.error("Failed to update forms:", error);
    } finally {
      setIsUpdating(false);
      setUpdateAvailable(null);
    }
  };

  const formListComponent = (
    <FormList
      formCategories={formCategories}
      onSelectForm={handleSelectForm}
      selectedFormUrl={selectedForm?.url}
    />
  );
  
  const loadingComponent = (
    <div className="p-4">
      <h2 className="px-4 text-lg font-semibold tracking-tight mb-4">Available Forms</h2>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="pl-4 space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-5/6" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );

  const initializingComponent = (
    <div className="flex items-center justify-center h-full p-8">
      <Alert>
        <AlertTitle>Initializing...</AlertTitle>
        <AlertDescription>
          Checking for the latest consent forms. This will only take a moment.
        </AlertDescription>
      </Alert>
    </div>
  );

  const sidebarContent = () => {
    if (isCheckingForUpdates) {
      return initializingComponent;
    }
    if (isLoading) {
      return loadingComponent;
    }
    if (formCategories.length === 0) {
      return (
         <div className="flex items-center justify-center h-full p-8">
            <Alert>
              <AlertTitle>No Forms Found</AlertTitle>
              <AlertDescription>
                Could not load consent forms. Please try checking for updates on the{' '}
                <Link href="/config" className="underline">Configuration</Link> page.
              </AlertDescription>
            </Alert>
        </div>
      )
    }
    return (
      <>
        <PatientForm 
            patientData={patientData}
            initialData={initialPatientData}
            setPatientData={handlePatientDataChange} 
            staffMembers={staffMembers} 
        />
        <ClinicianForm 
          staffMembers={staffMembers}
          selectedStaffId={selectedStaffMember?.id}
          onStaffMemberChange={handleStaffMemberChange}
        />
        {formListComponent}
      </>
    );
  };
  
  const mainContent = () => {
    if (isFetchingFields) {
        return <PdfFormSkeleton />;
    }

    if (selectedForm && pdfFields.length > 0) {
        return (
            <PdfForm
                formTitle={selectedForm.title}
                fields={pdfFields}
                initialData={pdfFormData}
                isSubmitting={isSubmitting}
                onSubmit={handlePdfSubmit}
            />
        );
    }

    return (
      <div className="flex-1 w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center text-muted-foreground">
          <p>Select a form to begin.</p>
          <p className="text-sm">The form's fields will appear here for you to edit.</p>
        </div>
      </div>
    );
  };


  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <AppHeader
        isMobile={isMobile}
        onMenuClick={() => setSheetOpen(true)}
      />
      <main className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-96 flex-col border-r bg-card">
          <div className="flex-1 overflow-y-auto">
            {sidebarContent()}
          </div>
        </aside>

        {/* Mobile Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-[85%] sm:w-96 bg-card">
             <div className="overflow-y-auto h-full">
               {sidebarContent()}
             </div>
          </SheetContent>
        </Sheet>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto md:flex">
          <div className="h-full w-full">
            {mainContent()}
          </div>
        </div>
      </main>

      <UpdateAvailableAlert
        open={showAlert}
        isUpdating={isUpdating}
        onConfirm={handleConfirmUpdate}
        onCancel={() => setShowAlert(false)}
      />
    </div>
  );
}
