import { z } from 'zod';
import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class TextAdvancedHandler implements IHandler {
  public readonly name = 'textAdvanced';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      {
        name: 'text_linkFrames',
        description: 'Link (thread) two text frames together',
        inputSchema: {
          sourcePageIndex: z.number().int().min(0),
          sourceFrameIndex: z.number().int().min(0),
          targetPageIndex: z.number().int().min(0),
          targetFrameIndex: z.number().int().min(0),
        },
        handler: compose(withLogging('text_linkFrames'), withErrorHandling())(this.linkFrames.bind(this)),
      },
      {
        name: 'text_unlinkFrames',
        description: 'Unlink a text frame from its thread',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          frameIndex: z.number().int().min(0),
        },
        handler: compose(withLogging('text_unlinkFrames'), withErrorHandling())(this.unlinkFrames.bind(this)),
      },
      {
        name: 'text_setColumns',
        description: 'Set column count and gutter for a text frame',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          frameIndex: z.number().int().min(0),
          count: z.number().int().min(1).max(12),
          gutter: z.number().min(0).optional().default(12),
        },
        handler: compose(withLogging('text_setColumns'), withErrorHandling())(this.setColumns.bind(this)),
      },
      {
        name: 'text_setTextWrap',
        description: 'Set text wrap preferences for an object',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          itemIndex: z.number().int().min(0),
          mode: z.enum(['none', 'boundingBox', 'objectShape', 'contour']),
          side: z.enum(['both', 'left', 'right', 'towardSpine', 'awayFromSpine']).optional().default('both'),
          offset: z.number().min(0).optional().default(7.055),
        },
        handler: compose(withLogging('text_setTextWrap'), withErrorHandling())(this.setTextWrap.bind(this)),
      },
      {
        name: 'text_setDropCap',
        description: 'Set drop cap options for a paragraph',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          frameIndex: z.number().int().min(0),
          paragraphIndex: z.number().int().min(0),
          lines: z.number().int().min(1).max(10).optional().default(3),
          characters: z.number().int().min(1).max(10).optional().default(1),
          characterStyle: z.string().optional(),
        },
        handler: compose(withLogging('text_setDropCap'), withErrorHandling())(this.setDropCap.bind(this)),
      },
      {
        name: 'text_setKeepOptions',
        description: 'Set keep options (widow/orphan control) for a paragraph',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          frameIndex: z.number().int().min(0),
          paragraphIndex: z.number().int().min(0).optional(),
          linesTogether: z.number().int().min(1).max(10).optional().default(2),
          startParagraph: z.enum(['anywhere', 'nextColumn', 'nextPage', 'nextOddPage', 'nextEvenPage']).optional().default('anywhere'),
          keepWithPrevious: z.boolean().optional().default(false),
          keepWithNext: z.number().int().min(0).max(5).optional().default(0),
        },
        handler: compose(withLogging('text_setKeepOptions'), withErrorHandling())(this.setKeepOptions.bind(this)),
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

  private async linkFrames(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      sourcePageIndex: z.number().int().min(0),
      sourceFrameIndex: z.number().int().min(0),
      targetPageIndex: z.number().int().min(0),
      targetFrameIndex: z.number().int().min(0),
    }).parse(args as Record<string, unknown>);

    const code = `
      var doc = app.activeDocument;
      var srcFrame = doc.pages[${params.sourcePageIndex}].textFrames[${params.sourceFrameIndex}];
      var tgtFrame = doc.pages[${params.targetPageIndex}].textFrames[${params.targetFrameIndex}];
      srcFrame.nextTextFrame = tgtFrame;
      JSON.stringify({ linked: true, source: ${params.sourceFrameIndex}, target: ${params.targetFrameIndex} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async unlinkFrames(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      frameIndex: z.number().int().min(0),
    }).parse(args as Record<string, unknown>);

    const code = `
      var doc = app.activeDocument;
      var tf = doc.pages[${params.pageIndex}].textFrames[${params.frameIndex}];
      tf.nextTextFrame = null;
      JSON.stringify({ unlinked: true, frame: ${params.frameIndex} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async setColumns(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      frameIndex: z.number().int().min(0),
      count: z.number().int().min(1).max(12),
      gutter: z.number().min(0).optional().default(12),
    }).parse(args as Record<string, unknown>);

    const code = `
      var doc = app.activeDocument;
      var tf = doc.pages[${params.pageIndex}].textFrames[${params.frameIndex}];
      tf.textFramePreferences.textColumnCount = ${params.count};
      tf.textFramePreferences.textColumnGutter = ${params.gutter};
      JSON.stringify({ columns: ${params.count}, gutter: ${params.gutter} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async setTextWrap(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      itemIndex: z.number().int().min(0),
      mode: z.enum(['none', 'boundingBox', 'objectShape', 'contour']),
      side: z.enum(['both', 'left', 'right', 'towardSpine', 'awayFromSpine']).optional().default('both'),
      offset: z.number().min(0).optional().default(7.055),
    }).parse(args as Record<string, unknown>);

    const modeMap: Record<string, string> = {
      none: 'TextWrapPreferences.TEXT_WRAP_OFF',
      boundingBox: 'TextWrapPreferences.TEXT_WRAP_BOUNDING_BOX',
      objectShape: 'TextWrapPreferences.TEXT_WRAP_OBJECT_SHAPE',
      contour: 'TextWrapPreferences.TEXT_WRAP_CONTOUR',
    };

    const sideMap: Record<string, string> = {
      both: 'TextWrapSide.BOTH_SIDES',
      left: 'TextWrapSide.LEFT_SIDE',
      right: 'TextWrapSide.RIGHT_SIDE',
      towardSpine: 'TextWrapSide.TOWARD_SPINE_SIDE',
      awayFromSpine: 'TextWrapSide.AWAY_FROM_SPINE_SIDE',
    };

    const code = `
      var doc = app.activeDocument;
      var item = doc.pages[${params.pageIndex}].allPageItems[${params.itemIndex}];
      item.textWrapPreferences.textWrapMode = ${modeMap[params.mode]};
      item.textWrapPreferences.textWrapSide = ${sideMap[params.side]};
      item.textWrapPreferences.textWrapOffset = ${params.offset};
      JSON.stringify({ mode: "${params.mode}", side: "${params.side}", offset: ${params.offset} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async setDropCap(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      frameIndex: z.number().int().min(0),
      paragraphIndex: z.number().int().min(0),
      lines: z.number().int().min(1).max(10).optional().default(3),
      characters: z.number().int().min(1).max(10).optional().default(1),
      characterStyle: z.string().optional(),
    }).parse(args as Record<string, unknown>);

    const escCharStyle = params.characterStyle ? this.escape(params.characterStyle) : '';

    const code = `
      var doc = app.activeDocument;
      var para = doc.pages[${params.pageIndex}].textFrames[${params.frameIndex}].paragraphs[${params.paragraphIndex}];
      para.dropCapCharacters = ${params.characters};
      para.dropCapLines = ${params.lines};
      ${params.characterStyle ? `para.dropCapStyle = doc.characterStyles.item("${escCharStyle}");` : ''}
      JSON.stringify({ lines: ${params.lines}, characters: ${params.characters} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async setKeepOptions(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      frameIndex: z.number().int().min(0),
      paragraphIndex: z.number().int().min(0).optional(),
      linesTogether: z.number().int().min(1).max(10).optional().default(2),
      startParagraph: z.enum(['anywhere', 'nextColumn', 'nextPage', 'nextOddPage', 'nextEvenPage']).optional().default('anywhere'),
      keepWithPrevious: z.boolean().optional().default(false),
      keepWithNext: z.number().int().min(0).max(5).optional().default(0),
    }).parse(args as Record<string, unknown>);

    const startMap: Record<string, string> = {
      anywhere: 'StartParagraph.ANYWHERE',
      nextColumn: 'StartParagraph.NEXT_COLUMN',
      nextPage: 'StartParagraph.NEXT_PAGE',
      nextOddPage: 'StartParagraph.NEXT_ODD_PAGE',
      nextEvenPage: 'StartParagraph.NEXT_EVEN_PAGE',
    };

    const code = `
      var doc = app.activeDocument;
      var para = doc.pages[${params.pageIndex}].textFrames[${params.frameIndex}].paragraphs[${params.paragraphIndex ?? 0}];
      para.keepLinesTogether = true;
      para.keepWithNext = ${params.keepWithNext};
      para.keepWithPrevious = ${params.keepWithPrevious};
      para.keepAllLinesTogether = true;
      para.startParagraph = ${startMap[params.startParagraph]};
      JSON.stringify({ linesTogether: true, startParagraph: "${params.startParagraph}" });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
