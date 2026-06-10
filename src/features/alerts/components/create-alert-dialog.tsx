"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAlert } from "@/features/alerts/actions/alerts";
import {
  CONDITION_LABELS,
  SUPPORTED_CURRENCIES,
} from "@/features/alerts/constants";
import {
  createAlertSchema,
  type CreateAlertFormInput,
  type CreateAlertInput,
} from "@/features/alerts/schemas";

function CurrencySelectItems() {
  return (
    <>
      {SUPPORTED_CURRENCIES.map((currency) => (
        <SelectItem key={currency.code} value={currency.code}>
          <span className="font-mono">{currency.code}</span>
          <span className="text-muted-foreground">— {currency.name}</span>
        </SelectItem>
      ))}
    </>
  );
}

export function CreateAlertDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateAlertFormInput, unknown, CreateAlertInput>({
    resolver: zodResolver(createAlertSchema),
    defaultValues: {
      from_currency: undefined,
      to_currency: undefined,
      target_rate: "",
      condition: undefined,
    },
  });

  function onSubmit(values: CreateAlertInput) {
    startTransition(async () => {
      const result = await createAlert(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Alert created", {
        description: "We'll check it at the next daily run.",
      });
      form.reset();
      setOpen(false);
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          New alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create alert</DialogTitle>
          <DialogDescription>
            We check rates once a day and email you when your target is
            reached.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="USD" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <CurrencySelectItems />
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="EUR" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <CurrencySelectItems />
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notify me when the rate is</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.entries(CONDITION_LABELS) as Array<
                          [keyof typeof CONDITION_LABELS, (typeof CONDITION_LABELS)[keyof typeof CONDITION_LABELS]]
                        >
                      ).map(([value, { label, symbol }]) => (
                        <SelectItem key={value} value={value}>
                          <span className="font-mono">{symbol}</span> {label}{" "}
                          target
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target rate</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.9500"
                      className="font-mono"
                      autoComplete="off"
                      {...field}
                      value={String(field.value ?? "")}
                    />
                  </FormControl>
                  <FormDescription>
                    How much 1 unit of the source currency should buy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isPending ? "Creating…" : "Create alert"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
