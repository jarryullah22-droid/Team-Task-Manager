import { createApp } from './createApp.js';
import { config } from './config/env.js';

// Local development entry point only.
// On Vercel the API is served by api/index.js as a serverless function and this
// file is never executed.
const app = createApp();

const server = app.listen(config.port, () => {
  console.log(
    `Team Task Manager API running on http://localhost:${config.port} [${config.nodeEnv}]`
  );
});

const shutdown = (signal) => () => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
