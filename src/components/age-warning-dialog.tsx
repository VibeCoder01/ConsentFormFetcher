
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface AgeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgeWarningDialog({ open, onOpenChange }: AgeWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Patient Age Warning</AlertDialogTitle>
          <AlertDialogDescription>
            This form should only be used if the patient is over 16 years old and has capacity to give consent. If the patient does not legally have capacity please use an appropriate alternative consent form from your hospital.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button onClick={() => onOpenChange(false)}>OK</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
