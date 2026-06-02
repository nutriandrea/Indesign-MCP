import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { ScriptExecutor } from '../../src/bridge/ScriptExecutor.js';
import { ExpressBridgeServer } from '../../src/bridge/ExpressBridgeServer.js';

const TEST_PORT = 18999;

describe('ExpressBridgeServer', () => {
  let executor: ScriptExecutor;
  let server: ExpressBridgeServer;

  beforeAll(async () => {
    executor = new ScriptExecutor(5000);
    server = new ExpressBridgeServer(
      { port: TEST_PORT, host: '127.0.0.1', token: 'test-token-123' },
      executor,
    );
    await server.start();
  });

  afterAll(async () => {
    executor.cancelAll();
    await server.stop();
  });

  async function request(
    urlOrPath: string,
    options: { method?: string; body?: unknown; token?: string; hostname?: string; port?: number } = {},
  ): Promise<{ status: number; body: any }> {
    const isFullUrl = urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');
    const url = isFullUrl ? new URL(urlOrPath) : null;
    const body = options.body ? JSON.stringify(options.body) : undefined;
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url?.hostname || options.hostname || '127.0.0.1',
        port: url ? parseInt(url.port) : options.port || TEST_PORT,
        path: url?.pathname || urlOrPath,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(body ? { 'Content-Length': Buffer.byteLength(body).toString() } : {}),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 500, body: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  it('should return 401 without token', async () => {
    const res = await request('/status');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('should return 401 with wrong token', async () => {
    const res = await request('/status', { token: 'wrong-token' });
    expect(res.status).toBe(401);
  });

  it('should return status with valid token', async () => {
    const res = await request('/status', { token: 'test-token-123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('scriptQueue');
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should reject POST /execute with missing code', async () => {
    const res = await request('/execute', {
      method: 'POST',
      body: {},
      token: 'test-token-123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('code');
  });

  it('should reject POST /execute with non-string code', async () => {
    const res = await request('/execute', {
      method: 'POST',
      body: { code: 123 },
      token: 'test-token-123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('code');
  });

  it('should reject oversized code', async () => {
    const res = await request('/execute', {
      method: 'POST',
      body: { code: 'x'.repeat(50001) },
      token: 'test-token-123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('50000');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request('/unknown', { token: 'test-token-123' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Not found');
  });

  it('should work without auth when token is empty', async () => {
    const noAuthServer = new ExpressBridgeServer(
      { port: TEST_PORT + 1, host: '127.0.0.1', token: '' },
      new ScriptExecutor(5000),
    );
    await noAuthServer.start();

    const res = await request('http://127.0.0.1:' + (TEST_PORT + 1) + '/status');
    expect(res.status).toBe(200);

    await noAuthServer.stop();
  });
});
