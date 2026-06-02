import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { BridgeResponse } from '../types/index.js';
import { ScriptExecutor } from './ScriptExecutor.js';
import { logger } from '../utils/logger.js';


export interface BridgeServerOptions {
  port: number;
  host: string;
  maxPayload: number;
  timeout: number;
}

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private httpServer: Server | null = null;
  private executor: ScriptExecutor;
  private options: BridgeServerOptions;
  private connections: Set<WebSocket> = new Set();

  constructor(options: BridgeServerOptions, executor: ScriptExecutor) {
    this.options = options;
    this.executor = executor;

    this.executor.on('request', (request) => {
      this.broadcast(JSON.stringify(request));
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer = createServer();
      this.wss = new WebSocketServer({
        server: this.httpServer,
        maxPayload: this.options.maxPayload,
      });

      this.wss.on('connection', (ws) => {
        this.connections.add(ws);
        logger.info('Bridge client connected');

        ws.on('message', (raw) => {
          try {
            const response: BridgeResponse = JSON.parse(raw.toString());
            this.executor.handleResponse(response);
          } catch (err) {
            logger.error('Invalid bridge message', { error: err instanceof Error ? err.message : String(err) });
          }
        });

        ws.on('close', () => {
          this.connections.delete(ws);
          logger.info('Bridge client disconnected');
        });

        ws.on('error', (err) => {
          logger.error('Bridge WebSocket error', { error: err.message });
          this.connections.delete(ws);
        });

        ws.send(JSON.stringify({ type: 'connected', version: '1.0.0' }));
      });

      this.httpServer.listen(this.options.port, this.options.host, () => {
        logger.info(`Bridge server listening on ${this.options.host}:${this.options.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const ws of this.connections) {
        ws.close();
      }
      this.connections.clear();

      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      if (this.httpServer) {
        this.httpServer.close(() => resolve());
        this.httpServer = null;
      } else {
        resolve();
      }
    });
  }

  private broadcast(data: string): void {
    for (const ws of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}
