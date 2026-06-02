import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ScriptExecutor } from '../../src/bridge/ScriptExecutor.js';

// Import all handlers
import { DocumentHandler } from '../../src/handlers/DocumentHandler.js';
import { PageHandler } from '../../src/handlers/PageHandler.js';
import { TextHandler } from '../../src/handlers/TextHandler.js';
import { StyleHandler } from '../../src/handlers/StyleHandler.js';
import { ObjectHandler } from '../../src/handlers/ObjectHandler.js';
import { ExportHandler } from '../../src/handlers/ExportHandler.js';
import { MasterHandler } from '../../src/handlers/MasterHandler.js';
import { TableHandler } from '../../src/handlers/TableHandler.js';
import { ResourcesHandler } from '../../src/handlers/ResourcesHandler.js';
import { BookHandler } from '../../src/handlers/BookHandler.js';
import { InteractiveHandler } from '../../src/handlers/InteractiveHandler.js';
import { XmlHandler } from '../../src/handlers/XmlHandler.js';

interface HandlerPair {
  name: string;
  instance: { name: string; tools: { name: string; description: string; inputSchema: Record<string, unknown>; handler: Function }[]; register: (server: McpServer) => void };
}

describe('Handler Registration', () => {
  const handlerPairs: HandlerPair[] = [
    { name: 'DocumentHandler', instance: new DocumentHandler(new ScriptExecutor(5000)) },
    { name: 'PageHandler', instance: new PageHandler(new ScriptExecutor(5000)) },
    { name: 'TextHandler', instance: new TextHandler(new ScriptExecutor(5000)) },
    { name: 'StyleHandler', instance: new StyleHandler(new ScriptExecutor(5000)) },
    { name: 'ObjectHandler', instance: new ObjectHandler(new ScriptExecutor(5000)) },
    { name: 'ExportHandler', instance: new ExportHandler(new ScriptExecutor(5000)) },
    { name: 'MasterHandler', instance: new MasterHandler(new ScriptExecutor(5000)) },
    { name: 'TableHandler', instance: new TableHandler(new ScriptExecutor(5000)) },
    { name: 'ResourcesHandler', instance: new ResourcesHandler(new ScriptExecutor(5000)) },
    { name: 'BookHandler', instance: new BookHandler(new ScriptExecutor(5000)) },
    { name: 'InteractiveHandler', instance: new InteractiveHandler(new ScriptExecutor(5000)) },
    { name: 'XmlHandler', instance: new XmlHandler(new ScriptExecutor(5000)) },
  ];

  for (const { name, instance } of handlerPairs) {
    describe(name, () => {
      it('should have a non-empty name', () => {
        expect(instance.name).toBeDefined();
        expect(typeof instance.name).toBe('string');
        expect(instance.name.length).toBeGreaterThan(0);
      });

      it('should expose tools array', () => {
        const tools = instance.tools;
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
      });

      it('should have valid tool definitions', () => {
        const tools = instance.tools;
        for (const tool of tools) {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
          expect(tool).toHaveProperty('handler');
          expect(typeof tool.name).toBe('string');
          expect(tool.name.length).toBeGreaterThan(0);
          expect(typeof tool.description).toBe('string');
          expect(tool.description.length).toBeGreaterThan(0);
          expect(typeof tool.handler).toBe('function');
          expect(tool.inputSchema).toBeDefined();
          expect(typeof tool.inputSchema).toBe('object');
        }
      });

      it('should register all tools on an McpServer without error', () => {
        const server = new McpServer({ name: 'test', version: '1.0.0' });
        expect(() => instance.register(server)).not.toThrow();
      });
    });
  }

  it('should have unique tool names across all handlers', () => {
    const allNames: string[] = [];
    for (const { instance } of handlerPairs) {
      for (const tool of instance.tools) {
        allNames.push(tool.name);
      }
    }
    const duplicates = allNames.filter((name, i) => allNames.indexOf(name) !== i);
    expect(duplicates).toEqual([]);
  });

  it('should produce exactly 81 tools across all 12 handlers', () => {
    let total = 0;
    for (const { instance } of handlerPairs) {
      total += instance.tools.length;
    }
    expect(total).toBe(81);
  });

  it('should have tool names prefixed with handler category', () => {
    for (const { name, instance } of handlerPairs) {
      const category = instance.name;
      for (const tool of instance.tools) {
        // ObjectHandler uses sub-category prefixes (layer_, image_, shape_, group_)
        if (name === 'ObjectHandler') {
          const validPrefixes = ['layer_', 'image_', 'shape_', 'group_'];
          expect(validPrefixes.some(p => tool.name.startsWith(p))).toBe(true);
        } else {
          expect(tool.name.startsWith(category + '_')).toBe(true);
        }
      }
    }
  });
});
