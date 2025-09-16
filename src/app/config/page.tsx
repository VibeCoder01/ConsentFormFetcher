"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Users, Save, RotateCcw, Loader2, Download, Upload, Mail, MapPin, Network, LogOut } from "lucide-react";
import { scrapeRcrForms } from "@/ai/flows/scrape-forms-flow";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/hooks/use-session";

const DEFAULT_RCR_URL = "https://www.rcr.ac.uk/our-services/management-service-delivery/national-radiotherapy-consent-forms/";

export default function ConfigPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();
  const [isScraping, setIsScraping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const importFileRef = useRef<HTMLInputElement>(null);
  
  const [rcrUrl, setRcrUrl] = useState("");
  const [initialRcrUrl, setInitialRcrUrl] = useState("");
  
  const [validateRNumber, setValidateRNumber] = useState(false);
  const [initialValidateRNumber, setInitialValidateRNumber] = useState(false);

  const [previewPdfFields, setPreviewPdfFields] = useState(false);
  const [initialPreviewPdfFields, setInitialPreviewPdfFields] = useState(false);

  const [pdfOpenMethod, setPdfOpenMethod] = useState<'browser' | 'acrobat'>('browser');
  const [initialPdfOpenMethod, setInitialPdfOpenMethod] = useState<'browser' | 'acrobat'>('browser');

  const [rtConsentFolder, setRtConsentFolder] = useState("");
  const [initialRtConsentFolder, setInitialRtConsentFolder] = useState("");

  const [prepopulateWithFakeData, setPrepopulateWithFakeData] = useState(true);
  const [initialPrepopulateWithFakeData, setInitialPrepopulateWithFakeData] = useState(true);

  const [showWelshForms, setShowWelshForms] = useState(false);
  const [initialShowWelshForms, setInitialShowWelshForms] = useState(false);

  const [komsApiDebugMode, setKomsApiDebugMode] = useState(false);
  const [initialKomsApiDebugMode, setInitialKomsApiDebugMode] = useState(false);


  const isModified = rcrUrl !== initialRcrUrl || validateRNumber !== initialValidateRNumber || previewPdfFields !== initialPreviewPdfFields || pdfOpenMethod !== initialPdfOpenMethod || rtConsentFolder !== initialRtConsentFolder || prepopulateWithFakeData !== initialPrepopulateWithFakeData || showWelshForms !== initialShowWelshForms || komsApiDebugMode !== initialKomsApiDebugMode;

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const config = await res.json();
      setRcrUrl(config.rcrConsentFormsUrl);
      setInitialRcrUrl(config.rcrConsentFormsUrl);
      setValidateRNumber(config.validateRNumber);
      setInitialValidateRNumber(config.validateRNumber);
      setPreviewPdfFields(config.previewPdfFields);
      setInitialPreviewPdfFields(config.previewPdfFields);
      setPdfOpenMethod(config.pdfOpenMethod || 'browser');
      setInitialPdfOpenMethod(config.pdfOpenMethod || 'browser');
      setRtConsentFolder(config.rtConsentFolder || "");
      setInitialRtConsentFolder(config.rtConsentFolder || "");
      setPrepopulateWithFakeData(config.prepopulateWithFakeData);
      setInitialPrepopulateWithFakeData(config.prepopulateWithFakeData);
      setShowWelshForms(config.showWelshForms);
      setInitialShowWelshForms(config.showWelshForms);
      setKomsApiDebugMode(config.komsApiDebugMode);
      setInitialKomsApiDebugMode(config.komsApiDebugMode);
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load app configuration.',
      });
    } finally {
      setIsLoadingConfig(false);
    }
  }

  useEffect(() => {
    fetchConfig();
  }, [toast]);

  const handleRestoreDefaultUrl = () => {
    setRcrUrl(DEFAULT_RCR_URL);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const updates = {
        rcrConsentFormsUrl: rcrUrl,
        validateRNumber: validateRNumber,
        previewPdfFields: previewPdfFields,
        pdfOpenMethod: pdfOpenMethod,
        rtConsentFolder: rtConsentFolder,
        prepopulateWithFakeData: prepopulateWithFakeData,
        showWelshForms: showWelshForms,
        komsApiDebugMode: komsApiDebugMode,
      };

       const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save URL.');
      }

      const { newConfig } = await response.json();
      
      // Update initial state to match saved state
      setInitialRcrUrl(newConfig.rcrConsentFormsUrl);
      setInitialValidateRNumber(newConfig.validateRNumber);
      setInitialPreviewPdfFields(newConfig.previewPdfFields);
      setInitialPdfOpenMethod(newConfig.pdfOpenMethod);
      setInitialRtConsentFolder(newConfig.rtConsentFolder);
      setInitialPrepopulateWithFakeData(newConfig.prepopulateWithFakeData);
      setInitialShowWelshForms(newConfig.showWelshForms);
      setInitialKomsApiDebugMode(newConfig.komsApiDebugMode);

      toast({
        title: 'Success',
        description: 'Configuration updated successfully.',
      });

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage,
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleUpdate = async () => {
    setIsScraping(true);
    toast({
      title: "Scraping in Progress",
      description: "Fetching the latest consent forms from the RCR website...",
    });

    try {
      const result = await scrapeRcrForms(rcrUrl);
      if (result.success) {
        toast({
          title: "Update Successful",
          description: `Successfully scraped ${result.formCount} forms. The form list is now up-to-date. Please navigate back to the home page to see the changes.`,
        });
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: `Could not update the form list. ${errorMessage}`,
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleExport = async () => {
    try {
        const res = await fetch('/api/config/backup');
        if (!res.ok) throw new Error('Failed to fetch configuration for export.');
        const data = await res.json();
        
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app-settings-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Success', description: 'Application settings have been exported.'});
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ variant: 'destructive', title: 'Export Failed', description: errorMessage });
    }
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("File content is not readable.");
              const importedData = JSON.parse(text);
              
              const response = await fetch('/api/config/backup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(importedData)
              });
              
              const result = await response.json();
              if (!response.ok) {
                  throw new Error(result.message || 'Failed to import settings.');
              }
              
              toast({
                  title: 'Import Successful',
                  description: "App settings have been restored. The page will now reload.",
              });
              
              // Reload the page to apply all changes
              setTimeout(() => window.location.reload(), 2000);

          } catch (error) {
               const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
               toast({
                   variant: 'destructive',
                   title: 'Import Failed',
                   description: errorMessage,
               });
          }
      };
      reader.onerror = () => {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to read the file.'});
      }
      reader.readAsText(file);

      // Reset file input value to allow re-importing the same file
      event.target.value = '';
  };
  
  if (isSessionLoading || isLoadingConfig) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  const hasWriteAccess = session.isLoggedIn && session.roles.includes('change');
  const hasFullAccess = session.isLoggedIn && session.roles.includes('full');

  const dataSourceCardContent = () => {
    if (isLoadingConfig) {
      return (
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      )
    }
    return (
      <>
        <CardContent>
           <div className="space-y-2">
            <Label htmlFor="rcrUrl">Data Source URL</Label>
            <Input 
                id="rcrUrl"
                value={rcrUrl}
                onChange={(e) => setRcrUrl(e.target.value)}
                aria-label="RCR Consent Forms URL"
                className="font-mono text-sm"
                disabled={!hasWriteAccess}
            />
           </div>
        </CardContent>
        {hasWriteAccess && (
            <CardFooter className="flex justify-start">
                <Button onClick={handleRestoreDefaultUrl} variant="outline" disabled={isSaving || !hasWriteAccess}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Default URL
                </Button>
            </CardFooter>
        )}
      </>
    )
  }

  const settingsCardContent = () => {
     if (isLoadingConfig) {
      return (
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
           <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-[280px]" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-[220px]" />
          </div>
        </CardContent>
      )
    }
    return (
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="validate-r-number" 
                    checked={validateRNumber}
                    onCheckedChange={setValidateRNumber}
                    disabled={!hasWriteAccess}
                />
                <Label htmlFor="validate-r-number">Enable R Number format validation</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="preview-pdf-fields" 
                    checked={previewPdfFields}
                    onCheckedChange={setPreviewPdfFields}
                    disabled={!hasWriteAccess}
                />
                <Label htmlFor="preview-pdf-fields">Preview PDF fields before generating</Label>
            </div>
             <div className="flex items-center space-x-2">
                <Switch 
                    id="prepopulate-with-fake-data" 
                    checked={prepopulateWithFakeData}
                    onCheckedChange={setPrepopulateWithFakeData}
                    disabled={!hasWriteAccess}
                />
                <Label htmlFor="prepopulate-with-fake-data">Pre-populate form with dummy data</Label>
            </div>
             <div className="flex items-center space-x-2">
                <Switch 
                    id="show-welsh-forms" 
                    checked={showWelshForms}
                    onCheckedChange={setShowWelshForms}
                    disabled={!hasWriteAccess}
                />
                <Label htmlFor="show-welsh-forms">Display Welsh PDF forms</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="koms-api-debug-mode" 
                    checked={komsApiDebugMode}
                    onCheckedChange={setKomsApiDebugMode}
                    disabled={!hasWriteAccess}
                />
                <Label htmlFor="koms-api-debug-mode">Enable KOMS API debug mode</Label>
            </div>
        </CardContent>
    )
  }
  
  const pdfHandlingCardContent = () => {
     if (isLoadingConfig) {
      return (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      )
    }
    return (
        <CardContent>
          <RadioGroup 
            value={pdfOpenMethod} 
            onValueChange={(value) => setPdfOpenMethod(value as 'browser' | 'acrobat')}
            className="space-y-2"
            disabled={!hasWriteAccess}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="browser" id="open-browser" />
              <Label htmlFor="open-browser">Automatically open in Browser</Label>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="acrobat" id="open-acrobat" />
                <Label htmlFor="open-acrobat">Download for Adobe Acrobat</Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
    )
  }
  
  const filePathsCardContent = () => {
    if (isLoadingConfig) {
      return (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      )
    }
    return (
      <CardContent className="space-y-4">
         <div className="space-y-2">
          <Label htmlFor="rtConsentFolder">RT Consent Folder (for uploads & generated PDFs)</Label>
          <Input 
              id="rtConsentFolder"
              value={rtConsentFolder}
              onChange={(e) => setRtConsentFolder(e.target.value)}
              aria-label="RT Consent Folder Path"
              className="font-mono text-sm"
              placeholder="e.g., \\\\server\\share\\consent_forms"
              disabled={!hasWriteAccess}
          />
         </div>
      </CardContent>
    )
  };


  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-16 items-center border-b px-4 md:px-6 bg-card justify-between">
        <div className="flex items-center">
            <Link href="/" aria-label="Back to home">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="ml-4 text-xl font-bold">Configuration</h1>
        </div>
        <div className="flex items-center gap-4">
            {hasWriteAccess && (
                 <Button onClick={handleSaveChanges} disabled={!isModified || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            )}
             <Button onClick={handleUpdate} disabled={isScraping || (isModified && hasWriteAccess)}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isScraping ? 'animate-spin' : ''}`} />
              Check for Updated Forms
            </Button>
            {session.isLoggedIn && session.username !== 'setup-admin' && (
              <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
              </Button>
            )}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Data Source</CardTitle>
              <CardDescription>
                The URL from which consent forms are scraped. This can be manually updated and saved.
              </CardDescription>
            </CardHeader>
            {dataSourceCardContent()}
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>File Paths</CardTitle>
              <CardDescription>
                Set the destination folder for generated and uploaded consent forms. Use UNC paths for network locations (e.g., `\\\\server\\share\\folder`).
              </CardDescription>
            </CardHeader>
            {filePathsCardContent()}
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                    Adjust application behavior and validation rules.
                </CardDescription>
            </CardHeader>
            {settingsCardContent()}
          </Card>

           <Card>
            <CardHeader>
                <CardTitle>PDF Handling</CardTitle>
                <CardDescription>
                    Choose how to open the generated PDF file.
                </CardDescription>
            </CardHeader>
            {pdfHandlingCardContent()}
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Add, edit, or remove staff members from the list used to populate clinician details on forms.
              </CardDescription>
            </CardHeader>
            <CardFooter>
               <Link href="/config/staff" passHref>
                  <Button variant="outline" disabled={!hasWriteAccess}>
                    <Users className="mr-2 h-4 w-4" />
                    Edit Staff List
                  </Button>
               </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tumour Site Management</CardTitle>
              <CardDescription>
                Manage the list of tumour sites used in the application.
              </CardDescription>
            </CardHeader>
            <CardFooter>
               <Link href="/config/tumour-sites" passHref>
                  <Button variant="outline" disabled={!hasWriteAccess}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Edit Tumour Sites
                  </Button>
               </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Management</CardTitle>
              <CardDescription>
                Configure settings for sending email notifications.
              </CardDescription>
            </CardHeader>
            <CardFooter>
               <Link href="/config/email" passHref>
                  <Button variant="outline" disabled={!hasWriteAccess}>
                    <Mail className="mr-2 h-4 w-4" />
                    Edit Email Config
                  </Button>
               </Link>
            </CardFooter>
          </Card>
          
          {hasFullAccess && (
            <Card>
                <CardHeader>
                    <CardTitle>Authentication</CardTitle>
                    <CardDescription>Configure and test the connection to your Active Directory server for user authentication.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/config/ad" passHref>
                        <Button variant="outline">
                            <Network className="mr-2 h-4 w-4" />
                            Configure Active Directory
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
          )}

           <Card>
            <CardHeader>
                <CardTitle>Backup & Restore Settings</CardTitle>
                <CardDescription>Export or import the full application configuration (including staff). The staff list can also be managed separately.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export App Settings
                </Button>
                {hasWriteAccess && (
                    <>
                    <Button variant="outline" onClick={handleImportClick} disabled={!hasWriteAccess}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import App Settings
                    </Button>
                    <input
                        type="file"
                        ref={importFileRef}
                        onChange={handleFileImport}
                        accept="application/json"
                        className="hidden"
                    />
                    </>
                )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
