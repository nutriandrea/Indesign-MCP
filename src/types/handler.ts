import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ── CallToolResult shape (matching @modelcontextprotocol/sdk) ──

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export type ToolResult = {
  content: (TextContent | ImageContent)[];
  isError?: boolean;
};

// ── Handler definitions ──

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (args: any, extra: any) => Promise<ToolResult>;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  handler: (uri: string, extra: any) => Promise<ToolResult>;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: { name: string; description: string; required?: boolean }[];
  handler: (args: Record<string, unknown>, extra: any) => Promise<ToolResult>;
}

export interface IHandler {
  readonly name: string;
  readonly tools: ToolDefinition[];
  readonly resources?: ResourceDefinition[];
  readonly prompts?: PromptDefinition[];
  register(server: McpServer): void;
}

// ── Middleware ──

export type Middleware = (
  handler: (args: unknown, extra: any) => Promise<ToolResult>,
) => (args: unknown, extra: any) => Promise<ToolResult>;

// ── InDesign domain interfaces ──

export interface SessionState {
  activeDoc?: DocumentInfo;
  lastItem?: {
    type: string;
    position: { x: number; y: number };
    properties: Record<string, unknown>;
  };
  documentHistory: string[];
}

export interface DocumentInfo {
  name: string;
  filePath?: string;
  pages: number;
  pageWidth: number;
  pageHeight: number;
  margins: { top: number; bottom: number; left: number; right: number };
  orientation: string;
  units: string;
  facingPages: boolean;
  bleed?: { top: number; bottom: number; left: number; right: number };
  slug?: { top: number; bottom: number; left: number; right: number };
}

export interface PageInfo {
  index: number;
  name: string;
  bounds: { top: number; bottom: number; left: number; right: number };
  side: string;
  masterSpread?: string;
  label?: string;
  pageColor?: string;
}

export interface TextFrameInfo {
  index: number;
  bounds: { top: number; bottom: number; left: number; right: number };
  content: string;
  contentType: string;
  overflows: boolean;
  textStyleRangeCount: number;
}

export interface StoryInfo {
  index: number;
  content: string;
  length: number;
  textFrames: number;
  paragraphCount: number;
}

export interface StyleInfo {
  name: string;
  type: 'paragraph' | 'character' | 'object' | 'table' | 'cell';
  basedOn?: string;
  properties: Record<string, unknown>;
}

export interface LayerInfo {
  name: string;
  index: number;
  visible: boolean;
  locked: boolean;
  printable: boolean;
  guideLayer: boolean;
  items: number;
}

export interface ColorInfo {
  name: string;
  model: string;
  space: 'CMYK' | 'RGB' | 'Lab';
  colorValue: number[];
  spot: boolean;
  registration: boolean;
}

export interface SwatchInfo {
  name: string;
  type: 'color' | 'gradient' | 'tint' | 'ink';
  baseColor?: string;
  properties: Record<string, unknown>;
}

export interface ShapeInfo {
  index: number;
  type: 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'graphicLine';
  bounds: { top: number; bottom: number; left: number; right: number };
  fillColor?: string;
  strokeColor?: string;
  strokeWeight: number;
}

export interface ImageInfo {
  index: number;
  filePath: string;
  bounds: { top: number; bottom: number; left: number; right: number };
  linkStatus: string;
  effectivePpi?: number;
  actualPpi?: number;
}

export interface GroupInfo {
  index: number;
  name: string;
  bounds: { top: number; bottom: number; left: number; right: number };
  items: number;
}

export interface TableInfo {
  index: number;
  rows: number;
  columns: number;
  bounds: { top: number; bottom: number; left: number; right: number };
  headerRows: number;
  footerRows: number;
}

export interface MasterSpreadInfo {
  name: string;
  pageCount: number;
  pages: string[];
  basedOn?: string;
}

export interface EffectInfo {
  type: string;
  applied: boolean;
  settings: Record<string, unknown>;
}
