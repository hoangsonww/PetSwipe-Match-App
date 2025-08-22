"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const pets_1 = __importDefault(require("./routes/pets"));
const matches_1 = __importDefault(require("./routes/matches"));
const swipes_1 = __importDefault(require("./routes/swipes"));
const chat_1 = __importDefault(require("./routes/chat"));
const errorHandler_1 = require("./middlewares/errorHandler");
const index_1 = require("./index");
const schemas_1 = require("./swagger/schemas");
const app = (0, express_1.default)();
// ─── WAIT FOR DB INIT ───────────────────────────────────────────────────────────
app.use(async (_req, _res, next) => {
    try {
        await (0, index_1.ensureInitialized)();
    }
    catch {
        // init failure already logged
    }
    next();
});
// ─── CORS ─────────────────────────────────────────────────────────────────────
// allow any origin, echoing back the request Origin header when credentials are used
const corsOptions = {
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl)
        callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
    ],
};
app.use((0, cors_1.default)(corsOptions));
// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)("dev"));
// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", auth_1.default);
app.use("/api/users", users_1.default);
app.use("/api/pets", pets_1.default);
app.use("/api/matches", matches_1.default);
app.use("/api/swipes", swipes_1.default);
app.use("/api/chat", chat_1.default);
// ─── SWAGGER / OPENAPI SETUP ───────────────────────────────────────────────────
const swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "PetSwipe API Documentation",
            version: "1.0.0",
            description: "OpenAPI documentation for the PetSwipe API. This API allows users to swipe on pets, view matches, and manage their profiles.",
        },
        servers: [
            {
                url: "https://petswipe-api.vercel.app/",
                description: "Production Server",
            },
            { url: "http://localhost:5001", description: "Local development" },
        ],
        components: {
            ...schemas_1.components,
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        "./src/routes/*.ts",
        "./src/entities/*.ts",
        "./src/controllers/*.ts",
        "./src/routes/*.js",
        "./src/entities/*.js",
        "./src/controllers/*.js",
    ],
});
app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});
app.get("/docs", (_req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>PetSwipe API Documentation</title>
        <link rel="icon" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/favicon-32x32.png" type="image/png"/>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css"
        />
        <style>
          body { margin:0; padding:0; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            SwaggerUIBundle({
              url: '/api-docs.json',
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis
              ],
            });
          };
        </script>
      </body>
    </html>`);
});
// ─── REDIRECT ROOT TO DOCS ─────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.redirect("/docs");
});
// ─── REDIRECT /api TO /docs ─────────────────────────────────────────────────────
app.get(["/api", "/api/"], (_req, res) => {
    res.redirect("/docs");
});
// ─── PING (for quick CORS test) ────────────────────────────────────────────────
app.get("/ping", (_req, res) => {
    res.json({ pong: true });
});
// ─── REQUEST LOGGER (after routes) ────────────────────────────────────────────
app.use((req, _res, next) => {
    console.log("→", req.method, req.path, "Origin:", req.headers.origin);
    next();
});
// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use(errorHandler_1.errorHandler);
exports.default = app;
