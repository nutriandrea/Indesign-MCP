import { z } from 'zod';
import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class TableHandler implements IHandler {
  public readonly name = 'table';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      {
        name: 'table_create',
        description: 'Create a table on a page at specified bounds with row/column count',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          bounds: z.object({ top: z.number(), left: z.number(), bottom: z.number(), right: z.number() }),
          rows: z.number().int().min(1).default(3),
          columns: z.number().int().min(1).default(3),
        },
        handler: compose(withLogging('table_create'), withErrorHandling())(this.create.bind(this)),
      },
      {
        name: 'table_list',
        description: 'List all tables on a page or in the document',
        inputSchema: { pageIndex: z.number().int().min(0).optional() },
        handler: compose(withLogging('table_list'), withErrorHandling())(this.list.bind(this)),
      },
      {
        name: 'table_addRow',
        description: 'Add a row to a table at a specific index',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          tableIndex: z.number().int().min(0),
          atIndex: z.number().int().min(0).optional(),
        },
        handler: compose(withLogging('table_addRow'), withErrorHandling())(this.addRow.bind(this)),
      },
      {
        name: 'table_addColumn',
        description: 'Add a column to a table at a specific index',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          tableIndex: z.number().int().min(0),
          atIndex: z.number().int().min(0).optional(),
        },
        handler: compose(withLogging('table_addColumn'), withErrorHandling())(this.addColumn.bind(this)),
      },
      {
        name: 'table_deleteRow',
        description: 'Delete a row from a table',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          tableIndex: z.number().int().min(0),
          rowIndex: z.number().int().min(0),
        },
        handler: compose(withLogging('table_deleteRow'), withErrorHandling())(this.deleteRow.bind(this)),
      },
      {
        name: 'table_deleteColumn',
        description: 'Delete a column from a table',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          tableIndex: z.number().int().min(0),
          columnIndex: z.number().int().min(0),
        },
        handler: compose(withLogging('table_deleteColumn'), withErrorHandling())(this.deleteColumn.bind(this)),
      },
      {
        name: 'table_setCell',
        description: 'Set content of a specific cell',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          tableIndex: z.number().int().min(0),
          row: z.number().int().min(0),
          column: z.number().int().min(0),
          content: z.string(),
        },
        handler: compose(withLogging('table_setCell'), withErrorHandling())(this.setCell.bind(this)),
      },
      {
        name: 'table_getInfo',
        description: 'Get detailed info about a table (rows, columns, cell contents)',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          tableIndex: z.number().int().min(0),
        },
        handler: compose(withLogging('table_getInfo'), withErrorHandling())(this.getInfo.bind(this)),
      },
    ];
  }

  public register(server: McpServer): void {
    for (const tool of this.tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  private escape(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  private scope(pageIndex?: number): string {
    return pageIndex !== undefined ? `app.activeDocument.pages[${pageIndex}]` : 'app.activeDocument';
  }

  private async create(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      bounds: z.object({ top: z.number(), left: z.number(), bottom: z.number(), right: z.number() }),
      rows: z.number().int().min(1).default(3),
      columns: z.number().int().min(1).default(3),
    }).parse(args as Record<string, unknown>);
    const b = params.bounds;
    const code = `
      var pg = app.activeDocument.pages[${params.pageIndex}];
      var tf = pg.textFrames.add();
      tf.geometricBounds = [${b.top}, ${b.left}, ${b.bottom}, ${b.right}];
      var table = tf.tables.add();
      table.rows[0].cells[0].contents = "";
      JSON.stringify({ rows: table.rows.length, columns: table.columns.length });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async list(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ pageIndex: z.number().int().min(0).optional() }).parse(args as Record<string, unknown>);
    const s = this.scope(params.pageIndex);
    const code = `
      var tables = ${s}.tables;
      var result = [];
      for (var i = 0; i < tables.length; i++) {
        var t = tables[i];
        result.push({ index: i, rows: t.rows.length, columns: t.columns.length });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async addRow(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      tableIndex: z.number().int().min(0),
      atIndex: z.number().int().min(0).optional(),
    }).parse(args as Record<string, unknown>);
    const at = params.atIndex !== undefined ? params.atIndex : 0;
    const code = `
      var table = ${this.scope(params.pageIndex)}.tables[${params.tableIndex}];
      if (!table.isValid) { throw new Error("Table not found"); }
      table.rows.add(${at});
      JSON.stringify({ rows: table.rows.length, columns: table.columns.length });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async addColumn(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      tableIndex: z.number().int().min(0),
      atIndex: z.number().int().min(0).optional(),
    }).parse(args as Record<string, unknown>);
    const at = params.atIndex !== undefined ? params.atIndex : 0;
    const code = `
      var table = ${this.scope(params.pageIndex)}.tables[${params.tableIndex}];
      if (!table.isValid) { throw new Error("Table not found"); }
      table.columns.add(${at});
      JSON.stringify({ rows: table.rows.length, columns: table.columns.length });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async deleteRow(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      tableIndex: z.number().int().min(0),
      rowIndex: z.number().int().min(0),
    }).parse(args as Record<string, unknown>);
    const code = `
      var table = ${this.scope(params.pageIndex)}.tables[${params.tableIndex}];
      if (!table.isValid) { throw new Error("Table not found"); }
      table.rows[${params.rowIndex}].remove();
      JSON.stringify({ rows: table.rows.length, columns: table.columns.length });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async deleteColumn(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      tableIndex: z.number().int().min(0),
      columnIndex: z.number().int().min(0),
    }).parse(args as Record<string, unknown>);
    const code = `
      var table = ${this.scope(params.pageIndex)}.tables[${params.tableIndex}];
      if (!table.isValid) { throw new Error("Table not found"); }
      table.columns[${params.columnIndex}].remove();
      JSON.stringify({ rows: table.rows.length, columns: table.columns.length });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async setCell(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      tableIndex: z.number().int().min(0),
      row: z.number().int().min(0),
      column: z.number().int().min(0),
      content: z.string(),
    }).parse(args as Record<string, unknown>);
    const escContent = this.escape(params.content);
    const code = `
      var table = ${this.scope(params.pageIndex)}.tables[${params.tableIndex}];
      if (!table.isValid) { throw new Error("Table not found"); }
      table.rows[${params.row}].cells[${params.column}].contents = "${escContent}";
      "set";
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async getInfo(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      tableIndex: z.number().int().min(0),
    }).parse(args as Record<string, unknown>);
    const code = `
      var table = ${this.scope(params.pageIndex)}.tables[${params.tableIndex}];
      if (!table.isValid) { throw new Error("Table not found"); }
      var result = { rows: table.rows.length, columns: table.columns.length, cells: [] };
      for (var r = 0; r < table.rows.length; r++) {
        for (var c = 0; c < table.columns.length; c++) {
          result.cells.push({ row: r, column: c, contents: table.rows[r].cells[c].contents });
        }
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
