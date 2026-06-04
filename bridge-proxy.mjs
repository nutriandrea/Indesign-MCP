#!/usr/bin/env node
/**
 * Bridge Proxy: connects to MCP server's WebSocket bridge,
 * receives ExtendScript requests, executes them in InDesign via 
 * JavaScript for Automation (JXA/osascript), and returns results.
 */
import WebSocket from 'ws';
import { execSync } from 'child_process';

const WS_URL = 'ws://127.0.0.1:8120';

let ws;
let reconnectTimer;

function connect() {
  ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    console.log('✅ Bridge proxy connected to MCP server');
  });
  
  ws.on('message', (raw) => {
    let request;
    try {
      request = JSON.parse(raw.toString());
    } catch(e) {
      return;
    }
    
    // The MCP server sends ExtendScript execution requests
    // Format: { id, code } or similar
    const code = request.code || request.script || raw.toString();
    const reqId = request.id || null;
    
    if (!code || code === 'connected' || code.type === 'connected') return;
    
    console.log(`📜 Executing script (${code.substring(0, 80)}...)`);
    
    try {
      // Escape the code for osascript
      const escaped = code
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      
      const result = execSync(
        `osascript -l JavaScript -e 'var app=Application("Adobe InDesign 2024");try{var r=app.doScript("${escaped}", {language: "javascript"});console.log(r?JSON.stringify(r):"null")}catch(e){console.log(JSON.stringify({error:e.message}))}'`,
        { timeout: 30000, encoding: 'utf-8' }
      ).trim();
      
      const response = {
        type: 'response',
        id: reqId,
        result: result
      };
      
      ws.send(JSON.stringify(response));
      console.log(`✅ Script executed: ${result.substring(0, 100)}`);
    } catch(e) {
      const response = {
        type: 'response',
        id: reqId,
        error: e.message
      };
      ws.send(JSON.stringify(response));
      console.error(`❌ Script failed: ${e.message}`);
    }
  });
  
  ws.on('close', () => {
    console.log('⚠️ Disconnected. Reconnecting in 3s...');
    reconnectTimer = setTimeout(connect, 3000);
  });
  
  ws.on('error', (err) => {
    console.error(`⚠️ WebSocket error: ${err.message}. Reconnecting in 3s...`);
    ws.close();
    reconnectTimer = setTimeout(connect, 3000);
  });
}

connect();

console.log('🔄 Bridge proxy starting... Will auto-reconnect.');
console.log('   Press Ctrl+C to stop.');
