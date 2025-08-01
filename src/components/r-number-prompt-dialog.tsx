
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

interface RNumberPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rNumber: string) => void;
}

export function RNumberPromptDialog({ open, onOpenChange, onSubmit }: RNumberPromptDialogProps) {
  const [rNumber, setRNumber] = useState("");

  const handleSubmit = () => {
    onSubmit(rNumber);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Get Live Patient Demographics</AlertDialogTitle>
          <AlertDialogDescription>
            Please enter the patient's R Number to fetch their details.
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
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleSubmit} disabled={!rNumber}>Get Demographics</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
