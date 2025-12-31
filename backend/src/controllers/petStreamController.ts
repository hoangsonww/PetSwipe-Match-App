import { Request, Response } from "express";
import { petEvents } from "../utils/petEvents";
import { Pet } from "../entities/Pet";

// Server-Sent Events handler streaming newly created pets in real time
export const streamNewPets = (req: Request, res: Response): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // write a first comment to establish the stream
  res.write(": connected\n\n");

  const onNewPet = (pet: Pet) => {
    res.write(`data: ${JSON.stringify(pet)}\n\n`);
  };

  petEvents.on("new-pet", onNewPet);

  req.on("close", () => {
    petEvents.off("new-pet", onNewPet);
  });
};
