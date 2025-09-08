"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const ormconfig_1 = __importDefault(require("./config/ormconfig"));
exports.AppDataSource = new typeorm_1.DataSource({
    ...ormconfig_1.default,
    synchronize: false,
    migrations: ["src/migrations/*.{ts,js}"],
});
