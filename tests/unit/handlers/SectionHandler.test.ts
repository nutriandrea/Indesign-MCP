import { describe, it, expect, vi } from 'vitest';
import { SectionHandler } from '../../../src/handlers/SectionHandler.js';

describe('SectionHandler', () => {
  function createMockExecutor() {
    return {
      execute: vi.fn().mockResolvedValue({ result: 'ok' }),
      on: vi.fn(),
      handleResponse: vi.fn(),
      cancelAll: vi.fn(),
      getStatus: vi.fn().mockReturnValue({ connected: true, queueDepth: 0 }),
    };
  }

  describe('handler structure', () => {
    it('should have name "section"', () => {
      const handler = new SectionHandler(createMockExecutor() as any);
      expect(handler.name).toBe('section');
    });

    it('should expose 4 tools', () => {
      const handler = new SectionHandler(createMockExecutor() as any);
      expect(handler.tools).toHaveLength(4);
    });

    it('should export all expected tools', () => {
      const handler = new SectionHandler(createMockExecutor() as any);
      const names = handler.tools.map((t) => t.name);
      expect(names).toContain('section_create');
      expect(names).toContain('section_list');
      expect(names).toContain('section_setNumbering');
      expect(names).toContain('section_delete');
    });

    it('should have every tool with name, description, inputSchema, and handler', () => {
      const handler = new SectionHandler(createMockExecutor() as any);
      for (const tool of handler.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      }
    });

    it('should have inputSchema as a plain object', () => {
      const handler = new SectionHandler(createMockExecutor() as any);
      for (const tool of handler.tools) {
        expect(typeof tool.inputSchema).toBe('object');
        expect(tool.inputSchema).not.toBeNull();
      }
    });
  });

  describe('section_create', () => {
    it('should call executor with sections.add and all parameters', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({ result: 'ok' });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_create')!;
      const result = await tool.handler({
        startPageIndex: 3,
        name: 'Chapter 1',
        pageNumberStart: 1,
        numberingStyle: 'upperRoman',
        sectionPrefix: 'A',
        includePrefix: true,
      }, {});

      expect(mock.execute).toHaveBeenCalledTimes(1);
      const code = mock.execute.mock.calls[0][0] as string;
      expect(code).toContain('doc.sections.add({ startPage: doc.pages[3] })');
      expect(code).toContain('section.name = "Chapter 1"');
      expect(code).toContain('section.pageNumberStart = 1');
      expect(code).toContain('PageNumberStyle.UPPER_ROMAN_PAGE_NUMBER');
      expect(code).toContain('section.sectionPrefix = "A"');
      expect(code).toContain('section.includeSectionPrefix = true');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should use defaults when optional parameters are omitted', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({ result: 'ok' });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_create')!;
      const result = await tool.handler({
        startPageIndex: 0,
      }, {});

      const code = mock.execute.mock.calls[0][0] as string;
      expect(code).toContain('doc.pages[0]');
      expect(code).toContain('section.pageNumberStart = 1');
      expect(code).toContain('PageNumberStyle.DECIMAL_PAGE_NUMBER');
      expect(code).toContain('section.includeSectionPrefix = false');
      // Optional fields should not be present
      expect(code).not.toContain('section.name =');
      expect(code).not.toContain('section.sectionPrefix =');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should escape special characters in name and sectionPrefix', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({ result: 'ok' });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_create')!;
      await tool.handler({
        startPageIndex: 0,
        name: 'Chapter "A" with \\backslash\nand newline',
        sectionPrefix: 'A-1 "special"',
        pageNumberStart: 1,
      }, {});

      const code = mock.execute.mock.calls[0][0] as string;
      expect(code).toContain('\\"');
      expect(code).toContain('\\\\');
      expect(code).toContain('\\n');
    });
  });

  describe('section_list', () => {
    it('should call executor with code iterating sections', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({
        result: [
          { index: 0, name: 'Section 1', startPage: 0, pageNumberStart: 1, pageNumberStyle: 'decimal', sectionPrefix: '', includePrefix: false },
        ],
      });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_list')!;
      const result = await tool.handler({}, {});

      expect(mock.execute).toHaveBeenCalledTimes(1);
      const code = mock.execute.mock.calls[0][0] as string;
      expect(code).toContain('doc.sections.length');
      expect(code).toContain('s.pageStart.index');
      expect(code).toContain('s.pageNumberStart');
      expect(code).toContain('s.pageNumberStyle.toString()');
      expect(code).toContain('s.sectionPrefix');
      expect(code).toContain('s.includeSectionPrefix');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should return sections list from executor', async () => {
      const mock = createMockExecutor();
      const sections = [
        { index: 0, name: 'Section 1', startPage: 0, pageNumberStart: 1, pageNumberStyle: 'decimal', sectionPrefix: '', includePrefix: false },
        { index: 1, name: 'Section 2', startPage: 5, pageNumberStart: 1, pageNumberStyle: 'upperRoman', sectionPrefix: 'A', includePrefix: true },
      ];
      mock.execute.mockResolvedValue({ result: sections });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_list')!;
      const result = await tool.handler({}, {});

      const text = result.content[0] as any;
      const parsed = JSON.parse(text.text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].index).toBe(0);
      expect(parsed[0].name).toBe('Section 1');
      expect(parsed[0].pageNumberStart).toBe(1);
      expect(parsed[1].startPage).toBe(5);
      expect(parsed[1].sectionPrefix).toBe('A');
      expect(parsed[1].includePrefix).toBe(true);
    });
  });

  describe('section_setNumbering', () => {
    it('should call executor with section index and pageNumberStart', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({ result: 'ok' });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_setNumbering')!;
      const result = await tool.handler({ sectionIndex: 0, pageNumberStart: 10, numberingStyle: 'lowerRoman' }, {});

      expect(mock.execute).toHaveBeenCalledTimes(1);
      const code = mock.execute.mock.calls[0][0] as string;
      expect(code).toContain('doc.sections[0]');
      expect(code).toContain('s.pageNumberStart = 10');
      expect(code).toContain('PageNumberStyle.LOWER_ROMAN_PAGE_NUMBER');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should work without numberingStyle', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({ result: 'ok' });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_setNumbering')!;
      await tool.handler({ sectionIndex: 0, pageNumberStart: 1 }, {});

      const code = mock.execute.mock.calls[0][0] as string;
      expect(code).toContain('s.pageNumberStart = 1');
      expect(code).not.toContain('pageNumberStyle');
      expect(code).not.toContain('PageNumberStyle');
    });

    it('should return confirmation from executor', async () => {
      const mock = createMockExecutor();
      mock.execute.mockResolvedValue({ result: { updated: true, sectionIndex: 0, pageNumberStart: 10 } });
      const handler = new SectionHandler(mock as any);

      const tool = handler.tools.find((t) => t.name === 'section_setNumbering')!;
      const result = await tool.handler({ sectionIndex: 0, pageNumberStart: 10, numberingStyle: 'decimal' }, {});

      const text = result.content[0] as any;
      const parsed = JSON.parse(text.text);
      expect(parsed.updated).toBe(true);
      expect(parsed.sectionIndex).toBe(0);
      expect(parsed.pageNumberStart).toBe(10);
    });
  });
});
