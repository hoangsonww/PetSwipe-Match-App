import app from "./app";
import { ensureInitialized } from "./bootstrap";

ensureInitialized();

const shouldListen =
  process.env.SERVERLESS !== "true" && process.env.VERCEL !== "1";

if (shouldListen) {
  ensureInitialized().then(() => {
    const port = process.env.PORT || 5001;
    app.listen(port, () =>
      console.log(`🚀 Server listening on http://localhost:${port}`),
    );
  });
}

export default app;
