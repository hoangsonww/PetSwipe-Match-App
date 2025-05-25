import { DataSourceOptions } from "typeorm";
import config from "./index";
import { AppUser } from "../entities/User";
import { Match } from "../entities/Match";
import { Swipe } from "../entities/Swipe";
import { Pet } from "../entities/Pet";

const ormconfig: DataSourceOptions = {
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  entities: [AppUser, Match, Swipe, Pet],

  synchronize: true,
  logging: config.nodeEnv === "development",
};

export default ormconfig;
