"use client";

import { useState, useTransition, useRef } from "react";
import type { ConsentForm, FillParams, FillResult, FormField } from "@/lib/types";
import { fillConsentForm } from "@/ai/flows/fill-consent-form-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Wand2, Printer, AlertCircle, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConsentFormViewerProps {
  form: ConsentForm | null;
}

export function ConsentFormViewer({ form }: ConsentFormViewerProps) {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [filledPdf, setFilledPdf] = useState<FillResult | null>(null);
  const [modalState, setModalState] = useState<"loading" | "form" | "preview" | "error">("loading");

  const handlePrint = () => {
    const iframe = filledPdf ? (document.getElementById('pdf-preview-iframe') as HTMLIFrameElement) : iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (error) {
        console.error("Failed to print:", error);
        toast({
          variant: "destructive",
          title: "Printing Failed",
          description: "Could not print the document. Please try again or use the browser's print functionality.",
        });
      }
    }
  };
  
  const handleAiFillClick = () => {
    if (!form) return;
    setIsModalOpen(true);
    setModalState("loading");
    setFilledPdf(null);
    setFieldValues({});

    startTransition(async () => {
      try {
        const result = await fillConsentForm({ pdfUrl: form.url });
        if (result.fields) {
          setFormFields(result.fields);
          setModalState("form");
        } else {
          throw new Error("Could not extract form fields.");
        }
      } catch (error) {
        console.error("Error extracting form fields:", error);
        setModalState("error");
        toast({
          variant: "destructive",
          title: "AI Error",
          description: "Failed to extract form fields from the PDF.",
        });
      }
    });
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmitForm = () => {
    if (!form) return;
    setModalState("loading");
    startTransition(async () => {
      try {
        const filledFields = formFields.map(f => ({ ...f, value: fieldValues[f.name] || '' }));
        const result = await fillConsentForm({ pdfUrl: form.url, fields: filledFields });
        if (result.filledPdfDataUri) {
          setFilledPdf(result);
          setModalState("preview");
        } else {
          throw new Error("Could not fill PDF.");
        }
      } catch (error) {
        console.error("Error filling PDF:", error);
        setModalState("error");
        toast({
          variant: "destructive",
          title: "AI Error",
          description: "Failed to fill the PDF form.",
        });
      }
    });
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
            Choose a form from the list to view and fill.
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
           <Button onClick={handleAiFillClick} size="sm" disabled={isPending}>
            {isPending && modalState !== 'preview' ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            AI Fill Form
          </Button>
          <Button onClick={handlePrint} size="sm" variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print / Save
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl h-[90dvh] flex flex-col">
          {modalState === 'preview' && filledPdf ? (
            <>
            <DialogHeader>
                <DialogTitle>Filled Form Preview</DialogTitle>
            </DialogHeader>
            <iframe
              id="pdf-preview-iframe"
              src={filledPdf.filledPdfDataUri}
              title={`Preview for ${form.title}`}
              className="h-full w-full border-0 flex-1"
            />
            <DialogFooter>
                <Button variant="outline" onClick={() => setModalState('form')}>Back to Form</Button>
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print / Save</Button>
            </DialogFooter>
           </>
          ) : (
          <>
            <DialogHeader>
              <DialogTitle>Fill Consent Form with AI</DialogTitle>
            </DialogHeader>
            <div className="flex-1 grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="relative h-full overflow-hidden rounded-md border">
                    <iframe
                        ref={iframeRef}
                        src={`${form.url}#view=fitH`}
                        title={form.title}
                        className="h-full w-full border-0"
                        aria-label={`PDF viewer for ${form.title}`}
                    />
                </div>
                <div className="flex flex-col gap-4">
                    {modalState === 'loading' && (
                        <div className="space-y-4 p-4">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    )}
                    {modalState === 'error' && (
                        <Alert variant="destructive" className="m-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                            There was a problem processing the PDF. Please try again later.
                            </AlertDescription>
                        </Alert>
                    )}
                    {modalState === 'form' && (
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                        {formFields.map((field) => (
                            <div key={field.name} className="space-y-2">
                            <Label htmlFor={field.name}>{field.description}</Label>
                            <Input
                                id={field.name}
                                value={fieldValues[field.name] || ""}
                                onChange={(e) =>
                                handleFieldChange(field.name, e.target.value)
                                }
                                placeholder={field.type === 'date' ? 'YYYY-MM-DD' : 'Enter value'}
                            />
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                    )}
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSubmitForm} disabled={modalState !== 'form' || isPending}>
                  {isPending ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Preview Filled PDF
                </Button>
            </DialogFooter>
          </>
        )}
        </DialogContent>
      </Dialog>
      
       <div className="flex-1 bg-muted/20 flex items-center justify-center p-8">
            <div className="text-center">
                <Wand2 className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-6 text-2xl font-semibold">
                    Use AI to Fill This Form
                </h3>
                <p className="mt-2 text-base text-muted-foreground">
                    Click the &quot;AI Fill Form&quot; button above to start.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    You&apos;ll be able to review and print the completed document.
                </p>
            </div>
        </div>
    </div>
  );
}
