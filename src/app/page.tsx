
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { UploadConfirmationDialog } from "@/components/upload-confirmation-dialog";

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
  hospitalName: "Kent Oncology Centre",
  rNumber: "R1234567",
  nhsNumber: "123 456 7890",
  hospitalNumber: "1234567",
  hospitalNumberMTW: "MTW123456",
  selectedIdentifier: 'rNumber',
  uniqueIdentifierValue: 'R1234567',
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
  
  const [previewPdfFieldsConfig, setPreviewPdfFieldsConfig] = useState(false);
  const [pdfOpenMethodConfig, setPdfOpenMethodConfig] = useState<'browser' | 'acrobat'>('browser');
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  
  const [fileToOverwrite, setFileToOverwrite] = useState<File | null>(null);
  const [isUploadConfirmationOpen, setUploadConfirmationOpen] = useState(false);
  
  const uploadInputRef = useRef<HTMLInputElement>(null);
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
    setIsConfigLoading(true);
    try {
      const [formsRes, staffRes, configRes] = await Promise.all([
        fetch("/api/consent-forms"),
        fetch("/api/staff"),
        fetch("/api/config"),
      ]);

      const formsData: ConsentFormCategory[] = await formsRes.json();
      const staffData: StaffMember[] = await staffRes.json();
      const configData = await configRes.json();

      setFormCategories(formsData);
      setStaffMembers(staffData);
      setPreviewPdfFieldsConfig(configData.previewPdfFields);
      setPdfOpenMethodConfig(configData.pdfOpenMethod || 'browser');
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error fetching initial data",
        description: "Could not load forms or staff list. Please try again later.",
      });
    } finally {
      setIsLoading(false);
      setIsConfigLoading(false);
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
      'hospital': { value: patientData.hospitalName, description: 'Hospital Name' },

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

  const prePopulateData = (fields: string[]): { finalFields: PdfField[], finalFormData: Record<string, string> } => {
    const newPdfFields: PdfField[] = [];
    const newPdfFormData: Record<string, string> = {};

    const specialStartsWithKeys = ['name', 'date'];
    
    const clinicianRelatedKeys = ['clinician name', 'name of person', 'responsible consultant'];

    for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        let prefilledValue = '';
        let matchedKeyDescription: string | null = null;
        let fieldProcessed = false;

        const normalizedField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Rule for "Name of hospital"
        if (normalizedField === 'nameofhospital') {
            newPdfFormData[fieldName] = patientData.hospitalName;
            newPdfFields.push({ name: fieldName, matchedKey: 'Hospital Name'});
            continue; // Skip to next field
        }
        
        // Contextual rule for Clinician Name -> Job Title sequence
        if (normalizedField.startsWith('name') && i + 1 < fields.length) {
            const nextFieldName = fields[i + 1];
            const normalizedNextField = nextFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

            if (normalizedNextField.includes('jobtitle') || normalizedNextField.includes('title')) {
                // This looks like a clinician name/title pair.
                if (selectedStaffMember) {
                    newPdfFormData[fieldName] = selectedStaffMember.name;
                    newPdfFields.push({ name: fieldName, matchedKey: 'Clinician Name' });

                    newPdfFormData[nextFieldName] = selectedStaffMember.title;
                    newPdfFields.push({ name: nextFieldName, matchedKey: 'Clinician Title' });
                } else {
                    // Leave blank if no clinician is selected
                    newPdfFormData[fieldName] = '';
                    newPdfFields.push({ name: fieldName, matchedKey: null });
                    newPdfFormData[nextFieldName] = '';
                    newPdfFields.push({ name: nextFieldName, matchedKey: null });
                }
                
                i++; // Important: we've processed the next field, so skip it.
                fieldProcessed = true;

                // Now, check if the field *after* the job title is a 'Name' field.
                if (i + 1 < fields.length) {
                    const followingFieldName = fields[i+1];
                    const normalizedFollowingField = followingFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalizedFollowingField.startsWith('name')) {
                        // It is, so leave it blank.
                        newPdfFormData[followingFieldName] = '';
                        newPdfFields.push({ name: followingFieldName, matchedKey: 'Intentionally left blank' });
                        i++; // We've processed this field too, so skip it.

                        // And check if the one after that is a date field
                        if (i + 1 < fields.length) {
                            const dateFieldName = fields[i+1];
                            const normalizedDateField = dateFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (normalizedDateField.startsWith('date')) {
                                newPdfFormData[dateFieldName] = '';
                                newPdfFields.push({ name: dateFieldName, matchedKey: 'Intentionally left blank' });
                                i++; // Processed, so skip.
                            }
                        }
                    }
                }
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

            const useStartsWith = specialStartsWithKeys.some(swKey => {
                // check for whole word match
                const regex = new RegExp(`\\b${swKey}\\b`);
                return regex.test(key);
            });

            const isMatch = useStartsWith
                ? normalizedField.startsWith(normalizedKey)
                : normalizedField.includes(normalizedKey);


            if (isMatch) {
                if(clinicianRelatedKeys.includes(key) && !selectedStaffMember) {
                    continue; 
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
    
    return { finalFields: newPdfFields, finalFormData: newPdfFormData };
  };


  const handleSelectForm = async (form: ConsentForm) => {
    setSelectedForm(form);
    setPdfFields([]);
    setPdfFormData({});
    setIsFetchingFields(true);
    if (isMobile) setSheetOpen(false);

    try {
      const result = await getPdfFields(form.url);
      if (result.success && result.fields) {
        const { finalFields, finalFormData } = prePopulateData(result.fields);
        
        setPdfFields(finalFields);

        if (previewPdfFieldsConfig) {
          // Preview is ON: show the form
          setPdfFormData(finalFormData);
        } else {
          // Preview is OFF: immediately submit
          await handlePdfSubmit(finalFormData, finalFields);
        }

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

  const handlePdfSubmit = async (finalFormData: Record<string, string>, currentPdfFields?: PdfField[]) => {
    if (!selectedForm) return;

    let pendingWindow: Window | null = null;
    if (pdfOpenMethodConfig === 'browser') {
        pendingWindow = window.open('', '_blank');
    }

    setIsSubmitting(true);
  
    // Use passed fields or state fields
    const fieldsForProcessing = currentPdfFields || pdfFields;
    const fieldNames = fieldsForProcessing.map(f => f.name);

    // Create a mutable copy of the data to modify
    const dataToFill = { ...finalFormData };
  
    // Find the index of the "Job Title" field
    const jobTitleFieldIndex = fieldNames.findIndex(name =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '').includes('jobtitle')
    );
  
    if (jobTitleFieldIndex !== -1) {
      let nameFieldBlanked = false;
      let dateFieldBlanked = false;
  
      // Start searching from the field AFTER the job title
      for (let i = jobTitleFieldIndex + 1; i < fieldNames.length; i++) {
        const fieldName = fieldNames[i];
        const normalizedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
        // Find and blank the first "Name" field
        if (!nameFieldBlanked && normalizedFieldName.includes('name')) {
          dataToFill[fieldName] = '';
          nameFieldBlanked = true;
          continue; // Move to the next field
        }
  
        // Find and blank the first "Date" field after the name has been blanked
        if (nameFieldBlanked && !dateFieldBlanked && normalizedFieldName.includes('date')) {
          dataToFill[fieldName] = '';
          dateFieldBlanked = true;
        }
  
        // If both are blanked, we can stop searching
        if (nameFieldBlanked && dateFieldBlanked) {
          break;
        }
      }
    }
  
    try {
      const result = await fillPdf({
        formUrl: selectedForm.url,
        fields: dataToFill, // Use the modified data
      });
  
      if (result.success && result.pdfId) {
        if (pdfOpenMethodConfig === 'acrobat') {
            const res = await fetch(`/api/filled-pdf/${result.pdfId}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Sanitize form title for filename
                const safeTitle = selectedForm.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const patientId = patientData.uniqueIdentifierValue.replace(/[^a-z0-9]/gi, '_');
                a.download = `${patientId}_${safeTitle}_filled.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                 toast({
                    title: 'Download Started',
                    description: 'Your PDF has been downloaded.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Download Failed',
                    description: 'Could not download the generated PDF.',
                });
            }
        } else {
            // Default to opening in browser
            if (pendingWindow) {
                pendingWindow.location.href = `/api/filled-pdf/${result.pdfId}`;
            } else {
                window.open(`/api/filled-pdf/${result.pdfId}`, '_blank');
            }
        }
      } else {
        if (pendingWindow) {
            pendingWindow.close();
        }
        toast({
          variant: 'destructive',
          title: 'PDF Generation Failed',
          description: result.error || 'An unknown error occurred while preparing the PDF.',
        });
      }
    } catch (error) {
      if (pendingWindow) {
          pendingWindow.close();
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `An error occurred while filling the PDF: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
  
  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset file input to allow uploading the same file again
    event.target.value = '';
  };
  
  const handleUpload = async (file: File, overwrite = false) => {
    const formData = new FormData();
    formData.append("file", file);

    let url = "/api/upload";
    if (overwrite) {
        url += "?overwrite=true";
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.status === 409) { // 409 Conflict - file exists
            setFileToOverwrite(file);
            setUploadConfirmationOpen(true);
            return;
        }

        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }

        toast({
            title: "Upload Successful",
            description: `${file.name} has been submitted.`,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: message,
        });
    }
  };

  const confirmOverwrite = () => {
    if (fileToOverwrite) {
        handleUpload(fileToOverwrite, true);
    }
    setUploadConfirmationOpen(false);
    setFileToOverwrite(null);
  };
  

  const formListComponent = (
    <FormList
      formCategories={formCategories}
      onSelectForm={handleSelectForm}
      selectedFormUrl={selectedForm?.url}
      disabled={isConfigLoading}
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
        {isConfigLoading ? loadingComponent : formListComponent}
      </>
    );
  };
  
  const mainContent = () => {
    if (isFetchingFields) {
        return <PdfFormSkeleton />;
    }

    if (selectedForm && Object.keys(pdfFormData).length > 0 && pdfFields.length > 0) {
        return (
            <PdfForm
                formTitle={selectedForm.title}
                fields={pdfFields}
                initialData={pdfFormData}
                isSubmitting={isSubmitting}
                onSubmit={(data) => handlePdfSubmit(data)}
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
        onUploadClick={handleUploadClick}
      />
       <input
        type="file"
        ref={uploadInputRef}
        onChange={handleFileSelected}
        accept="application/pdf"
        className="hidden"
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
      
       <UploadConfirmationDialog
        open={isUploadConfirmationOpen}
        onOpenChange={setUploadConfirmationOpen}
        onConfirm={confirmOverwrite}
        fileName={fileToOverwrite?.name || ""}
      />
    </div>
  );
}
