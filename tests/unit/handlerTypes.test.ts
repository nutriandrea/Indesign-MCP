import { describe, it, expect } from 'vitest';
import type { ToolResult, TextContent, ImageContent } from '../../src/types/handler.js';
import { formatResponse } from '../../src/utils/errorHandler.js';

describe('ImageContent', () => {
  it('should create ImageContent with required fields', () => {
    const img: ImageContent = {
      type: 'image',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
    };
    expect(img.type).toBe('image');
    expect(img.data).toBeDefined();
    expect(typeof img.data).toBe('string');
    expect(img.mimeType).toBe('image/png');
  });

  it('should accept JPEG mime type', () => {
    const img: ImageContent = {
      type: 'image',
      data: '/9j/4AAQSkZJRg==',
      mimeType: 'image/jpeg',
    };
    expect(img.mimeType).toBe('image/jpeg');
  });
});

describe('ToolResult with ImageContent', () => {
  it('should accept mixed TextContent and ImageContent array', () => {
    const result: ToolResult = {
      content: [
        { type: 'text', text: 'Page exported successfully' },
        { type: 'image', data: 'base64data', mimeType: 'image/png' },
      ],
    };
    expect(result.content).toHaveLength(2);
    expect(result.content[0].type).toBe('text');
    expect(result.content[1].type).toBe('image');
    expect(result.isError).toBeUndefined();
  });

  it('should accept only ImageContent', () => {
    const result: ToolResult = {
      content: [{ type: 'image', data: 'abc', mimeType: 'image/png' }],
    };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('image');
  });

  it('should work with isError flag', () => {
    const result: ToolResult = {
      content: [{ type: 'text', text: 'Export failed' }],
      isError: true,
    };
    expect(result.isError).toBe(true);
  });
});

describe('formatResponse backward compatibility', () => {
  it('should still return TextContent for simple data', () => {
    const result = formatResponse({ status: 'ok' });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('ok');
  });

  it('should still return correct JSON string for arrays', () => {
    const result = formatResponse(['a', 'b', 'c']);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('["a","b","c"]');
  });
});
