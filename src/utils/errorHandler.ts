import type { ToolResult } from '../types/index.js';

export class InDesignError extends Error {
  public readonly code: string;
  public readonly originalError?: unknown;

  constructor(message: string, code: string = 'INDESIGN_ERROR', originalError?: unknown) {
    super(message);
    this.name = 'InDesignError';
    this.code = code;
    this.originalError = originalError;
  }
}

export function formatResponse(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data ?? 'ok') }],
  };
}

export function formatErrorResponse(error: Error | string): ToolResult {
  const message = error instanceof Error ? error.message : error;
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
