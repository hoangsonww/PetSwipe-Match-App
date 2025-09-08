"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.ensureInitialized = ensureInitialized;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const ormconfig_1 = __importDefault(require("./config/ormconfig"));
const app_1 = __importDefault(require("./app"));
exports.AppDataSource = new typeorm_1.DataSource(ormconfig_1.default);
// initialize once and cache the promise
let initPromise = null;
function ensureInitialized() {
    if (!initPromise) {
        initPromise = exports.AppDataSource.initialize()
            .then(() => console.log("✅ TypeORM initialized"))
            .catch((err) => {
            console.error("❌ TypeORM init error:", err);
            // crash in dev
            if (process.env.NODE_ENV !== "production")
                process.exit(1);
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
        app_1.default.listen(port, () => console.log(`🚀 Dev server on http://localhost:${port}`));
    });
}
exports.default = app_1.default;
