import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { ScriptExecutor } from './ScriptExecutor.js';
import { logger } from '../utils/logger.js';

export interface ExpressBridgeOptions {
  port: number;
  host: string;
  token: string;
}

export class ExpressBridgeServer {
  private app: Express;
  private httpServer: HttpServer | null = null;
  private executor: ScriptExecutor;
  private options: ExpressBridgeOptions;

  constructor(options: ExpressBridgeOptions, executor: ScriptExecutor) {
    this.options = options;
    this.executor = executor;
    this.app = express();

    this.app.use(express.json({ limit: '1mb' }));

    // Auth middleware
    if (options.token) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        const provided = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : (req.query.token as string | undefined);

        if (provided !== options.token) {
          res.status(401).json({ error: 'Unauthorized: invalid or missing BRIDGE_TOKEN' });
          return;
        }
        next();
      });
    }

    // GET /status — bridge health and queue depth
    this.app.get('/status', (_req: Request, res: Response) => {
      const status = this.executor.getStatus();
      res.json({
        status: 'ok',
        scriptQueue: status.queueDepth,
        connected: status.connected,
        timestamp: new Date().toISOString(),
      });
    });

    // POST /execute — run arbitrary ExtendScript code
    this.app.post('/execute', async (req: Request, res: Response) => {
      const { code, timeout } = req.body;

      if (!code || typeof code !== 'string') {
        res.status(400).json({ error: 'Missing required string field: code' });
        return;
      }

      if (code.length > 50000) {
        res.status(400).json({ error: 'Code exceeds 50000 character limit' });
        return;
      }

      try {
        const response = await this.executor.execute(code, timeout ?? undefined);
        res.json({
          id: response.id,
          type: response.type,
          result: response.result,
          error: response.error,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: message });
      }
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found. Available endpoints: GET /status, POST /execute' });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer = createServer(this.app);
      this.httpServer.listen(this.options.port, this.options.host, () => {
        logger.info(`Express bridge server listening on ${this.options.host}:${this.options.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
        this.httpServer = null;
      } else {
        resolve();
      }
    });
  }
}
