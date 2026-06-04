import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { createDocumentSchema, openDocumentSchema, saveDocumentSchema, closeDocumentSchema } from '../schemas/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class DocumentHandler implements IHandler {
  public readonly name = 'document';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      {
        name: 'document_create',
        description: 'Create a new InDesign document with specified dimensions, margins, and settings',
        inputSchema: createDocumentSchema.shape,
        handler: compose(withLogging('document_create'), withErrorHandling())(this.create.bind(this)),
      },
      {
        name: 'document_open',
        description: 'Open an existing InDesign document from file path',
        inputSchema: openDocumentSchema.shape,
        handler: compose(withLogging('document_open'), withErrorHandling())(this.open.bind(this)),
      },
      {
        name: 'document_save',
        description: 'Save the active InDesign document, optionally to a specific path',
        inputSchema: saveDocumentSchema.shape,
        handler: compose(withLogging('document_save'), withErrorHandling())(this.save.bind(this)),
      },
      {
        name: 'document_close',
        description: 'Close the active InDesign document with save options',
        inputSchema: closeDocumentSchema.shape,
        handler: compose(withLogging('document_close'), withErrorHandling())(this.close.bind(this)),
      },
      {
        name: 'document_getInfo',
        description: 'Get detailed information about the active document including page count, dimensions, and margins',
        inputSchema: {},
        handler: compose(withLogging('document_getInfo'), withErrorHandling())(this.getInfo.bind(this)),
      },
      {
        name: 'document_listOpen',
        description: 'List all currently open InDesign documents',
        inputSchema: {},
        handler: compose(withLogging('document_listOpen'), withErrorHandling())(this.listOpen.bind(this)),
      },
    ];
  }

  public register(server: McpServer): void {
    for (const tool of this.tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  private async create(args: unknown, _extra: any): Promise<ToolResult> {
    const params = createDocumentSchema.parse(args);
    const code = `
      var doc = app.documents.add(true, {
        documentPreferences: {
          pageWidth: "${params.width}",
          pageHeight: "${params.height}",
          pagesPerDocument: ${params.pages},
          facingPages: ${params.facingPages},
          pageOrientation: ${params.orientation === 'landscape' ? 'PageOrientation.landscape' : 'PageOrientation.portrait'}
        },
        marginPreferences: {
          top: ${params.margins.top},
          bottom: ${params.margins.bottom},
          left: ${params.margins.left},
          right: ${params.margins.right}
        }
      });
      ${params.bleed ? `
      doc.documentPreferences.documentBleedTopOffset = ${params.bleed.top};
      doc.documentPreferences.documentBleedBottomOffset = ${params.bleed.bottom};
      doc.documentPreferences.documentBleedInsideOrLeftOffset = ${params.bleed.left};
      doc.documentPreferences.documentBleedOutsideOrRightOffset = ${params.bleed.right};
      ` : ''}
      JSON.stringify({
        name: doc.name,
        pages: doc.pages.length,
        pageWidth: doc.documentPreferences.pageWidth,
        pageHeight: doc.documentPreferences.pageHeight,
        orientation: doc.documentPreferences.pageOrientation
      });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async open(args: unknown, _extra: any): Promise<ToolResult> {
    const params = openDocumentSchema.parse(args);
    const code = `
      var doc = app.open(File("${params.filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"), ${params.showWindow});
      JSON.stringify({
        name: doc.name,
        pages: doc.pages.length,
        pageWidth: doc.documentPreferences.pageWidth,
        pageHeight: doc.documentPreferences.pageHeight
      });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async save(args: unknown, _extra: any): Promise<ToolResult> {
    const params = saveDocumentSchema.parse(args);
    const saveOpt = params.saveOptions === 'yes' ? 'SaveOptions.yes' : params.saveOptions === 'no' ? 'SaveOptions.no' : 'SaveOptions.ask';
    const code = params.filePath
      ? `app.activeDocument.save(File("${params.filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")); "saved"`
      : `app.activeDocument.${saveOpt === 'SaveOptions.yes' ? 'save()' : 'close(' + saveOpt + ')'}; "saved"`;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async close(args: unknown, _extra: any): Promise<ToolResult> {
    const params = closeDocumentSchema.parse(args);
    const opt = params.saveOptions === 'yes' ? 'SaveOptions.yes' : params.saveOptions === 'no' ? 'SaveOptions.no' : 'SaveOptions.ask';
    const code = `app.activeDocument.close(${opt}); "closed"`;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async getInfo(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      if (!app.activeDocument) throw new Error("No active document");
      var doc = app.activeDocument;
      var filePath = "";
      try { filePath = doc.fullName.toString(); } catch(e) {}
      JSON.stringify({
        name: doc.name,
        filePath: filePath,
        pages: doc.pages.length,
        pageWidth: doc.documentPreferences.pageWidth,
        pageHeight: doc.documentPreferences.pageHeight,
        margins: { top: doc.marginPreferences.top, bottom: doc.marginPreferences.bottom, left: doc.marginPreferences.left, right: doc.marginPreferences.right },
        orientation: doc.documentPreferences.pageOrientation,
        units: doc.viewPreferences.horizontalMeasurementUnits,
        facingPages: doc.documentPreferences.facingPages
      });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async listOpen(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      var docs = app.documents;
      var result = [];
      for (var i = 0; i < docs.length; i++) {
        var fp = "";
        try { fp = docs[i].fullName.toString(); } catch(e) {}
        result.push({
          name: docs[i].name,
          pages: docs[i].pages.length,
          filePath: fp
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
