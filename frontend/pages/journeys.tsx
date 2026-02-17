import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  Milestone,
  NotebookPen,
  PawPrint,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Layout } from "@/components/Layout";
import { useUser } from "@/hooks/useUser";
import {
  journeyApi,
  AdoptionJourney,
  AdoptionTask,
  JourneyStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const JOURNEY_STAGES: ReadonlyArray<{
  value: JourneyStatus;
  label: string;
  description: string;
}> = [
  {
    value: "DISCOVERY",
    label: "Discovery",
    description:
      "You liked this pet and let the shelter know you’re interested.",
  },
  {
    value: "APPLICATION_SUBMITTED",
    label: "Application submitted",
    description: "Your paperwork is in and awaiting review.",
  },
  {
    value: "MEET_AND_GREET",
    label: "Meet & greet",
    description: "Plan time with the shelter to meet your future companion.",
  },
  {
    value: "HOME_PREP",
    label: "Home prep",
    description: "Gather supplies and coordinate pickup logistics.",
  },
  {
    value: "ADOPTED",
    label: "Adopted!",
    description: "Celebrate adoption day and welcome them home.",
  },
];

const STAGE_ORDER = JOURNEY_STAGES.map((stage) => stage.value);

const statusLabelMap = JOURNEY_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.value]: stage.label }),
  {} as Record<JourneyStatus, string>,
);

const statusDescriptionMap = JOURNEY_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.value]: stage.description }),
  {} as Record<JourneyStatus, string>,
);

const progressForStatus = (status: JourneyStatus): number => {
  const index = STAGE_ORDER.indexOf(status);
  if (index <= 0) return 10;
  const ratio = STAGE_ORDER.length > 1 ? index / (STAGE_ORDER.length - 1) : 1;
  return Math.min(100, Math.max(10, Math.round(ratio * 100)));
};

type NotesDraftMap = Record<string, string>;
type TaskDraftMap = Record<string, { title: string; description: string }>;

