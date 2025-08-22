"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const User_1 = require("../entities/User");
const Match_1 = require("../entities/Match");
const Swipe_1 = require("../entities/Swipe");
const Pet_1 = require("../entities/Pet");
const ormconfig = {
    type: "postgres",
    host: index_1.default.db.host,
    port: index_1.default.db.port,
    username: index_1.default.db.username,
    password: index_1.default.db.password,
    database: index_1.default.db.database,
    // TLS for Aiven
    ssl: index_1.default.db.ssl,
    extra: {
        // pg SSL options
        ...(index_1.default.db.ssl
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
    entities: [User_1.AppUser, Match_1.Match, Swipe_1.Swipe, Pet_1.Pet],
    // only auto‐sync schema in dev
    synchronize: index_1.default.nodeEnv === "development",
    logging: index_1.default.nodeEnv === "development",
};
exports.default = ormconfig;
