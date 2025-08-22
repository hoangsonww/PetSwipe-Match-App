"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const imageProcessor_1 = require("../messaging/consumers/imageProcessor");
(0, imageProcessor_1.startImageProcessor)().catch((err) => {
    console.error("Fatal error in image processor:", err);
    process.exit(1);
});
