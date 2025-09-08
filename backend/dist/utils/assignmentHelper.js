"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignPetsToUser = assignPetsToUser;
const index_1 = require("../index");
const User_1 = require("../entities/User");
const Pet_1 = require("../entities/Pet");
const Match_1 = require("../entities/Match");
const userRepo = () => index_1.AppDataSource.getRepository(User_1.AppUser);
const petRepo = () => index_1.AppDataSource.getRepository(Pet_1.Pet);
const matchRepo = () => index_1.AppDataSource.getRepository(Match_1.Match);
/**
 * Assigns pets to a user.
 * - If `targetCount` is provided, tops them up to that many matches.
 * - If `targetCount` is omitted, assigns *all* currently unassigned pets.
 * Never re-assigns the same pet twice.
 *
 * @param userId      UUID of the user
 * @param targetCount Optional total number of matches desired
 * @returns how many new matches were created
 */
async function assignPetsToUser(userId, targetCount) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) {
        throw new Error("User not found");
    }
    const existing = await matchRepo().find({
        where: { user: { id: userId } },
        relations: ["pet"],
    });
    const assignedIds = new Set(existing.map((m) => m.pet.id));
    const allPets = await petRepo().find();
    const available = allPets.filter((p) => !assignedIds.has(p.id));
    if (available.length === 0) {
        return 0;
    }
    let toAssign;
    if (typeof targetCount === "number") {
        const need = targetCount - existing.length;
        if (need <= 0) {
            return 0;
        }
        toAssign = available.slice(0, need);
    }
    else {
        toAssign = available;
    }
    const newMatches = toAssign.map((pet) => matchRepo().create({ user, pet }));
    await matchRepo().save(newMatches);
    return newMatches.length;
}
