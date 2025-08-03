
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { ArrowLeft, RefreshCw, Users, Save, RotateCcw, Loader2 } from "lucide-react";
import { scrapeRcrForms } from "@/ai/flows/scrape-forms-flow";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DEFAULT_RCR_URL = "https://www.rcr.ac.uk/our-services/management-service-delivery/national-radiotherapy-consent-forms/";

export default function ConfigPage() {
  const { toast } = useToast();
  const [isScraping, setIsScraping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [rcrUrl, setRcrUrl] = useState("");
  const [initialRcrUrl, setInitialRcrUrl] = useState("");
  
  const [validateRNumber, setValidateRNumber] = useState(false);
  const [initialValidateRNumber, setInitialValidateRNumber] = useState(false);

  const isModified = rcrUrl !== initialRcrUrl || validateRNumber !== initialValidateRNumber;

  useEffect(() => {
    async function fetchConfig() {
      setIsLoadingConfig(true);
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        const config = await res.json();
        setRcrUrl(config.rcrConsentFormsUrl);
        setInitialRcrUrl(config.rcrConsentFormsUrl);
        setValidateRNumber(config.validateRNumber);
        setInitialValidateRNumber(config.validateRNumber);
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
            />
           </div>
        </CardContent>
        <CardFooter className="flex justify-start">
            <Button onClick={handleRestoreDefaultUrl} variant="outline" disabled={isSaving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Default URL
            </Button>
        </CardFooter>
      </>
    )
  }

  const validationCardContent = () => {
     if (isLoadingConfig) {
      return (
        <CardContent>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
        </CardContent>
      )
    }
    return (
        <CardContent>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="validate-r-number" 
                    checked={validateRNumber}
                    onCheckedChange={setValidateRNumber}
                />
                <Label htmlFor="validate-r-number">Enable R Number format validation</Label>
            </div>
        </CardContent>
    )
  }

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
            <Button onClick={handleSaveChanges} disabled={!isModified || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
             <Button onClick={handleUpdate} disabled={isScraping || isModified}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isScraping ? 'animate-spin' : ''}`} />
              Check for Updated Forms
            </Button>
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
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                    Adjust application behavior and validation rules.
                </CardDescription>
            </CardHeader>
            {validationCardContent()}
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
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Edit Staff List
                  </Button>
               </Link>
            </CardFooter>
          </Card>

        </div>
      </main>
    </div>
  );
}
