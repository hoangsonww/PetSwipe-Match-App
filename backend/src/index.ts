import "reflect-metadata";
import { DataSource } from "typeorm";
import ormconfig from "./config/ormconfig";
import app from "./app";

export const AppDataSource = new DataSource(ormconfig);

// initialize once and cache the promise
let initPromise: Promise<void> | null = null;
export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = AppDataSource.initialize()
      .then(() => console.log("✅ TypeORM initialized"))
      .catch((err) => {
        console.error("❌ TypeORM init error:", err);
        // crash in dev
        if (process.env.NODE_ENV !== "production") process.exit(1);
        // in prod we swallow so each request can see the DB-guard error
      });
  }
  return initPromise;
}

ensureInitialized();

// only listen in dev
if (process.env.NODE_ENV !== "production") {
  ensureInitialized().then(() => {
    const port = process.env.PORT || 5001;
    app.listen(port, () =>
      console.log(`🚀 Dev server on http://localhost:${port}`),
    );
  });
}

export default app;