const JourneyPage: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const highlightPetId =
    typeof router.query.petId === "string" ? router.query.petId : null;

  const {
    data: journeys,
    error,
    isValidating,
    mutate,
  } = useSWR<AdoptionJourney[]>(
    user ? "my-adoption-journeys" : null,
    journeyApi.listMyJourneys,
  );

  const [notesDrafts, setNotesDrafts] = useState<NotesDraftMap>({});
  const [newTaskDrafts, setNewTaskDrafts] = useState<TaskDraftMap>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (error) {
      toast.error("We couldn’t load your adoption journeys. Try again soon.");
    }
  }, [error]);

  useEffect(() => {
    if (!journeys) return;
    setNotesDrafts((prev) => {
      const next: NotesDraftMap = { ...prev };
      const seen = new Set<string>();
      journeys.forEach((journey) => {
        seen.add(journey.id);
        const incoming = journey.notes ?? "";
        if (next[journey.id] !== incoming) {
          next[journey.id] = incoming;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!seen.has(key)) delete next[key];
      });
      return next;
    });
  }, [journeys]);

  const handleStatusChange = async (
    journeyId: string,
    status: JourneyStatus,
  ) => {
    try {
      await journeyApi.updateJourney(journeyId, { status });
      await mutate();
      toast.success("Adoption stage updated");
    } catch {
      toast.error("We couldn’t update the adoption stage right now.");
    }
  };

  const handleNotesBlur = async (journey: AdoptionJourney) => {
    const draftValue = notesDrafts[journey.id] ?? "";
    const currentValue = journey.notes ?? "";
    if (draftValue.trim() === currentValue.trim()) return;

    try {
      await journeyApi.updateJourney(journey.id, { notes: draftValue });
      await mutate();
      toast.success("Journey notes saved");
    } catch {
      toast.error("Unable to save notes. Please try again.");
      setNotesDrafts((prev) => ({ ...prev, [journey.id]: currentValue }));
    }
  };

  const handleToggleTask = async (
    journeyId: string,
    task: AdoptionTask,
    completed: boolean,
  ) => {
    try {
      await journeyApi.updateTask(journeyId, task.id, { completed });
      await mutate();
      toast.success(
        completed ? "Task completed—great work!" : "Task moved back to to-do.",
      );
    } catch {
      toast.error("We couldn’t update that task just yet.");
    }
  };

  const handleDeleteTask = async (journeyId: string, taskId: string) => {
    try {
      await journeyApi.deleteTask(journeyId, taskId);
      await mutate();
      toast.success("Task removed");
    } catch {
      toast.error("We couldn’t remove that task. Give it another try.");
    }
  };

  const handleAddTask = async (journeyId: string) => {
    const draft = newTaskDrafts[journeyId] ?? { title: "", description: "" };
    const title = draft.title.trim();
    const description = draft.description.trim();

    if (!title) {
      toast.error("Add a quick title so we know what to work on.");
      return;
    }

    try {
      await journeyApi.addTask(journeyId, {
        title,
        description: description.length > 0 ? description : undefined,
      });
      setNewTaskDrafts((prev) => ({
        ...prev,
        [journeyId]: { title: "", description: "" },
      }));
      await mutate();
      toast.success("New task added to your checklist");
    } catch {
      toast.error("We couldn’t add that task yet. Please try again.");
    }
  };

  if (
    authLoading ||
    (user && !journeys && (isValidating || !error)) ||
    (!user && authLoading)
  ) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  if (!journeys || journeys.length === 0) {
    return (
      <Layout>
        <Head>
          <title>Adoption Journeys | PetSwipe</title>
        </Head>
        <div className="px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto max-w-3xl rounded-3xl border border-dashed border-[#7097A8]/40 bg-white/80 p-10 text-center shadow-xl dark:border-[#B6EBE9]/50 dark:bg-gray-900/70"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#EDF6F3] text-[#234851] dark:bg-[#1f3135] dark:text-[#B6EBE9]">
              <Milestone className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-[#234851] dark:text-[#B6EBE9]">
              Build your first adoption journey
            </h1>
            <p className="mt-3 text-base text-neutral-600 dark:text-neutral-300">
              Like a pet to see their personalized adoption roadmap here. We’ll
              create smart checklists and keep you on track from discovery to
              adoption day.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                className="bg-[#7097A8] px-6 text-white hover:bg-[#5f868d]"
                onClick={() => router.push("/home")}
              >
                Browse adoptable pets
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/liked-swipes")}
                className="border-[#7097A8]/40 text-[#234851] hover:bg-[#EDF6F3] dark:border-[#B6EBE9]/30 dark:text-[#B6EBE9] dark:hover:bg-[#1f3135]"
              >
                View liked pets
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Adoption Journeys | PetSwipe</title>
      </Head>
      <div className="px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto flex max-w-5xl flex-col gap-4 text-center"
        >
          <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#EDF6F3] px-4 py-1 text-sm font-medium text-[#234851] dark:bg-[#1f3135] dark:text-[#B6EBE9]">
            <Sparkles className="h-4 w-4" /> Guided adoption planner
          </span>
          <h1 className="text-4xl font-extrabold text-[#234851] dark:text-[#B6EBE9]">
            Stay organized every step of the way
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-300">
            Track where you are in the adoption journey, capture notes from the
            shelter, and tick off actionable tasks tailored to each pet you
            love.
          </p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-8 md:grid-cols-2">
          {journeys.map((journey) => {
            const currentNotes = notesDrafts[journey.id] ?? "";
            const taskDraft =
              newTaskDrafts[journey.id] ?? { title: "", description: "" };
            const stageIndex = STAGE_ORDER.indexOf(journey.status);
            const stageDescription =
              statusDescriptionMap[journey.status] ?? "";
            const isHighlighted = highlightPetId === journey.pet.id;

            return (
              <motion.div
                key={journey.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <Card
                  className={cn(
                    "h-full border border-transparent bg-white/95 shadow-xl backdrop-blur-sm transition-shadow dark:bg-gray-900/80",
                    isHighlighted
                      ? "border-[#7097A8] shadow-[#7097A8]/30"
                      : "hover:shadow-2xl",
                  )}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="text-left">
                        <CardTitle className="text-2xl font-bold text-[#234851] dark:text-[#B6EBE9]">
                          {journey.pet.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
                          Updated {" "}
                          {formatDistanceToNow(new Date(journey.updatedAt), {
                            addSuffix: true,
                          })}
                        </CardDescription>
                      </div>
                      <Badge className="flex items-center gap-1 bg-[#7097A8] text-white">
                        <Milestone className="h-3.5 w-3.5" />
                        {statusLabelMap[journey.status]}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {JOURNEY_STAGES.map((stage, idx) => (
                          <span
                            key={stage.value}
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
                              idx < stageIndex &&
                                "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                              idx === stageIndex &&
                                "bg-[#7097A8] text-white dark:bg-[#234851] dark:text-[#B6EBE9]",
                              idx > stageIndex &&
                                "bg-neutral-100 text-neutral-500 dark:bg-gray-800 dark:text-gray-300",
                            )}
                          >
                            {stage.label}
                          </span>
                        ))}
                      </div>

                      <div>
                        <Progress value={progressForStatus(journey.status)} />
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                          {stageDescription}
                        </p>
                      </div>

                      <Select
                        value={journey.status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            journey.id,
                            value as JourneyStatus,
                          )
                        }
                      >
                        <SelectTrigger className="w-full justify-between border-[#7097A8]/40 text-left text-sm font-medium text-[#234851] dark:border-[#B6EBE9]/40 dark:text-[#B6EBE9]">
                          <SelectValue placeholder="Update adoption stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOURNEY_STAGES.map((stage) => (
                            <SelectItem key={stage.value} value={stage.value}>
                              {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-[#234851] dark:text-[#B6EBE9]">
                        <NotebookPen className="h-4 w-4" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">
                          Journey notes
                        </h2>
                      </div>
                      <Textarea
                        value={currentNotes}
                        onChange={(event) =>
                          setNotesDrafts((prev) => ({
                            ...prev,
                            [journey.id]: event.target.value,
                          }))
                        }
                        onBlur={() => handleNotesBlur(journey)}
                        rows={4}
                        placeholder="Log shelter updates, questions to ask, or anything to prep."
                        className="border-[#7097A8]/30 text-sm focus-visible:ring-[#7097A8] dark:border-[#B6EBE9]/30 dark:bg-gray-900"
                      />
                    </section>

                    <Separator />

                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#234851] dark:text-[#B6EBE9]">
                          <PawPrint className="h-4 w-4" />
                          <h2 className="text-sm font-semibold uppercase tracking-wider">
                            Action checklist
                          </h2>
                        </div>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {journey.tasks.filter((task) => task.completed).length} /
                          {" "}
                          {journey.tasks.length} completed
                        </span>
                      </div>

                      <div className="space-y-3">
                        {journey.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 rounded-xl border border-[#7097A8]/20 bg-[#F6FBFD] p-3 dark:border-[#B6EBE9]/20 dark:bg-gray-900"
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={(checked) =>
                                handleToggleTask(
                                  journey.id,
                                  task,
                                  checked === true,
                                )
                              }
                              className="mt-1 border-[#7097A8] text-[#7097A8]"
                            />
                            <div className="flex-1 space-y-1">
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  task.completed
                                    ? "text-emerald-700 line-through dark:text-emerald-300"
                                    : "text-neutral-800 dark:text-neutral-100",
                                )}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                  {task.description}
                                </p>
                              )}
                              {task.completed && task.completedAt && (
                                <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                                  Completed {" "}
                                  {formatDistanceToNow(
                                    new Date(task.completedAt),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove task"
                              onClick={() => handleDeleteTask(journey.id, task.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-dashed border-[#7097A8]/40 bg-white p-4 shadow-sm dark:border-[#B6EBE9]/30 dark:bg-gray-900">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                          <Plus className="h-4 w-4" /> Add a custom task
                        </h3>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Input
                            value={taskDraft.title}
                            onChange={(event) =>
                              setNewTaskDrafts((prev) => {
                                const existing =
                                  prev[journey.id] ?? {
                                    title: "",
                                    description: "",
                                  };
                                return {
                                  ...prev,
                                  [journey.id]: {
                                    ...existing,
                                    title: event.target.value,
                                  },
                                };
                              })
                            }
                            placeholder="Task title"
                            className="border-[#7097A8]/30 text-sm focus-visible:ring-[#7097A8] dark:border-[#B6EBE9]/30 dark:bg-gray-900"
                          />
                          <Input
                            value={taskDraft.description}
                            onChange={(event) =>
                              setNewTaskDrafts((prev) => {
                                const existing =
                                  prev[journey.id] ?? {
                                    title: "",
                                    description: "",
                                  };
                                return {
                                  ...prev,
                                  [journey.id]: {
                                    ...existing,
                                    description: event.target.value,
                                  },
                                };
                              })
                            }
                            placeholder="Optional details"
                            className="border-[#7097A8]/30 text-sm focus-visible:ring-[#7097A8] dark:border-[#B6EBE9]/30 dark:bg-gray-900"
                          />
                          <Button
                            onClick={() => handleAddTask(journey.id)}
                            className="bg-[#7097A8] text-white hover:bg-[#5f868d]"
                          >
                            Save task
                          </Button>
                        </div>
                      </div>
                    </section>
                  </CardContent>

                  <CardFooter className="flex flex-wrap items-center gap-3 border-t border-[#7097A8]/20 bg-[#F6FBFD] py-4 dark:border-[#B6EBE9]/20 dark:bg-gray-900">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/pet/${journey.pet.id}`)}
                      className="border-[#7097A8]/40 text-[#234851] hover:bg-[#EDF6F3] dark:border-[#B6EBE9]/40 dark:text-[#B6EBE9] dark:hover:bg-[#1f3135]"
                    >
                      <PawPrint className="mr-2 h-4 w-4" /> View pet profile
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-sm text-[#234851] hover:text-[#5f868d] dark:text-[#B6EBE9]"
                      onClick={() => router.push(`/journeys?petId=${journey.pet.id}`)}
                    >
                      Highlight journey
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default JourneyPage;
