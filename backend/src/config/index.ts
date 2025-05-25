import dotenv from "dotenv";
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES || "1h",
  },

  db: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10) || 5432,
    username: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === "true",
  },

  aws: {
    region: process.env.AWS_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    bucket: process.env.S3_BUCKET!,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  },
};
