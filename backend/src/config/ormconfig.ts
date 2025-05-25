import { DataSourceOptions } from "typeorm";
import config from "./index";

const ormconfig: DataSourceOptions = {
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  entities: [__dirname + "/../entities/*.{ts,js}"],
  synchronize: true,
  logging: config.nodeEnv === "development",
};

export default ormconfig;
