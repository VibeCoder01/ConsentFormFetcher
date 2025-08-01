
"use client";

import { useState } from "react";
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
import config from "@/config/app.json";

interface RNumberPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rNumber: string) => void;
  isSubmitting: boolean;
}

export function RNumberPromptDialog({ open, onOpenChange, onSubmit, isSubmitting }: RNumberPromptDialogProps) {
  const [rNumber, setRNumber] = useState("");
  const isRNumberValid = !config.validateRNumber || (!!rNumber && /^R\d{7}$/i.test(rNumber));

  const handleSubmit = () => {
    if (isRNumberValid) {
        onSubmit(rNumber);
    } else {
        // You could add a toast or inline error here for more robust feedback
        console.error("Invalid R Number format");
    }
  }
  
  const handleCancel = () => {
    onOpenChange(false);
    setRNumber(""); // Reset on cancel
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Get Live Patient Demographics</AlertDialogTitle>
          <AlertDialogDescription>
            {config.validateRNumber 
              ? "Please enter the patient's R Number to fetch their details. It must start with 'R' and be followed by 7 digits."
              : "Please enter the patient's R Number to fetch their details."
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid items-center gap-1.5">
            <Label htmlFor="r-number-prompt">R Number</Label>
            <Input 
                id="r-number-prompt"
                type="text"
                value={rNumber}
                onChange={(e) => setRNumber(e.target.value)}
                placeholder="e.g., R1234567"
                disabled={isSubmitting}
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleSubmit} disabled={!rNumber || isSubmitting || !isRNumberValid}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Get Demographics
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
