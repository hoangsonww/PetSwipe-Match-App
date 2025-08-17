import "reflect-metadata";
import { DataSource } from "typeorm";
import ormconfig from "./config/ormconfig";

export const AppDataSource = new DataSource({
  ...ormconfig,
  synchronize: false,
  migrations: ["src/migrations/*.{ts,js}"],
});
