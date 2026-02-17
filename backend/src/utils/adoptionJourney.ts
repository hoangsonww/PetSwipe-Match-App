import { JourneyStatus } from "../entities/AdoptionJourney";

export const JOURNEY_STATUS_FLOW: JourneyStatus[] = [
  JourneyStatus.DISCOVERY,
  JourneyStatus.APPLICATION_SUBMITTED,
  JourneyStatus.MEET_AND_GREET,
  JourneyStatus.HOME_PREP,
  JourneyStatus.ADOPTED,
];

export const isJourneyStatus = (value: unknown): value is JourneyStatus =>
  typeof value === "string" &&
  JOURNEY_STATUS_FLOW.includes(value as JourneyStatus);

export const DEFAULT_JOURNEY_TASKS: Array<{
  title: string;
  description?: string;
}> = [
  {
    title: "Reach out to the shelter",
    description:
      "Send a quick introduction so the shelter knows you’re interested and can share the next steps.",
  },
  {
    title: "Submit the adoption application",
    description:
      "Complete any paperwork the shelter requires to get the process officially underway.",
  },
  {
    title: "Schedule a meet and greet",
    description:
      "Arrange a time to visit the shelter or set up a video call to meet your future pet.",
  },
  {
    title: "Prepare your home",
    description:
      "Gather the essentials—food, bedding, safe spaces—so your pet feels welcome from day one.",
  },
  {
    title: "Plan adoption day",
    description:
      "Coordinate pickup logistics and celebrate bringing your new companion home!",
  },
];
