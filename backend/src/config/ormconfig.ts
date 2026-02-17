import { DataSourceOptions } from "typeorm";
import config from "./index";
import { AppUser } from "../entities/User";
import { Match } from "../entities/Match";
import { Swipe } from "../entities/Swipe";
import { Pet } from "../entities/Pet";
import { AdoptionJourney } from "../entities/AdoptionJourney";
import { AdoptionTask } from "../entities/AdoptionTask";

const ormconfig: DataSourceOptions = {
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,

  // TLS for Aiven
  ssl: config.db.ssl,
  extra: {
    // pg SSL options
    ...(config.db.ssl
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {}),
    // connection pool options
    max: 1, // max open connections
    idleTimeoutMillis: 30000, // close idle clients after 30s
  },

  entities: [AppUser, Match, Swipe, Pet, AdoptionJourney, AdoptionTask],

  // only auto‐sync schema in dev
  synchronize: config.nodeEnv === "development",
  logging: config.nodeEnv === "development",
};

export default ormconfig;
