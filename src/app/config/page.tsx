"use client";

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
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ConfigPage() {
  const { toast } = useToast();

  const handleUpdate = () => {
    toast({
      title: "Update Not Implemented",
      description: "This feature is for demonstration purposes only.",
      duration: 3000,
    });
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
        <div className="mx-auto max-w-2xl">
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
              <Button onClick={handleUpdate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Form List
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
