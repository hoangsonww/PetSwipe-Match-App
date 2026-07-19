"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  adoptionApplicationSchema,
  ADOPTION_APPLICATION_STEP_FIELDS as STEP_FIELDS,
  ADOPTION_APPLICATION_STEP_TITLES as STEP_TITLES,
  type AdoptionApplicationValues,
} from "@/lib/adoptionApplicationSchema";

export type { AdoptionApplicationValues };

interface AdoptionApplicationFormProps {
  petId: string;
  petName?: string;
  /**
   * Called with a validated payload on final submit.
   *
   * NOTE: The `POST /api/adoption-applications` endpoint proposed in
   * issue #61 doesn't exist yet, so the default behavior below just
   * simulates a submission. Once the backend lands, pass a real
   * `onSubmit` handler (e.g. calling `adoptionApi.createApplication`)
   * from the parent page instead of relying on the default.
   */
  onSubmit?: (values: AdoptionApplicationValues) => Promise<void> | void;
}

export function AdoptionApplicationForm({
  petId,
  petName,
  onSubmit,
}: AdoptionApplicationFormProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<AdoptionApplicationValues>({
    resolver: zodResolver(adoptionApplicationSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      householdSize: "",
      housingType: undefined,
      landlordPermission: false,
      hasOtherPets: false,
      otherPetsDetails: "",
      vetOrReferenceContact: "",
      notes: "",
    },
  });

  const isLastStep = step === STEP_TITLES.length - 1;
  const progress = ((step + 1) / STEP_TITLES.length) * 100;
  const housingType = form.watch("housingType");
  const hasOtherPets = form.watch("hasOtherPets");

  const goNext = async () => {
    const fieldsToValidate = STEP_FIELDS[step];
    const valid =
      fieldsToValidate.length === 0
        ? true
        : await form.trigger(fieldsToValidate);
    if (valid) setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinalSubmit = async (values: AdoptionApplicationValues) => {
    try {
      setSubmitting(true);
      if (onSubmit) {
        await onSubmit(values);
      } else {
        // Backend endpoint (POST /api/adoption-applications) is not wired
        // up yet — see issue #61. Stage the payload locally for now.
        console.info("[AdoptionApplicationForm] draft payload", {
          petId,
          ...values,
        });
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      setSubmitted(true);
      toast.success("Application saved");
    } catch {
      toast.error("Something went wrong submitting your application");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-[#234851] dark:text-[#B6EBE9]" />
          <h2 className="text-2xl font-bold text-[#234851] dark:text-[#B6EBE9]">
            Application received!
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {petName
              ? `Thanks for applying to adopt ${petName}. `
              : "Thanks for applying. "}
            The shelter review queue and status tracking are coming soon —
            for now this confirms your details were captured successfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="space-y-4">
        <CardTitle className="text-2xl text-center text-[#234851] dark:text-[#B6EBE9]">
          {petName ? `Apply to Adopt ${petName}` : "Adoption Application"}
        </CardTitle>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFinalSubmit)}
            className="space-y-6"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {step === 0 && (
                  <>
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jane@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="(555) 123-4567"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="householdSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>People in household</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["1", "2", "3", "4", "5+"].map((n) => (
                                <SelectItem key={n} value={n}>
                                  {n}
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
                      name="housingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Housing type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="own">I own</SelectItem>
                              <SelectItem value="rent">I rent</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {housingType === "rent" && (
                      <FormField
                        control={form.control}
                        name="landlordPermission"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              My landlord allows pets
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="hasOtherPets"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            I currently have other pets
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    {hasOtherPets && (
                      <FormField
                        control={form.control}
                        name="otherPetsDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tell us about your other pets</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Species, age, temperament..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="vetOrReferenceContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Vet or personal reference (optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Name and phone/email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 3 && (
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anything else the shelter should know?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Optional notes for the shelter"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={step === 0 || submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {isLastStep ? (
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit application
                </Button>
              ) : (
                <Button type="button" onClick={goNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
