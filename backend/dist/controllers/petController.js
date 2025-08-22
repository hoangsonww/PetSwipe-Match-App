"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPetById = exports.updatePet = exports.listMyCreatedPets = exports.createPet = exports.uploadPetPhoto = exports.exportPets = exports.listPets = exports.uploadPets = void 0;
const csv_parser_1 = __importDefault(require("csv-parser"));
const index_1 = require("../index");
const Pet_1 = require("../entities/Pet");
const csv_1 = require("../utils/csv");
const stream_1 = __importDefault(require("stream"));
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../utils/supabase");
const petRepo = () => index_1.AppDataSource.getRepository(Pet_1.Pet);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
function extractFirstFile(req) {
    if (req.file)
        return req.file;
    const f = req.files;
    if (!f)
        return undefined;
    if (Array.isArray(f))
        return f[0];
    // @ts-ignore
    return f.file?.[0] || f.files?.[0] || f.csv?.[0] || Object.values(f)[0]?.[0];
}
exports.uploadPets = [
    // Use .any() so Swagger/clients with different field names still work
    upload.any(),
    (req, res, next) => {
        const uploaded = extractFirstFile(req);
        if (!uploaded) {
            res.status(400).json({ message: "CSV required" });
            return;
        }
        const creatorEmail = req.user?.email ?? "test@unc.edu";
        // Allowed header names (normalized to lower-case)
        const allowed = [
            "name",
            "type", // preferred
            "breed", // alias for type
            "description",
            "photourl", // 'photoUrl' becomes 'photourl' after normalization
            "sheltername",
            "sheltercontact",
            "shelteraddress",
        ];
        const errors = [];
        const validPartials = [];
        let headerValidated = false;
        let responded = false;
        let dataLine = 1; // header not counted; first data row will be 2
        const rs = new stream_1.default.PassThrough();
        rs.end(uploaded.buffer);
        const parser = (0, csv_parser_1.default)({
            strict: true, // each row must match header length
            mapHeaders: ({ header }) => header
                .replace(/\ufeff/g, "")
                .trim()
                .toLowerCase(),
            mapValues: ({ value }) => typeof value === "string" ? value.trim() : value,
        });
        parser.on("headers", (headers) => {
            const lower = headers.map((h) => h.toLowerCase());
            const headerSet = new Set(lower);
            const extra = lower.filter((h) => !allowed.includes(h));
            const hasName = headerSet.has("name");
            const hasType = headerSet.has("type");
            const hasBreed = headerSet.has("breed");
            const missingRequired = [];
            if (!hasName)
                missingRequired.push("name");
            if (!hasType && !hasBreed)
                missingRequired.push("type or breed");
            if (extra.length || missingRequired.length) {
                responded = true;
                rs.unpipe(parser);
                parser.removeAllListeners();
                res.status(400).json({
                    message: "Invalid CSV headers",
                    allowedHeaders: allowed,
                    extra,
                    missingRequired,
                });
                return;
            }
            headerValidated = true;
        });
        parser.on("data", (row) => {
            dataLine += 1;
            // Normalize/alias values (all keys are lower-case)
            const name = (row.name ?? "").trim();
            const type = (row.type ?? row.breed ?? "").trim();
            const description = (row.description ?? "").trim();
            const photoUrlRaw = (row.photourl ?? "").trim();
            const shelterName = (row.sheltername ?? "").trim();
            const shelterContact = (row.sheltercontact ?? "").trim();
            const shelterAddress = (row.shelteraddress ?? "").trim();
            // Skip truly blank rows
            if (!name &&
                !type &&
                !description &&
                !photoUrlRaw &&
                !shelterName &&
                !shelterContact &&
                !shelterAddress) {
                return;
            }
            // Per-row required checks
            if (!name) {
                errors.push({
                    row: dataLine,
                    message: 'Missing required field "name"',
                });
                return;
            }
            if (!type) {
                errors.push({
                    row: dataLine,
                    message: 'Missing required field "type" (or provide "breed")',
                });
                return;
            }
            // Optional: validate photoUrl protocol if provided
            let photoUrl;
            if (photoUrlRaw) {
                try {
                    const u = new URL(photoUrlRaw);
                    if (u.protocol === "http:" || u.protocol === "https:") {
                        photoUrl = u.toString();
                    }
                    else {
                        errors.push({
                            row: dataLine,
                            message: "Invalid photoUrl (must be http/https)",
                        });
                    }
                }
                catch {
                    errors.push({
                        row: dataLine,
                        message: "Invalid photoUrl (malformed URL)",
                    });
                }
            }
            // Build partial Pet
            const partial = {
                name,
                type,
                description: description || undefined,
                photoUrl,
                shelterName: shelterName || undefined,
                shelterContact: shelterContact || undefined,
                shelterAddress: shelterAddress || undefined,
                createdBy: creatorEmail,
            };
            validPartials.push(partial);
        });
        parser.on("end", async () => {
            if (responded)
                return;
            if (!headerValidated) {
                res.status(400).json({ message: "Invalid or missing CSV header row" });
                return;
            }
            try {
                if (validPartials.length === 0) {
                    res.json({ imported: 0, errors });
                    return;
                }
                const saved = await petRepo().save(validPartials);
                res.json({ imported: saved.length, errors });
            }
            catch (err) {
                next(err);
            }
        });
        parser.on("error", (err) => {
            if (!responded)
                next(err);
        });
        rs.pipe(parser);
    },
];
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
const listPets = async (req, res, next) => {
    try {
        if (req.user) {
            const pets = await petRepo()
                .createQueryBuilder("pet")
                .leftJoin("pet.swipes", "swipe", "swipe.userId = :uid", {
                uid: req.user.id,
            })
                .where("swipe.id IS NULL")
                .orderBy("pet.createdAt", "DESC")
                .getMany();
            res.json(pets);
            return;
        }
        const all = await petRepo().find({ order: { createdAt: "DESC" } });
        res.json(all);
    }
    catch (err) {
        next(err);
    }
};
exports.listPets = listPets;
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
const exportPets = async (_req, res, next) => {
    try {
        const all = await petRepo().find();
        (0, csv_1.sendCsv)(res, all, "pets_export.csv");
    }
    catch (err) {
        next(err);
    }
};
exports.exportPets = exportPets;
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
exports.uploadPetPhoto = [
    upload.single("photo"),
    async (req, res, next) => {
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
            const url = await (0, supabase_1.uploadPetPic)(req.file.buffer, req.file.originalname, req.file.mimetype);
            pet.photoUrl = url;
            await petRepo().save(pet);
            res.json({ photoUrl: url });
        }
        catch (err) {
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
const createPet = async (req, res, next) => {
    try {
        const { name, type, description, shelterName, shelterContact, shelterAddress, photoUrl, } = req.body;
        if (!name || !type) {
            res.status(400).json({ message: "name and type required" });
            return;
        }
        const createdBy = req.user?.email ?? "test@unc.edu";
        const pet = index_1.AppDataSource.getRepository(Pet_1.Pet).create({
            name,
            type,
            description,
            shelterName,
            shelterContact,
            shelterAddress,
            photoUrl,
            createdBy,
        });
        await index_1.AppDataSource.getRepository(Pet_1.Pet).save(pet);
        res.status(201).json({ pet });
    }
    catch (err) {
        next(err);
    }
};
exports.createPet = createPet;
/**
 * @openapi
 * /api/pets/mine:
 *   get:
 *     summary: List pets created by the authenticated user
 *     tags:
 *       - Pets
 *     description: |
 *       Returns all pets where `createdBy` equals the authenticated user's email.
 *       Results are ordered by `createdAt` descending.
 *     responses:
 *       '200':
 *         description: Array of pets created by the current user
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
 *                   createdBy:
 *                     type: string
 *                     format: email
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       '401':
 *         description: Authentication required
 *       '500':
 *         description: Internal server error
 */
const listMyCreatedPets = async (req, res, next) => {
    try {
        const email = req.user?.email;
        if (!email) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const pets = await index_1.AppDataSource.getRepository(Pet_1.Pet).find({
            where: { createdBy: email },
            order: { createdAt: "DESC" },
        });
        res.json(pets);
    }
    catch (err) {
        next(err);
    }
};
exports.listMyCreatedPets = listMyCreatedPets;
/**
 * @openapi
 * /api/pets/{petId}:
 *   put:
 *     summary: Update a pet you created
 *     tags:
 *       - Pets
 *     description: |
 *       Updates a pet **only** if the authenticated user's email matches the pet's `createdBy`.
 *       Fields not included in the request body are left unchanged. `createdBy` is immutable.
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         description: UUID of the pet to update
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               photoUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               shelterName:
 *                 type: string
 *                 nullable: true
 *               shelterContact:
 *                 type: string
 *                 nullable: true
 *               shelterAddress:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       '200':
 *         description: Updated pet
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
 *                     createdBy:
 *                       type: string
 *                       format: email
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: The requester is not allowed to update this pet
 *       '404':
 *         description: Pet not found
 *       '500':
 *         description: Internal server error
 */
const updatePet = async (req, res, next) => {
    try {
        const email = req.user?.email;
        if (!email) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const { petId } = req.params;
        const repo = index_1.AppDataSource.getRepository(Pet_1.Pet);
        const pet = await repo.findOne({ where: { id: petId } });
        if (!pet) {
            res.status(404).json({ message: "Pet not found" });
            return;
        }
        if (pet.createdBy !== email) {
            res
                .status(403)
                .json({ message: "You are not allowed to update this pet" });
            return;
        }
        // Whitelist fields that can be updated
        const { name, type, description, photoUrl, shelterName, shelterContact, shelterAddress, } = req.body ?? {};
        if (name !== undefined)
            pet.name = name;
        if (type !== undefined)
            pet.type = type;
        if (description !== undefined)
            pet.description = description;
        if (photoUrl !== undefined)
            pet.photoUrl = photoUrl;
        if (shelterName !== undefined)
            pet.shelterName = shelterName;
        if (shelterContact !== undefined)
            pet.shelterContact = shelterContact;
        if (shelterAddress !== undefined)
            pet.shelterAddress = shelterAddress;
        await repo.save(pet);
        res.json({ pet });
    }
    catch (err) {
        next(err);
    }
};
exports.updatePet = updatePet;
/**
 * @openapi
 * /api/pets/{petId}:
 *   get:
 *     summary: Get a single pet by ID
 *     tags:
 *       - Pets
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         description: UUID of the pet
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Pet found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 photoUrl:
 *                   type: string
 *                   format: uri
 *                   nullable: true
 *                 shelterName:
 *                   type: string
 *                   nullable: true
 *                 shelterContact:
 *                   type: string
 *                   nullable: true
 *                 shelterAddress:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
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
const getPetById = async (req, res, next) => {
    try {
        const { petId } = req.params;
        if (!petId || typeof petId !== "string" || petId.length < 10) {
            res.status(404).json({ message: "Pet not found" });
            return;
        }
        const pet = await petRepo().findOne({ where: { id: petId } });
        if (!pet) {
            res.status(404).json({ message: "Pet not found" });
            return;
        }
        res.json(pet);
    }
    catch (err) {
        next(err);
    }
};
exports.getPetById = getPetById;
