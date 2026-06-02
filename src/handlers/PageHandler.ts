import { z } from 'zod';
import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { addPageSchema } from '../schemas/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class PageHandler implements IHandler {
  public readonly name = 'page';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      {
        name: 'page_add',
        description: 'Add a new page to the active document at a specified position',
        inputSchema: addPageSchema.shape,
        handler: compose(withLogging('page_add'), withErrorHandling())(this.add.bind(this)),
      },
      {
        name: 'page_delete',
        description: 'Delete a page from the active document by index',
        inputSchema: { index: z.number().int().min(0) },
        handler: compose(withLogging('page_delete'), withErrorHandling())(this.delete.bind(this)),
      },
      {
        name: 'page_duplicate',
        description: 'Duplicate a page in the active document',
        inputSchema: { index: z.number().int().min(0) },
        handler: compose(withLogging('page_duplicate'), withErrorHandling())(this.duplicate.bind(this)),
      },
      {
        name: 'page_move',
        description: 'Move a page to a new position in the active document',
        inputSchema: { index: z.number().int().min(0), toIndex: z.number().int().min(0) },
        handler: compose(withLogging('page_move'), withErrorHandling())(this.move.bind(this)),
      },
      {
        name: 'page_getInfo',
        description: 'Get detailed information about a specific page',
        inputSchema: { index: z.number().int().min(0) },
        handler: compose(withLogging('page_getInfo'), withErrorHandling())(this.getInfo.bind(this)),
      },
      {
        name: 'page_listAll',
        description: 'List all pages in the active document with their properties',
        inputSchema: {},
        handler: compose(withLogging('page_listAll'), withErrorHandling())(this.listAll.bind(this)),
      },
      {
        name: 'page_applyMaster',
        description: 'Apply a master spread to a page',
        inputSchema: { pageIndex: z.number().int().min(0), masterName: z.string() },
        handler: compose(withLogging('page_applyMaster'), withErrorHandling())(this.applyMaster.bind(this)),
      },
    ];
  }

  public register(server: McpServer): void {
    for (const tool of this.tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  private async add(args: unknown, _extra: any): Promise<ToolResult> {
    const params = addPageSchema.parse(args);
    const code = `
      var doc = app.activeDocument;
      var refPage = ${params.referencePage !== undefined ? `doc.pages[${params.referencePage}]` : 'undefined'};
      var pos = LocationOptions.${params.position};
      var page = doc.pages.add(pos, refPage);
      JSON.stringify({ index: page.documentOffset, name: page.name });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async delete(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ index: z.number().int().min(0) }).parse(args);
    const code = `app.activeDocument.pages[${params.index}].remove(); "deleted"`;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async duplicate(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ index: z.number().int().min(0) }).parse(args);
    const code = `
      var page = app.activeDocument.pages[${params.index}].duplicate();
      JSON.stringify({ index: page.documentOffset, name: page.name });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async move(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ index: z.number().int().min(0), toIndex: z.number().int().min(0) }).parse(args);
    const code = `app.activeDocument.pages[${params.index}].move(LocationOptions.atBeginning, app.activeDocument.pages[${params.toIndex}]); "moved"`;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async getInfo(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ index: z.number().int().min(0) }).parse(args);
    const code = `
      var page = app.activeDocument.pages[${params.index}];
      JSON.stringify({
        index: page.documentOffset,
        name: page.name,
        bounds: { top: page.bounds[0], left: page.bounds[1], bottom: page.bounds[2], right: page.bounds[3] },
        side: page.side,
        masterSpread: page.appliedMaster ? page.appliedMaster.name : null,
        label: page.label
      });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async listAll(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      var pages = app.activeDocument.pages;
      var result = [];
      for (var i = 0; i < pages.length; i++) {
        result.push({
          index: i,
          name: pages[i].name,
          side: pages[i].side,
          masterSpread: pages[i].appliedMaster ? pages[i].appliedMaster.name : null
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async applyMaster(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ pageIndex: z.number().int().min(0), masterName: z.string() }).parse(args);
    const code = `
      var master = app.activeDocument.masterSpreads.item("${params.masterName.replace(/"/g, '\\"')}");
      app.activeDocument.pages[${params.pageIndex}].appliedMaster = master;
      "applied";
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
