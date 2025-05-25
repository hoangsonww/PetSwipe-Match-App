import "reflect-metadata";
import { DataSource } from "typeorm";
import ormconfig from "./config/ormconfig";
import app from "./app";

export const AppDataSource = new DataSource(ormconfig);

AppDataSource.initialize()
  .then(() => {
    const port = process.env.PORT || 5001;
    app.listen(port, () =>
      console.log(`🚀 Server running on http://localhost:${port}`),
    );
  })
  .catch((err) => {
    console.error("TypeORM init error:", err);
  });
