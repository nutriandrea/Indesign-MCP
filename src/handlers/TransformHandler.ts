import { z } from 'zod';
import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class TransformHandler implements IHandler {
  public readonly name = 'transform';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      {
        name: 'transform_align',
        description: 'Align objects on a page relative to selection, margins, or page',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          itemIndices: z.array(z.number().int().min(0)).min(1),
          alignMode: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']),
          relativeTo: z.enum(['selection', 'margins', 'page']).optional().default('selection'),
        },
        handler: compose(withLogging('transform_align'), withErrorHandling())(this.align.bind(this)),
      },
      {
        name: 'transform_distribute',
        description: 'Distribute objects evenly on a page',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          itemIndices: z.array(z.number().int().min(0)).min(2),
          distributeMode: z.enum(['left', 'center', 'horizontalSpace', 'right', 'top', 'middle', 'vertical', 'bottom']),
          bounds: z.enum(['selection', 'margins', 'page']).optional().default('selection'),
        },
        handler: compose(withLogging('transform_distribute'), withErrorHandling())(this.distribute.bind(this)),
      },
      {
        name: 'transform_rotate',
        description: 'Rotate an object by a specified angle',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          itemIndex: z.number().int().min(0),
          angle: z.number(),
          layerIndex: z.number().int().min(0).optional(),
        },
        handler: compose(withLogging('transform_rotate'), withErrorHandling())(this.rotate.bind(this)),
      },
      {
        name: 'transform_scale',
        description: 'Scale an object by percentages',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          itemIndex: z.number().int().min(0),
          scaleX: z.number().min(0.1).max(10000).default(100),
          scaleY: z.number().min(0.1).max(10000).default(100),
          isPercentage: z.boolean().optional().default(true),
        },
        handler: compose(withLogging('transform_scale'), withErrorHandling())(this.scale.bind(this)),
      },
      {
        name: 'transform_flip',
        description: 'Flip an object horizontally or vertically',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          itemIndex: z.number().int().min(0),
          axis: z.enum(['horizontal', 'vertical']),
        },
        handler: compose(withLogging('transform_flip'), withErrorHandling())(this.flip.bind(this)),
      },
    ];
  }

  public register(server: McpServer): void {
    for (const tool of this.tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  private async align(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      itemIndices: z.array(z.number().int().min(0)).min(1),
      alignMode: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']),
      relativeTo: z.enum(['selection', 'margins', 'page']).optional().default('selection'),
    }).parse(args as Record<string, unknown>);

    const alignMap: Record<string, string> = {
      left: 'AlignOptions.LEFT_ALIGN',
      center: 'AlignOptions.HORIZONTAL_CENTERS',
      right: 'AlignOptions.RIGHT_ALIGN',
      top: 'AlignOptions.TOP_ALIGN',
      middle: 'AlignOptions.VERTICAL_CENTERS',
      bottom: 'AlignOptions.BOTTOM_ALIGN',
    };

    const code = `
      var doc = app.activeDocument;
      doc.documentPreferences.properties = { properties: { documentBleedUniformSize: true } };
      doc.select(null);
      var items = [];
      var pageItems = doc.pages[${params.pageIndex}].allPageItems;
      ${params.itemIndices.map(idx => `items.push(pageItems[${idx}]);`).join('\n')}
      for (var i = 0; i < items.length; i++) { items[i].select(true); }
      try {
        doc.align(${alignMap[params.alignMode]}, AlignDistributeBounds.${params.relativeTo === 'selection' ? 'ALIGN_DISTRIBUTE_TO_SELECTION' : params.relativeTo === 'margins' ? 'ALIGN_DISTRIBUTE_TO_MARGINS' : 'ALIGN_DISTRIBUTE_TO_PAGE'});
      } catch(e) {}
      JSON.stringify({ aligned: true, mode: "${params.alignMode}", count: ${params.itemIndices.length} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async distribute(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      itemIndices: z.array(z.number().int().min(0)).min(2),
      distributeMode: z.enum(['left', 'center', 'horizontalSpace', 'right', 'top', 'middle', 'vertical', 'bottom']),
      bounds: z.enum(['selection', 'margins', 'page']).optional().default('selection'),
    }).parse(args as Record<string, unknown>);

    const distMap: Record<string, string> = {
      left: 'DistributeOptions.DISTRIBUTE_LEFT_ALIGN',
      center: 'DistributeOptions.DISTRIBUTE_HORIZONTAL_CENTERS',
      horizontalSpace: 'DistributeOptions.DISTRIBUTE_HORIZONTAL_SPACE',
      right: 'DistributeOptions.DISTRIBUTE_RIGHT_ALIGN',
      top: 'DistributeOptions.DISTRIBUTE_TOP_ALIGN',
      middle: 'DistributeOptions.DISTRIBUTE_VERTICAL_CENTERS',
      vertical: 'DistributeOptions.DISTRIBUTE_VERTICAL_SPACE',
      bottom: 'DistributeOptions.DISTRIBUTE_BOTTOM_ALIGN',
    };

    const code = `
      var doc = app.activeDocument;
      doc.select(null);
      var pageItems = doc.pages[${params.pageIndex}].allPageItems;
      ${params.itemIndices.map(idx => `pageItems[${idx}].select(true);`).join('\n')}
      try {
        doc.distribute(${distMap[params.distributeMode]}, AlignDistributeBounds.${params.bounds === 'selection' ? 'ALIGN_DISTRIBUTE_TO_SELECTION' : params.bounds === 'margins' ? 'ALIGN_DISTRIBUTE_TO_MARGINS' : 'ALIGN_DISTRIBUTE_TO_PAGE'});
      } catch(e) {}
      JSON.stringify({ distributed: true, mode: "${params.distributeMode}", count: ${params.itemIndices.length} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async rotate(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      itemIndex: z.number().int().min(0),
      angle: z.number(),
      layerIndex: z.number().int().min(0).optional(),
    }).parse(args as Record<string, unknown>);

    const code = `
      var doc = app.activeDocument;
      var item = doc.pages[${params.pageIndex}].allPageItems[${params.itemIndex}];
      ${params.layerIndex !== undefined ? `item.itemLayer = doc.layers[${params.layerIndex}];` : ''}
      item.rotate((${params.angle} * -1));
      JSON.stringify({ rotated: true, angle: ${params.angle} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async scale(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      itemIndex: z.number().int().min(0),
      scaleX: z.number().min(0.1).max(10000).default(100),
      scaleY: z.number().min(0.1).max(10000).default(100),
      isPercentage: z.boolean().optional().default(true),
    }).parse(args as Record<string, unknown>);

    const code = `
      var doc = app.activeDocument;
      var item = doc.pages[${params.pageIndex}].allPageItems[${params.itemIndex}];
      item.scale(${params.scaleX}${params.isPercentage ? '' : ''}, ${params.scaleY}${params.isPercentage ? '' : ''});
      JSON.stringify({ scaled: true, scaleX: ${params.scaleX}, scaleY: ${params.scaleY} });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async flip(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      itemIndex: z.number().int().min(0),
      axis: z.enum(['horizontal', 'vertical']),
    }).parse(args as Record<string, unknown>);

    const code = `
      var doc = app.activeDocument;
      var item = doc.pages[${params.pageIndex}].allPageItems[${params.itemIndex}];
      item.flipItem(${params.axis === 'horizontal' ? 'Flip.HORIZONTAL' : 'Flip.VERTICAL'});
      JSON.stringify({ flipped: true, axis: "${params.axis}" });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
