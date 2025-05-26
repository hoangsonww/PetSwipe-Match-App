import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import petsRoutes from "./routes/pets";
import matchesRoutes from "./routes/matches";
import swipesRoutes from "./routes/swipes";
import { errorHandler } from "./middlewares/errorHandler";
import { ensureInitialized } from "./index";
import { components as schemaComponents } from "./swagger/schemas";

const app = express();

// ─── WAIT FOR DB INIT ───────────────────────────────────────────────────────────
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();
  } catch {
    // init failure already logged
  }
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
// allow any origin, echoing back the request Origin header when credentials are used
const corsOptions: cors.CorsOptions = {
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
app.use(cors(corsOptions));

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pets", petsRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/swipes", swipesRoutes);

// ─── SWAGGER / OPENAPI SETUP ───────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PetSwipe API Documentation",
      version: "1.0.0",
      description:
        "OpenAPI documentation for the PetSwipe API. This API allows users to swipe on pets, view matches, and manage their profiles.",
    },
    servers: [
      {
        url: "https://petswipe-api.vercel.app/",
        description: "Production Server",
      },
      { url: "http://localhost:5001", description: "Local development" },
    ],
    components: {
      ...schemaComponents,
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
app.use(errorHandler);

export default app;
