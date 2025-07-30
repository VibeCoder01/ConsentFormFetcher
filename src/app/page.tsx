
"use client";

import { useState, useEffect } from "react";
import type { ConsentForm, ConsentFormCategory, PatientData } from "@/lib/types";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [formCategories, setFormCategories] = useState<ConsentFormCategory[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState<ConsentFormCategory[] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [patientData, setPatientData] = useState<PatientData>({
    firstName: "John",
    lastName: "Doe",
    dob: "1970-01-01",
    hospitalNumber: "1234567",
  });
  const [selectedForm, setSelectedForm] = useState<ConsentForm | null>(null);
  const [isFillingPdf, setIsFillingPdf] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

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

  const handleSelectForm = async (form: ConsentForm) => {
    setSelectedForm(form);
    setIsFillingPdf(true);

    try {
      const result = await fillPdf({
        formUrl: form.url,
        patient: patientData
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
    } catch(error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Error",
        description: `An error occurred while filling the PDF: ${errorMessage}`,
      });
    } finally {
      setIsFillingPdf(false)
      if (isMobile) {
        setSheetOpen(false);
      }
    }
  };

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
                <a href="/config" className="underline">Configuration</a> page.
              </AlertDescription>
            </Alert>
        </div>
      )
    }
    return (
      <>
        <PatientForm patientData={patientData} setPatientData={setPatientData} />
        {formListComponent}
      </>
    );
  };
  
  const mainContent = (
    <div className="flex-1 w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {isFillingPdf ? (
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Pre-populating PDF...</p>
          </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>Select a form to begin.</p>
          <p className="text-sm">A pre-populated PDF will be opened in a new tab.</p>
        </div>
      )}
    </div>
  );

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
            {mainContent}
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
