import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { AppConfig } from '../utils/configLoader.js';
import { logger } from '../utils/logger.js';
import { SessionManager } from '../core/SessionManager.js';
import { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import { BridgeServer } from '../bridge/BridgeServer.js';
import { ExpressBridgeServer } from '../bridge/ExpressBridgeServer.js';
import { DocumentHandler } from '../handlers/DocumentHandler.js';
import { PageHandler } from '../handlers/PageHandler.js';
import { TextHandler } from '../handlers/TextHandler.js';
import { StyleHandler } from '../handlers/StyleHandler.js';
import { ObjectHandler } from '../handlers/ObjectHandler.js';
import { ExportHandler } from '../handlers/ExportHandler.js';
import { MasterHandler } from '../handlers/MasterHandler.js';
import { TableHandler } from '../handlers/TableHandler.js';
import { ResourcesHandler } from '../handlers/ResourcesHandler.js';
import { BookHandler } from '../handlers/BookHandler.js';
import { InteractiveHandler } from '../handlers/InteractiveHandler.js';
import { XmlHandler } from '../handlers/XmlHandler.js';

export class IndesignMcpServer {
  private mcpServer: McpServer;
  private executor: ScriptExecutor;
  private sessionManager: SessionManager;
  private bridgeServer: BridgeServer | null = null;
  private expressBridgeServer: ExpressBridgeServer | null = null;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.executor = new ScriptExecutor(config.bridge.timeout);
    this.sessionManager = new SessionManager();

    this.mcpServer = new McpServer({
      name: config.server.name,
      version: config.server.version,
    });

    // Register all handlers
    const handlers = [
      new DocumentHandler(this.executor),
      new PageHandler(this.executor),
      new TextHandler(this.executor),
      new StyleHandler(this.executor),
      new ObjectHandler(this.executor),
      new ExportHandler(this.executor),
      new MasterHandler(this.executor),
      new TableHandler(this.executor),
      new ResourcesHandler(this.executor),
      new BookHandler(this.executor),
      new InteractiveHandler(this.executor),
      new XmlHandler(this.executor),
    ];

    for (const handler of handlers) {
      handler.register(this.mcpServer);
      logger.debug(`Registered handler: ${handler.name}`);
    }

    // Register session resource
    this.mcpServer.resource(
      'session_status',
      'mcp://session/status',
      async (uri: URL) => ({
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(this.sessionManager.getAllSessions()),
            mimeType: 'application/json',
          },
        ],
      }),
    );

    // Register bridge resource
    this.mcpServer.resource(
      'bridge_status',
      'mcp://bridge/status',
      async (uri: URL) => ({
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(this.executor.getStatus()),
            mimeType: 'application/json',
          },
        ],
      }),
    );

    logger.info(`MCP server initialized: ${config.server.name} v${config.server.version}`);
  }

  async start(): Promise<void> {
    // Start bridge server if using websocket transport
    if (this.config.server.transport === 'websocket') {
      this.bridgeServer = new BridgeServer(this.config.bridge, this.executor);
      await this.bridgeServer.start();
    }

    if (this.config.httpBridge.enabled) {
      const token = this.config.httpBridge.token || process.env.BRIDGE_TOKEN || '';
      this.expressBridgeServer = new ExpressBridgeServer(
        { ...this.config.httpBridge, token },
        this.executor,
      );
      await this.expressBridgeServer.start();
    }

    // Connect MCP transport
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);

    logger.info(`MCP server running on ${this.config.server.transport} transport`);

    // Handle shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down...');
    this.executor.cancelAll();
    if (this.bridgeServer) {
      await this.bridgeServer.stop();
    }
    if (this.expressBridgeServer) {
      await this.expressBridgeServer.stop();
    }
    process.exit(0);
  }
}
