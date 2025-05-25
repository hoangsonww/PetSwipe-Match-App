import "reflect-metadata";
import { DataSource } from "typeorm";
import ormconfig from "../src/config/ormconfig";
import { assignPetsToUser } from "../src/utils/assignmentHelper";

async function main() {
  const userId = process.argv[2];
  // Optional: you can still pass a number if you only want that many
  const targetArg = process.argv[3];

  if (!userId) {
    console.error(
      "Usage: ts-node scripts/assignPetsToUser.ts <userId> [targetCount]",
    );
    process.exit(1);
  }

  // parse targetCount if provided, otherwise undefined => assign all
  const targetCount = targetArg ? parseInt(targetArg, 10) : undefined;

  const ds = new DataSource(ormconfig);
  await ds.initialize();

  try {
    const added = await assignPetsToUser(userId, targetCount);
    console.log(`✅ Assigned ${added} pets to user ${userId}`);
  } catch (err: any) {
    console.error("❌ Error assigning pets:", err.message || err);
    process.exit(1);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
