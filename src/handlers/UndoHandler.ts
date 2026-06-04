import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class UndoHandler implements IHandler {
  public readonly name = 'undo';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      {
        name: 'undo',
        description: 'Undo the last operation',
        inputSchema: {},
        handler: compose(withLogging('undo'), withErrorHandling())(this.undo.bind(this)),
      },
      {
        name: 'redo',
        description: 'Redo the last undone operation',
        inputSchema: {},
        handler: compose(withLogging('redo'), withErrorHandling())(this.redo.bind(this)),
      },
      {
        name: 'undo_history',
        description: 'Get undo/redo state information',
        inputSchema: {},
        handler: compose(withLogging('undo_history'), withErrorHandling())(this.undoHistory.bind(this)),
      },
    ];
  }

  public register(server: McpServer): void {
    for (const tool of this.tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  private async undo(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      if (app.activeDocument.undoable) {
        app.activeDocument.undo();
        "undone";
      } else {
        "nothing to undo";
      }
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async redo(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      app.activeDocument.redo();
      "redone";
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async undoHistory(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      JSON.stringify({
        undoable: app.activeDocument.undoable,
        redoable: app.activeDocument.redoable
      });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
