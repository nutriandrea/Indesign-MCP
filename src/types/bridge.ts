export interface BridgeRequest {
  id: string;
  code: string;
  timeout?: number;
}

export interface BridgeResponse {
  id: string;
  type: 'result' | 'error';
  result?: unknown;
  error?: string;
}

export interface BridgeStatus {
  connected: boolean;
  queueDepth: number;
  pluginVersion?: string;
}
