import { Request, Response, NextFunction } from "express";
import csvParser from "csv-parser";
import { AppDataSource } from "../index";
import { Pet } from "../entities/Pet";
import { sendCsv } from "../utils/csv";
import stream from "stream";
import multer from "multer";
import { uploadPetPic } from "../utils/supabase";

interface RawPetRow {
  name: string;
  breed: string; // e.g. "Dog", "Cat"
  description?: string;
}

const petRepo = () => AppDataSource.getRepository(Pet);
const upload = multer(); // in-memory

/**
 * @openapi
 * /api/pets/upload:
 *   post:
 *     summary: Upload a CSV of pets
 *     tags:
 *       - Pets
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "CSV with headers: name,breed,description"
 *     responses:
 *       '200':
 *         description: Number of imported pets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imported:
 *                   type: integer
 *                   description: How many rows were saved
 *       '400':
 *         description: CSV file missing
 *       '500':
 *         description: Internal server error
 */
export const uploadPets = (
  req: Request & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction,
): void => {
  if (!req.file) {
    res.status(400).json({ message: "CSV required" });
    return;
  }
  const rows: RawPetRow[] = [];
  const rs = new stream.PassThrough();
  rs.end(req.file.buffer);

  rs.pipe(csvParser())
    .on("data", (row: RawPetRow) => rows.push(row))
    .on("end", async () => {
      try {
        // map CSV rows into Partial<Pet>
        const partials: Partial<Pet>[] = rows.map((r) => ({
          name: r.name,
          type: r.breed,
          description: r.description,
        }));
        const saved = await petRepo().save(partials);
        res.json({ imported: saved.length });
      } catch (err) {
        next(err);
      }
    })
    .on("error", next);
};

/**
 * @openapi
 * /api/pets:
 *   get:
 *     summary: List all pets
 *     tags:
 *       - Pets
 *     responses:
 *       '200':
 *         description: Array of pet objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   photoUrl:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       '500':
 *         description: Internal server error
 */
export const listPets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user) {
      const pets = await AppDataSource.getRepository(Pet)
        .createQueryBuilder("pet")
        // join the swipes *relation* (Pet.swipes) and only that user's swipes
        .leftJoin("pet.swipes", "swipe", "swipe.userId = :uid", {
          uid: req.user.id,
        })
        // filter out any pet that *did* get a swipe
        .where("swipe.id IS NULL")
        .orderBy("pet.createdAt", "DESC")
        .getMany();

      res.json(pets);
      return;
    }

    // unauthenticated — show everything
    const all = await AppDataSource.getRepository(Pet).find({
      order: { createdAt: "DESC" },
    });
    res.json(all);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/pets/export:
 *   get:
 *     summary: Export all pets as CSV
 *     tags:
 *       - Pets
 *     responses:
 *       '200':
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       '500':
 *         description: Internal server error
 */
export const exportPets = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const all = await petRepo().find();
    sendCsv(res, all, "pets_export.csv");
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/pets/{petId}/photo:
 *   post:
 *     summary: Upload or replace a photo for a pet
 *     tags:
 *       - Pets
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the pet to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *     responses:
 *       '200':
 *         description: URL of the uploaded photo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 photoUrl:
 *                   type: string
 *                   format: uri
 *       '400':
 *         description: Missing file
 *       '404':
 *         description: Pet not found
 *       '500':
 *         description: Internal server error
 */
export const uploadPetPhoto = [
  upload.single("photo"),
  async (
    req: Request<{ petId: string }> & { file?: Express.Multer.File },
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const petId = req.params.petId;
      if (!req.file) {
        res.status(400).json({ message: "Image file required" });
        return;
      }
      const pet = await petRepo().findOne({ where: { id: petId } });
      if (!pet) {
        res.status(404).json({ message: "Pet not found" });
        return;
      }
      const url = await uploadPetPic(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
      pet.photoUrl = url;
      await petRepo().save(pet);
      res.json({ photoUrl: url });
    } catch (err) {
      next(err);
    }
  },
];

/**
 * @openapi
 * /api/pets:
 *   post:
 *     summary: Add a new pet for adoption
 *     tags:
 *       - Pets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 description: e.g. "Cat", "Dog"
 *               description:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       '201':
 *         description: Created pet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pet:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     photoUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: Missing required fields
 *       '500':
 *         description: Internal server error
 */
export const createPet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, type, description } = req.body;
    if (!name || !type) {
      res.status(400).json({ message: "name and type required" });
      return;
    }
    const pet = petRepo().create({ name, type, description });
    await petRepo().save(pet);
    res.status(201).json({ pet });
  } catch (err) {
    next(err);
  }
};
