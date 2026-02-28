import "reflect-metadata";
import { DataSource } from "typeorm";
import ormconfig from "./config/ormconfig";

export const AppDataSource = new DataSource(ormconfig);

let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = AppDataSource.initialize()
      .then(() => console.log("✅ TypeORM initialized"))
      .catch((err) => {
        console.error("❌ TypeORM init error:", err);
        if (process.env.NODE_ENV !== "production") process.exit(1);
      });
  }

  return initPromise;
}
