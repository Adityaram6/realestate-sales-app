"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/common/tag-input";
import { DuplicateWarning } from "@/components/leads/duplicate-warning";
import { useToast } from "@/hooks/use-toast";
import { leadsApi, type LeadCreatePayload } from "@/lib/leads-api";
import { extractApiError } from "@/lib/api-client";
import {
  LEAD_SOURCE_SUGGESTIONS,
  LeadStatus,
  type Lead,
} from "@realestate/shared";

const LEAD_TAG_SUGGESTIONS = [
  "Investor",
  "Premium",
  "First-time buyer",
  "Repeat",
  "NRI",
  "Urgent",
] as const;

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[+\d\s-]+$/, "Only digits, spaces, + and - allowed"),
  email: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  source: z.string().optional(),
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),
  locationPreference: z.string().optional(),
  status: z.enum([LeadStatus.HOT, LeadStatus.WARM, LeadStatus.COLD]).optional(),
  tags: z.array(z.string()).default([]),
  consentGiven: z
    .boolean()
    .refine((v) => v === true, "Consent is required under DPDP"),
});

type LeadFormValues = z.infer<typeof schema>;

interface LeadFormProps {
  initial?: Lead;
}

export function LeadForm({ initial }: LeadFormProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      source: initial?.source ?? "",
      budgetMin: initial?.budgetMin,
      budgetMax: initial?.budgetMax,
      locationPreference: initial?.locationPreference ?? "",
      status: initial?.status,
      tags: initial?.tags ?? [],
      consentGiven: initial?.consentGiven ?? false,
    },
  });

  const phone = watch("phone");
  const email = watch("email");
  const [debouncedPhone, setDebouncedPhone] = useState(phone);
  const [debouncedEmail, setDebouncedEmail] = useState(email);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPhone(phone), 400);
    return () => clearTimeout(t);
  }, [phone]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(email), 400);
    return () => clearTimeout(t);
  }, [email]);

  const dupQuery = useQuery({
    queryKey: ["leads", "duplicate", debouncedPhone, debouncedEmail],
    queryFn: () =>
      leadsApi.checkDuplicate(debouncedPhone, debouncedEmail || undefined),
    enabled:
      !isEdit &&
      Boolean(debouncedPhone && debouncedPhone.replace(/[^\d]/g, "").length >= 7),
  });

  const saveMut = useMutation({
    mutationFn: async (payload: LeadCreatePayload) =>
      isEdit
        ? leadsApi.update(initial!.id, payload)
        : leadsApi.create(payload),
  });

  const onSubmit = async (values: LeadFormValues) => {
    const payload: LeadCreatePayload = {
      ...values,
      email: values.email || undefined,
      consentGiven: values.consentGiven,
    };
    try {
      const lead = await saveMut.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.show({
        title: isEdit ? "Lead updated" : "Lead created",
        description: lead.name,
        variant: "success",
      });
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    }
  };

  const pending = isSubmitting || saveMut.isPending;
  const dup = dupQuery.data;
  const hasDuplicate = dup?.phoneMatch || dup?.emailMatch;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Full name"
            required
            htmlFor="name"
            error={errors.name?.message}
          >
            <Input id="name" {...register("name")} placeholder="Ravi Kumar" />
          </FormField>
          <FormField
            label="Phone"
            required
            htmlFor="phone"
            error={errors.phone?.message}
          >
            <Input
              id="phone"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              {...register("phone")}
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email?.message}
            className="md:col-span-2"
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
          </FormField>

          {!isEdit && hasDuplicate ? (
            <div className="md:col-span-2">
              <DuplicateWarning
                phoneMatch={dup?.phoneMatch}
                emailMatch={dup?.emailMatch}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField label="Source" htmlFor="source">
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select or type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_SUGGESTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Status" htmlFor="status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onValueChange={(v) => field.onChange(v as LeadStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Unscored" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LeadStatus.HOT}>Hot</SelectItem>
                    <SelectItem value={LeadStatus.WARM}>Warm</SelectItem>
                    <SelectItem value={LeadStatus.COLD}>Cold</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Budget min (₹)"
            htmlFor="budgetMin"
            error={errors.budgetMin?.message}
          >
            <Input
              id="budgetMin"
              type="number"
              step="any"
              {...register("budgetMin", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Budget max (₹)"
            htmlFor="budgetMax"
            error={errors.budgetMax?.message}
          >
            <Input
              id="budgetMax"
              type="number"
              step="any"
              {...register("budgetMax", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Location preference"
            htmlFor="locationPreference"
            className="md:col-span-2"
          >
            <Input
              id="locationPreference"
              placeholder="e.g. Madhurawada, Bheemili"
              {...register("locationPreference")}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Tags" htmlFor="tags">
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <TagInput
                    id="tags"
                    value={field.value ?? []}
                    onChange={field.onChange}
                    suggestions={LEAD_TAG_SUGGESTIONS}
                  />
                )}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              DPDP consent
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField error={errors.consentGiven?.message}>
            <Controller
              control={control}
              name="consentGiven"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-muted/30 p-4 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-input"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      The lead has consented to being contacted.
                    </p>
                    <p className="text-muted-foreground">
                      Required under India's DPDP Act. We'll stamp the consent
                      timestamp on save and store it with the record.
                    </p>
                  </div>
                </label>
              )}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
