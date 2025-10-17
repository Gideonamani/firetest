/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

setGlobalOptions({
  maxInstances: 10,
  region: "africa-south1",
});

/**
 * Placeholder handler that keeps Firebase Hosting rewrites happy while the
 * Next.js + Cloud Functions integration is wired up. Requests are logged so
 * we can verify routing during local emulator runs.
 */
export const nextApp = onRequest(async (req, res) => {
  logger.info("nextApp placeholder hit", {path: req.path});

  const lines = [
    "Next.js SSR handler coming soon.",
    `Received request for: ${req.path || "/"}`,
    "Update functions/src/index.ts to mount the Next.js",
    "server once the build pipeline is ready.",
  ];

  res.status(200).send(lines.join("\n"));
});
