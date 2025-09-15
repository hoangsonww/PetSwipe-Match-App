import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../index";
import { AdoptionJourney } from "../entities/AdoptionJourney";
import { AdoptionTask } from "../entities/AdoptionTask";
import { isJourneyStatus } from "../utils/adoptionJourney";

const journeyRepo = () => AppDataSource.getRepository(AdoptionJourney);
const taskRepo = () => AppDataSource.getRepository(AdoptionTask);

const sanitizeNotes = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const stripTaskJourney = (task: AdoptionTask) => {
  const { journey, ...rest } = task as AdoptionTask & { journey?: unknown };
  return rest;
};

const toPlainJourney = (journey: AdoptionJourney) => {
  const { tasks, ...rest } = journey as AdoptionJourney & {
    tasks?: AdoptionTask[];
  };
  const orderedTasks = Array.isArray(tasks)
    ? [...tasks].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )
    : [];

  return {
    ...rest,
    tasks: orderedTasks.map(stripTaskJourney),
  };
};

/**
 * @openapi
 * /api/journeys/me:
 *   get:
 *     summary: List the authenticated user's adoption journeys
 *     tags:
 *       - Adoption Journeys
 *     responses:
 *       '200':
 *         description: Array of adoption journeys with related tasks and pets
 *       '401':
 *         description: Unauthorized (no active session)
 */
export const listMyJourneys = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const journeys = await journeyRepo().find({
      where: { user: { id: req.user.id } },
      relations: ["pet", "tasks"],
      order: { updatedAt: "DESC" },
    });

    res.json(journeys.map(toPlainJourney));
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/journeys/{journeyId}:
 *   patch:
 *     summary: Update the status or notes for an adoption journey
 *     tags:
 *       - Adoption Journeys
 *     parameters:
 *       - in: path
 *         name: journeyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Updated adoption journey
 *       '400':
 *         description: Invalid payload
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Journey not found
 */
export const updateJourney = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const { journeyId } = req.params;
  if (typeof journeyId !== "string" || journeyId.length === 0) {
    res.status(400).json({ message: "journeyId path param is required" });
    return;
  }

  const { status, notes } = req.body ?? {};

  if (status !== undefined && !isJourneyStatus(status)) {
    res.status(400).json({ message: "Invalid journey status" });
    return;
  }

  if (notes !== undefined && typeof notes !== "string") {
    res.status(400).json({ message: "notes must be a string" });
    return;
  }

  try {
    const journey = await journeyRepo().findOne({
      where: { id: journeyId, user: { id: req.user.id } },
      relations: ["pet", "tasks"],
    });

    if (!journey) {
      res.status(404).json({ message: "Journey not found" });
      return;
    }

    if (status) {
      journey.status = status;
    }

    if (notes !== undefined) {
      journey.notes = sanitizeNotes(notes);
    }

    const saved = await journeyRepo().save(journey);
    res.json(toPlainJourney(saved));
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/journeys/{journeyId}/tasks:
 *   post:
 *     summary: Append a custom task to an adoption journey
 *     tags:
 *       - Adoption Journeys
 *     parameters:
 *       - in: path
 *         name: journeyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Newly created task
 *       '400':
 *         description: Invalid payload
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Journey not found
 */
export const addTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const { journeyId } = req.params;
  if (typeof journeyId !== "string" || journeyId.length === 0) {
    res.status(400).json({ message: "journeyId path param is required" });
    return;
  }

  const { title, description } = req.body ?? {};
  if (typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ message: "Task title is required" });
    return;
  }

  if (description !== undefined && typeof description !== "string") {
    res.status(400).json({ message: "description must be a string" });
    return;
  }

  try {
    const journey = await journeyRepo().findOne({
      where: { id: journeyId, user: { id: req.user.id } },
    });

    if (!journey) {
      res.status(404).json({ message: "Journey not found" });
      return;
    }

    const trimmedTitle = title.trim().slice(0, 160);
    const trimmedDescription = description?.trim() ?? "";

    const task = taskRepo().create({
      journey,
      title: trimmedTitle,
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
    });
    const saved = await taskRepo().save(task);
    const plain = stripTaskJourney(saved);
    res.status(201).json(plain);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/journeys/{journeyId}/tasks/{taskId}:
 *   patch:
 *     summary: Update an adoption task
 *     tags:
 *       - Adoption Journeys
 *     parameters:
 *       - in: path
 *         name: journeyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Updated task
 *       '400':
 *         description: Invalid payload
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Task not found
 */
export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const { journeyId, taskId } = req.params;
  if (typeof journeyId !== "string" || journeyId.length === 0) {
    res.status(400).json({ message: "journeyId path param is required" });
    return;
  }
  if (typeof taskId !== "string" || taskId.length === 0) {
    res.status(400).json({ message: "taskId path param is required" });
    return;
  }

  const { title, description, completed } = req.body ?? {};

  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    res.status(400).json({ message: "title must be a non-empty string" });
    return;
  }

  if (description !== undefined && typeof description !== "string") {
    res.status(400).json({ message: "description must be a string" });
    return;
  }

  if (completed !== undefined && typeof completed !== "boolean") {
    res.status(400).json({ message: "completed must be a boolean" });
    return;
  }

  try {
    const task = await taskRepo().findOne({
      where: { id: taskId },
      relations: ["journey", "journey.user"],
    });

    if (!task || task.journey.id !== journeyId || task.journey.user.id !== req.user.id) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (title !== undefined) {
      task.title = title.trim().slice(0, 160);
    }

    if (description !== undefined) {
      const trimmed = description.trim();
      task.description = trimmed.length > 0 ? trimmed : null;
    }

    if (completed !== undefined) {
      task.completed = completed;
      task.completedAt = completed ? new Date() : null;
    }

    const saved = await taskRepo().save(task);
    const plain = stripTaskJourney(saved);
    res.json(plain);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/journeys/{journeyId}/tasks/{taskId}:
 *   delete:
 *     summary: Remove a task from an adoption journey
 *     tags:
 *       - Adoption Journeys
 *     responses:
 *       '204':
 *         description: Task deleted
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Task not found
 */
export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const { journeyId, taskId } = req.params;
  if (typeof journeyId !== "string" || journeyId.length === 0) {
    res.status(400).json({ message: "journeyId path param is required" });
    return;
  }
  if (typeof taskId !== "string" || taskId.length === 0) {
    res.status(400).json({ message: "taskId path param is required" });
    return;
  }

  try {
    const task = await taskRepo().findOne({
      where: { id: taskId },
      relations: ["journey", "journey.user"],
    });

    if (!task || task.journey.id !== journeyId || task.journey.user.id !== req.user.id) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    await taskRepo().remove(task);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
