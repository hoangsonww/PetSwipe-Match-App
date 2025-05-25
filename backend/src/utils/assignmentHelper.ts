import { AppDataSource } from "../index";
import { AppUser } from "../entities/User";
import { Pet } from "../entities/Pet";
import { Match } from "../entities/Match";

const userRepo = () => AppDataSource.getRepository(AppUser);
const petRepo = () => AppDataSource.getRepository(Pet);
const matchRepo = () => AppDataSource.getRepository(Match);

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
export async function assignPetsToUser(
  userId: string,
  targetCount?: number,
): Promise<number> {
  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Fetch existing matches so we don't double-assign
  const existing = await matchRepo().find({
    where: { user: { id: userId } },
    relations: ["pet"],
  });
  const assignedIds = new Set(existing.map((m) => m.pet.id));

  // All pets in the system
  const allPets = await petRepo().find();
  // Filter out those already assigned
  const available = allPets.filter((p) => !assignedIds.has(p.id));
  if (available.length === 0) {
    return 0;
  }

  // Decide how many to assign
  let toAssign: Pet[];
  if (typeof targetCount === "number") {
    const need = targetCount - existing.length;
    if (need <= 0) {
      return 0;
    }
    // take first `need` available (could also randomize if desired)
    toAssign = available.slice(0, need);
  } else {
    // no limit: assign all available
    toAssign = available;
  }

  const newMatches = toAssign.map((pet) => matchRepo().create({ user, pet }));
  await matchRepo().save(newMatches);
  return newMatches.length;
}
