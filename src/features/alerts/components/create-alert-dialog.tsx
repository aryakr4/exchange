"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Sparkles } from "lucide-react";
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
import { interpretAlert } from "@/features/alerts/actions/interpret";
import {
  CONDITION_LABELS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
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
  const [nlText, setNlText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isInterpreting, startInterpret] = useTransition();

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

  function handleInterpret() {
    setNotice(null);
    setSummary(null);
    startInterpret(async () => {
      const result = await interpretAlert({ text: nlText });
      if (result.status === "ok") {
        form.setValue(
          "from_currency",
          result.draft.from_currency as SupportedCurrencyCode,
          { shouldValidate: true },
        );
        form.setValue(
          "to_currency",
          result.draft.to_currency as SupportedCurrencyCode,
          { shouldValidate: true },
        );
        form.setValue("condition", result.draft.condition, {
          shouldValidate: true,
        });
        form.setValue("target_rate", String(result.draft.target_rate), {
          shouldValidate: true,
        });
        setSummary(result.summary);
      } else {
        setNotice(result.message);
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
      setNlText("");
      setNotice(null);
      setSummary(null);
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
          <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
            <label
              htmlFor="nl-alert"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Describe your alert in plain English
            </label>
            <textarea
              id="nl-alert"
              rows={2}
              maxLength={500}
              value={nlText}
              onChange={(event) => setNlText(event.target.value)}
              placeholder="Tell me when my dollars buy more rupees so I can send money home to India"
              className="resize-none rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleInterpret}
              disabled={isInterpreting || nlText.trim().length === 0}
              className="justify-self-start"
            >
              {isInterpreting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {isInterpreting ? "Reading…" : "Interpret"}
            </Button>
            {summary && (
              <p className="text-sm text-muted-foreground">{summary}</p>
            )}
            {notice && (
              <p className="text-sm text-destructive">{notice}</p>
            )}
          </div>
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
