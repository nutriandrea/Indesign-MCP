#!/usr/bin/env node

import { loadConfig } from './utils/configLoader.js';
import { IndesignMcpServer } from './server/IndesignMcpServer.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const configPath = process.argv[2]; // optional path to config file
  const config = loadConfig(configPath);

  // Override log level from env if set
  if (process.env.LOG_LEVEL) {
    config.logging.level = process.env.LOG_LEVEL as any;
  }

  const server = new IndesignMcpServer(config);

  try {
    await server.start();
  } catch (err) {
    logger.error('Fatal error during startup', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

main();
