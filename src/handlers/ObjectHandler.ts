import { z } from 'zod';
import type { IHandler, ToolDefinition, ToolResult } from '../types/index.js';
import { formatResponse } from '../utils/errorHandler.js';
import { withLogging, withErrorHandling, compose } from '../utils/middleware.js';
import type { ScriptExecutor } from '../bridge/ScriptExecutor.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class ObjectHandler implements IHandler {
  public readonly name = 'object';
  private executor: ScriptExecutor;

  constructor(executor: ScriptExecutor) {
    this.executor = executor;
  }

  public get tools(): ToolDefinition[] {
    return [
      // Layer tools
      {
        name: 'layer_create',
        description: 'Create a new layer in the active document',
        inputSchema: {
          name: z.string().default('Layer'),
          visible: z.boolean().default(true),
          locked: z.boolean().default(false),
          printable: z.boolean().default(true),
          guideLayer: z.boolean().default(false),
        },
        handler: compose(withLogging('layer_create'), withErrorHandling())(this.createLayer.bind(this)),
      },
      {
        name: 'layer_list',
        description: 'List all layers in the active document',
        inputSchema: {},
        handler: compose(withLogging('layer_list'), withErrorHandling())(this.listLayers.bind(this)),
      },
      {
        name: 'layer_setProperties',
        description: 'Set properties of a layer',
        inputSchema: {
          index: z.number().int().min(0),
          visible: z.boolean().optional(),
          locked: z.boolean().optional(),
          printable: z.boolean().optional(),
        },
        handler: compose(withLogging('layer_setProperties'), withErrorHandling())(this.setLayerProperties.bind(this)),
      },
      // Image tools
      {
        name: 'image_place',
        description: 'Place an image file into a page',
        inputSchema: {
          filePath: z.string(),
          pageIndex: z.number().int().min(0),
          x: z.number(),
          y: z.number(),
          width: z.number().positive().optional(),
          height: z.number().positive().optional(),
          layerIndex: z.number().int().min(0).optional(),
        },
        handler: compose(withLogging('image_place'), withErrorHandling())(this.placeImage.bind(this)),
      },
      {
        name: 'image_list',
        description: 'List all placed images in a page',
        inputSchema: { pageIndex: z.number().int().min(0) },
        handler: compose(withLogging('image_list'), withErrorHandling())(this.listImages.bind(this)),
      },
      {
        name: 'image_getLinks',
        description: 'Get link status for all placed images',
        inputSchema: {},
        handler: compose(withLogging('image_getLinks'), withErrorHandling())(this.getImageLinks.bind(this)),
      },
      {
        name: 'image_relink',
        description: 'Relink a placed image to a new file',
        inputSchema: {
          imageIndex: z.number().int().min(0),
          newFilePath: z.string(),
          pageIndex: z.number().int().min(0),
        },
        handler: compose(withLogging('image_relink'), withErrorHandling())(this.relinkImage.bind(this)),
      },
      // Shape tools
      {
        name: 'shape_create',
        description: 'Create a geometric shape (rectangle, ellipse, polygon, line)',
        inputSchema: {
          pageIndex: z.number().int().min(0),
          type: z.enum(['rectangle', 'ellipse', 'polygon', 'line']),
          bounds: z.object({ top: z.number(), left: z.number(), bottom: z.number(), right: z.number() }),
          fillColor: z.string().optional(),
          strokeColor: z.string().optional(),
          strokeWeight: z.number().min(0).default(1),
          layerIndex: z.number().int().min(0).optional(),
        },
        handler: compose(withLogging('shape_create'), withErrorHandling())(this.createShape.bind(this)),
      },
      {
        name: 'shape_list',
        description: 'List all shapes on a page',
        inputSchema: { pageIndex: z.number().int().min(0) },
        handler: compose(withLogging('shape_list'), withErrorHandling())(this.listShapes.bind(this)),
      },
      // Group tools
      {
        name: 'group_list',
        description: 'List all groups in a page',
        inputSchema: { pageIndex: z.number().int().min(0) },
        handler: compose(withLogging('group_list'), withErrorHandling())(this.listGroups.bind(this)),
      },
      {
        name: 'group_ungroup',
        description: 'Ungroup a group by index',
        inputSchema: { pageIndex: z.number().int().min(0), groupIndex: z.number().int().min(0) },
        handler: compose(withLogging('group_ungroup'), withErrorHandling())(this.ungroup.bind(this)),
      },
    ];
  }

  public register(server: McpServer): void {
    for (const tool of this.tools) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  private escape(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  // Layer methods
  private async createLayer(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      name: z.string().default('Layer'),
      visible: z.boolean().default(true),
      locked: z.boolean().default(false),
      printable: z.boolean().default(true),
      guideLayer: z.boolean().default(false),
    }).parse(args);
    const escName = this.escape(params.name);
    const code = `
      var layer = app.activeDocument.layers.add({name: "${escName}"});
      layer.visible = ${params.visible};
      layer.locked = ${params.locked};
      layer.printable = ${params.printable};
      layer.guide = ${params.guideLayer};
      JSON.stringify({ name: layer.name, index: layer.index });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async listLayers(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      var layers = app.activeDocument.layers;
      var result = [];
      for (var i = 0; i < layers.length; i++) {
        result.push({
          name: layers[i].name,
          index: i,
          visible: layers[i].visible,
          locked: layers[i].locked,
          printable: layers[i].printable,
          guide: layers[i].guide
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async setLayerProperties(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      index: z.number().int().min(0),
      visible: z.boolean().optional(),
      locked: z.boolean().optional(),
      printable: z.boolean().optional(),
    }).parse(args as Record<string, unknown>);
    let code = `var layer = app.activeDocument.layers[${params.index}];\n`;
    if (params.visible !== undefined) code += `layer.visible = ${params.visible};\n`;
    if (params.locked !== undefined) code += `layer.locked = ${params.locked};\n`;
    if (params.printable !== undefined) code += `layer.printable = ${params.printable};\n`;
    code += '"set"';
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  // Image methods
  private async placeImage(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      filePath: z.string(),
      pageIndex: z.number().int().min(0),
      x: z.number(),
      y: z.number(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      layerIndex: z.number().int().min(0).optional(),
    }).parse(args as Record<string, unknown>);
    const escPath = this.escape(params.filePath);
    const scaleCode = params.width && params.height
      ? `image.geometricBounds = [${params.y}, ${params.x}, ${params.y + params.height}, ${params.x + params.width}];`
      : '';
    const code = `
      var page = app.activeDocument.pages[${params.pageIndex}];
      var image = page.place(File("${escPath}"))[0];
      ${scaleCode}
      JSON.stringify({
        index: image.index,
        bounds: image.geometricBounds,
        linkStatus: image.imageLink ? image.imageLink.status : 'unknown'
      });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async listImages(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ pageIndex: z.number().int().min(0) }).parse(args as Record<string, unknown>);
    const code = `
      var page = app.activeDocument.pages[${params.pageIndex}];
      var allImages = page.allGraphics;
      var result = [];
      for (var i = 0; i < allImages.length; i++) {
        var img = allImages[i];
        var link = img.imageLink;
        result.push({
          index: i,
          filePath: link ? link.filePath : 'embedded',
          linkStatus: link ? link.status : 'embedded',
          bounds: img.geometricBounds
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async getImageLinks(_args: unknown, _extra: any): Promise<ToolResult> {
    const code = `
      var allLinks = app.activeDocument.links;
      var result = [];
      for (var i = 0; i < allLinks.length; i++) {
        result.push({
          filePath: allLinks[i].filePath,
          status: allLinks[i].status,
          embedded: allLinks[i].embedded
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async relinkImage(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      imageIndex: z.number().int().min(0),
      newFilePath: z.string(),
      pageIndex: z.number().int().min(0),
    }).parse(args as Record<string, unknown>);
    const escPath = this.escape(params.newFilePath);
    const code = `
      var img = app.activeDocument.pages[${params.pageIndex}].allGraphics[${params.imageIndex}];
      img.imageLink.relink(File("${escPath}"));
      "relinked";
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  // Shape methods
  private async createShape(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({
      pageIndex: z.number().int().min(0),
      type: z.enum(['rectangle', 'ellipse', 'polygon', 'line']),
      bounds: z.object({ top: z.number(), left: z.number(), bottom: z.number(), right: z.number() }),
      fillColor: z.string().optional(),
      strokeColor: z.string().optional(),
      strokeWeight: z.number().min(0).default(1),
      layerIndex: z.number().int().min(0).optional(),
    }).parse(args as Record<string, unknown>);
    const { top, left, bottom, right } = params.bounds;
    const shapeMap: Record<string, string> = {
      rectangle: 'rectangles.add()',
      ellipse: 'ovals.add()',
      polygon: 'polygons.add()',
      line: 'graphicLines.add()',
    };
    const fillStr = params.fillColor ? `shape.fillColor = app.activeDocument.colors.item("${this.escape(params.fillColor)}");` : '';
    const strokeStr = params.strokeColor ? `shape.strokeColor = app.activeDocument.colors.item("${this.escape(params.strokeColor)}");` : '';
    const code = `
      var shape = app.activeDocument.pages[${params.pageIndex}].${shapeMap[params.type]};
      shape.geometricBounds = [${top}, ${left}, ${bottom}, ${right}];
      shape.strokeWeight = ${params.strokeWeight};
      ${fillStr}
      ${strokeStr}
      JSON.stringify({ index: shape.index, type: "${params.type}", bounds: shape.geometricBounds });
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async listShapes(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ pageIndex: z.number().int().min(0) }).parse(args as Record<string, unknown>);
    const code = `
      var page = app.activeDocument.pages[${params.pageIndex}];
      var result = [];
      var items = page.allPageItems;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemType = 'unknown';
        if (item.constructor.name === 'Rectangle') itemType = 'rectangle';
        else if (item.constructor.name === 'Oval') itemType = 'ellipse';
        else if (item.constructor.name === 'Polygon') itemType = 'polygon';
        else if (item.constructor.name === 'GraphicLine') itemType = 'line';
        else if (item.constructor.name === 'TextFrame') continue;
        else if (item.constructor.name === 'Group') continue;
        result.push({
          index: i,
          type: itemType,
          bounds: item.geometricBounds,
          strokeWeight: item.strokeWeight
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  // Group methods
  private async listGroups(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ pageIndex: z.number().int().min(0) }).parse(args as Record<string, unknown>);
    const code = `
      var page = app.activeDocument.pages[${params.pageIndex}];
      var result = [];
      for (var i = 0; i < page.groups.length; i++) {
        result.push({
          index: i,
          name: page.groups[i].name,
          bounds: page.groups[i].geometricBounds
        });
      }
      JSON.stringify(result);
    `;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }

  private async ungroup(args: unknown, _extra: any): Promise<ToolResult> {
    const params = z.object({ pageIndex: z.number().int().min(0), groupIndex: z.number().int().min(0) }).parse(args as Record<string, unknown>);
    const code = `app.activeDocument.pages[${params.pageIndex}].groups[${params.groupIndex}].ungroup(); "ungrouped"`;
    const response = await this.executor.execute(code);
    return formatResponse(response.result);
  }
}
