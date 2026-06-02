import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

const configSchema = z.object({
  bridge: z
    .object({
      port: z.number().int().positive().default(8120),
      host: z.string().default('127.0.0.1'),
      maxPayload: z.number().int().positive().default(1048576),
      timeout: z.number().int().positive().default(30000),
    })
    .default({}),
  httpBridge: z
    .object({
      enabled: z.boolean().default(false),
      port: z.number().int().positive().default(3000),
      host: z.string().default('127.0.0.1'),
      token: z.string().default(''),
    })
    .default({}),
  server: z
    .object({
      transport: z.enum(['stdio', 'websocket']).default('stdio'),
      name: z.string().default('indesign-nutria-mcp'),
      version: z.string().default('1.0.0'),
    })
    .default({}),
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof configSchema>;

const defaultConfig: AppConfig = {
  bridge: {
    port: 8120,
    host: '127.0.0.1',
    maxPayload: 1048576,
    timeout: 30000,
  },
  httpBridge: {
    enabled: false,
    port: 3000,
    host: '127.0.0.1',
    token: '',
  },
  server: {
    transport: 'stdio',
    name: 'indesign-nutria-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
};

export function loadConfig(configPath?: string): AppConfig {
  if (configPath && existsSync(resolve(configPath))) {
    try {
      const raw = JSON.parse(readFileSync(resolve(configPath), 'utf-8'));
      return configSchema.parse(raw);
    } catch (err) {
      console.warn(`Config load failed at ${configPath}, using defaults:`, err);
      return defaultConfig;
    }
  }

  if (existsSync(resolve('indesign-nutria-mcp.json'))) {
    try {
      const raw = JSON.parse(readFileSync(resolve('indesign-nutria-mcp.json'), 'utf-8'));
      return configSchema.parse(raw);
    } catch {
      return defaultConfig;
    }
  }

  return defaultConfig;
}
