
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Users, Save, RotateCcw, Loader2 } from "lucide-react";
import { scrapeRcrForms } from "@/ai/flows/scrape-forms-flow";

const DEFAULT_RCR_URL = "https://www.rcr.ac.uk/our-services/management-service-delivery/national-radiotherapy-consent-forms/";

export default function ConfigPage() {
  const { toast } = useToast();
  const [isScraping, setIsScraping] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [rcrUrl, setRcrUrl] = useState("");
  const [isUrlModified, setIsUrlModified] = useState(false);
  const [validateRNumber, setValidateRNumber] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      setIsLoadingConfig(true);
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        const config = await res.json();
        setRcrUrl(config.rcrConsentFormsUrl);
        setValidateRNumber(config.validateRNumber);
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

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRcrUrl(e.target.value);
    setIsUrlModified(true);
  }

  const handleRestoreDefaultUrl = () => {
    setRcrUrl(DEFAULT_RCR_URL);
    setIsUrlModified(true);
  };

  const handleSaveUrl = async () => {
    setIsSavingUrl(true);
    try {
       const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rcrConsentFormsUrl: rcrUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save URL.');
      }
      
      toast({
        title: 'Success',
        description: 'Data source URL updated successfully.',
      });
      setIsUrlModified(false);

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage,
      });
    } finally {
        setIsSavingUrl(false);
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
          <Skeleton className="h-10 w-full" />
        </CardContent>
      )
    }
    return (
      <>
        <CardContent>
          <Input 
            value={rcrUrl}
            onChange={handleUrlChange}
            aria-label="RCR Consent Forms URL"
            className="font-mono text-sm"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSaveUrl} disabled={!isUrlModified || isSavingUrl}>
              {isSavingUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
             <Button onClick={handleRestoreDefaultUrl} variant="outline" disabled={isSavingUrl}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Default
            </Button>
          </div>
          <Button onClick={handleUpdate} disabled={isScraping || isUrlModified}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isScraping ? 'animate-spin' : ''}`} />
            Check for Updated Forms
          </Button>
        </CardFooter>
      </>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-16 items-center border-b px-4 md:px-6 bg-card">
        <Link href="/" aria-label="Back to home">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="ml-4 text-xl font-bold">Configuration</h1>
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
          
          <Card>
            <CardHeader>
              <CardTitle>Live Demographics Validation</CardTitle>
              <CardDescription>
                This setting controls whether the R Number entered by a user is validated for the correct format (e.g., R1234567) before calling the KOMS service. This can be disabled for testing purposes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <p className="text-sm font-medium">R Number Validation:</p>
                <Badge variant={validateRNumber ? "default" : "secondary"}>
                  {validateRNumber ? "Enabled" : "Disabled"}
                </Badge>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    To change this setting, please edit the <code>validateRNumber</code> value in the <code>src/config/app.json</code> file.
                </p>
            </CardFooter>
          </Card>

        </div>
      </main>
    </div>
  );
}
