import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { BridgeRequest, BridgeResponse, BridgeStatus } from '../types/index.js';
import { InDesignError } from '../utils/errorHandler.js';
import { sanitizeCode } from '../utils/stringUtils.js';

export class ScriptExecutor extends EventEmitter {
  private pending: Map<string, { resolve: (res: BridgeResponse) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }> = new Map();
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 30000) {
    super();
    this.defaultTimeout = defaultTimeout;
  }

  async execute(
    code: string,
    timeout?: number,
  ): Promise<BridgeResponse> {
    const sanitized = sanitizeCode(code);
    const id = uuidv4();
    const request: BridgeRequest = {
      id,
      code: sanitized,
      timeout: timeout ?? this.defaultTimeout,
    };

    return new Promise<BridgeResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new InDesignError('Script execution timed out', 'EXECUTION_TIMEOUT'));
      }, request.timeout ?? this.defaultTimeout);

      this.pending.set(id, { resolve, reject, timer });
      this.emit('request', request);
    });
  }

  handleResponse(response: BridgeResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(response.id);

    if (response.type === 'error') {
      pending.reject(
        new InDesignError(response.error ?? 'Unknown bridge error', 'BRIDGE_ERROR'),
      );
    } else {
      pending.resolve(response);
    }
  }

  getStatus(): BridgeStatus {
    return {
      connected: this.pending.size > 0,
      queueDepth: this.pending.size,
    };
  }

  cancelAll(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new InDesignError('Execution cancelled', 'CANCELLED'));
      this.pending.delete(id);
    }
  }
}
