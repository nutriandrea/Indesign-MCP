import type { Middleware, ToolResult } from '../types/index.js';
import { logger } from './logger.js';

export function withLogging(handlerName: string): Middleware {
  return (next) =>
    async (args: unknown, extra: any): Promise<ToolResult> => {
      logger.debug(`Handler "${handlerName}" called`, { args });
      try {
        const result = await next(args, extra);
        logger.debug(`Handler "${handlerName}" succeeded`);
        return result;
      } catch (err) {
        logger.error(`Handler "${handlerName}" failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    };
}

export function withErrorHandling(): Middleware {
  return (next) =>
    async (args: unknown, extra: any): Promise<ToolResult> => {
      try {
        return await next(args, extra);
      } catch (err) {
        return {
          content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
          isError: true,
        };
      }
    };
}

export function compose(...middlewares: Middleware[]): Middleware {
  return (handler) =>
    middlewares.reduceRight((next, mw) => mw(next), handler);
}
