
"use client";

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
import { RefreshCw } from "lucide-react";

interface UpdateAvailableAlertProps {
  open: boolean;
  isUpdating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UpdateAvailableAlert({ open, isUpdating, onConfirm, onCancel }: UpdateAvailableAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updates Available</AlertDialogTitle>
          <AlertDialogDescription>
            New or updated consent forms are available. Would you like to update the list now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isUpdating}>
            Not Now
          </AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Yes, Update"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
