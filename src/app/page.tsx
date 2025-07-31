
"use client";

import { useState, useEffect, useMemo } from "react";
import type { ConsentForm, ConsentFormCategory, PatientData, IdentifierType } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppHeader } from "@/components/app-header";
import { FormList } from "@/components/form-list";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UpdateAvailableAlert } from "@/components/update-available-alert";
import { checkForFormUpdates, updateForms } from "@/ai/flows/update-check-flow";
import { PatientForm } from "@/components/patient-form";
import { fillPdf } from "@/ai/flows/fill-pdf-flow";
import { getPdfFields } from "@/ai/flows/get-pdf-fields-flow";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { PdfForm, PdfFormSkeleton, PdfField } from "@/components/pdf-form";
import { format } from 'date-fns';

const initialPatientData: PatientData = {
  forename: "John",
  surname: "Doe",
  dob: "1970-01-01",
  addr1: "123 Fake Street",
  addr2: "Fakeville",
  addr3: "Faketon",
  postcode: "FK1 1AB",
  fullAddress: "123 Fake Street, Fakeville, Faketon, FK1 1AB",
  homePhone: "01234567890",
  gpName: "Dr. Smith",
  hospitalName: "General Hospital",
  rNumber: "R1234567",
  nhsNumber: "123 456 7890",
  hospitalNumber: "1234567",
  hospitalNumberMTW: "MTW123456",
  selectedIdentifier: 'hospitalNumber',
  uniqueIdentifierValue: '1234567'
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

  const [pdfFields, setPdfFields] = useState<PdfField[]>([]);
  const [isFetchingFields, setIsFetchingFields] = useState(false);
  const [pdfFormData, setPdfFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handlePatientDataChange = (newData: PatientData) => {
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
  };

  const fetchForms = () => {
    setIsLoading(true);
    fetch("/api/consent-forms")
      .then((res) => res.json())
      .then((data: ConsentFormCategory[]) => {
        setFormCategories(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchForms();

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
    
    return {
      // More specific names first
      'patient full name': fullName,
      'name of patient': fullName,
      'patientname': fullName,
      'patient name': fullName,
      'name': fullName, // Generic name, handled with care in pre-population logic
      
      'surname': patientData.surname,
      'last name': patientData.surname,
      
      'forename': patientData.forename,
      'first name': patientData.forename,
      
      'dob': formattedDob,
      'date of birth': formattedDob,
      
      'hospital number mtw': patientData.hospitalNumberMTW,
      'hospitalnamemtw': patientData.hospitalNumberMTW,
      'hospital number': patientData.hospitalNumber,
      'hospitalnumber': patientData.hospitalNumber,
      
      'name of hospital': patientData.hospitalName,
      'hospitalname': patientData.hospitalName,
      
      'address': patientData.fullAddress,
      'addr1': patientData.addr1,
      'address line 1': patientData.addr1,
      'addr2': patientData.addr2,
      'address line 2': patientData.addr2,
      'addr3': patientData.addr3,
      'address line 3': patientData.addr3,
      'postcode': patientData.postcode,
      
      'home phone': patientData.homePhone,
      'home telephone': patientData.homePhone,
      
      'gp name': patientData.gpName,
      'gpname': patientData.gpName,
      
      'r number': patientData.rNumber,
      'rnumber': patientData.rNumber,
      
      'nhs number': patientData.nhsNumber,
      'nhsnumber': patientData.nhsNumber,
      
      'patient unique identifier': patientData.uniqueIdentifierValue,
      'unique patient identifier': patientData.uniqueIdentifierValue,

      'date': todaysDate,
    };
  }, [patientData]);

  const prePopulateForm = (fields: string[]) => {
    const newPdfFields: PdfField[] = [];
    const newPdfFormData: Record<string, string> = {};

    const specialStartsWithKeys = ['name', 'date'];

    for (const fieldName of fields) {
        const normalizedField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let prefilledValue = '';
        let matchedKey: string | null = null;

        // Sort keys by length descending to match more specific keys first (e.g., "patient name" before "name")
        const sortedKeys = Object.keys(patientMappings).sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            const value = patientMappings[key as keyof typeof patientMappings];
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

            const isMatch = specialStartsWithKeys.includes(key)
                ? normalizedField.startsWith(normalizedKey)
                : normalizedField.includes(normalizedKey);

            if (isMatch) {
                // Avoid overwriting if a more specific key has already matched
                if (!prefilledValue) {
                    prefilledValue = value;
                    matchedKey = key;
                }
            }
        }
        newPdfFormData[fieldName] = prefilledValue;
        newPdfFields.push({ name: fieldName, matchedKey });
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
      fetchForms(); // Re-fetch the forms to update the list
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
        <PatientForm patientData={patientData} setPatientData={handlePatientDataChange} />
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
