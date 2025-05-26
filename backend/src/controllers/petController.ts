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
 *     summary: Upload a CSV of pets for bulk import
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
 *                 description: CSV file with headers `name,breed,description`
 *     responses:
 *       '200':
 *         description: Number of pets successfully imported
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imported:
 *                   type: integer
 *                   description: Count of imported rows
 *       '400':
 *         description: CSV file missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *     summary: List all pets, filtering out those swiped by the current user
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
 *                   shelterName:
 *                     type: string
 *                     nullable: true
 *                   shelterContact:
 *                     type: string
 *                     nullable: true
 *                   shelterAddress:
 *                     type: string
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
      const pets = await petRepo()
        .createQueryBuilder("pet")
        .leftJoin("pet.swipes", "swipe", "swipe.userId = :uid", {
          uid: (req.user as any).id,
        })
        .where("swipe.id IS NULL")
        .orderBy("pet.createdAt", "DESC")
        .getMany();
      res.json(pets);
      return;
    }
    const all = await petRepo().find({ order: { createdAt: "DESC" } });
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
 *         description: CSV file download containing all pets
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
 *     summary: Upload or replace a pet's photo
 *     tags:
 *       - Pets
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the pet
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '404':
 *         description: Pet not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *     summary: Create a new pet listing
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
 *               shelterName:
 *                 type: string
 *                 nullable: true
 *                 description: Name of the shelter
 *               shelterContact:
 *                 type: string
 *                 nullable: true
 *                 description: Contact info for the shelter
 *               shelterAddress:
 *                 type: string
 *                 nullable: true
 *                 description: Physical address of the shelter
 *     responses:
 *       '201':
 *         description: Newly created pet object
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
 *                     shelterName:
 *                       type: string
 *                       nullable: true
 *                     shelterContact:
 *                       type: string
 *                       nullable: true
 *                     shelterAddress:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '500':
 *         description: Internal server error
 */
export const createPet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      type,
      description,
      shelterName,
      shelterContact,
      shelterAddress,
    } = req.body;
    if (!name || !type) {
      res.status(400).json({ message: "name and type required" });
      return;
    }
    const pet = petRepo().create({
      name,
      type,
      description,
      shelterName,
      shelterContact,
      shelterAddress,
    });
    await petRepo().save(pet);
    res.status(201).json({ pet });
  } catch (err) {
    next(err);
  }
};
