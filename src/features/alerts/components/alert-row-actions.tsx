"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  deleteAlert,
  toggleAlertActive,
} from "@/features/alerts/actions/alerts";

interface AlertRowActionsProps {
  alert: {
    id: string;
    active: boolean;
    from_currency: string;
    to_currency: string;
  };
}

export function AlertRowActions({ alert }: AlertRowActionsProps) {
  const pairLabel = `${alert.from_currency} to ${alert.to_currency}`;
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleToggle(nextActive: boolean) {
    startToggle(async () => {
      const result = await toggleAlertActive({
        id: alert.id,
        active: nextActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextActive ? "Alert resumed" : "Alert paused");
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteAlert({ id: alert.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      toast.success("Alert deleted");
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Switch
        checked={alert.active}
        onCheckedChange={handleToggle}
        disabled={isToggling}
        aria-label={`${alert.active ? "Pause" : "Resume"} alert for ${pairLabel}`}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete alert for ${pairLabel}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alert?</AlertDialogTitle>
            <AlertDialogDescription>
              The {pairLabel} alert and its notification history will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Keep the dialog open while the action runs.
                event.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
