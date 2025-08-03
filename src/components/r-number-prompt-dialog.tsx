
"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RNumberPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rNumber: string) => void;
  isSubmitting: boolean;
}

export function RNumberPromptDialog({ open, onOpenChange, onSubmit, isSubmitting }: RNumberPromptDialogProps) {
  const [rNumber, setRNumber] = useState("");
  const [config, setConfig] = useState({ validateRNumber: false });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      if (open) {
        setIsLoadingConfig(true);
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const appConfig = await res.json();
            setConfig(appConfig);
          }
        } catch (error) {
          console.error("Failed to fetch config for dialog:", error);
          // Use default config on error
          setConfig({ validateRNumber: false });
        } finally {
          setIsLoadingConfig(false);
        }
      }
    }
    fetchConfig();
  }, [open]);

  const isRNumberValid = !config.validateRNumber || (!!rNumber && /^R\d{7}$/i.test(rNumber));

  const handleSubmit = () => {
    if (isRNumberValid && rNumber && !isSubmitting) {
        onSubmit(rNumber);
    }
  }
  
  const handleCancel = () => {
    onOpenChange(false);
    setRNumber(""); // Reset on cancel
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default form submission
      handleSubmit();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Get Live Patient Demographics</AlertDialogTitle>
          <AlertDialogDescription>
            {config.validateRNumber 
              ? "Please enter the patient's KOMS patient number to fetch their details. It must start with 'R' and be followed by 7 digits."
              : "Please enter the patient's KOMS patient number to fetch their details."
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid items-center gap-1.5">
            <Label htmlFor="r-number-prompt">KOMS patient number</Label>
            <Input 
                id="r-number-prompt"
                type="text"
                value={rNumber}
                onChange={(e) => setRNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., R1234567"
                disabled={isSubmitting || isLoadingConfig}
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleSubmit} disabled={!rNumber || isSubmitting || !isRNumberValid || isLoadingConfig}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Get Demographics
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
