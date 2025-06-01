import "reflect-metadata";
import { startImageProcessor } from "../messaging/consumers/imageProcessor";

startImageProcessor().catch((err) => {
  console.error("Fatal error in image processor:", err);
  process.exit(1);
});
