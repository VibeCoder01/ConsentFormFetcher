"use client";

import { useRef } from "react";
import type { ConsentForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileText, Printer } from "lucide-react";

interface ConsentFormViewerProps {
  form: ConsentForm | null;
}

export function ConsentFormViewer({ form }: ConsentFormViewerProps) {
  const handlePrintOrSave = () => {
    if (form) {
      window.open(form.url, '_blank');
    }
  };

  if (!form) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-6 text-2xl font-semibold">
            Select a Consent Form
          </h3>
          <p className="mt-2 text-base text-muted-foreground">
            Choose a form from the list to view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between gap-4 border-b p-3 md:p-4">
        <h2 className="text-base md:text-lg font-semibold truncate" title={form.title}>
          {form.title}
        </h2>
        <div className="flex gap-2">
          <Button onClick={handlePrintOrSave} size="sm" variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Open to Print/Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-muted/20 flex items-center justify-center">
        <div className="text-center p-8">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
            <h3 className="mt-6 text-xl font-semibold">
              PDF Viewing Is Handled in a New Tab
            </h3>
            <p className="mt-2 text-base text-muted-foreground">
              Click the "Open to Print/Save" button above to view the PDF.
            </p>
        </div>
      </div>
    </div>
  );
}
