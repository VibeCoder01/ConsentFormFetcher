"use client";

import { useRef } from "react";
import type { ConsentForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileText, Printer } from "lucide-react";

interface ConsentFormViewerProps {
  form: ConsentForm | null;
}

export function ConsentFormViewer({ form }: ConsentFormViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus(); // Focus on the iframe for some browsers
        iframe.contentWindow.print();
      } catch (error) {
        console.error("Failed to print:", error);
        alert("Could not print the document. Please use the browser's print functionality.");
      }
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
            Choose a form from the list to view, fill, and save.
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
        <Button onClick={handlePrint} size="sm">
          <Printer className="mr-2 h-4 w-4" />
          Print / Save
        </Button>
      </div>
      <iframe
        ref={iframeRef}
        src={`${form.url}#view=fitH`}
        title={form.title}
        className="h-full w-full border-0"
        aria-label={`PDF viewer for ${form.title}`}
      />
    </div>
  );
}
