
"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import config from "@/config/app.json";
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
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { scrapeRcrForms } from "@/ai/flows/scrape-forms-flow";

export default function ConfigPage() {
  const { toast } = useToast();
  const [isScraping, setIsScraping] = useState(false);

  const handleUpdate = async () => {
    setIsScraping(true);
    toast({
      title: "Scraping in Progress",
      description: "Fetching the latest consent forms from the RCR website...",
    });

    try {
      const result = await scrapeRcrForms(config.rcrConsentFormsUrl);
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
                The URL from which consent forms are scraped. This process can
                be triggered to update the local form list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="break-all rounded-md bg-muted p-3 font-mono text-sm text-muted-foreground">
                {config.rcrConsentFormsUrl}
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdate} disabled={isScraping}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isScraping ? 'animate-spin' : ''}`} />
                Check for Updated Forms
              </Button>
            </CardFooter>
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
                <Badge variant={config.validateRNumber ? "default" : "secondary"}>
                  {config.validateRNumber ? "Enabled" : "Disabled"}
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
